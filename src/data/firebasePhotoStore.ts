import { deleteObject, getBlob, ref } from 'firebase/storage';
import { deleteField, doc, getDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { firebaseAuth, firebaseStorage, firestore } from '../lib/firebase.js';
import { FirebasePhotoStoreError, firebasePhotoPath } from './firebasePhotoSync.js';

function requireOwner(scanId: string): { uid: string; path: string } {
  if (!firebaseAuth || !firebaseStorage || !firestore) {
    throw new FirebasePhotoStoreError('Account photo storage is not configured yet.', 'STORAGE_NOT_CONFIGURED', false);
  }
  const uid = firebaseAuth.currentUser?.uid;
  if (!uid) throw new FirebasePhotoStoreError('Sign in again before accessing this photo.', 'AUTH_REQUIRED', false);
  return { uid, path: firebasePhotoPath(uid, scanId) };
}

function errorCode(error: unknown): string {
  return typeof error === 'object' && error !== null && 'code' in error && typeof error.code === 'string'
    ? error.code
    : '';
}

function storageError(error: unknown, action: 'read' | 'delete'): FirebasePhotoStoreError {
  const code = errorCode(error);
  if (code === 'storage/object-not-found') {
    return new FirebasePhotoStoreError('The saved crop photo is no longer available.', 'PHOTO_NOT_FOUND', false);
  }
  if (code === 'storage/unauthenticated' || code === 'storage/unauthorized' || code === 'permission-denied') {
    return new FirebasePhotoStoreError('This photo is not available to this account. Sign in again and retry.', 'PHOTO_PERMISSION_DENIED', false);
  }
  if (code === 'storage/retry-limit-exceeded' || code === 'storage/canceled' || code === 'unavailable' || code === 'storage/unknown') {
    return new FirebasePhotoStoreError('Could not reach photo storage. Check your connection and retry.', 'PHOTO_NETWORK_ERROR', true);
  }
  const actionLabel = action === 'read' ? 'loaded' : 'deleted';
  return new FirebasePhotoStoreError(`The crop photo could not be ${actionLabel}. Check your connection and retry.`, 'PHOTO_STORAGE_FAILED', true);
}

export async function getFirebaseCropPhoto(input: { scanId: string; firebasePhotoPath: string }): Promise<Blob> {
  const { path } = requireOwner(input.scanId);
  if (input.firebasePhotoPath !== path) {
    throw new FirebasePhotoStoreError('This photo reference does not match the signed-in account.', 'PHOTO_REFERENCE_INVALID', false);
  }
  try {
    return await getBlob(ref(firebaseStorage!, path));
  } catch (error) {
    throw storageError(error, 'read');
  }
}

export async function deleteFirebaseCropPhoto(input: { scanId: string; firebasePhotoPath: string }): Promise<void> {
  const { uid, path } = requireOwner(input.scanId);
  if (input.firebasePhotoPath !== path) {
    throw new FirebasePhotoStoreError('This photo reference does not match the signed-in account.', 'PHOTO_REFERENCE_INVALID', false);
  }
  let objectMissing = false;
  try { await deleteObject(ref(firebaseStorage!, path)); }
  catch (error) {
    if (errorCode(error) === 'storage/object-not-found') objectMissing = true;
    else throw storageError(error, 'delete');
  }
  try {
    const scanRef = doc(firestore!, 'users', uid, 'scans', input.scanId);
    const scanSnapshot = await getDoc(scanRef);
    await updateDoc(doc(firestore!, 'users', uid, 'scans', input.scanId), {
      firebasePhotoPath: deleteField(),
      photoScope: scanSnapshot.data()?.cloudPhotoPath ? 'cloud' : 'local-only',
      updatedAt: serverTimestamp(),
    });
  } catch {
    throw new FirebasePhotoStoreError(objectMissing
      ? 'The photo was missing, but its scan link could not be updated. Retry cleanup.'
      : 'The photo was deleted, but the scan link could not be updated. Retry cleanup.', 'PHOTO_REFERENCE_SAVE_FAILED', true);
  }
}
