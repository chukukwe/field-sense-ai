import type { ScanItem } from '../types';

/** Browser object URLs belong to this page session, not the persisted cache. */
export function toCachedScan(scan: ScanItem): ScanItem {
  return scan.imageUrl.startsWith('blob:') ? { ...scan, imageUrl: '' } : scan;
}

export function mergeCloudScans(cloudScans: ScanItem[], currentScans: ScanItem[], cachedScans: ScanItem[]): ScanItem[] {
  const deviceScans = [...currentScans, ...cachedScans.filter((cached) => !currentScans.some((scan) => scan.id === cached.id))];
  const merged = cloudScans.map((cloudScan) => {
    const localScan = deviceScans.find((scan) => scan.id === cloudScan.id);
    if (!localScan) return cloudScan;
    return {
      ...localScan,
      ...cloudScan,
      // Keep the already selected image while server metadata arrives.
      imageUrl: localScan.imageUrl.startsWith('blob:') ? localScan.imageUrl : cloudScan.imageUrl,
      photoStorageKey: localScan.photoStorageKey ?? cloudScan.photoStorageKey,
      // Remote references remain authoritative, including when cleared.
      firebasePhotoPath: cloudScan.firebasePhotoPath,
      cloudPhotoPath: cloudScan.cloudPhotoPath,
      photoScope: cloudScan.photoScope ?? localScan.photoScope,
      assessmentFailure: localScan.assessmentFailure ?? cloudScan.assessmentFailure,
    };
  });
  return [...merged, ...deviceScans.filter((scan) => scan.dataScope === 'local-only' && !cloudScans.some((cloudScan) => cloudScan.id === scan.id))];
}
