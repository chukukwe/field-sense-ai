import type { CropAssessment, ScanItem } from '../types.js';

/** A late transport failure must not erase a result received through Firestore. */
export function updateScanAssessment(
  scan: ScanItem,
  assessment: CropAssessment | undefined,
  status: NonNullable<ScanItem['assessmentStatus']>,
  summary?: string,
  failure?: ScanItem['assessmentFailure'],
): ScanItem {
  if (!assessment && scan.assessment
    && (scan.assessmentStatus === 'completed' || scan.assessmentStatus === 'inconclusive')) return scan;
  return {
    ...scan,
    ...(assessment ? { assessment } : {}),
    assessmentStatus: status,
    assessmentFailure: status === 'failed' ? failure : undefined,
    ...(summary ? { summary } : {}),
    footerIcon: status === 'completed' ? 'check'
      : status === 'inconclusive' || status === 'failed' || status === 'unavailable' ? 'alert' : 'clock',
    footerStatus: status === 'completed' ? 'Crop check ready'
      : status === 'inconclusive' ? 'Not sure yet'
        : status === 'processing' ? 'Checking crop'
          : status === 'pending' ? 'Ready to check'
            : status === 'unavailable' ? 'Crop check unavailable' : 'Could not check',
    footerActionLabel: status === 'failed' ? 'Try again' : 'See result',
  };
}
