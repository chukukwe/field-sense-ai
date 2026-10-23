/** Minimal server-only Supabase Storage REST adapter. No Supabase secret is sent to the browser. */
import { PhotoStorageError } from './photoStorageError.js';

export interface SupabasePhotoStoreConfig {
  url: string;
  apiKey: string;
  legacyServiceRoleKey?: boolean;
  bucket: string;
  fetcher?: typeof fetch;
}

export function createSupabasePhotoStore(config: SupabasePhotoStoreConfig) {
  const root = config.url.replace(/\/$/, '');
  const fetcher = config.fetcher ?? fetch;
  const objectUrl = (path: string) => `${root}/storage/v1/object/${encodeURIComponent(config.bucket)}/${path.split('/').map(encodeURIComponent).join('/')}`;
  const headers = (extra?: HeadersInit) => {
    const result = new Headers(extra);
    result.set('apikey', config.apiKey);
    // New sb_secret keys belong only in apikey. Legacy service_role JWTs are also
    // sent as a bearer token so Supabase resolves the service_role authorization.
    if (config.legacyServiceRoleKey) result.set('Authorization', `Bearer ${config.apiKey}`);
    return result;
  };
  const request = async (url: string, init: RequestInit, operation: 'upload' | 'download' | 'delete') => {
    let response: Response;
    try {
      response = await fetcher(url, { ...init, signal: AbortSignal.timeout(25_000) });
    } catch (error) {
      throw new PhotoStorageError(error instanceof Error && error.name === 'TimeoutError' ? 'timeout' : 'network');
    }
    if (response.ok) return response;
    if (operation === 'download' && response.status === 404) return response;
    if (operation === 'delete' && response.status === 404) return response;
    const category = response.status === 401 ? 'invalid_credentials'
      : response.status === 403 ? 'authorization'
        : operation === 'upload' && response.status === 404 ? 'bucket_missing'
          : response.status >= 500 ? 'upstream' : 'request_rejected';
    throw new PhotoStorageError(category, response.status);
  };

  return {
    async upload(path: string, image: Buffer, contentType: string): Promise<void> {
      await request(objectUrl(path), { method: 'PUT', headers: headers({ 'Content-Type': contentType, 'x-upsert': 'true', 'Cache-Control': 'private, max-age=0, no-store' }), body: new Uint8Array(image) }, 'upload');
    },
    async download(path: string): Promise<{ bytes: Buffer; contentType: string } | null> {
      const response = await request(objectUrl(path), { headers: headers(), cache: 'no-store' }, 'download');
      if (response.status === 404) return null;
      return { bytes: Buffer.from(await response.arrayBuffer()), contentType: response.headers.get('content-type') ?? 'application/octet-stream' };
    },
    async remove(path: string): Promise<void> {
      await request(objectUrl(path), { method: 'DELETE', headers: headers() }, 'delete');
    },
  };
}
