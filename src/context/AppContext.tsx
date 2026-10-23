import React, { useState, useEffect, useCallback } from 'react';
import { collection, deleteDoc, doc, getDoc, onSnapshot, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import type { CropAssessment, ScanItem, UserProfile } from '../types';
import { AppContext } from './AppContextStore';
import type { ScanDraft } from './AppContextStore';
import { useAuth } from './useAuth';
import { deleteScanPhoto, getScanPhoto, saveScanPhoto } from '../data/photoStore';
import { firebaseAuth, firestore } from '../lib/firebase';
import { CropPhotoRequestError, deleteCloudCropPhoto, getCloudCropPhoto } from '../data/photoApi';

const initialDraft: ScanDraft = {
  photoFile: null,
  photoPreviewUrl: null,
  photoSizeMb: 0,
  cropType: null,
  customCropName: '',
  observations: '',
};

/** Format a Date object as "14th Oct, 2026" */
function formatScanDate(d: Date): string {
  const day = d.getDate();
  const suffix =
    day % 100 >= 11 && day % 100 <= 13
      ? 'th'
      : ['th', 'st', 'nd', 'rd', 'th'][Math.min(day % 10, 4)];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${day}${suffix} ${months[d.getMonth()]}, ${d.getFullYear()}`;
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, fullName } = useAuth();
  const uid = user?.uid ?? '';
  const scansStorageKey = `fieldvoice_scans_${uid}`;
  const profileStorageKey = `fieldvoice_profile_${uid}`;
  const [scans, setScans] = useState<ScanItem[]>(() => {
    try { return JSON.parse(localStorage.getItem(`fieldvoice_scans_${uid}`) ?? '[]') as ScanItem[]; }
    catch { return []; }
  });

  const [userProfile, setUserProfile] = useState<UserProfile>(() => {
    try {
      const saved = localStorage.getItem(`fieldvoice_profile_${uid}`);
      if (saved) return JSON.parse(saved) as UserProfile;
    } catch { /* fall back to Firebase identity */ }
    const name = fullName || user?.displayName || user?.email?.split('@')[0] || 'Field Scout';
    return {
      name,
      email: user?.email ?? '',
      role: 'Smallholder Farmer & Field Scout',
      location: 'Eket Field Hub, Akwa Ibom',
      preferredLanguage: 'English (Default)',
      accentGuidance: true,
      avatarInitials: name.split(/\s+/).map((part) => part[0]).join('').toUpperCase().slice(0, 2),
      isDevData: false,
    };
  });

  const [isOffline, setIsOffline] = useState<boolean>(!navigator.onLine);
  const [offlineQueueCount, setOfflineQueueCount] = useState<number>(0);
  const [cachedStorageMb, setCachedStorageMb] = useState<number>(12.4);
  const [scanDraft, setScanDraft] = useState<ScanDraft>(initialDraft);
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [helpModalOpen, setHelpModalOpen] = useState<boolean>(false);
  const [storageModalOpen, setStorageModalOpen] = useState<boolean>(false);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (!uid) return;
    try { localStorage.setItem(scansStorageKey, JSON.stringify(scans)); } catch { /* local cache is best effort */ }
  }, [scans, scansStorageKey, uid]);

  useEffect(() => {
    if (!uid) return;
    try { localStorage.setItem(profileStorageKey, JSON.stringify(userProfile)); } catch { /* local cache is best effort */ }
  }, [userProfile, profileStorageKey, uid]);

  useEffect(() => {
    if (!uid || !firestore) return;
    const stopProfile = onSnapshot(doc(firestore, 'users', uid), (snapshot) => {
      const data = snapshot.data();
      if (!data) return;
      setUserProfile((previous) => ({
        ...previous,
        name: typeof data.fullName === 'string' ? data.fullName : previous.name,
        email: user?.email ?? previous.email,
        location: typeof data.location === 'string' ? data.location : previous.location,
        preferredLanguage: typeof data.preferredLanguage === 'string' ? data.preferredLanguage : previous.preferredLanguage,
        accentGuidance: typeof data.accentGuidance === 'boolean' ? data.accentGuidance : previous.accentGuidance,
        avatarInitials: (typeof data.fullName === 'string' ? data.fullName : previous.name).split(/\s+/).map((part: string) => part[0]).join('').toUpperCase().slice(0, 2),
        isDevData: false,
      }));
    });
    const stopScans = onSnapshot(collection(firestore, 'users', uid, 'scans'), (snapshot) => {
      const cloudScans = snapshot.docs.map((scanDoc) => ({ ...scanDoc.data(), id: scanDoc.id, dataScope: 'cloud' as const } as ScanItem));
      let localScans: ScanItem[] = [];
      try { localScans = JSON.parse(localStorage.getItem(scansStorageKey) ?? '[]') as ScanItem[]; } catch { /* ignore invalid local cache */ }
      const mergedCloudScans = cloudScans.map((cloudScan) => {
        const localScan = localScans.find((scan) => scan.id === cloudScan.id);
        if (!localScan) return cloudScan;
        return {
          ...localScan,
          ...cloudScan,
          // The storage key points to this device's original IndexedDB photo;
          // it must survive the server-created cloud metadata record.
          photoStorageKey: localScan.photoStorageKey ?? cloudScan.photoStorageKey,
          photoScope: cloudScan.photoScope ?? localScan.photoScope,
          assessmentFailure: localScan.assessmentFailure ?? cloudScan.assessmentFailure,
        };
      });
      const localOnlyScans = localScans.filter((scan) => scan.dataScope === 'local-only' && !cloudScans.some((cloudScan) => cloudScan.id === scan.id));
      setScans([...mergedCloudScans, ...localOnlyScans]);
    }, () => {
      // Continue with the account-scoped local cache when Firestore is unreachable.
    });
    return () => { stopProfile(); stopScans(); };
  }, [uid, user?.email, scansStorageKey]);

  const resetScanDraft = () => {
    setScanDraft(initialDraft);
  };

  const saveScan = useCallback(async (scan: ScanItem): Promise<'cloud' | 'local-only'> => {
    const savedScan: ScanItem = { ...scan, assessmentStatus: scan.assessmentStatus ?? 'unavailable' };
    const localScan: ScanItem = {
      ...savedScan,
      imageUrl: savedScan.imageUrl.startsWith('blob:') ? '' : savedScan.imageUrl,
      cloudPhotoPath: undefined,
      dataScope: 'local-only',
      footerStatus: 'Saved on this device only',
    };

    // Persist locally before any network request. The assessment API creates
    // the owner-scoped cloud record when it claims this scan. Awaiting a
    // Firestore setDoc here can block the scan indefinitely while offline,
    // and a delayed client write could overwrite a completed server result.
    try {
      const cached = JSON.parse(localStorage.getItem(scansStorageKey) ?? '[]') as ScanItem[];
      localStorage.setItem(scansStorageKey, JSON.stringify([localScan, ...cached.filter((item) => item.id !== scan.id)]));
    } catch { /* in-memory state still keeps the scan available */ }
    setScans((prev) => [localScan, ...prev.filter((item) => item.id !== scan.id)]);
    return 'local-only';
  }, [scansStorageKey]);

  const markPhotoStoredLocally = useCallback((scanId: string, photoStorageKey: string) => {
    setScans((previous) => previous.map((scan) => scan.id !== scanId ? scan : {
      ...scan,
      photoStorageKey,
      photoScope: scan.cloudPhotoPath ? 'cloud' : 'local-only',
    }));
  }, []);

  const markPhotoSynced = useCallback((scanId: string, cloudPhotoPath: string) => {
    setScans((previous) => previous.map((scan) => scan.id !== scanId ? scan : {
      ...scan,
      cloudPhotoPath,
      photoScope: 'cloud',
    }));
  }, []);

  const applyAssessment = useCallback((scanId: string, assessment: CropAssessment | undefined, status: NonNullable<ScanItem['assessmentStatus']>, summary?: string, failure?: ScanItem['assessmentFailure']) => {
    setScans((previous) => previous.map((scan) => scan.id !== scanId ? scan : {
      ...scan,
      ...(assessment ? { assessment } : {}),
      assessmentStatus: status,
      assessmentFailure: status === 'failed' ? failure : undefined,
      ...(summary ? { summary } : {}),
      footerIcon: status === 'completed' ? 'check' : status === 'inconclusive' || status === 'failed' || status === 'unavailable' ? 'alert' : 'clock',
      footerStatus: status === 'completed' ? 'Crop check ready'
        : status === 'inconclusive' ? 'Not sure yet'
          : status === 'processing' ? 'Checking crop'
            : status === 'pending' ? 'Ready to check'
              : status === 'unavailable' ? 'Crop check unavailable' : 'Could not check',
      footerActionLabel: status === 'failed' ? 'Try again' : 'See result',
    }));
  }, []);

  const markScanFailed = useCallback(async (scanId: string, summary: string, failure?: ScanItem['assessmentFailure']) => {
    // Keep UI recovery local and immediate. The backend owns cloud assessment
    // state; a queued client update could hang offline or overwrite a result
    // that completed after the browser stopped waiting.
    applyAssessment(scanId, undefined, 'failed', summary, failure);
  }, [applyAssessment]);

  const deleteScan = useCallback(async (id: string): Promise<boolean> => {
    const scan = scans.find((item) => item.id === id);
    if (!scan) return false;
    let localPhoto: Blob | undefined;
    try { if (scan.photoStorageKey) localPhoto = await getScanPhoto(scan.photoStorageKey); }
    catch { return false; }
    if (scan.cloudPhotoPath) {
      if (!user) return false;
      if (!localPhoto) {
        try { localPhoto = await getCloudCropPhoto({ scanId: scan.id, idToken: await user.getIdToken() }); }
        catch (error) {
          // A missing cloud object has nothing left to preserve. Other retrieval
          // failures stop deletion before any remote data is removed.
          if (!(error instanceof CropPhotoRequestError) || error.code !== 'PHOTO_NOT_FOUND') return false;
        }
      }
      try { await deleteCloudCropPhoto({ scanId: scan.id, idToken: await user.getIdToken() }); }
      catch { return false; }
    }

    try {
      if (scan.dataScope !== 'local-only') {
        if (!firestore || !uid) throw new Error('Firebase is unavailable.');
        await deleteDoc(doc(firestore, 'users', uid, 'scans', id));
      }
      if (scan.photoStorageKey) await deleteScanPhoto(scan.photoStorageKey).catch(() => undefined);
      setScans((prev) => prev.filter((s) => s.id !== id));
      return true;
    } catch {
      // If the database deletion failed after removing the local photo, restore
      // the photo when possible so the still-existing scan remains viewable.
      if (scan.photoStorageKey && localPhoto) {
        try { await saveScanPhoto(scan.photoStorageKey, localPhoto); } catch { /* report failure either way */ }
      } else if (scan.cloudPhotoPath && localPhoto) {
        const restoreKey = `${uid}/${scan.id}`;
        try {
          await saveScanPhoto(restoreKey, localPhoto);
          if (firestore && uid) await updateDoc(doc(firestore, 'users', uid, 'scans', id), {
            photoStorageKey: restoreKey,
            photoScope: 'local-only',
            updatedAt: serverTimestamp(),
          });
          setScans((previous) => previous.map((item) => item.id === id ? { ...item, photoStorageKey: restoreKey, cloudPhotoPath: undefined, photoScope: 'local-only' } : item));
        } catch { /* keep the operation reported as failed */ }
      }
      return false;
    }
  }, [scans, uid, user]);

  const clearCache = () => {
    setCachedStorageMb(0.8);
    setOfflineQueueCount(0);
  };

  const updateUserProfile = async (profile: Partial<UserProfile>): Promise<boolean> => {
    const next = { ...userProfile, ...profile, email: user?.email ?? userProfile.email, isDevData: false };
    const fullName = next.name.trim();
    try {
      if (!firestore || !uid || fullName.length < 2 || !next.email) return false;
      const profileRef = doc(firestore, 'users', uid);
      const existingSnapshot = await getDoc(profileRef);
      const existingProfile = existingSnapshot.data();
      const existingCreatedAt = existingProfile?.createdAt;

      await setDoc(profileRef, {
        fullName,
        email: typeof existingProfile?.email === 'string' ? existingProfile.email : next.email,
        role: typeof existingProfile?.role === 'string' ? existingProfile.role : next.role,
        location: next.location,
        preferredLanguage: next.preferredLanguage,
        accentGuidance: next.accentGuidance,
        ...(existingSnapshot.exists()
          ? existingCreatedAt !== undefined ? { createdAt: existingCreatedAt } : {}
          : { createdAt: serverTimestamp() }),
        updatedAt: serverTimestamp(),
      }, { merge: true });
      if (firebaseAuth?.currentUser && profile.name) await updateProfile(firebaseAuth.currentUser, { displayName: fullName });
      setUserProfile({ ...next, name: fullName });
      return true;
    } catch { return false; }
  };

  /**
   * Creates a pending ScanItem from the current draft (no AI result yet).
   * Saves it into the scan list so it appears in history immediately.
   * Returns the new ScanItem so the caller can navigate to its assessment route.
   */
  const createScanFromDraft = useCallback((): ScanItem => {
    const id = `scan-${Date.now()}`;
    const crop = scanDraft.cropType ?? 'Cassava';
    const cropName = crop === 'Other' ? scanDraft.customCropName.trim() : '';
    const previewUrl = scanDraft.photoPreviewUrl ?? '/assets/cassava-leaf-sample.png';

    const newScan: ScanItem = {
      id,
      title: `${cropName || crop} Leaf`,
      cropType: crop,
      ...(cropName ? { customCropName: cropName } : {}),
      date: formatScanDate(new Date()),
      status: 'Observation',
      statusVariant: 'amber',
      summary: 'No crop check yet.',
      footerIcon: 'clock',
      footerStatus: 'Checking crop…',
      footerActionLabel: 'See result',
      imageUrl: previewUrl,
      photoStorageKey: scanDraft.photoFile ? `${uid}/${id}` : undefined,
      assessmentStatus: 'pending',
      imageSizeMb: scanDraft.photoSizeMb || undefined,
      userObservations: scanDraft.observations || undefined,
    };

    return newScan;
  }, [scanDraft, uid]);

  return (
    <AppContext.Provider
      value={{
        scans,
        userProfile,
        isOffline,
        offlineQueueCount,
        cachedStorageMb,
        scanDraft,
        activeModal,
        helpModalOpen,
        storageModalOpen,
        setHelpModalOpen,
        setStorageModalOpen,
        setActiveModal,
        setIsOffline,
        setScanDraft,
        resetScanDraft,
        saveScan,
        markPhotoStoredLocally,
        markPhotoSynced,
        applyAssessment,
        markScanFailed,
        deleteScan,
        clearCache,
        updateUserProfile,
        createScanFromDraft,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};
