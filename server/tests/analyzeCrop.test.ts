import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import request from 'supertest';
import sharp from 'sharp';
import type { CropAssessmentResult } from '../src/assessmentSchema.js';
import { createApp, ProviderError, type AnalyzeDependencies } from '../src/app.js';
import { classifyGeminiFailure, mapGeminiProviderFailure, parseGeminiResponseText, preservesNumbers } from '../src/gemini.js';

const png = await sharp({ create: { width: 1, height: 1, channels: 3, background: '#30a060' } }).png().toBuffer();
const assessment: CropAssessmentResult = {
  status: 'completed', cropIdentification: 'Cassava',
  observedSymptoms: ['Small yellow patches are visible.'],
  possibleCauses: [{ name: 'Possible leaf stress', explanation: 'Several conditions can cause this appearance.', likelihood: 'uncertain' }],
  confidence: 'low', confidenceReason: 'The photo shows only a small area of one leaf.',
  summary: 'A few yellow patches are visible, but the cause cannot be confirmed from this image.',
  recommendedActions: ['Take a closer photo of the full plant and leaf underside.'],
  preventionTips: ['Continue checking nearby plants for similar changes.'],
  whenToSeekHelp: 'Ask a local agricultural extension officer if symptoms spread.',
  limitations: ['Only one leaf is shown.'],
  disclaimer: 'AI-assisted visual assessment, not a confirmed diagnosis.',
};

describe('Gemini failure diagnostics', () => {
  it('finds a DNS error nested under the fetch TypeError without retaining its message', () => {
    const cause = Object.assign(new Error('private socket detail'), { code: 'ENOTFOUND' });
    const error = new TypeError('fetch failed', { cause });
    const diagnostics = classifyGeminiFailure(error);
    assert.deepEqual(diagnostics, { category: 'dns', code: 'ENOTFOUND' });
    assert.equal(JSON.stringify(diagnostics).includes('private socket detail'), false);
  });

  it('classifies an unwrapped fetch TypeError as a network failure', () => {
    assert.deepEqual(classifyGeminiFailure(new TypeError('fetch failed')), {
      category: 'network', code: 'FETCH_FAILED',
    });
  });

  it('recognizes TLS, connection, timeout, and HTTP failures from safe codes only', () => {
    assert.deepEqual(classifyGeminiFailure(Object.assign(new Error('TLS failure'), { code: 'ERR_TLS_CERT_ALTNAME_INVALID' })), {
      category: 'tls', code: 'ERR_TLS_CERT_ALTNAME_INVALID',
    });
    assert.deepEqual(classifyGeminiFailure(Object.assign(new Error('socket reset'), { code: 'ECONNRESET' })), {
      category: 'connection', code: 'ECONNRESET',
    });
    assert.deepEqual(classifyGeminiFailure(Object.assign(new Error('request cancelled'), { name: 'AbortError' })), {
      category: 'timeout', code: 'REQUEST_TIMEOUT',
    });
    assert.deepEqual(classifyGeminiFailure(Object.assign(new Error('operation aborted'), { name: 'TimeoutError' })), {
      category: 'timeout', code: 'REQUEST_TIMEOUT',
    });
    assert.deepEqual(classifyGeminiFailure(Object.assign(new Error('provider rejected request'), { status: 401 })), {
      category: 'http', code: 'HTTP_RESPONSE', httpStatus: 401,
    });
    assert.deepEqual(classifyGeminiFailure(Object.assign(new Error('gateway timed out'), { status: 504 })), {
      category: 'http', code: 'HTTP_RESPONSE', httpStatus: 504,
    });
  });

  it('does not expose arbitrary provider error text in diagnostics', () => {
    const diagnostics = classifyGeminiFailure(new Error('sensitive response body and credential-like text'));
    assert.deepEqual(diagnostics, { category: 'provider', code: 'UNKNOWN_PROVIDER_ERROR' });
    assert.equal(JSON.stringify(diagnostics).includes('sensitive'), false);
  });

  it('maps an upstream gateway timeout to the retryable timeout response', () => {
    const failure = mapGeminiProviderFailure(Object.assign(new Error('gateway response'), { status: 504 }));
    assert.equal(failure.code, 'GEMINI_TIMEOUT');
    assert.equal(failure.status, 504);
    assert.equal(failure.retryable, true);
    assert.equal(failure.publicMessage.includes('gateway response'), false);
  });

  it('keeps quota, credentials, and provider unavailability distinct', () => {
    for (const [status, code] of [[429, 'GEMINI_QUOTA'], [401, 'GEMINI_AUTH_FAILED'], [403, 'GEMINI_AUTH_FAILED'], [503, 'GEMINI_UNAVAILABLE']] as const) {
      const failure = mapGeminiProviderFailure(Object.assign(new Error('private upstream detail'), { status }));
      assert.equal(failure.code, code);
      assert.equal(failure.status, status === 401 || status === 403 ? 503 : status);
      assert.equal(failure.publicMessage.includes('private upstream detail'), false);
      assert.equal(failure.retryable, status === 429 || status === 503);
    }
  });

  it('parses valid structured JSON and rejects empty or malformed provider text safely', () => {
    assert.deepEqual(parseGeminiResponseText('{"summary":"visible symptoms"}'), { summary: 'visible symptoms' });
    for (const text of [undefined, null, '', '   ']) {
      assert.throws(() => parseGeminiResponseText(text), (error: unknown) => error instanceof ProviderError && error.code === 'EMPTY_MODEL_RESPONSE');
    }
    assert.throws(() => parseGeminiResponseText('{bad json'), (error: unknown) => error instanceof ProviderError && error.code === 'INVALID_MODEL_RESPONSE');
  });
});

function setup(overrides: Partial<AnalyzeDependencies> = {}) {
  const persisted: CropAssessmentResult[] = [];
  const fails: string[] = [];
  const failureMessages: string[] = [];
  const deps: AnalyzeDependencies = {
    verifyIdToken: async (token) => {
      if (token !== 'valid-owner-token' && token !== 'valid-other-token') throw new Error('invalid token');
      return { uid: token === 'valid-owner-token' ? 'owner' : 'other' };
    },
    claimScan: async (uid, id) => uid === 'owner' && id === 'scan-test' ? 'claimed' : 'missing',
    saveAssessment: async (_uid, _id, result) => { persisted.push(result); },
    failScan: async (_uid, id, message) => { fails.push(id); failureMessages.push(message); },
    assessImage: async () => assessment,
    allowedOrigins: ['http://localhost:5173'],
    limiterMax: 50,
    ...overrides,
  };
  return { app: createApp(deps), persisted, fails, failureMessages };
}

const auth = { Authorization: 'Bearer valid-owner-token' };

describe('POST /api/analyze-crop', () => {
  it('rejects missing and invalid Firebase ID tokens', async () => {
    const { app } = setup();
    assert.equal((await request(app).post('/api/analyze-crop')).status, 401);
    assert.equal((await request(app).post('/api/analyze-crop').set('Authorization', 'Bearer expired')).status, 401);
  });

  it('rejects a missing scan ID, unsupported crop, and missing image', async () => {
    const { app } = setup();
    assert.equal((await request(app).post('/api/analyze-crop').set(auth).field('cropType', 'Cassava')).status, 400);
    assert.equal((await request(app).post('/api/analyze-crop').set(auth).field('scanId', 'scan-test').field('cropType', 'Yam')).status, 400);
    assert.equal((await request(app).post('/api/analyze-crop').set(auth).field('scanId', 'scan-test').field('cropType', 'Cassava')).status, 400);
  });

  it('requires and passes a trimmed custom crop name when Others is selected', async () => {
    const { app } = setup({ assessImage: async (_image, _mime, crop) => { assert.equal(crop, 'Cocoyam'); return assessment; } });
    const missing = await request(app).post('/api/analyze-crop').set(auth)
      .field('scanId', 'scan-test').field('cropType', 'Other')
      .attach('image', png, { filename: 'crop.png', contentType: 'image/png' });
    assert.equal(missing.status, 400);
    const response = await request(app).post('/api/analyze-crop').set(auth)
      .field('scanId', 'scan-test').field('cropType', 'Other').field('customCropName', '  Cocoyam  ')
      .attach('image', png, { filename: 'crop.png', contentType: 'image/png' });
    assert.equal(response.status, 200);
  });

  it('rejects unsupported or malformed image bytes declared as PNG', async () => {
    const { app } = setup();
    const response = await request(app).post('/api/analyze-crop').set(auth)
      .field('scanId', 'scan-test').field('cropType', 'Cassava')
      .attach('image', Buffer.from('not an image'), { filename: 'crop.png', contentType: 'image/png' });
    assert.equal(response.status, 415);
  });

  it('rejects uploads over 8 MiB', async () => {
    const { app } = setup();
    const response = await request(app).post('/api/analyze-crop').set(auth)
      .field('scanId', 'scan-test').field('cropType', 'Cassava')
      .attach('image', Buffer.alloc(8 * 1024 * 1024 + 1, 1), { filename: 'crop.png', contentType: 'image/png' });
    assert.equal(response.status, 413);
  });

  it('does not analyze a scan outside the verified user scope', async () => {
    const { app, persisted } = setup();
    const response = await request(app).post('/api/analyze-crop').set({ Authorization: 'Bearer valid-other-token' })
      .field('scanId', 'scan-test').field('cropType', 'Cassava')
      .attach('image', png, { filename: 'crop.png', contentType: 'image/png' });
    assert.equal(response.status, 404);
    assert.equal(persisted.length, 0);
  });

  it('registers a local-only scan under the UID from the verified token before analysis', async () => {
    const records = new Map<string, { cropType: string; observations: string }>();
    const { app, persisted } = setup({
      claimScan: async (uid, scanId, cropType, details) => {
        const recordKey = `${uid}/${scanId}`;
        const existing = records.get(recordKey);
        if (existing && (existing.cropType !== cropType || existing.observations !== details.observations)) return 'missing';
        if (!existing) records.set(recordKey, { cropType, observations: details.observations });
        return 'claimed';
      },
    });
    const response = await request(app).post('/api/analyze-crop').set(auth)
      .field('scanId', 'scan-local-first').field('cropType', 'Cassava').field('observations', 'Yellow lower leaves')
      .attach('image', png, { filename: 'original.png', contentType: 'image/png' });
    assert.equal(response.status, 200);
    assert.deepEqual(records.get('owner/scan-local-first'), { cropType: 'Cassava', observations: 'Yellow lower leaves' });
    assert.equal(records.has('other/scan-local-first'), false);
    assert.deepEqual(persisted, [assessment]);
  });

  it('validates and persists a successful result', async () => {
    let providerMime = '';
    const { app, persisted } = setup({ assessImage: async (_image, mime) => { providerMime = mime; return assessment; } });
    const response = await request(app).post('/api/analyze-crop').set(auth)
      .field('scanId', 'scan-test').field('cropType', 'Cassava').field('observations', 'Yellowing on lower leaves')
      .attach('image', png, { filename: 'untrusted-name.png', contentType: 'image/png' });
    assert.equal(response.status, 200);
    assert.equal(providerMime, 'image/png');
    assert.deepEqual(response.body.assessment, assessment);
    assert.deepEqual(persisted, [assessment]);
  });

  it('accepts supported JPEG, PNG, and WebP photos with matching provider MIME types', async () => {
    const images = [
      { mime: 'image/jpeg', bytes: await sharp({ create: { width: 2, height: 2, channels: 3, background: '#30a060' } }).jpeg().toBuffer() },
      { mime: 'image/png', bytes: png },
      { mime: 'image/webp', bytes: await sharp({ create: { width: 2, height: 2, channels: 3, background: '#30a060' } }).webp().toBuffer() },
    ];
    const providerMimes: string[] = [];
    const { app } = setup({ claimScan: async () => 'claimed', assessImage: async (_image, mime) => { providerMimes.push(mime); return assessment; } });
    for (const image of images) {
      const response = await request(app).post('/api/analyze-crop').set(auth)
        .field('scanId', 'scan-test').field('cropType', 'Cassava')
        .attach('image', image.bytes, { filename: 'crop-photo', contentType: image.mime });
      assert.equal(response.status, 200);
    }
    assert.deepEqual(providerMimes, images.map(({ mime }) => mime));
  });

  it('normalizes a large valid photo to a bounded JPEG before assessment', async () => {
    const largePng = await sharp({ create: { width: 3000, height: 2000, channels: 3, background: '#30a060' } }).png().toBuffer();
    let providerImage: Buffer | undefined;
    let providerMime = '';
    const { app } = setup({ assessImage: async (image, mime) => { providerImage = image; providerMime = mime; return assessment; } });
    const response = await request(app).post('/api/analyze-crop').set(auth)
      .field('scanId', 'scan-test').field('cropType', 'Cassava')
      .attach('image', largePng, { filename: 'crop.png', contentType: 'image/png' });
    assert.equal(response.status, 200);
    assert.equal(providerMime, 'image/jpeg');
    assert.ok(providerImage);
    const prepared = await sharp(providerImage).metadata();
    assert.equal(prepared.format, 'jpeg');
    assert.ok((prepared.width ?? 0) <= 2048);
    assert.ok((prepared.height ?? 0) <= 2048);
  });

  it('reports Firestore assessment-save failures separately from Gemini failures', async () => {
    const { app, persisted, fails } = setup({
      saveAssessment: async () => { throw Object.assign(new Error('private Firestore details'), { code: 'firestore/unavailable' }); },
    });
    const response = await request(app).post('/api/analyze-crop').set(auth)
      .field('scanId', 'scan-test').field('cropType', 'Cassava')
      .attach('image', png, { filename: 'crop.png', contentType: 'image/png' });
    assert.equal(response.status, 503);
    assert.equal(response.body.error.code, 'ASSESSMENT_SAVE_FAILED');
    assert.equal(response.body.error.retryable, true);
    assert.doesNotMatch(JSON.stringify(response.body), /private Firestore details/);
    assert.equal(persisted.length, 0);
    assert.deepEqual(fails, ['scan-test']);
  });

  it('does not make duplicate provider requests for completed or processing scans', async () => {
    let providerCalls = 0;
    for (const claim of ['complete', 'processing'] as const) {
      const { app } = setup({
        claimScan: async () => claim,
        assessImage: async () => { providerCalls += 1; return assessment; },
      });
      const response = await request(app).post('/api/analyze-crop').set(auth)
        .field('scanId', 'scan-test').field('cropType', 'Cassava')
        .attach('image', png, { filename: 'crop.png', contentType: 'image/png' });
      assert.equal(response.status, 409);
    }
    assert.equal(providerCalls, 0);
  });

  it('rejects malformed model output and marks the scan failed', async () => {
    const { app, persisted, fails } = setup({ assessImage: async () => ({ status: 'completed', diagnosis: 'invented' }) });
    const response = await request(app).post('/api/analyze-crop').set(auth)
      .field('scanId', 'scan-test').field('cropType', 'Cassava')
      .attach('image', png, { filename: 'crop.png', contentType: 'image/png' });
    assert.equal(response.status, 502);
    assert.equal(persisted.length, 0);
    assert.deepEqual(fails, ['scan-test']);
  });

  it('handles malformed JSON from the provider without returning an assessment', async () => {
    const { app, persisted, fails } = setup({
      assessImage: async () => { throw new ProviderError('INVALID_MODEL_RESPONSE', 502, 'The assessment could not be validated.'); },
    });
    const response = await request(app).post('/api/analyze-crop').set(auth)
      .field('scanId', 'scan-test').field('cropType', 'Cassava')
      .attach('image', png, { filename: 'crop.png', contentType: 'image/png' });
    assert.equal(response.status, 502);
    assert.equal(response.body.error.code, 'INVALID_MODEL_RESPONSE');
    assert.equal(persisted.length, 0);
    assert.deepEqual(fails, ['scan-test']);
  });

  it('returns retryable timeout and quota responses without success data', async () => {
    for (const [status, code] of [[504, 'GEMINI_TIMEOUT'], [429, 'GEMINI_QUOTA']] as const) {
      const { app, fails, failureMessages } = setup({
        assessImage: async () => { throw new ProviderError(code, status, 'Try later.'); },
      });
      const response = await request(app).post('/api/analyze-crop').set(auth)
        .field('scanId', 'scan-test').field('cropType', 'Cassava')
        .attach('image', png, { filename: 'crop.png', contentType: 'image/png' });
      assert.equal(response.status, status);
      assert.equal(response.body.error.code, code);
      assert.deepEqual(fails, ['scan-test']);
      assert.deepEqual(failureMessages, ['Try later.']);
    }
  });

  it('allows the same saved scan to be assessed again after a retryable failure', async () => {
    let providerCalls = 0;
    const { app, fails, persisted } = setup({
      claimScan: async () => 'claimed',
      assessImage: async () => {
        providerCalls += 1;
        if (providerCalls === 1) throw new ProviderError('GEMINI_TIMEOUT', 504, 'Retry this scan.');
        return assessment;
      },
    });
    const send = () => request(app).post('/api/analyze-crop').set(auth)
      .field('scanId', 'scan-test').field('cropType', 'Cassava')
      .attach('image', png, { filename: 'crop.png', contentType: 'image/png' });
    assert.equal((await send()).status, 504);
    assert.equal((await send()).status, 200);
    assert.equal(providerCalls, 2);
    assert.deepEqual(fails, ['scan-test']);
    assert.deepEqual(persisted, [assessment]);
  });

  it('returns a safe provider failure response without internal error details', async () => {
    const { app } = setup({ assessImage: async () => { throw new Error('private provider response detail'); } });
    const response = await request(app).post('/api/analyze-crop').set(auth)
      .field('scanId', 'scan-test').field('cropType', 'Cassava')
      .attach('image', png, { filename: 'crop.png', contentType: 'image/png' });
    assert.equal(response.status, 502);
    assert.equal(response.body.error.message, 'The crop assessment service could not complete this request. Try again later.');
    assert.equal(JSON.stringify(response.body).includes('private provider response detail'), false);
  });

  it('stores an inconclusive result as distinct from technical failure', async () => {
    const inconclusive = { ...assessment, status: 'inconclusive' as const, cropIdentification: 'unknown' as const, possibleCauses: [], summary: 'The image does not show enough detail to assess the crop.' };
    const { app, persisted } = setup({ assessImage: async () => inconclusive });
    const response = await request(app).post('/api/analyze-crop').set(auth)
      .field('scanId', 'scan-test').field('cropType', 'Cassava')
      .attach('image', png, { filename: 'crop.png', contentType: 'image/png' });
    assert.equal(response.status, 200);
    assert.equal(response.body.assessment.status, 'inconclusive');
    assert.deepEqual(persisted, [inconclusive]);
  });
});

describe('POST /api/assessment/translate-pidgin', () => {
  it('requires authentication and preserves the structured assessment contract', async () => {
    const { app } = setup({ translateAssessment: async (input) => ({ ...input, summary: 'E get small yellow mark, but we no fit confirm wetin cause am.' }) });
    assert.equal((await request(app).post('/api/assessment/translate-pidgin').send({ assessment })).status, 401);
    const response = await request(app).post('/api/assessment/translate-pidgin').set(auth).send({ assessment });
    assert.equal(response.status, 200);
    assert.equal(response.body.assessment.status, assessment.status);
    assert.equal(response.body.assessment.confidence, assessment.confidence);
    assert.match(response.body.assessment.summary, /E get/);
  });

  it('rejects incomplete source assessments before requesting translation', async () => {
    let calls = 0;
    const { app } = setup({ translateAssessment: async () => { calls += 1; return assessment; } });
    const response = await request(app).post('/api/assessment/translate-pidgin').set(auth).send({ assessment: { summary: 'only a summary' } });
    assert.equal(response.status, 400);
    assert.equal(calls, 0);
  });
});

describe('Pidgin translation safety check', () => {
  it('preserves every number in translated fields', () => {
    const source = { ...assessment, summary: 'Check again in 48 hours.' };
    assert.equal(preservesNumbers(source, { ...source, summary: 'Check again in 48 hours.' }), true);
    assert.equal(preservesNumbers(source, { ...source, summary: 'Check again in 24 hours.' }), false);
  });
});
