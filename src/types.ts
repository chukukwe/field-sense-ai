import type { CropAssessment, CropType } from '../shared/cropAssessment.js';

export type { CropAssessment, CropType } from '../shared/cropAssessment.js';

export type ScanStatusType = 'Possible Cause' | 'Observation' | 'Pest Detected';

export interface ScanItem {
  id: string;
  title: string;
  cropType: CropType;
  date: string;
  status: ScanStatusType;
  statusVariant: 'red' | 'amber' | 'green';
  summary: string;
  footerIcon: 'clock' | 'speaker' | 'check' | 'alert';
  footerStatus: string;
  footerActionLabel: string;
  imageUrl: string;
  photoStorageKey?: string;
  cloudPhotoPath?: string;
  photoScope?: 'cloud' | 'local-only' | 'missing';
  dataScope?: 'cloud' | 'local-only';
  assessmentStatus?: 'pending' | 'processing' | 'completed' | 'inconclusive' | 'unavailable' | 'failed';
  assessment?: CropAssessment;
  processingStartedAt?: { toDate: () => Date } | Date | string;
  imageSizeMb?: number;
  userObservations?: string;
  voiceNoteDuration?: string;
  voiceNoteLanguage?: string;
  audioUrl?: string;
  diagnosis?: {
    category: 'single' | 'multiple' | 'unidentified' | 'unclear';
    title: string;
    badgeLabel: string;
    badgeVariant: 'green' | 'amber' | 'red';
    observedOnLeaf: string;
    primaryPossibleCause?: string;
    whyItMatters?: string;
    candidates?: Array<{
      id: number;
      name: string;
      probability: string;
      description: string;
      vectorOrDetail: string;
    }>;
    steps: Array<{
      stepNumber: number;
      title: string;
      instruction: string;
    }>;
    expertGuidance?: string;
  };
}

export interface UserProfile {
  name: string;
  email: string;
  role: string;
  location: string;
  preferredLanguage: string;
  accentGuidance: boolean;
  avatarInitials: string;
  isDevData: boolean;
}
