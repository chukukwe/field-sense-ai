import type { ScanItem } from '../types.js';

interface PhotoSources {
  local: (key: string) => Promise<Blob | undefined>;
  cloud: (scanId: string) => Promise<Blob | undefined>;
  firebase: (scanId: string, path: string) => Promise<Blob | undefined>;
}

/** A broken or unavailable device cache must not hide a valid account photo. */
export async function loadAssessmentPhoto(
  scan: Pick<ScanItem, 'id' | 'photoStorageKey' | 'cloudPhotoPath' | 'firebasePhotoPath'>,
  sources: PhotoSources,
): Promise<Blob | undefined> {
  const readers: Array<() => Promise<Blob | undefined>> = [];
  if (scan.photoStorageKey) readers.push(() => sources.local(scan.photoStorageKey!));
  if (scan.cloudPhotoPath) readers.push(() => sources.cloud(scan.id));
  if (scan.firebasePhotoPath) readers.push(() => sources.firebase(scan.id, scan.firebasePhotoPath!));
  let lastError: unknown;
  for (const read of readers) {
    try {
      const photo = await read();
      if (photo) return photo;
    } catch (error) { lastError = error; }
  }
  if (lastError) throw lastError;
  return undefined;
}
