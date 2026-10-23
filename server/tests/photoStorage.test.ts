import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import request from 'supertest';
import sharp from 'sharp';
import { createApp, type AnalyzeDependencies, type PhotoRecord, type PhotoStoreDependencies } from '../src/app.js';
import { PhotoStorageError } from '../src/photoStorageError.js';

const png = await sharp({ create: { width: 4, height: 4, channels: 3, background: '#30a060' } }).png().toBuffer();

function setup(overrides: Partial<PhotoStoreDependencies> = {}, maxImageBytes?: number) {
  const records = new Map<string, PhotoRecord>([['owner:scan-test', {}]]);
  const objects = new Map<string, { bytes: Buffer; type: string }>();
  const uploadedPaths: string[] = [];
  const removedPaths: string[] = [];
  const store: PhotoStoreDependencies = {
    getPhotoRecord: async (uid, id) => records.get(`${uid}:${id}`) ?? null,
    savePhotoReference: async (uid, id, path) => { records.set(`${uid}:${id}`, { cloudPhotoPath: path }); },
    clearPhotoReference: async (uid, id) => { records.set(`${uid}:${id}`, {}); },
    upload: async (path, bytes, type) => { objects.set(path, { bytes, type }); uploadedPaths.push(path); },
    download: async (path) => { const object = objects.get(path); return object ? { bytes: object.bytes, contentType: object.type } : null; },
    remove: async (path) => { objects.delete(path); removedPaths.push(path); },
    ...overrides,
  };
  const deps: AnalyzeDependencies = {
    verifyIdToken: async (token) => {
      if (token === 'owner-token' || token === 'new-owner-token') return { uid: 'owner' };
      if (token === 'other-token') return { uid: 'other' };
      throw new Error('invalid token');
    },
    claimScan: async () => 'missing', saveAssessment: async () => undefined, failScan: async () => undefined,
    assessImage: async () => ({}), allowedOrigins: ['http://localhost:5173'], photoStore: store, maxImageBytes,
  };
  return { app: createApp(deps), records, objects, uploadedPaths, removedPaths };
}

describe('protected crop photo storage API', () => {
  it('returns an explicit setup error when private photo storage is not configured', async () => {
    const app = createApp({
      verifyIdToken: async () => ({ uid: 'owner' }), claimScan: async () => 'missing',
      saveAssessment: async () => undefined, failScan: async () => undefined, assessImage: async () => ({}),
      allowedOrigins: [],
    });
    const response = await request(app).get('/api/scans/scan-test/photo');
    assert.equal(response.status, 503);
    assert.equal(response.body.error.code, 'PHOTO_STORAGE_NOT_CONFIGURED');
  });

  it('returns a sanitized not-found error for an unavailable storage route or resource', async () => {
    const { app } = setup({ upload: async () => { throw new PhotoStorageError('not_found', 404); } });
    const response = await request(app).post('/api/scans/scan-test/photo').set('Authorization', 'Bearer owner-token')
      .attach('image', png, { filename: 'crop.png', contentType: 'image/png' });
    assert.equal(response.status, 503);
    assert.equal(response.body.error.code, 'PHOTO_STORAGE_NOT_FOUND');
    assert.equal(JSON.stringify(response.body).includes('secret'), false);
  });

  it('uploads an owner-scoped image and retrieves it after a fresh token (same account on another device)', async () => {
    const { app, uploadedPaths } = setup();
    const upload = await request(app).post('/api/scans/scan-test/photo').set('Authorization', 'Bearer owner-token')
      .attach('image', png, { filename: 'crop.png', contentType: 'image/png' });
    assert.equal(upload.status, 200);
    assert.deepEqual(upload.body, { cloudPhotoPath: 'users/owner/scans/scan-test/photo' });
    assert.deepEqual(uploadedPaths, ['users/owner/scans/scan-test/photo']);

    const retrieved = await request(app).get('/api/scans/scan-test/photo').set('Authorization', 'Bearer new-owner-token');
    assert.equal(retrieved.status, 200);
    assert.equal(retrieved.headers['content-type'], 'image/png');
    assert.equal(retrieved.headers['cache-control'], 'private, no-store');
    assert.deepEqual(retrieved.body, png);
  });

  it('rejects missing/invalid auth and isolates another Firebase UID', async () => {
    const { app } = setup();
    assert.equal((await request(app).get('/api/scans/scan-test/photo')).status, 401);
    assert.equal((await request(app).get('/api/scans/scan-test/photo').set('Authorization', 'Bearer invalid')).status, 401);
    const upload = await request(app).post('/api/scans/scan-test/photo').set('Authorization', 'Bearer other-token')
      .attach('image', png, { filename: 'crop.png', contentType: 'image/png' });
    assert.equal(upload.status, 404);
    assert.equal((await request(app).get('/api/scans/scan-test/photo').set('Authorization', 'Bearer other-token')).status, 404);
  });

  it('rejects unsupported content and oversized uploads before storing them', async () => {
    const unsupported = setup();
    const badType = await request(unsupported.app).post('/api/scans/scan-test/photo').set('Authorization', 'Bearer owner-token')
      .attach('image', Buffer.from('not an image'), { filename: 'crop.png', contentType: 'image/png' });
    assert.equal(badType.status, 415);
    const tooLarge = setup({}, 10);
    const limited = await request(tooLarge.app).post('/api/scans/scan-test/photo').set('Authorization', 'Bearer owner-token')
      .attach('image', png, { filename: 'crop.png', contentType: 'image/png' });
    assert.equal(limited.status, 413);
  });

  it('keeps the local-copy contract on Storage or Firestore failure and allows retry', async () => {
    let failSave = true;
    const { app, removedPaths } = setup({
      savePhotoReference: async () => { if (failSave) throw new Error('Firestore temporarily unavailable.'); },
    });
    const first = await request(app).post('/api/scans/scan-test/photo').set('Authorization', 'Bearer owner-token')
      .attach('image', png, { filename: 'crop.png', contentType: 'image/png' });
    assert.equal(first.status, 503);
    assert.deepEqual(removedPaths, ['users/owner/scans/scan-test/photo']);
    failSave = false;
    const retry = await request(app).post('/api/scans/scan-test/photo').set('Authorization', 'Bearer owner-token')
      .attach('image', png, { filename: 'crop.png', contentType: 'image/png' });
    assert.equal(retry.status, 200);
  });

  it('reports missing cloud objects and safely removes an owned photo', async () => {
    const { app, records, objects } = setup();
    records.set('owner:scan-test', { cloudPhotoPath: 'users/owner/scans/scan-test/photo' });
    const absent = await request(app).get('/api/scans/scan-test/photo').set('Authorization', 'Bearer owner-token');
    assert.equal(absent.status, 404);
    objects.set('users/owner/scans/scan-test/photo', { bytes: png, type: 'image/png' });
    const removed = await request(app).delete('/api/scans/scan-test/photo').set('Authorization', 'Bearer owner-token');
    assert.equal(removed.status, 200);
    assert.equal(removed.body.deleted, true);
    assert.deepEqual(records.get('owner:scan-test'), {});
  });

  it('fails closed if a Firestore reference points outside the verified user and scan path', async () => {
    const { app, records } = setup();
    records.set('owner:scan-test', { cloudPhotoPath: 'users/other/scans/scan-test/photo' });
    const response = await request(app).get('/api/scans/scan-test/photo').set('Authorization', 'Bearer owner-token');
    assert.equal(response.status, 404);
  });

  it('supports local-first assessment, same-photo retry, then private photo sync', async () => {
    const records = new Map<string, PhotoRecord>();
    const objects = new Map<string, Buffer>();
    let assessmentCalls = 0;
    const assessedImages: Buffer[] = [];
    const assessment = {
      status: 'completed' as const, cropIdentification: 'Cassava' as const,
      observedSymptoms: ['Small yellow patches are visible.'],
      possibleCauses: [{ name: 'Possible leaf stress', explanation: 'Several conditions can cause this appearance.', likelihood: 'uncertain' as const }],
      confidence: 'low' as const, confidenceReason: 'Only one small leaf area is shown.',
      summary: 'Small yellow patches are visible, but their cause is not clear.',
      recommendedActions: ['Take a closer photo of the full plant.'], preventionTips: ['Check nearby plants.'],
      whenToSeekHelp: 'Ask an extension officer if the signs spread.', limitations: ['Only one leaf is shown.'],
      disclaimer: 'This is an AI photo check, not a confirmed diagnosis.',
    };
    const photoStore: PhotoStoreDependencies = {
      getPhotoRecord: async (uid, id) => records.get(`${uid}:${id}`) ?? null,
      savePhotoReference: async (uid, id, path) => { records.set(`${uid}:${id}`, { cloudPhotoPath: path }); },
      clearPhotoReference: async (uid, id) => { records.set(`${uid}:${id}`, {}); },
      upload: async (path, image) => { objects.set(path, Buffer.from(image)); },
      download: async (path) => { const bytes = objects.get(path); return bytes ? { bytes, contentType: 'image/png' } : null; },
      remove: async (path) => { objects.delete(path); },
    };
    const app = createApp({
      allowedOrigins: [], photoStore, limiterMax: 50,
      verifyIdToken: async () => ({ uid: 'owner' }),
      claimScan: async (uid, id) => {
        const key = `${uid}:${id}`;
        if (!records.has(key)) records.set(key, {});
        return 'claimed';
      },
      saveAssessment: async () => undefined,
      failScan: async () => undefined,
      assessImage: async (image) => {
        assessmentCalls += 1;
        assessedImages.push(Buffer.from(image));
        if (assessmentCalls === 1) throw new Error('provider detail must not escape');
        return assessment;
      },
    });
    const assess = () => request(app).post('/api/analyze-crop').set('Authorization', 'Bearer owner-token')
      .field('scanId', 'scan-local-photo').field('cropType', 'Cassava')
      .attach('image', png, { filename: 'original.png', contentType: 'image/png' });

    assert.equal((await assess()).status, 502);
    const retry = await assess();
    assert.equal(retry.status, 200);
    assert.deepEqual(assessedImages, [png, png]);
    const synced = await request(app).post('/api/scans/scan-local-photo/photo').set('Authorization', 'Bearer owner-token')
      .attach('image', png, { filename: 'original.png', contentType: 'image/png' });
    assert.equal(synced.status, 200);
    assert.equal(synced.body.cloudPhotoPath, 'users/owner/scans/scan-local-photo/photo');
    assert.deepEqual(objects.get('users/owner/scans/scan-local-photo/photo'), png);
  });
});
