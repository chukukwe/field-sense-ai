/** Minimal server-only Supabase Storage REST adapter. No Supabase secret is sent to the browser. */
import { PhotoStorageError } from './photoStorageError.js';

export interface SupabasePhotoStoreConfig {
  url: string;
  apiKey: string;
  legacyServiceRoleKey?: boolean;
  bucket: string;
  fetcher?: typeof fetch;
}

type NotFoundCategory = 'bucket_missing' | 'object_missing' | 'endpoint_not_found' | 'not_found';

function projectRoot(url: string): string {
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol) || !parsed.hostname
      || parsed.username || parsed.password || (parsed.pathname !== '' && parsed.pathname !== '/')
      || parsed.search || parsed.hash) {
      throw new Error('invalid endpoint');
    }
    return parsed.origin;
  } catch {
    throw new PhotoStorageError('invalid_endpoint');
  }
}

async function classifyNotFound(response: Response): Promise<NotFoundCategory> {
  const contentType = response.headers.get('content-type')?.toLowerCase() ?? '';
  let payload: unknown;
  try { payload = await response.clone().json(); } catch { payload = undefined; }

  if (typeof payload === 'object' && payload !== null) {
    const fields = payload as Record<string, unknown>;
    const signals = [fields.code, fields.error, fields.message, fields.statusCode]
      .filter((value): value is string => typeof value === 'string')
      .join(' ')
      .toLowerCase();
    if (/bucket[ _-]?not[ _-]?found|bucketnotfound/.test(signals)) return 'bucket_missing';
    if (/object[ _-]?not[ _-]?found|objectnotfound/.test(signals)) return 'object_missing';
    if (/cannot\s+(get|post|put|delete|head)\s+\/|(?:route|endpoint|requested path).*not found|pgrst\d+/.test(signals)) {
      return 'endpoint_not_found';
    }
  }

  // Storage errors are JSON. An HTML 404 indicates the request likely reached
  // a web/router endpoint instead of the Storage API; the body is never logged.
  if (contentType.includes('text/html')) return 'endpoint_not_found';
  return 'not_found';
}

export function createSupabasePhotoStore(config: SupabasePhotoStoreConfig) {
  const root = projectRoot(config.url);
  const fetcher = config.fetcher ?? fetch;
  // Existing installations may keep a legacy JWT in SUPABASE_SECRET_KEY, or
  // migrate the value before renaming SUPABASE_SERVICE_ROLE_KEY. The actual
  // credential format determines whether Storage also needs bearer auth.
  const useLegacyBearer = !config.apiKey.startsWith('sb_')
    && (config.legacyServiceRoleKey === true || /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(config.apiKey));
  const objectUrl = (path: string) => `${root}/storage/v1/object/${encodeURIComponent(config.bucket)}/${path.split('/').map(encodeURIComponent).join('/')}`;
  const headers = (extra?: HeadersInit) => {
    const result = new Headers(extra);
    result.set('apikey', config.apiKey);
    // New sb_secret keys belong only in apikey. Legacy service_role JWTs are also
    // sent as a bearer token so Supabase resolves the service_role authorization.
    if (useLegacyBearer) result.set('Authorization', `Bearer ${config.apiKey}`);
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
    if (response.status === 404) {
      const category = await classifyNotFound(response);
      if (category === 'object_missing' && (operation === 'download' || operation === 'delete')) return response;
      throw new PhotoStorageError(category, response.status);
    }
    if (response.status === 400) {
      // Storage can report a malformed key as HTTP 400 rather than 401.
      // Inspect only recognized signals and never retain or log its payload.
      const body: unknown = await response.clone().json().catch(() => null);
      if (typeof body === 'object' && body !== null) {
        const fields = body as Record<string, unknown>;
        const code = typeof fields.code === 'string' ? fields.code : '';
        const message = typeof fields.message === 'string' ? fields.message : '';
        if (code === 'InvalidJWT'
          || /jws protected header is invalid|invalid jwt|headers must have required property ['"]authorization['"]/i.test(message)) {
          throw new PhotoStorageError('invalid_credentials', response.status);
        }
      }
    }
    const category = response.status === 401 ? 'invalid_credentials'
      : response.status === 403 ? 'authorization'
        : response.status >= 500 ? 'upstream' : 'request_rejected';
    throw new PhotoStorageError(category, response.status);
  };

  return {
    async upload(path: string, image: Buffer, contentType: string, options: { upsert: boolean }): Promise<{ created: boolean }> {
      await request(objectUrl(path), { method: 'POST', headers: headers({ 'Content-Type': contentType, 'x-upsert': String(options.upsert), 'Cache-Control': 'private, max-age=0, no-store' }), body: new Uint8Array(image) }, 'upload');
      // A successful create-only request proves this call created the object.
      // Upsert requests may replace an existing object, so they are never rollback candidates.
      return { created: !options.upsert };
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
