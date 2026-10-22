import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createSupabasePhotoStore } from '../src/supabasePhotoStore.js';

describe('Supabase private Storage adapter', () => {
  it('uses a modern server secret only in apikey and the server-derived object path', async () => {
    const requests: Array<{ url: string; init?: RequestInit }> = [];
    const store = createSupabasePhotoStore({
      url: 'https://project.supabase.co/', apiKey: 'test-only-server-secret', bucket: 'crop-photos',
      fetcher: async (url, init) => { requests.push({ url: String(url), init }); return new Response('{}', { status: 200 }); },
    });
    const bytes = Buffer.from('image');
    await store.upload('users/uid/scans/scan-1/photo', bytes, 'image/png');
    const uploadRequest = requests[0];
    assert.ok(uploadRequest);
    const uploadInit = uploadRequest.init;
    assert.ok(uploadInit);
    assert.equal(uploadRequest.url, 'https://project.supabase.co/storage/v1/object/crop-photos/users/uid/scans/scan-1/photo');
    assert.equal(uploadInit.method, 'PUT');
    const headers = new Headers(uploadInit.headers);
    assert.equal(headers.get('apikey'), 'test-only-server-secret');
    assert.equal(headers.has('authorization'), false);
    assert.equal(headers.get('x-upsert'), 'true');
    assert.equal((uploadInit.body as Uint8Array).byteLength, bytes.byteLength);

    await store.remove('users/uid/scans/scan-1/photo');
    assert.equal(requests[1]?.init?.method, 'DELETE');
    assert.equal(new Headers(requests[1]?.init?.headers).has('authorization'), false);
  });

  it('retrieves private object bytes and content type without producing a public URL', async () => {
    const store = createSupabasePhotoStore({
      url: 'https://project.supabase.co', apiKey: 'test-only-server-secret', bucket: 'crop-photos',
      fetcher: async (url, init) => {
        assert.equal(String(url), 'https://project.supabase.co/storage/v1/object/crop-photos/users/uid/scans/scan-1/photo');
        assert.equal(new Headers(init?.headers).get('apikey'), 'test-only-server-secret');
        return new Response(Buffer.from('private-photo'), { status: 200, headers: { 'Content-Type': 'image/jpeg' } });
      },
    });
    const response = await store.download('users/uid/scans/scan-1/photo');
    assert.equal(response?.contentType, 'image/jpeg');
    assert.equal(response?.bytes.toString(), 'private-photo');
  });

  it('sends the legacy service_role JWT as apikey and bearer authorization', async () => {
    const store = createSupabasePhotoStore({
      url: 'https://project.supabase.co', apiKey: 'legacy-test-key', legacyServiceRoleKey: true, bucket: 'crop-photos',
      fetcher: async (_url, init) => {
        const headers = new Headers(init?.headers);
        assert.equal(headers.get('apikey'), 'legacy-test-key');
        assert.equal(headers.get('authorization'), 'Bearer legacy-test-key');
        return new Response('{}', { status: 200 });
      },
    });
    await store.remove('users/uid/scans/scan-1/photo');
  });
});
