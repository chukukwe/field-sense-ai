import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { CropPhotoRequestError, getCloudCropPhoto, uploadCropPhoto, PHOTO_REQUEST_TIMEOUT_MS, uploadLocalScanPhoto } from '../../src/data/photoApi.js';

describe('authenticated private photo API', () => {
  it('bounds a hung photo upload and aborts the connection', async (context) => {
    context.mock.timers.enable({ apis: ['setTimeout'] });
    let signal: AbortSignal | null | undefined;
    const pending = uploadCropPhoto({ scanId: 'scan-test', image: new Blob(['photo']), idToken: 'test-token' }, async (_url, init) => {
      signal = init?.signal;
      return new Promise<Response>(() => {});
    });
    const rejected = assert.rejects(pending, (error: unknown) => error instanceof CropPhotoRequestError
      && error.code === 'PHOTO_REQUEST_TIMEOUT' && error.retryable);
    context.mock.timers.tick(PHOTO_REQUEST_TIMEOUT_MS);
    await rejected;
    assert.equal(signal?.aborted, true);
  });

  it('bounds a stalled private photo response body', async (context) => {
    context.mock.timers.enable({ apis: ['setTimeout'] });
    const pending = getCloudCropPhoto({ scanId: 'scan-test', idToken: 'test-token' },
      async () => new Response(new ReadableStream({ start() {} })));
    const rejected = assert.rejects(pending, (error: unknown) => error instanceof CropPhotoRequestError
      && error.code === 'PHOTO_REQUEST_TIMEOUT');
    await Promise.resolve();
    context.mock.timers.tick(PHOTO_REQUEST_TIMEOUT_MS);
    await rejected;
  });

  it('sends an image with the Firebase ID token and accepts only the persisted Supabase path', async () => {
    const image = new Blob(['image bytes'], { type: 'image/png' });
    let calls = 0;
    const path = await uploadCropPhoto({ scanId: 'scan-123', image, idToken: 'firebase-token' }, async (url, init) => {
      calls += 1;
      assert.match(String(url), /\/api\/scans\/scan-123\/photo$/);
      assert.equal(init?.method, 'POST');
      const headers = new Headers(init?.headers);
      assert.equal(headers.get('authorization'), 'Bearer firebase-token');
      assert.equal(headers.has('content-type'), false);
      const formData = init?.body;
      assert.ok(formData instanceof FormData);
      assert.equal((formData.get('image') as Blob).type, 'image/png');
      return Response.json({ cloudPhotoPath: 'users/uid/scans/scan-123/photo' });
    });
    assert.equal(path, 'users/uid/scans/scan-123/photo');
    assert.equal(calls, 1);
  });

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
