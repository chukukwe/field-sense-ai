/** Minimal server-only Supabase Storage REST adapter. No Supabase secret is sent to the browser. */
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

  return {
    async upload(path: string, image: Buffer, contentType: string): Promise<void> {
      const response = await fetcher(objectUrl(path), { method: 'PUT', headers: headers({ 'Content-Type': contentType, 'x-upsert': 'true', 'Cache-Control': 'private, max-age=0, no-store' }), body: new Uint8Array(image) });
      if (!response.ok) throw new Error('Supabase photo upload failed.');
    },
    async download(path: string): Promise<{ bytes: Buffer; contentType: string } | null> {
      const response = await fetcher(objectUrl(path), { headers: headers(), cache: 'no-store' });
      if (response.status === 404) return null;
      if (!response.ok) throw new Error('Supabase photo download failed.');
      return { bytes: Buffer.from(await response.arrayBuffer()), contentType: response.headers.get('content-type') ?? 'application/octet-stream' };
    },
    async remove(path: string): Promise<void> {
      const response = await fetcher(objectUrl(path), { method: 'DELETE', headers: headers() });
      if (!response.ok && response.status !== 404) throw new Error('Supabase photo deletion failed.');
    },
  };
}
