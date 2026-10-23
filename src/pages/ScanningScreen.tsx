import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Repeat, Trash2, Radio } from 'lucide-react';
import { TopHeader } from '../components/common/TopHeader';
import { useApp } from '../context/useApp';
import { getScanPhoto, saveScanPhoto } from '../data/photoStore';
import { AssessmentRequestError, requestCropAssessment } from '../data/assessmentApi';
import { useAssessmentProgress } from '../hooks/useAssessmentProgress';
import { AssessmentProgressIndicator } from '../components/common/AssessmentProgressIndicator';
import { useAuth } from '../context/useAuth';
import { uploadCropPhoto } from '../data/photoApi';

export const ScanningScreen: React.FC = () => {
  const navigate = useNavigate();
  const { scanDraft, createScanFromDraft, saveScan, markPhotoSynced, applyAssessment, markScanFailed } = useApp();
  const { user } = useAuth();
  const scanProcessRef = useRef<Promise<string> | null>(null);
  const {
    progress,
    message: progressMessage,
    start: startProgress,
    resume: resumeProgress,
    setPhase: setProgressPhase,
    stop: stopProgress,
    complete: completeProgress,
  } = useAssessmentProgress();

  const [laserPos, setLaserPos] = useState<number>(20);

  // Animate the laser scanning bar
  useEffect(() => {
    let direction = 1;
    const laserInterval = setInterval(() => {
      setLaserPos((prev) => {
        if (prev >= 82) direction = -1;
        if (prev <= 12) direction = 1;
        return prev + direction * 1.8;
      });
    }, 40);
    return () => clearInterval(laserInterval);
  }, []);

  // Keep the original photo on this device, save scan metadata, and allow the
  // authenticated backend to register local-only metadata during assessment.
  useEffect(() => {
    let active = true;
    // Strict Mode replays this effect after the hook's cleanup clears its
    // interval. Resume the estimate without starting a second scan request.
    resumeProgress();
    if (!scanProcessRef.current) {
      startProgress();
      scanProcessRef.current = (async () => {
        const scan = createScanFromDraft();
        try {
          let photoSaved = false;
          if (scanDraft.photoFile && scan.photoStorageKey) {
            try {
              await saveScanPhoto(scan.photoStorageKey, scanDraft.photoFile);
              photoSaved = true;
            } catch {
              // Keep the scan metadata so the user can review the failed scan.
            }
          }

          await saveScan({
            ...scan,
            photoScope: photoSaved ? 'local-only' : 'missing',
            status: 'Observation',
            statusVariant: 'amber',
            summary: 'Your scan is saved. An AI result has not been generated yet.',
            footerIcon: 'clock',
            assessmentStatus: 'pending',
            footerStatus: 'Assessment pending',
            footerActionLabel: 'View assessment',
          });

          if (!photoSaved || !scan.photoStorageKey) {
            stopProgress();
            await markScanFailed(scan.id, 'The photo could not be saved on this device, so no assessment was requested.');
          } else if (!scanDraft.cropType) {
            stopProgress();
            await markScanFailed(scan.id, 'Choose a crop type before requesting an assessment.');
          } else {
            let localPhoto: Blob | undefined;
            let idToken = '';
            try {
              localPhoto = await getScanPhoto(scan.photoStorageKey);
              if (!localPhoto) throw new Error('The saved photo could not be read from this device.');
              if (!user) throw new Error('Sign in again before requesting an assessment.');
              idToken = await user.getIdToken();
            } catch (error) {
              const message = error instanceof Error
                ? error.message
                : 'The photo could not be read from this device.';
              stopProgress();
              await markScanFailed(scan.id, message);
            }

            if (localPhoto && user && idToken) {
              try {
                setProgressPhase('uploading');
                const assessment = await requestCropAssessment({
                  image: localPhoto,
                  cropType: scanDraft.cropType,
                  customCropName: scanDraft.cropType === 'Other' ? scanDraft.customCropName.trim() : undefined,
                  observations: scanDraft.observations,
                  scanId: scan.id,
                  idToken,
                });
                applyAssessment(scan.id, assessment, assessment.status, assessment.summary);
                await completeProgress();
              } catch (error) {
                stopProgress();
                const failure = error instanceof AssessmentRequestError && error.status !== undefined
                  ? { code: error.code, status: error.status }
                  : undefined;
                await markScanFailed(scan.id, error instanceof Error ? error.message : 'The assessment could not be completed. You can retry this scan.', failure);
              }

              // The assessment request creates the authenticated user's scan
              // record when the initial client-side Firestore save was offline.
              // Sync the same local photo only after that record exists.
              try {
                const cloudPhotoPath = await uploadCropPhoto({ scanId: scan.id, image: localPhoto, idToken });
                markPhotoSynced(scan.id, cloudPhotoPath);
              }
              catch { /* The local image remains available; Scan Details retries sync when reopened. */ }
            }
          }
        } catch {
          stopProgress();
          await markScanFailed(scan.id, 'The scan could not be completed. You can retry this scan from your scan history.');
        } finally {
          stopProgress();
        }

        return scan.id;
      })();
    }

    // React Strict Mode replays effects in development. Reuse the same scan
    // operation, but let the currently mounted effect handle navigation.
    void scanProcessRef.current.then((scanId) => {
      if (active) navigate(`/assessment/${scanId}`);
    });
    return () => { active = false; };
  }, [navigate, scanDraft.photoFile, scanDraft.cropType, scanDraft.customCropName, scanDraft.observations, createScanFromDraft, saveScan, markPhotoSynced, applyAssessment, markScanFailed, user, startProgress, resumeProgress, setProgressPhase, completeProgress, stopProgress]);

  const previewImage = scanDraft.photoPreviewUrl || '/assets/cassava-leaf-sample.png';
  const cropLabel = scanDraft.cropType || 'Cassava';

  return (
    <div className="flex flex-col gap-4 pb-4">
      <TopHeader
        variant="page"
        title="Checking your crop"
        subtitle="Getting your crop photo ready."
      />

      <div className="px-4 flex flex-col gap-4">
        {/* Photo Container with scan preparation animation */}
        <div className="bg-[#1F2B25] border border-dashed border-[#176B45] rounded-2xl p-4 flex flex-col gap-3">
          <div className="relative rounded-xl overflow-hidden bg-black aspect-square w-full select-none">
            <img
              src={previewImage}
              alt="Scanning leaf"
              className="w-full h-full object-cover opacity-90"
            />

            {/* Top Status Pills */}
            <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-10 pointer-events-none gap-2">
              <span className="bg-black/70 backdrop-blur-md text-white text-[11px] px-2.5 py-1 rounded-full font-medium flex items-center gap-1.5 border border-white/10 shrink-0">
                <span className="w-2 h-2 rounded-full bg-[#22C55E] animate-pulse shrink-0" />
                Crop analysis
              </span>
            </div>

            {/* Animated Laser Line */}
            <div
              className="absolute left-0 right-0 z-10 pointer-events-none"
              style={{ top: `${laserPos}%` }}
            >
              <div className="h-[2px] w-full bg-[#FF8A32] shadow-[0_0_8px_2px_rgba(255,138,50,0.6)]" />
              {/* Glow spread */}
              <div className="h-[8px] w-full bg-gradient-to-b from-[#FF8A32]/30 to-transparent -mt-[1px]" />
            </div>

          </div>

          <AssessmentProgressIndicator progress={progress} message={progressMessage} />

          {/* Replace / Remove (disabled while scanning) */}
          <div className="flex flex-col gap-2 pointer-events-none opacity-40">
            <div className="w-full bg-[#292C2A] text-white py-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2">
              <Repeat className="w-4 h-4 text-gray-300" />
              <span>Replace Photo</span>
            </div>
            <div className="w-full bg-[#2E2020] text-[#E04141] py-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2">
              <Trash2 className="w-4 h-4" />
              <span>Remove</span>
            </div>
          </div>
        </div>

        {/* Crop Selection (frozen / showing selected) */}
        <div className="bg-[#292C2A] rounded-2xl p-4 border border-[#323633] pointer-events-none opacity-60">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-bold text-white">
              What crop is affected? <span className="text-[#E04141]">*</span>
            </h3>
            <span className="text-xs font-semibold text-[#FF8A32]">One crop</span>
          </div>
          <p className="text-[11px] text-[#8F9490] mb-3">
            Checking the crop you selected.
          </p>
          <div className="grid grid-cols-2 gap-2.5">
            <div className="p-3 rounded-xl bg-[#174D38] border border-[#22C55E] text-white">
              <p className="text-xs font-bold text-white">{cropLabel}</p>
              <p className="text-[10px] text-white/70 mt-0.5">Akpu / Iwa</p>
            </div>
            <div className="p-3 rounded-xl bg-[#202321] text-[#8F9490]">
              <p className="text-xs font-bold">Plantain</p>
              <p className="text-[10px] mt-0.5">Banana family</p>
            </div>
            <div className="p-3 rounded-xl bg-[#202321] text-[#8F9490]">
              <p className="text-xs font-bold">Maize</p>
              <p className="text-[10px] mt-0.5">Corn / Ibokpot</p>
            </div>
            <div className="p-3 rounded-xl bg-[#202321] text-[#8F9490]">
              <p className="text-xs font-bold">Vegetables</p>
              <p className="text-[10px] mt-0.5">Ugwu / Waterleaf</p>
            </div>
          </div>
        </div>

        {/* Observations (frozen) */}
        <div className="bg-[#292C2A] rounded-2xl p-4 border border-[#323633] pointer-events-none opacity-60">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-bold text-white">What have you noticed?</h3>
            <span className="text-xs font-semibold text-[#FF8A32]">Optional</span>
          </div>
          <div className="bg-[#181B19] text-xs text-[#8F9490] p-3.5 rounded-xl min-h-[72px] leading-relaxed">
            {scanDraft.observations || "Describe the changes you've seen on the plant\u2026"}
          </div>
          <div className="flex items-center gap-2 mt-2.5 text-[11px] text-[#8F9490]">
            <Radio className="w-3.5 h-3.5 shrink-0" />
            <span>Voice recognition: Eket / Pidgin / English</span>
          </div>
        </div>

        {/* Analyze Button (disabled while scanning) */}
        <button
          disabled
          className="w-full bg-[#1B382B] text-gray-500 font-semibold text-sm py-3.5 rounded-xl cursor-not-allowed"
        >
          Analyzing Crop…
        </button>
        <p className="text-[11px] text-[#8F9490] text-center -mt-2">
          The result may be wrong. Ask a local farm adviser if you are unsure.
        </p>
      </div>
    </div>
  );
};
