import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import request from 'supertest';
import sharp from 'sharp';
import type { CropAssessmentResult } from '../src/assessmentSchema.js';
import { createApp, ProviderError, type AnalyzeDependencies } from '../src/app.js';

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

function setup(overrides: Partial<AnalyzeDependencies> = {}) {
  const persisted: CropAssessmentResult[] = [];
  const fails: string[] = [];
  const deps: AnalyzeDependencies = {
    verifyIdToken: async (token) => {
      if (token !== 'valid-owner-token' && token !== 'valid-other-token') throw new Error('invalid token');
      return { uid: token === 'valid-owner-token' ? 'owner' : 'other' };
    },
    claimScan: async (uid, id) => uid === 'owner' && id === 'scan-test' ? 'claimed' : 'missing',
    saveAssessment: async (_uid, _id, result) => { persisted.push(result); },
    failScan: async (_uid, id) => { fails.push(id); },
    assessImage: async () => assessment,
    allowedOrigins: ['http://localhost:5173'],
    limiterMax: 50,
    ...overrides,
  };
  return { app: createApp(deps), persisted, fails };
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

  it('validates and persists a successful result', async () => {
    const { app, persisted } = setup();
    const response = await request(app).post('/api/analyze-crop').set(auth)
      .field('scanId', 'scan-test').field('cropType', 'Cassava').field('observations', 'Yellowing on lower leaves')
      .attach('image', png, { filename: 'untrusted-name.png', contentType: 'image/png' });
    assert.equal(response.status, 200);
    assert.deepEqual(response.body.assessment, assessment);
    assert.deepEqual(persisted, [assessment]);
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
      const { app, fails } = setup({
        assessImage: async () => { throw new ProviderError(code, status, 'Try later.'); },
      });
      const response = await request(app).post('/api/analyze-crop').set(auth)
        .field('scanId', 'scan-test').field('cropType', 'Cassava')
        .attach('image', png, { filename: 'crop.png', contentType: 'image/png' });
      assert.equal(response.status, status);
      assert.equal(response.body.error.code, code);
      assert.deepEqual(fails, ['scan-test']);
    }
  });

  it('returns a safe provider failure response without internal error details', async () => {
    const { app } = setup({ assessImage: async () => { throw new Error('private provider response detail'); } });
    const response = await request(app).post('/api/analyze-crop').set(auth)
      .field('scanId', 'scan-test').field('cropType', 'Cassava')
      .attach('image', png, { filename: 'crop.png', contentType: 'image/png' });
    assert.equal(response.status, 502);
    assert.equal(response.body.error.message, 'The crop assessment service could not complete this request.');
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
