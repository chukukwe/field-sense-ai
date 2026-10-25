export function canRequestAssessmentRetry<T extends {
  photoStorageKey?: string;
  firebasePhotoPath?: string;
  cloudPhotoPath?: string;
  dataScope?: string;
}>(
  scan: T | undefined,
  hasAuthenticatedUser: boolean,
  isRetrying: boolean,
): scan is T {
  // Local photos and both private cloud providers remain valid retry sources.
  // The endpoint verifies Firebase identity and ownership before assessment.
  return Boolean(scan && (scan.photoStorageKey || scan.firebasePhotoPath || scan.cloudPhotoPath)
    && hasAuthenticatedUser && !isRetrying);
}
