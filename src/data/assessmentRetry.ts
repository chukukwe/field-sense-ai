export function canRequestAssessmentRetry<T extends { photoStorageKey?: string; dataScope?: string }>(
  scan: T | undefined,
  hasAuthenticatedUser: boolean,
  isRetrying: boolean,
): scan is T & { photoStorageKey: string } {
  // Local-only scans are valid retry candidates too. The assessment endpoint
  // verifies Firebase identity and scan ownership before accepting the request.
  return Boolean(scan?.photoStorageKey && hasAuthenticatedUser && !isRetrying);
}
