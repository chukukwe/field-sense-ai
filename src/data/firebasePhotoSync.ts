export class FirebasePhotoStoreError extends Error {
  readonly code: string;
  readonly retryable: boolean;

  constructor(message: string, code: string, retryable: boolean) {
    super(message);
    this.name = 'FirebasePhotoStoreError';
    this.code = code;
    this.retryable = retryable;
  }
}

export function firebasePhotoPath(uid: string, scanId: string): string {
  if (!uid || uid.includes('/') || uid === '.' || uid === '..') {
    throw new FirebasePhotoStoreError('Sign in again before accessing this photo.', 'AUTH_REQUIRED', false);
  }
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(scanId)) {
    throw new FirebasePhotoStoreError('This scan could not be identified. Open it again and retry.', 'INVALID_SCAN_ID', false);
  }
  return `users/${uid}/scans/${scanId}/crop-photo`;
}
