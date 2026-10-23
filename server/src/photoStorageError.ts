export type PhotoStorageFailureCategory =
  | 'invalid_credentials'
  | 'authorization'
  | 'invalid_endpoint'
  | 'endpoint_not_found'
  | 'bucket_missing'
  | 'object_missing'
  | 'not_found'
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
