/**
 * Cloud photo storage is intentionally unavailable for this MVP configuration.
 * Keep the helper interface for callers that may still reference legacy paths,
 * but fail closed before any Firebase Storage SDK request can be made.
 */
const storageUnavailable = () => new Error('Cloud photo storage is unavailable. Photos remain on this device.');

export async function uploadCloudScanPhoto(_uid: string, _scanId: string, _image: File): Promise<string> {
  throw storageUnavailable();
}

export async function getCloudScanPhoto(_path: string): Promise<Blob> {
  throw storageUnavailable();
}

export async function deleteCloudScanPhoto(_path: string): Promise<void> {
  throw storageUnavailable();
}
