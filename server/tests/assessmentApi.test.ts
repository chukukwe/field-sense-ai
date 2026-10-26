import { getLagosMonth, getPlanningMonth, getPlantingWindows, cropCare } from '../../src/data/farmGuidePlanning.js';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { AssessmentRequestError, requestCropAssessment, ASSESSMENT_REQUEST_TIMEOUT_MS } from '../../src/data/assessmentApi.js';
import { canRequestAssessmentRetry } from '../../src/data/assessmentRetry.js';
import { advanceEstimatedProgress, getAssessmentProgressMessage } from '../../src/data/assessmentProgress.js';
import type { CropAssessment, ScanItem } from '../../src/types.js';
import { updateScanAssessment } from '../../src/data/assessmentState.js';
import { translateAssessmentToPidgin } from '../../src/data/pidginTranslationApi.js';
import { getSeasonGuideEntry, seasonGuideAreas, type SeasonGuidePeriod } from '../../src/data/seasonGuide.js';
import { farmGuideData, getFarmGuideCalendarEntries, getFarmGuideLocation, getFarmGuideLocations, getFarmGuideZone, getReviewedCalendarForLocation } from '../../src/data/farmGuideData.js';

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
    assert.equal(canRequestAssessmentRetry({ firebasePhotoPath: 'users/owner/scans/scan-remote/crop-photo' }, true, false), true);
    assert.equal(canRequestAssessmentRetry({ cloudPhotoPath: 'users/owner/scans/scan-legacy/photo' }, true, false), true);
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

  it('stops a hung upload at the request deadline and aborts its connection', async (context) => {
    context.mock.timers.enable({ apis: ['setTimeout'] });
    let signal: AbortSignal | null | undefined;
    const pending = requestCropAssessment(input, async (_url, init) => {
      signal = init?.signal;
      return new Promise<Response>(() => {});
    });
    const rejected = assert.rejects(pending, (error: unknown) => error instanceof AssessmentRequestError
      && error.code === 'ASSESSMENT_TIMEOUT' && error.status === 408 && error.retryable);
    context.mock.timers.tick(ASSESSMENT_REQUEST_TIMEOUT_MS);
    await rejected;
    assert.equal(signal?.aborted, true);
  });

  it('also bounds a response whose body never finishes', async (context) => {
    context.mock.timers.enable({ apis: ['setTimeout'] });
    const pending = requestCropAssessment(input, async () => new Response(new ReadableStream({ start() {} })));
    const rejected = assert.rejects(pending, (error: unknown) => error instanceof AssessmentRequestError
      && error.code === 'ASSESSMENT_TIMEOUT');
    await Promise.resolve();
    context.mock.timers.tick(ASSESSMENT_REQUEST_TIMEOUT_MS);
    await rejected;
  });

  it('clears the request timer after a successful response', async (context) => {
    context.mock.timers.enable({ apis: ['setTimeout'] });
    let signal: AbortSignal | null | undefined;
    await requestCropAssessment(input, async (_url, init) => {
      signal = init?.signal;
      return Response.json({ assessment: result });
    });
    context.mock.timers.tick(ASSESSMENT_REQUEST_TIMEOUT_MS);
    assert.equal(signal?.aborted, false);
  });

  it('preserves a cloud result when a late HTTP timeout or retry update arrives', () => {
    const saved: ScanItem = {
      id: 'scan-completed', title: 'Cassava', cropType: 'Cassava', date: '24 Oct 2026',
      status: 'Observation', statusVariant: 'amber', summary: result.summary,
      footerIcon: 'check', footerStatus: 'Crop check ready', footerActionLabel: 'See result',
      imageUrl: '', assessment: result, assessmentStatus: result.status,
    };
    assert.equal(updateScanAssessment(saved, undefined, 'failed', 'Timed out'), saved);
    assert.equal(updateScanAssessment(saved, undefined, 'processing', 'Checking'), saved);
    const pending = { ...saved, assessment: undefined, assessmentStatus: 'pending' as const };
    assert.equal(updateScanAssessment(pending, undefined, 'failed', 'Timed out').assessmentStatus, 'failed');
    assert.equal(updateScanAssessment(pending, result, result.status, result.summary).assessment, result);
  });

  it('returns a clear retryable failure and never treats an error as an assessment', async () => {
    await assert.rejects(
      requestCropAssessment(input, async () => Response.json({ error: { code: 'GEMINI_TIMEOUT', message: 'The assessment timed out.', retryable: true } }, { status: 504 })),
      (error: unknown) => error instanceof AssessmentRequestError
        && error.code === 'GEMINI_TIMEOUT' && error.status === 504 && error.retryable && error.message === 'The assessment timed out.',
    );
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

  it('uses a source-matched LGA zone and withholds unsupported legacy calendar dates', () => {
    assert.equal(farmGuideData.states.length, 37);
    assert.equal(farmGuideData.locations.length, 774);

    const akwaIbom = farmGuideData.states.find((item) => item.name === 'Akwa Ibom');
    assert.ok(akwaIbom);
    const eket = getFarmGuideLocations(akwaIbom.id).find((item) => item.name === 'Eket');
    assert.ok(eket);
    const location = getFarmGuideLocation(eket.id);
    assert.ok(location);
    assert.equal(location.needsReview, false);
    assert.match(location.zoneSource ?? '', /naerls/);
    const zone = getFarmGuideZone(location.zoneId);
    assert.equal(zone?.name, 'Humid Forest (rainforest)');

    const octoberPlanting = getFarmGuideCalendarEntries(location.zoneId, 10, 'plant');
    assert.equal(octoberPlanting.some((entry) => entry.crop === 'Cassava'), false);
    assert.ok(octoberPlanting.every((entry) => entry.status === 'source_reviewed'));
    const ambiguous = farmGuideData.locations.find((item) => item.name === 'Kankara');
    assert.ok(ambiguous?.needsReview);
    assert.deepEqual(getReviewedCalendarForLocation(ambiguous.id, 7, 'plant'), []);
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

describe('Farm Guide planning conditions', () => {
  it('uses Lagos dates and rejects invalid planning months', () => {
    assert.equal(getLagosMonth(new Date('2026-12-31T23:30:00Z')), 1);
    for (const value of [null, '', '0', '13', '-1', '1.5', 'NaN', '01']) assert.equal(getPlanningMonth(value, 7), 7);
    assert.equal(getPlanningMonth('12', 7), 12);
  });
  it('keeps dry-season entries out of rain-only planting plans across every zone and month', () => {
    let dryEntries = 0;
    for (const zone of farmGuideData.zones) for (let month = 1; month <= 12; month += 1) {
      const rain = getPlantingWindows(zone.id, month, 'rainfall');
      const irrigation = getPlantingWindows(zone.id, month, 'irrigation');
      assert.ok(rain.every((entry) => entry.seasonLabel !== 'dry_season'));
      assert.ok(rain.every((entry) => irrigation.some((other) => other.cropId === entry.cropId && other.seasonLabel === entry.seasonLabel)));
      dryEntries += irrigation.filter((entry) => entry.seasonLabel === 'dry_season').length;
    }
    assert.ok(dryEntries > 0, 'Test must exercise real dry-season entries');
  });
  it('keeps the first crop care guides source-linked without changing draft calendar status', () => {
    for (const crop of ['Cassava', 'Maize', 'Plantain', 'Okra']) {
      const care = cropCare[crop]; assert.ok(care);
      assert.ok(care.beforePlanting && care.water && care.earlyCare && care.harvest && care.scope);
      assert.match(care.source.url, /^https:\/\//);
    }
    assert.ok(farmGuideData.calendar.every((entry) => entry.status === 'draft'));
  });
});

describe('Farm Guide published evidence gates', () => {
  it('matches explicit NAERLS exceptions and keeps ambiguous source names unresolved', () => {
    const find = (state: string, lga: string) => {
      const stateId = farmGuideData.states.find((item) => item.name === state)?.id;
      const location = farmGuideData.locations.find((item) => item.stateId === stateId && item.name === lga);
      assert.ok(location); return location;
    };
    assert.equal(find('Akwa Ibom', 'Eket').zoneId, 2);
    assert.equal(find('Niger', 'Bosso').zoneId, 4);
    assert.equal(find('Yobe', 'Damaturu').zoneId, 6);
    assert.equal(find('Yobe', 'Nguru').zoneId, 7);
    assert.equal(find('Plateau', 'Jos North').zoneId, 8);
    assert.equal(find('Federal Capital Territory', 'Gwagwalada').zoneId, 4);
    for (const [state,lga] of [['Katsina','Kankara'],['Kwara','Kaiama'],['Osun','Ife East'],['Ebonyi','Izzi'],['Anambra','Ayamelum']]) {
      const location=find(state!,lga!); assert.equal(location.needsReview,true);
      for(let month=1;month<=12;month++) assert.deepEqual(getReviewedCalendarForLocation(location.id,month,'plant'),[]);
    }
  });
  it('publishes only traceable windows and preserves partial-month conditions', () => {
    const northern=getFarmGuideCalendarEntries(5,6,'plant').find((entry)=>entry.crop==='Maize');
    assert.ok(northern); assert.match(northern.window,/Last week of June/); assert.match(northern.conditions,/established rains/);
    assert.equal(getFarmGuideCalendarEntries(5,5,'plant').some((entry)=>entry.crop==='Maize'),false);
    const humid=getFarmGuideCalendarEntries(2,3,'plant').find((entry)=>entry.crop==='Maize');
    assert.ok(humid); assert.match(humid.conditions,/SAMMAZ 63/);
    for(const zone of farmGuideData.zones) for(let month=1;month<=12;month++) {
      for(const entry of getFarmGuideCalendarEntries(zone.id,month,'plant')) {
        assert.equal(entry.status,'source_reviewed'); assert.match(entry.source,/^https:\/\//);
        assert.ok(entry.window && entry.conditions && entry.sourceLocator && entry.reviewedOn);
      }
      assert.deepEqual(getFarmGuideCalendarEntries(zone.id,month,'harvest'),[],'No unsupported harvest month should be shown');
    }
  });
});
