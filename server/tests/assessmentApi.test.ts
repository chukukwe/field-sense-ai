import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { AssessmentRequestError, requestCropAssessment } from '../../src/data/assessmentApi.js';
import { canRequestAssessmentRetry } from '../../src/data/assessmentRetry.js';
import { advanceEstimatedProgress, getAssessmentProgressMessage } from '../../src/data/assessmentProgress.js';
import type { CropAssessment } from '../../src/types.js';
import { translateAssessmentToPidgin } from '../../src/data/pidginTranslationApi.js';
import { canOfferSampleCropResult, getSampleCropResult } from '../../src/data/sampleCropResults.js';
import { getSeasonGuideEntry, seasonGuideAreas, type SeasonGuidePeriod } from '../../src/data/seasonGuide.js';
import { farmGuideData, getFarmGuideCalendarEntries, getFarmGuideLocation, getFarmGuideLocations, getFarmGuideZone } from '../../src/data/farmGuideData.js';

const result: CropAssessment = {
  status: 'inconclusive', cropIdentification: 'unknown', observedSymptoms: [], possibleCauses: [],
  confidence: 'low', confidenceReason: 'The photo is too distant.',
  summary: 'The photo does not show enough detail to assess the crop.',
  recommendedActions: ['Take a clearer close-up.'], preventionTips: [],
  whenToSeekHelp: 'Ask an agricultural extension officer if symptoms continue.',
  limitations: ['The crop is not identifiable.'], disclaimer: 'AI-assisted visual assessment, not a confirmed diagnosis.',
};

const input = { image: new Blob(['photo'], { type: 'image/png' }), cropType: 'Cassava' as const, observations: '', scanId: 'scan-test', idToken: 'test-token' };

describe('frontend assessment API helper', () => {
  it('keeps estimated progress gradual and below completion until analysis succeeds', () => {
    let preparing = 0;
    for (let index = 0; index < 100; index += 1) {
      preparing = advanceEstimatedProgress(preparing, 'preparing', 250);
    }
    assert.equal(preparing, 18);

    let uploading = preparing;
    for (let index = 0; index < 100; index += 1) {
      uploading = advanceEstimatedProgress(uploading, 'uploading', 250);
    }
    assert.equal(uploading, 38);

    let analyzing = uploading;
    for (let index = 0; index < 250; index += 1) {
      analyzing = advanceEstimatedProgress(analyzing, 'analyzing', 1_000);
      assert.ok(analyzing < 100);
    }
    assert.equal(analyzing, 94);
    assert.ok(advanceEstimatedProgress(90, 'analyzing', 1_000) - 90 < 0.1);
  });

  it('uses preparation, upload, analysis, and long-wait status messages', () => {
    assert.match(getAssessmentProgressMessage('preparing', 0), /Preparing your crop image/);
    assert.match(getAssessmentProgressMessage('uploading', 0), /Uploading crop image/);
    assert.match(getAssessmentProgressMessage('analyzing', 0), /AI is examining your crop/);
    assert.match(getAssessmentProgressMessage('analyzing', 30_000), /taking a little longer/);
    assert.equal(getAssessmentProgressMessage('complete', 0), 'Analysis complete');
  });

  it('allows an authenticated local-only scan with its saved photo to be retried', () => {
    const localOnlyScan = { photoStorageKey: 'owner/scan-test', dataScope: 'local-only' };
    assert.equal(canRequestAssessmentRetry(localOnlyScan, true, false), true);
    assert.equal(canRequestAssessmentRetry(localOnlyScan, false, false), false);
    assert.equal(canRequestAssessmentRetry(localOnlyScan, true, true), false);
    assert.equal(canRequestAssessmentRetry({ dataScope: 'local-only' }, true, false), false);
  });

  it('sends multipart data without setting Content-Type and accepts an inconclusive response', async () => {
    let sentUrl = '';
    let sentInit: RequestInit | undefined;
    const response = await requestCropAssessment(input, async (url, init) => {
      sentUrl = String(url);
      sentInit = init;
      return Response.json({ assessment: result });
    });
    assert.equal(sentUrl, '/api/analyze-crop');
    assert.equal(response.status, 'inconclusive');
    assert.equal(new Headers(sentInit?.headers).get('authorization'), 'Bearer test-token');
    assert.equal(new Headers(sentInit?.headers).has('content-type'), false);
    assert.ok(sentInit?.body instanceof FormData);
  });

  it('returns a clear retryable failure and never treats an error as an assessment', async () => {
    await assert.rejects(
      requestCropAssessment(input, async () => Response.json({ error: { code: 'GEMINI_TIMEOUT', message: 'The assessment timed out.', retryable: true } }, { status: 504 })),
      (error: unknown) => error instanceof AssessmentRequestError
        && error.code === 'GEMINI_TIMEOUT' && error.status === 504 && error.retryable && error.message === 'The assessment timed out.',
    );
  });

  it('offers a prepared sample only for known provider availability failures', () => {
    assert.equal(canOfferSampleCropResult({ code: 'GEMINI_QUOTA', status: 429 }, 'Cassava'), true);
    assert.equal(canOfferSampleCropResult({ code: 'GEMINI_TIMEOUT', status: 504 }, 'Maize'), true);
    assert.equal(canOfferSampleCropResult({ code: 'GEMINI_UNAVAILABLE', status: 503 }, 'Plantain'), true);
    assert.equal(canOfferSampleCropResult({ code: 'GEMINI_UNAVAILABLE', status: 502 }, 'Plantain'), true);
    assert.equal(canOfferSampleCropResult({ code: 'ASSESSMENT_TIMEOUT', status: 504 }, 'Cassava'), true);
    assert.equal(canOfferSampleCropResult({ code: 'ASSESSMENT_TIMEOUT', status: 408 }, 'Cassava'), true);
    assert.equal(canOfferSampleCropResult({ code: 'ASSESSMENT_UNAVAILABLE', status: 503 }, 'Cassava'), true);
    for (const failure of [
      { code: 'GEMINI_QUOTA', status: 503 },
      { code: 'GEMINI_UNAVAILABLE', status: 504 },
      { code: 'GEMINI_AUTH_FAILED', status: 503 },
      { code: 'RATE_LIMITED', status: 429 },
      { code: 'AUTH_REQUIRED', status: 401 },
      { code: 'SCAN_NOT_FOUND', status: 404 },
      { code: 'INVALID_IMAGE', status: 415 },
      { code: 'INVALID_REQUEST', status: 400 },
      { code: 'NETWORK_ERROR', status: 0 },
      { code: 'UNKNOWN_ERROR', status: 500 },
    ]) {
      assert.equal(canOfferSampleCropResult(failure, 'Cassava'), false);
    }
    assert.equal(canOfferSampleCropResult({ code: 'GEMINI_QUOTA', status: 429 }, 'Other'), false);
  });

  it('keeps sample results structured and separate from the uploaded photo', () => {
    for (const crop of ['Cassava', 'Plantain', 'Maize', 'Vegetables'] as const) {
      const sample = getSampleCropResult(crop);
      assert.ok(sample);
      assert.equal(sample.source, 'sample');
      assert.equal(sample.saved, false);
      assert.equal(sample.assessment.status, 'inconclusive');
      assert.ok(sample.assessment.disclaimer.toLowerCase().includes('sample'));
      const limitations: string[] = sample.assessment.limitations;
      assert.ok(limitations.some((item: string) => item.toLowerCase().includes('not made from your photo')));
    }
    assert.equal(getSampleCropResult('Maize')?.possibleProblem, 'Leaf spots');
    assert.match(getSampleCropResult('Vegetables')?.title ?? '', /healthy-looking/i);
    assert.equal(getSampleCropResult('Vegetables')?.assessment.possibleCauses.length, 0);
    assert.equal(getSampleCropResult('Other'), undefined);
  });

  it('provides consistent offline season examples for each supported area, crop, and period', () => {
    const periods: SeasonGuidePeriod[] = ['rainy-example', 'dry-example'];
    for (const area of seasonGuideAreas) {
      for (const crop of area.crops) {
        for (const period of periods) {
          const entry = getSeasonGuideEntry(area.id, period, crop);
          assert.ok(entry, 'A prepared guide entry should exist.');
          assert.equal(entry.areaId, area.id);
          assert.equal(entry.crop, crop);
          assert.equal(entry.period, period);
          assert.match(entry.rainNote, /not a forecast/i);
        }
      }
    }
    const wetEket = getSeasonGuideEntry('eket-example', 'rainy-example', 'Cassava');
    const dryKano = getSeasonGuideEntry('kano-example', 'dry-example', 'Maize');
    assert.ok(wetEket && dryKano);
    assert.notEqual(wetEket.headline, dryKano.headline);
  });

  it('maps a selected state and LGA to an approximate zone and only returns draft calendar data', () => {
    assert.equal(farmGuideData.states.length, 37);
    assert.equal(farmGuideData.locations.length, 774);

    const akwaIbom = farmGuideData.states.find((item) => item.name === 'Akwa Ibom');
    assert.ok(akwaIbom);
    const eket = getFarmGuideLocations(akwaIbom.id).find((item) => item.name === 'Eket');
    assert.ok(eket);
    const location = getFarmGuideLocation(eket.id);
    assert.ok(location);
    assert.equal(location.needsReview, true);
    const zone = getFarmGuideZone(location.zoneId);
    assert.equal(zone?.name, 'Mangrove / Freshwater Swamp (coastal)');

    const octoberPlanting = getFarmGuideCalendarEntries(location.zoneId, 10, 'plant');
    assert.ok(octoberPlanting.some((entry) => entry.crop === 'Cassava'));
    assert.ok(octoberPlanting.every((entry) => entry.status === 'draft'));
  });

  it('treats an intermediary 504 response without JSON as a retryable timeout', async () => {
    await assert.rejects(
      requestCropAssessment(input, async () => new Response('gateway timeout body', { status: 504 })),
      (error: unknown) => error instanceof AssessmentRequestError
        && error.code === 'ASSESSMENT_TIMEOUT'
        && error.retryable
        && /took too long/i.test(error.message)
        && !error.message.includes('gateway timeout body'),
    );
  });

  it('keeps no-body quota and service-unavailable errors recoverable', async () => {
    for (const [status, code] of [[429, 'RATE_LIMITED'], [503, 'ASSESSMENT_UNAVAILABLE']] as const) {
      await assert.rejects(
        requestCropAssessment(input, async () => new Response('untrusted upstream body', { status })),
        (error: unknown) => error instanceof AssessmentRequestError && error.code === code && error.retryable,
      );
    }
  });

  it('rejects malformed successful responses', async () => {
    await assert.rejects(
      requestCropAssessment(input, async () => Response.json({ assessment: { status: 'completed', summary: 'not enough fields' } })),
      (error: unknown) => error instanceof AssessmentRequestError && error.code === 'INVALID_RESPONSE',
    );
  });

  it('sends a trimmed crop name for Others', async () => {
    let form: FormData | undefined;
    await requestCropAssessment({ ...input, cropType: 'Other', customCropName: '  Cocoyam  ' }, async (_url, init) => {
      form = init?.body as FormData;
      return Response.json({ assessment: result });
    });
    assert.equal(form?.get('cropType'), 'Other');
    assert.equal(form?.get('customCropName'), 'Cocoyam');
  });

  it('keeps Pidgin translation authenticated and rejects incomplete translations', async () => {
    let init: RequestInit | undefined;
    const translated = await translateAssessmentToPidgin(result, 'test-token', async (_url, requestInit) => {
      init = requestInit;
      return Response.json({ assessment: { ...result, summary: 'Dis photo no show enough detail.' } });
    });
    assert.equal(translated.summary, 'Dis photo no show enough detail.');
    assert.equal(new Headers(init?.headers).get('authorization'), 'Bearer test-token');
    await assert.rejects(translateAssessmentToPidgin(result, 'test-token', async () => Response.json({ assessment: { summary: 'bad' } })), /could not be loaded/i);
  });
});
