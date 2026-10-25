import { getScanPhoto, saveScanPhoto } from './photoStore.js';

export class CropPhotoRequestError extends Error {
  readonly code: string;
  readonly retryable: boolean;

  constructor(message: string, code: string, retryable: boolean) {
    super(message);
    this.name = 'CropPhotoRequestError';
    this.code = code;
    this.retryable = retryable;
  }
}

const baseUrl = (import.meta.env?.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') ?? '';

export const PHOTO_REQUEST_TIMEOUT_MS = 60_000;

async function photoRequest<T>(
  scanId: string, idToken: string, init: RequestInit, fetcher: typeof fetch,
  readResponse: (response: Response) => Promise<T>,
): Promise<T> {
  const controller = new AbortController();
  const timeoutError = () => new CropPhotoRequestError(
    'The photo service took too long. Your scan is still available. Check your connection and retry.',
    'PHOTO_REQUEST_TIMEOUT', true,
  );
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(timeoutError());
    }, PHOTO_REQUEST_TIMEOUT_MS);
  });
  const request = async () => {
    try {
      const response = await fetcher(`${baseUrl}/api/scans/${encodeURIComponent(scanId)}/photo`, {
        ...init,
        headers: { Authorization: `Bearer ${idToken}`, ...init.headers },
        signal: controller.signal,
      });
      if (!response.ok) {
        const body: unknown = await response.json().catch(() => null);
        const error = typeof body === 'object' && body !== null && 'error' in body ? body.error : null;
        const message = typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string'
          ? error.message : 'The crop photo request failed. Check your connection and retry.';
        const code = typeof error === 'object' && error !== null && 'code' in error && typeof error.code === 'string' ? error.code : 'PHOTO_REQUEST_FAILED';
        const retryable = typeof error === 'object' && error !== null && 'retryable' in error && error.retryable === true;
        throw new CropPhotoRequestError(message, code, retryable);
      }
      return await readResponse(response);
    } catch (error) {
      if (controller.signal.aborted) throw timeoutError();
      if (error instanceof CropPhotoRequestError) throw error;
      throw new CropPhotoRequestError('Could not reach the photo service. Check your connection and retry.', 'NETWORK_ERROR', true);
    }
  };
  try {
    return await Promise.race([request(), deadline]);
  } finally {
    clearTimeout(timer);
  }
}

export async function uploadCropPhoto(input: { scanId: string; image: Blob; idToken: string }, fetcher: typeof fetch = fetch): Promise<string> {
  const form = new FormData();
  form.append('image', input.image, 'crop-photo');
  return photoRequest(input.scanId, input.idToken, { method: 'POST', body: form }, fetcher, async (response) => {
    const body: unknown = await response.json().catch(() => null);
    if (typeof body !== 'object' || body === null || !('cloudPhotoPath' in body) || typeof body.cloudPhotoPath !== 'string' || !body.cloudPhotoPath) {
      throw new CropPhotoRequestError('The photo service did not confirm that the photo was saved. Retry the upload.', 'INVALID_RESPONSE', true);
    }
    return body.cloudPhotoPath;
  });
}

export async function uploadLocalScanPhoto(input: {
  scanId: string;
  photoStorageKey: string;
  idToken: string;
  replacement?: Blob;
}, storage = { get: getScanPhoto, save: saveScanPhoto }, fetcher: typeof fetch = fetch): Promise<string> {
  if (input.replacement) await storage.save(input.photoStorageKey, input.replacement);
  const image = input.replacement ?? await storage.get(input.photoStorageKey);
  if (!image) throw new CropPhotoRequestError('The original photo is not available on this device. Choose the original file to restore it.', 'LEGACY_PHOTO_MISSING', false);
  return uploadCropPhoto({ scanId: input.scanId, image, idToken: input.idToken }, fetcher);
}

export async function getCloudCropPhoto(input: { scanId: string; idToken: string }, fetcher: typeof fetch = fetch): Promise<Blob> {
  return photoRequest(input.scanId, input.idToken, { method: 'GET', cache: 'no-store' }, fetcher, (response) => response.blob());
}

export async function deleteCloudCropPhoto(input: { scanId: string; idToken: string }, fetcher: typeof fetch = fetch): Promise<void> {
  await photoRequest(input.scanId, input.idToken, { method: 'DELETE' }, fetcher, async () => undefined);
}
