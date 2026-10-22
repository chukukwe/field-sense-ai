import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Repeat, Trash2, Radio } from 'lucide-react';
import { TopHeader } from '../components/common/TopHeader';
import { useApp } from '../context/useApp';
import { getScanPhoto, saveScanPhoto } from '../data/photoStore';
import { requestCropAssessment } from '../data/assessmentApi';
import { useAuth } from '../context/useAuth';
import { uploadCropPhoto } from '../data/photoApi';

const SCANNING_STEPS = [
  'Preparing your photo…',
  'Saving crop and observation details…',
  'Keeping your scan on this device…',
  'Sending your photo for assessment…',
  'Opening your saved scan…',
];

export const ScanningScreen: React.FC = () => {
  const navigate = useNavigate();
  const { scanDraft, createScanFromDraft, saveScan, applyAssessment, markScanFailed } = useApp();
  const { user } = useAuth();
  const hasSubmitted = useRef(false);

  const [laserPos, setLaserPos] = useState<number>(20);
  const [stepIndex, setStepIndex] = useState<number>(0);
  const [dots, setDots] = useState<string>('');

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

  // Cycle through scanning status messages
  useEffect(() => {
    const stepInterval = setInterval(() => {
      setStepIndex((prev) => (prev < SCANNING_STEPS.length - 1 ? prev + 1 : prev));
    }, 650);
    return () => clearInterval(stepInterval);
  }, []);

  // Animate trailing dots
  useEffect(() => {
    const dotsInterval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? '' : prev + '.'));
    }, 400);
    return () => clearInterval(dotsInterval);
  }, []);

  // Save the photo locally and the scan metadata before requesting Gemini.
  // The API receives the locally stored Blob; no cloud photo store is used.
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (hasSubmitted.current) return;
      hasSubmitted.current = true;
      const scan = createScanFromDraft();
      let photoSaved = false;
      if (scanDraft.photoFile && scan.photoStorageKey) {
        try {
          await saveScanPhoto(scan.photoStorageKey, scanDraft.photoFile);
          photoSaved = true;
        } catch {
          // Keep metadata so the failure is visible and the scan can be reviewed.
        }
      }

      const metadataResult = await saveScan({
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
        await markScanFailed(scan.id, 'The photo could not be saved on this device, so no assessment was requested.');
      } else if (metadataResult !== 'cloud') {
        applyAssessment(scan.id, undefined, 'unavailable', 'This scan is saved on this device only. Sign in with a working connection so its metadata can be verified before analysis.');
      } else if (!scanDraft.cropType) {
        await markScanFailed(scan.id, 'Choose a crop type before requesting an assessment.');
      } else {
        let localPhoto: Blob | undefined;
        try {
          localPhoto = await getScanPhoto(scan.photoStorageKey);
          if (!localPhoto) throw new Error('The saved photo could not be read from this device.');
          if (!user) throw new Error('Sign in again before requesting an assessment.');
          const assessment = await requestCropAssessment({
            image: localPhoto,
            cropType: scanDraft.cropType,
            observations: scanDraft.observations,
            scanId: scan.id,
            idToken: await user.getIdToken(),
          });
          applyAssessment(scan.id, assessment, assessment.status, assessment.summary);
        } catch (error) {
          await markScanFailed(scan.id, error instanceof Error ? error.message : 'The assessment could not be completed. You can retry this scan.');
        }
        // The API returns success only after the private object is uploaded and
        // the Firestore reference has been updated. Keep IndexedDB as fallback.
        if (localPhoto && user) {
          try { await uploadCropPhoto({ scanId: scan.id, image: localPhoto, idToken: await user.getIdToken() }); }
          catch { /* Scan Details offers a retry/migration action; local data stays intact. */ }
        }
      }
      navigate(`/assessment/${scan.id}`);
    }, 3600);
    return () => clearTimeout(timer);
  }, [navigate, scanDraft.photoFile, scanDraft.cropType, scanDraft.observations, createScanFromDraft, saveScan, applyAssessment, markScanFailed, user]);

  const previewImage = scanDraft.photoPreviewUrl || '/assets/cassava-leaf-sample.png';
  const cropLabel = scanDraft.cropType || 'Cassava';

  return (
    <div className="flex flex-col gap-4 pb-4">
      <TopHeader
        variant="page"
        title="Scan a Crop"
        subtitle="Take a photo of the affected plant so we can help you investigate."
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
                Preparing scan
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

            {/* Frosted Bottom Overlay — Scanning Status */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent rounded-b-xl p-3 z-10">
              <p className="text-[12px] font-semibold text-white tracking-tight">
                {SCANNING_STEPS[stepIndex].replace('…', '')}{dots}
              </p>
            </div>
          </div>

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
            <span className="text-xs font-semibold text-[#FF8A32]">Select 1</span>
          </div>
          <p className="text-[11px] text-[#8F9490] mb-3">
            Tuned for Akwa Ibom and Niger Delta coastal agricultural belts.
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
          AI results are guidance, not a confirmed diagnosis.
        </p>
      </div>
    </div>
  );
};
