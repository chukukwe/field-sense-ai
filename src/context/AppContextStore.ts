import { createContext } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { CropAssessment, CropType, ScanItem, UserProfile } from '../types';

export interface ScanDraft {
  photoFile: File | null;
  photoPreviewUrl: string | null;
  photoSizeMb: number;
  cropType: CropType | null;
  customCropName: string;
  observations: string;
}

export interface AppContextType {
  scans: ScanItem[];
  userProfile: UserProfile;
  isOffline: boolean;
  offlineQueueCount: number;
  cachedStorageMb: number;
  scanDraft: ScanDraft;
  activeModal: string | null;
  helpModalOpen: boolean;
  storageModalOpen: boolean;
  setHelpModalOpen: (open: boolean) => void;
  setStorageModalOpen: (open: boolean) => void;
  setActiveModal: (modalId: string | null) => void;
  setIsOffline: (offline: boolean) => void;
  setScanDraft: Dispatch<SetStateAction<ScanDraft>>;
  resetScanDraft: () => void;
  saveScan: (scan: ScanItem) => Promise<'cloud' | 'local-only'>;
  markPhotoStoredLocally: (scanId: string, photoStorageKey: string) => void;
  markPhotoSynced: (scanId: string, cloudPhotoPath: string) => void;
  applyAssessment: (scanId: string, assessment: CropAssessment | undefined, status: NonNullable<ScanItem['assessmentStatus']>, summary?: string, failure?: ScanItem['assessmentFailure']) => void;
  markScanFailed: (scanId: string, summary: string, failure?: ScanItem['assessmentFailure']) => Promise<void>;
  deleteScan: (id: string) => Promise<boolean>;
  clearCache: () => void;
  updateUserProfile: (profile: Partial<UserProfile>) => Promise<boolean>;
  createScanFromDraft: () => ScanItem;
}

export const AppContext = createContext<AppContextType | undefined>(undefined);
