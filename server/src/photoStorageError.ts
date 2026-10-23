export type PhotoStorageFailureCategory =
  | 'invalid_credentials'
  | 'authorization'
  | 'bucket_missing'
  | 'timeout'
  | 'network'
  | 'upstream'
  | 'request_rejected';

export class PhotoStorageError extends Error {
  constructor(
    public readonly category: PhotoStorageFailureCategory,
    public readonly httpStatus?: number,
  ) {
    super(category);
    this.name = 'PhotoStorageError';
  }
}
