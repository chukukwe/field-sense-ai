import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { CropPhotoRequestError, uploadLocalScanPhoto } from '../../src/data/photoApi.js';

describe('legacy IndexedDB photo migration helper', () => {
  it('uploads an existing local photo and does not remove the fallback copy', async () => {
    const photo = new Blob(['original crop bytes'], { type: 'image/jpeg' });
    let localCopy: Blob | undefined = photo;
    let requests = 0;
    const path = await uploadLocalScanPhoto({ scanId: 'scan-legacy', photoStorageKey: 'scan-legacy', idToken: 'firebase-token' }, {
      get: async () => localCopy,
      save: async (_key, blob) => { localCopy = blob; },
    }, async (_url, init) => {
      requests += 1;
      assert.equal(new Headers(init?.headers).get('authorization'), 'Bearer firebase-token');
      assert.ok(init?.body instanceof FormData);
      return Response.json({ cloudPhotoPath: 'users/uid/scans/scan-legacy/photo' });
    });
    assert.equal(path, 'users/uid/scans/scan-legacy/photo');
    assert.equal(requests, 1);
    assert.equal(localCopy, photo);
  });

  it('saves a reselected original locally before attempting cloud upload', async () => {
    const replacement = new Blob(['replacement bytes'], { type: 'image/png' });
    let localCopy: Blob | undefined;
    await assert.rejects(uploadLocalScanPhoto({ scanId: 'scan-legacy', photoStorageKey: 'uid/scan-legacy', idToken: 'token', replacement }, {
      get: async () => localCopy,
      save: async (_key, blob) => { localCopy = blob; },
    }, async () => { throw new Error('offline'); }), (error: unknown) => error instanceof CropPhotoRequestError && error.code === 'NETWORK_ERROR');
    assert.equal(localCopy, replacement);
  });

  it('reports missing legacy image bytes without pretending migration succeeded', async () => {
    let requests = 0;
    await assert.rejects(uploadLocalScanPhoto({ scanId: 'scan-legacy', photoStorageKey: 'scan-legacy', idToken: 'token' }, {
      get: async () => undefined,
      save: async () => undefined,
    }, async () => { requests += 1; return Response.json({ cloudPhotoPath: 'never' }); }),
    (error: unknown) => error instanceof CropPhotoRequestError && error.code === 'LEGACY_PHOTO_MISSING');
    assert.equal(requests, 0);
  });

  it('keeps the local photo available for a retry after a cloud failure', async () => {
    const photo = new Blob(['still local'], { type: 'image/webp' });
    const first = await uploadLocalScanPhoto({ scanId: 'scan-retry', photoStorageKey: 'scan-retry', idToken: 'token' }, {
      get: async () => photo,
      save: async () => undefined,
    }, async () => Response.json({ error: { code: 'PHOTO_SAVE_FAILED', message: 'Retry this upload.', retryable: true } }, { status: 503 }))
      .then(() => 'unexpected success', (error: unknown) => error);
    assert.ok(first instanceof CropPhotoRequestError && first.retryable);
    assert.equal(await new Promise((resolve) => resolve(photo.text())), 'still local');
  });
});
