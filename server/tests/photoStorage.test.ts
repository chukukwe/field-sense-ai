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
  const uploadModes: boolean[] = [];
  const removedPaths: string[] = [];
  const store: PhotoStoreDependencies = {
    getPhotoRecord: async (uid, id) => records.get(`${uid}:${id}`) ?? null,
    savePhotoReference: async (uid, id, path) => { records.set(`${uid}:${id}`, { cloudPhotoPath: path }); },
    clearPhotoReference: async (uid, id) => { records.set(`${uid}:${id}`, {}); },
    upload: async (path, bytes, type, options = { upsert: true }) => {
      uploadModes.push(options.upsert);
      if (!options.upsert && objects.has(path)) throw new PhotoStorageError('request_rejected', 409);
      objects.set(path, { bytes, type });
      uploadedPaths.push(path);
      return { created: !options.upsert };
    },
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
  return { app: createApp(deps), records, objects, uploadedPaths, uploadModes, removedPaths };
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

  it('returns a distinct sanitized error when Supabase identifies a missing bucket', async () => {
    const { app } = setup({ upload: async () => { throw new PhotoStorageError('bucket_missing', 404); } });
    const response = await request(app).post('/api/scans/scan-test/photo').set('Authorization', 'Bearer owner-token')
      .attach('image', png, { filename: 'crop.png', contentType: 'image/png' });
    assert.equal(response.status, 503);
    assert.equal(response.body.error.code, 'PHOTO_STORAGE_BUCKET_NOT_FOUND');
    assert.equal(JSON.stringify(response.body).includes('test-only'), false);
  });

  it('uploads an owner-scoped image and retrieves it after a fresh token (same account on another device)', async () => {
    const { app, uploadedPaths, uploadModes } = setup();
    const upload = await request(app).post('/api/scans/scan-test/photo').set('Authorization', 'Bearer owner-token')
      .attach('image', png, { filename: 'crop.png', contentType: 'image/png' });
    assert.equal(upload.status, 200);
    assert.deepEqual(upload.body, { cloudPhotoPath: 'users/owner/scans/scan-test/photo' });
    assert.deepEqual(uploadedPaths, ['users/owner/scans/scan-test/photo']);
    assert.deepEqual(uploadModes, [false]);

    const retrieved = await request(app).get('/api/scans/scan-test/photo').set('Authorization', 'Bearer new-owner-token');
    assert.equal(retrieved.status, 200);
    assert.equal(retrieved.headers['content-type'], 'image/png');
    assert.equal(retrieved.headers['cache-control'], 'private, no-store');
    assert.deepEqual(retrieved.body, png);
  });

  it('retries an existing owner-scoped photo at the exact same path with upsert enabled', async () => {
    const { app, records, objects, uploadedPaths, uploadModes } = setup();
    const expectedPath = 'users/owner/scans/scan-test/photo';
    records.set('owner:scan-test', { cloudPhotoPath: expectedPath });

    const response = await request(app).post('/api/scans/scan-test/photo').set('Authorization', 'Bearer owner-token')
      .attach('image', png, { filename: 'crop.png', contentType: 'image/png' });

    assert.equal(response.status, 200);
    assert.deepEqual(response.body, { cloudPhotoPath: expectedPath });
    assert.deepEqual(uploadedPaths, [expectedPath]);
    assert.deepEqual(uploadModes, [true]);
    assert.equal(objects.size, 1);
    assert.deepEqual(records.get('owner:scan-test'), { cloudPhotoPath: expectedPath });
  });

  it('fails a first-time upload collision without overwriting or deleting the existing object', async () => {
    const { app, objects, records, uploadModes, removedPaths } = setup();
    const path = 'users/owner/scans/scan-test/photo';
    const existingBytes = Buffer.from('pre-existing object');
    objects.set(path, { bytes: existingBytes, type: 'image/png' });

    const response = await request(app).post('/api/scans/scan-test/photo').set('Authorization', 'Bearer owner-token')
      .attach('image', png, { filename: 'crop.png', contentType: 'image/png' });

    assert.equal(response.status, 502);
    assert.deepEqual(uploadModes, [false]);
    assert.deepEqual(objects.get(path), { bytes: existingBytes, type: 'image/png' });
    assert.deepEqual(records.get('owner:scan-test'), {});
    assert.deepEqual(removedPaths, []);
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
    const { app, removedPaths, objects } = setup({
      savePhotoReference: async () => { if (failSave) throw new Error('Firestore temporarily unavailable.'); },
    });
    const first = await request(app).post('/api/scans/scan-test/photo').set('Authorization', 'Bearer owner-token')
      .attach('image', png, { filename: 'crop.png', contentType: 'image/png' });
    assert.equal(first.status, 503);
    assert.deepEqual(removedPaths, ['users/owner/scans/scan-test/photo']);
    assert.equal(objects.has('users/owner/scans/scan-test/photo'), false);
    failSave = false;
    const retry = await request(app).post('/api/scans/scan-test/photo').set('Authorization', 'Bearer owner-token')
      .attach('image', png, { filename: 'crop.png', contentType: 'image/png' });
    assert.equal(retry.status, 200);
  });

  it('does not remove a path when upload did not confirm this request created it', async () => {
    const path = 'users/owner/scans/scan-test/photo';
    const existingBytes = Buffer.from('pre-existing object');
    const { app, objects, removedPaths } = setup({
      upload: async () => ({ created: false }),
      savePhotoReference: async () => { throw new Error('Firestore temporarily unavailable.'); },
    });
    objects.set(path, { bytes: existingBytes, type: 'image/png' });

    const response = await request(app).post('/api/scans/scan-test/photo').set('Authorization', 'Bearer owner-token')
      .attach('image', png, { filename: 'crop.png', contentType: 'image/png' });

    assert.equal(response.status, 503);
    assert.deepEqual(objects.get(path), { bytes: existingBytes, type: 'image/png' });
    assert.deepEqual(removedPaths, []);
  });

  it('keeps the object and reports success if Firestore saved the reference before returning an error', async () => {
    const path = 'users/owner/scans/scan-test/photo';
    let reads = 0;
    const { app, objects, removedPaths } = setup({
      getPhotoRecord: async () => reads++ === 0 ? {} : { cloudPhotoPath: path },
      savePhotoReference: async () => { throw new Error('Firestore response was lost after commit.'); },
    });

    const response = await request(app).post('/api/scans/scan-test/photo').set('Authorization', 'Bearer owner-token')
      .attach('image', png, { filename: 'crop.png', contentType: 'image/png' });

    assert.equal(response.status, 200);
    assert.deepEqual(response.body, { cloudPhotoPath: path });
    assert.equal(objects.has(path), true);
    assert.deepEqual(removedPaths, []);
  });

  it('leaves a newly created object untouched when Firestore reference status cannot be verified', async () => {
    const path = 'users/owner/scans/scan-test/photo';
    let reads = 0;
    const { app, objects, removedPaths } = setup({
      getPhotoRecord: async () => {
        if (reads++ === 0) return {};
        throw new Error('Firestore read unavailable.');
      },
      savePhotoReference: async () => { throw new Error('Firestore write unavailable.'); },
    });

    const response = await request(app).post('/api/scans/scan-test/photo').set('Authorization', 'Bearer owner-token')
      .attach('image', png, { filename: 'crop.png', contentType: 'image/png' });

    assert.equal(response.status, 503);
    assert.equal(objects.has(path), true);
    assert.deepEqual(removedPaths, []);
  });

  it('recovers the identical orphaned photo on retry after an unconfirmed Firestore link', async () => {
    const path = 'users/owner/scans/scan-test/photo';
    let unavailable = true;
    let reads = 0;
    const { app, objects, removedPaths } = setup({
      getPhotoRecord: async () => {
        if (unavailable && reads++ > 0) throw new Error('Firestore read unavailable');
        return {};
      },
      savePhotoReference: async () => { if (unavailable) throw new Error('Firestore write unavailable'); },
    });
    const send = () => request(app).post('/api/scans/scan-test/photo').set('Authorization', 'Bearer owner-token')
      .attach('image', png, { filename: 'crop.png', contentType: 'image/png' });
    assert.equal((await send()).status, 503);
    assert.equal(objects.has(path), true);
    unavailable = false;
    const retry = await send();
    assert.equal(retry.status, 200);
    assert.equal(retry.body.cloudPhotoPath, path);
    assert.deepEqual(objects.get(path)?.bytes, png);
    assert.deepEqual(removedPaths, []);
  });

  it('does not remove a newly created object when Firestore readback points to a different path', async () => {
    const path = 'users/owner/scans/scan-test/photo';
    const differentPath = 'users/owner/scans/another-scan/photo';
    let reads = 0;
    const { app, objects, uploadedPaths, uploadModes, removedPaths } = setup({
      getPhotoRecord: async () => reads++ === 0 ? {} : { cloudPhotoPath: differentPath },
      savePhotoReference: async () => { throw new Error('Firestore write response was lost.'); },
    });

    const response = await request(app).post('/api/scans/scan-test/photo').set('Authorization', 'Bearer owner-token')
      .attach('image', png, { filename: 'crop.png', contentType: 'image/png' });

    assert.equal(response.status, 503);
    assert.equal(response.body.error.code, 'PHOTO_REFERENCE_SAVE_FAILED');
    assert.equal(reads, 2);
    assert.deepEqual(uploadedPaths, [path]);
    assert.deepEqual(uploadModes, [false]);
    assert.equal(objects.has(path), true);
    assert.deepEqual(removedPaths, []);
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
      upload: async (path, image, _type, options = { upsert: true }) => {
        if (!options.upsert && objects.has(path)) throw new PhotoStorageError('request_rejected', 409);
        objects.set(path, Buffer.from(image));
        return { created: !options.upsert };
      },
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
