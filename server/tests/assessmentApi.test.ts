import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { AssessmentRequestError, requestCropAssessment } from '../../src/data/assessmentApi.js';
import type { CropAssessment } from '../../src/types.js';
import { translateAssessmentToPidgin } from '../../src/data/pidginTranslationApi.js';

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
        && error.code === 'GEMINI_TIMEOUT' && error.retryable && error.message === 'The assessment timed out.',
    );
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
