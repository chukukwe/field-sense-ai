import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { FirebasePhotoStoreError, firebasePhotoPath } from '../../src/data/firebasePhotoSync.js';

describe('legacy Firebase photo reference compatibility', () => {
  it('recognizes only the expected owner-scoped path for an existing migration reference', () => {
    assert.equal(firebasePhotoPath('farmer-a', 'scan_123-4'), 'users/farmer-a/scans/scan_123-4/crop-photo');
    assert.notEqual(firebasePhotoPath('farmer-a', 'scan_123-4'), 'users/farmer-a/scans/scan_123-4/photo');
  });

  it('rejects malformed owner and scan identifiers before accessing legacy storage', () => {
    assert.throws(() => firebasePhotoPath('farmer/a', 'scan-1'), (error: unknown) =>
      error instanceof FirebasePhotoStoreError && error.code === 'AUTH_REQUIRED');
    assert.throws(() => firebasePhotoPath('farmer-a', '../other'), (error: unknown) =>
      error instanceof FirebasePhotoStoreError && error.code === 'INVALID_SCAN_ID');
  });
});
