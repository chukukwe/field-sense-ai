import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Camera, Clock, Trash2, Image as ImageIcon, CloudUpload } from 'lucide-react';
import { TopHeader } from '../components/common/TopHeader';
import { ScanImage } from '../components/common/ScanImage';
import { useApp } from '../context/useApp';
import { useAuth } from '../context/useAuth';
import { CropPhotoRequestError, getCloudCropPhoto, uploadCropPhoto, uploadLocalScanPhoto } from '../data/photoApi';
import { getFirebaseCropPhoto } from '../data/firebasePhotoStore';
import { AssessmentRequestError, requestCropAssessment } from '../data/assessmentApi';
import { getScanPhoto, saveScanPhoto } from '../data/photoStore';
import { usePidginAssessment } from '../data/usePidginAssessment';
import { PidginAssessmentControls } from '../components/common/PidginAssessmentControls';
import { simpleConfidence, simpleLikelihood } from '../data/assessmentLanguage';
import { loadAssessmentPhoto } from '../data/loadAssessmentPhoto';
import { useAssessmentProgress } from '../hooks/useAssessmentProgress';
import { AssessmentProgressIndicator } from '../components/common/AssessmentProgressIndicator';

export const ScanDetailsScreen: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { scans, deleteScan, setActiveModal, applyAssessment, markScanFailed, markPhotoStoredLocally, markPhotoSynced, resetScanDraft } = useApp();
  const { user } = useAuth();

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [photoReload, setPhotoReload] = useState(0);
  const [assessmentBusy, setAssessmentBusy] = useState(false);
  const [assessmentMessage, setAssessmentMessage] = useState('');
  const [photoSyncBusy, setPhotoSyncBusy] = useState(false);
  const [photoSyncMessage, setPhotoSyncMessage] = useState('');
  const photoInput = useRef<HTMLInputElement>(null);
  const autoUploadAttempt = useRef('');
  const retryInFlight = useRef(false);
  const photoSyncInFlight = useRef(false);
  const assessmentProgress = useAssessmentProgress();

  const scan = scans.find((item) => item.id === id);
  const diagnosis = scan?.diagnosis;

  const { language, setLanguage, translated, display: assessment, loading: translationLoading, error: translationError } = usePidginAssessment(scan?.id, scan?.assessment);
  const isSampleScan = Boolean(scan && /^scan-[1-4]$/.test(scan.id));
  const canCheckCrop = Boolean(scan && !scan.assessment && !diagnosis
    && ['failed', 'pending', 'processing', 'unavailable'].includes(scan.assessmentStatus ?? 'unavailable'));

  const handleDelete = async () => {
    if (!scan) return;
    setShowDeleteModal(false);
    const ok = await deleteScan(scan.id);
    if (ok) {
      navigate('/history');
    } else {
      setActiveModal('delete-failed');
    }
  };

  const uploadExistingPhoto = useCallback(async (
    scanToUpload: typeof scan,
    authenticatedUser: typeof user,
    replacement?: File,
    openPickerWhenMissing = true,
  ) => {
    if (!scanToUpload || !authenticatedUser || photoSyncInFlight.current) return;
    if (replacement && (!['image/jpeg', 'image/png', 'image/webp'].includes(replacement.type) || !replacement.size || replacement.size > 8 * 1024 * 1024)) {
      setPhotoSyncMessage('Choose a JPEG, PNG or WebP photo up to 8 MB.');
      return;
    }
    if (!replacement && !scanToUpload.photoStorageKey) {
      setPhotoSyncMessage('Choose the original photo to save it to your account.');
      if (openPickerWhenMissing) photoInput.current?.click();
      return;
    }
    photoSyncInFlight.current = true;
    setPhotoSyncBusy(true);
    setPhotoSyncMessage('Saving photo to your account…');
    try {
      const photoStorageKey = scanToUpload.photoStorageKey ?? `${authenticatedUser.uid}/${scanToUpload.id}`;
      const cloudPhotoPath = await uploadLocalScanPhoto({
        scanId: scanToUpload.id,
        photoStorageKey,
        idToken: await authenticatedUser.getIdToken(),
        replacement,
      }, {
        get: getScanPhoto,
        save: async (key, image) => {
          await saveScanPhoto(key, image);
          autoUploadAttempt.current = `${scanToUpload.id}:${key}`;
          markPhotoStoredLocally(scanToUpload.id, key);
        },
      });
      markPhotoSynced(scanToUpload.id, cloudPhotoPath);
      setPhotoSyncMessage('Photo saved to your account. You can view it when you sign in on another device.');
      setPhotoReload((value) => value + 1);
    } catch (error) {
      const missingLocalPhoto = error instanceof CropPhotoRequestError && error.code === 'LEGACY_PHOTO_MISSING';
      setPhotoSyncMessage(missingLocalPhoto
        ? 'Choose the original photo to save it to your account.'
        : error instanceof CropPhotoRequestError
          ? error.message
          : 'The photo could not be saved. Check your connection and retry.');
      if (missingLocalPhoto && openPickerWhenMissing) photoInput.current?.click();
    } finally {
      photoSyncInFlight.current = false;
      setPhotoSyncBusy(false);
    }
  }, [markPhotoStoredLocally, markPhotoSynced]);

  // Older scans created before automatic cloud sync are migrated when their
  // original device opens Scan Details. Keep the local bytes as a fallback.
  useEffect(() => {
    if (!scan || scan.dataScope !== 'cloud' || scan.firebasePhotoPath || scan.cloudPhotoPath || scan.photoScope !== 'local-only' || !scan.photoStorageKey || !user) return;
    const attemptKey = `${scan.id}:${scan.photoStorageKey}`;
    if (autoUploadAttempt.current === attemptKey) return;
    autoUploadAttempt.current = attemptKey;
    void uploadExistingPhoto(scan, user, undefined, false);
  }, [scan, user, uploadExistingPhoto]);

  const retryAssessment = async () => {
    if (!scan || !canCheckCrop || retryInFlight.current || assessmentBusy || !user) return;
    retryInFlight.current = true;
    assessmentProgress.start();
    setAssessmentBusy(true);
    setAssessmentMessage('');
    applyAssessment(scan.id, undefined, 'processing', 'Your crop photo is being assessed.');
    let image: Blob | undefined;
    let idToken = '';
    try {
      idToken = await user.getIdToken();
      image = await loadAssessmentPhoto(scan, {
        local: getScanPhoto,
        cloud: (scanId) => getCloudCropPhoto({ scanId, idToken }),
        firebase: (scanId, firebasePhotoPath) => getFirebaseCropPhoto({ scanId, firebasePhotoPath }),
      });
      if (!image) {
        applyAssessment(scan.id, undefined, 'failed', 'The original photo is unavailable. Choose or capture a photo, then retry the assessment.');
        setAssessmentMessage('The original photo is unavailable. Choose or capture a photo, then retry the assessment.');
        return;
      }
      assessmentProgress.setPhase('uploading');
      const result = await requestCropAssessment({
        image,
        cropType: scan.cropType,
        customCropName: scan.customCropName,
        observations: scan.userObservations ?? '',
        scanId: scan.id,
        idToken,
      });
      applyAssessment(scan.id, result, result.status, result.summary);
      await assessmentProgress.complete();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'The assessment could not be completed. Retry when you are ready.';
      setAssessmentMessage(message);
      if (error instanceof AssessmentRequestError && error.code === 'ALREADY_PROCESSING') {
        applyAssessment(scan.id, undefined, 'processing', 'Your crop is still being checked. Its result will appear here when ready.');
      } else {
        const failure = error instanceof AssessmentRequestError && error.status !== undefined
          ? { code: error.code, status: error.status }
          : undefined;
        await markScanFailed(scan.id, message, failure);
      }
    } finally {
      // A successful assessment is stored in Firestore, while the image has
      // its own private Storage upload. Try to complete that link after a
      // retry too, including when the provider request failed.
      assessmentProgress.stop();
      retryInFlight.current = false;
      setAssessmentBusy(false);
      if (image && idToken && !scan.cloudPhotoPath && !scan.firebasePhotoPath) {
        void uploadCropPhoto({ scanId: scan.id, image, idToken })
          .then((cloudPhotoPath) => markPhotoSynced(scan.id, cloudPhotoPath))
          .catch(() => { /* The manual photo-sync action remains available. */ });
      }
    }
  };

  if (!scan) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 gap-4 px-4 text-center">
        <p className="text-sm text-[#8F9490]">Scan record not found.</p>
        <button
          onClick={() => navigate('/history')}
          className="text-xs font-semibold text-[#1EB968] hover:underline"
        >
          Back to History
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 pb-8">
      <TopHeader
        variant="detail"
        title="Scan Details"
        showHelp
        onBack={() => navigate(-1)}
      />

      <div className="px-4 flex flex-col gap-4">
        {isSampleScan && (
          <p className="rounded-xl border border-[#B36A2D] bg-[#2E2319] px-3 py-2 text-[11px] leading-relaxed text-[#F2D1AE]">
            Sample assessment for demonstration only. This is not an AI result for your crop.
          </p>
        )}

        {/* ── Hero Photo ── */}
        <div className="relative aspect-square rounded-2xl overflow-hidden bg-[#181B19] border border-[#323633]">
          <ScanImage
            key={`${scan.id}-${scan.cloudPhotoPath ?? 'local'}-${photoReload}`}
            scan={scan}
            alt={scan.title}
            className="w-full h-full object-cover"
          />
          <span className="absolute top-3 left-3 bg-black/60 backdrop-blur-md text-white text-[11px] px-4 py-2 rounded-full font-medium flex items-center gap-1.5 border border-white/10">
            <ImageIcon className="w-3.5 h-3.5 shrink-0" />
            {scan.customCropName || scan.cropType} • Scanned {scan.date}
          </span>
        </div>

        <input ref={photoInput} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(event) => {
          const selected = event.currentTarget.files?.[0];
          event.currentTarget.value = '';
          if (selected) void uploadExistingPhoto(scan, user, selected);
        }} />

        {scan.firebasePhotoPath || scan.cloudPhotoPath ? null : scan.photoStorageKey && scan.photoScope !== 'missing' ? (
          <div className="rounded-xl border border-[#4B513C] bg-[#292C2A] px-3 py-3">
            <div className="flex items-start gap-2 text-xs text-[#E7E9E7]">
              <CloudUpload className="mt-0.5 h-4 w-4 shrink-0 text-[#1EB968]" aria-hidden="true" />
              <div>
                <p className="font-semibold">Photo saved on this device</p>
                <p className="mt-0.5 text-[#A1A7A3]">Sync it to your account so it appears with this scan on your other devices.</p>
              </div>
            </div>
            {photoSyncMessage && <p className="mt-2 text-[11px] text-[#D1D5DB]" role="status">{photoSyncMessage}</p>}
            <button type="button" onClick={() => void uploadExistingPhoto(scan, user)} disabled={photoSyncBusy || !user}
              className="mt-3 w-full rounded-xl bg-[#176B45] py-2.5 text-xs font-semibold text-white hover:bg-[#1eb968] disabled:opacity-60">
              {photoSyncBusy ? 'Saving photo…' : 'Sync photo to my account'}
            </button>
          </div>
        ) : scan.dataScope === 'cloud' && scan.assessmentStatus ? (
          <div className="rounded-xl border border-[#4B513C] bg-[#292C2A] px-3 py-3">
            <p className="text-xs font-semibold text-[#E7E9E7]">Your scan record is saved, but no photo is linked yet.</p>
            <p className="mt-1 text-[11px] text-[#A1A7A3]">Choose the original photo to attach it to your account for access on other devices.</p>
            {photoSyncMessage && <p className="mt-2 text-[11px] text-[#D1D5DB]" role="status">{photoSyncMessage}</p>}
            <button type="button" onClick={() => photoInput.current?.click()} disabled={photoSyncBusy || !user}
              className="mt-3 w-full rounded-xl bg-[#176B45] py-2.5 text-xs font-semibold text-white hover:bg-[#1eb968] disabled:opacity-60">
              {photoSyncBusy ? 'Saving photo…' : 'Choose original photo'}
            </button>
          </div>
        ) : null}

        {(canCheckCrop || assessmentBusy) && <section className="rounded-2xl border border-[#B36A2D] bg-[#2E2319] p-4" aria-label="Assessment retry">
          <h3 className="text-sm font-bold text-white">{assessmentBusy || scan.assessmentStatus === 'processing' ? 'Checking your crop' : scan.assessmentStatus === 'failed' ? 'Crop check could not finish' : 'Your crop check is saved'}</h3>
          <p className="mt-1 text-xs leading-relaxed text-[#D1D5DB]">{scan.summary}</p>
          <button type="button" onClick={() => void retryAssessment()} disabled={assessmentBusy || !user}
            className="mt-3 w-full rounded-xl bg-[#176B45] py-3 text-xs font-semibold text-white hover:bg-[#1eb968] disabled:opacity-60">
            {assessmentBusy ? 'Checking your crop…' : scan.assessmentStatus === 'failed' ? 'Try again' : scan.assessmentStatus === 'processing' ? 'Check again' : 'Check crop'}
          </button>
          {assessmentBusy && <div className="mt-3"><AssessmentProgressIndicator progress={assessmentProgress.progress} message={assessmentProgress.message} /></div>}
          {assessmentMessage && assessmentMessage !== scan.summary && <p role="alert" className="mt-2 text-xs text-[#FFB4A8]">{assessmentMessage}</p>}
          {(scan.photoScope === 'missing' || (!scan.photoStorageKey && !scan.firebasePhotoPath && !scan.cloudPhotoPath)) && <button type="button" onClick={() => photoInput.current?.click()} className="mt-2 text-xs font-semibold text-[#1EB968]">Choose a replacement photo</button>}
        </section>}

        {/* ── What Was Found ── */}
        <div className="bg-[#292C2A] rounded-2xl p-4 border border-[#323633]">
          <div className="flex items-center justify-between mb-3 gap-2">
            <h3 className="text-base font-bold text-white">
              {diagnosis || assessment ? 'What we found' : 'Crop check status'}
            </h3>
            {scan.statusVariant === 'red' && (
              <span className="bg-[#3E1F1F] text-[#E04141] text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider shrink-0">
                ATTENTION
              </span>
            )}
            {scan.statusVariant === 'amber' && (
              <span className="bg-[#3E2F1E] text-[#FF8A32] text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider shrink-0">
                REVIEW
              </span>
            )}
            {scan.statusVariant === 'green' && (
              <span className="bg-[#174D38] text-[#22C55E] text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider shrink-0">
                HEALTHY
              </span>
            )}
          </div>

          <div className="flex flex-col gap-2.5">
            {/* Possible problem */}
            {diagnosis && (
              <div className="bg-[#1F2B25] p-3.5 rounded-xl border border-[#273B30]">
                <span className="text-[11px] font-bold text-[#FF8A32] block mb-0.5">
                  Possible problem
                </span>
                <h4 className="text-sm font-bold text-[#22C55E] mb-1 leading-snug">
                  {diagnosis.title}
                </h4>
                <p className="text-[11px] text-[#A1A7A3]">
                  Possible cause from visible signs
                </p>
              </div>
            )}

            {!diagnosis && !assessment && (
              <div className="bg-[#2E2319] p-3.5 rounded-xl border border-[#B36A2D]">
                <h4 className="text-sm font-bold text-white mb-1">{scan.assessmentStatus === 'failed' ? 'Crop check could not finish' : 'No crop check yet'}</h4>
                <p className="text-[11px] text-[#D1D5DB] leading-relaxed">{scan.summary}</p>
                {scan.userObservations && (
                  <p className="text-[11px] text-[#D1D5DB] mt-2">Your note: {scan.userObservations}</p>
                )}
              </div>
            )}

            {assessment && (
              <div className="bg-[#1F2B25] p-3.5 rounded-xl border border-[#273B30] flex flex-col gap-3">
                <PidginAssessmentControls language={language} onLanguageChange={setLanguage} loading={translationLoading} error={translationError}
                  text={language === 'pidgin' && translated ? [assessment.summary, assessment.confidenceReason, ...assessment.observedSymptoms, ...assessment.possibleCauses.flatMap((cause) => [cause.name, cause.explanation]), ...assessment.recommendedActions, ...assessment.preventionTips, assessment.whenToSeekHelp, ...assessment.limitations, assessment.disclaimer].join('. ') : ''} />
                <div>
                  <span className="text-[11px] font-bold text-[#FF8A32] block mb-0.5">{assessment.status === 'inconclusive' ? 'Not sure yet' : 'Crop check from your photo'}</span>
                  <h4 className="text-sm font-bold text-white mb-1 leading-snug">{assessment.summary}</h4>
                  <p className="text-[11px] text-[#A1A7A3]">Crop: {scan.customCropName || scan.cropType} · How sure: {simpleConfidence(assessment.confidence)}</p>
                  <p className="text-[11px] text-[#A1A7A3] mt-1">{assessment.confidenceReason}</p>
                </div>
                {!!assessment.observedSymptoms.length && <div>
                  <h5 className="text-xs font-bold text-white mb-1">Visible observations</h5>
                  <ul className="list-disc pl-4 text-[11px] text-[#D1D5DB] space-y-1">{assessment.observedSymptoms.map((symptom, index) => <li key={`${index}-${symptom}`}>{symptom}</li>)}</ul>
                </div>}
                {!!assessment.possibleCauses.length && <div>
                  <h5 className="text-xs font-bold text-white mb-1">What may be wrong</h5>
                  <div className="flex flex-col gap-2">{assessment.possibleCauses.map((cause, index) => <div key={`${index}-${cause.name}`} className="bg-[#383B39] p-3 rounded-xl">
                  <p className="text-xs font-bold text-white">{cause.name} <span className="text-[#FF8A32] font-medium">· {simpleLikelihood(cause.likelihood)}</span></p>
                    <p className="text-[11px] text-[#D1D5DB] mt-1 leading-relaxed">{cause.explanation}</p>
                  </div>)}</div>
                </div>}
                <p className="text-[11px] text-[#D1D5DB] leading-relaxed">{assessment.disclaimer}</p>
              </div>
            )}

            {/* Visible Symptoms + Context */}
            <div className="bg-[#383B39] p-3.5 rounded-xl flex flex-col gap-3">
              {diagnosis?.observedOnLeaf && (
                <div>
                  <h5 className="text-xs font-bold text-white mb-1">What we can see</h5>
                  <p className="text-xs text-[#D1D5DB] leading-relaxed">
                    {diagnosis.observedOnLeaf}
                  </p>
                </div>
              )}

              {diagnosis?.whyItMatters && (
                <div className="border-t border-white/10 pt-2.5">
                  <h5 className="text-xs font-bold text-white mb-1">What may happen next</h5>
                  <p className="text-xs text-[#D1D5DB] leading-relaxed">
                    {diagnosis.whyItMatters}
                  </p>
                </div>
              )}
              {assessment && <>
                {assessment.recommendedActions.length > 0 && <div>
                  <h5 className="text-xs font-bold text-white mb-1">Recommended next steps</h5>
                  <ul className="list-disc pl-4 text-xs text-[#D1D5DB] leading-relaxed space-y-1">{assessment.recommendedActions.map((action, index) => <li key={`${index}-${action}`}>{action}</li>)}</ul>
                </div>}
                {assessment.preventionTips.length > 0 && <div className="border-t border-white/10 pt-2.5">
                  <h5 className="text-xs font-bold text-white mb-1">Prevention tips</h5>
                  <ul className="list-disc pl-4 text-xs text-[#D1D5DB] leading-relaxed space-y-1">{assessment.preventionTips.map((tip, index) => <li key={`${index}-${tip}`}>{tip}</li>)}</ul>
                </div>}
                {assessment.limitations.length > 0 && <div className="border-t border-white/10 pt-2.5">
                  <h5 className="text-xs font-bold text-white mb-1">What this photo cannot show</h5>
                  <ul className="list-disc pl-4 text-xs text-[#D1D5DB] leading-relaxed space-y-1">{assessment.limitations.map((limitation, index) => <li key={`${index}-${limitation}`}>{limitation}</li>)}</ul>
                </div>}
                <div className="border-t border-white/10 pt-2.5">
                  <h5 className="text-xs font-bold text-white mb-1">When to ask for help</h5>
                  <p className="text-xs text-[#D1D5DB] leading-relaxed">{assessment.whenToSeekHelp}</p>
                </div>
              </>}
            </div>
          </div>
        </div>

        {/* ── Practical Next Steps ── */}
        {diagnosis?.steps && diagnosis.steps.length > 0 && (
          <div className="bg-[#292C2A] rounded-2xl p-4 border border-[#323633]">
            <div className="flex items-start justify-between mb-3 gap-2">
              <h3 className="text-base font-bold text-white">Practical Next Steps</h3>
              <span className="bg-[#174D38] text-[#22C55E] text-[11px] font-semibold px-2.5 py-0.5 rounded-full shrink-0">
                {diagnosis.steps.length} Steps
              </span>
            </div>

            <div className="flex flex-col gap-2.5">
              {diagnosis.steps.map((step) => (
                <div key={step.stepNumber} className="bg-[#202321] p-3.5 rounded-xl flex gap-3">
                  <span className="w-5 h-5 min-w-[20px] rounded-full bg-[#176B45] text-white text-[11px] font-bold flex items-center justify-center mt-0.5">
                    {step.stepNumber}
                  </span>
                  <div>
                    <h4 className="text-xs font-bold text-white leading-snug">{step.title}</h4>
                    <p className="text-[11px] text-[#A1A7A3] mt-1 leading-snug">
                      {step.instruction}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Action Buttons ── */}
        <div className="flex flex-col gap-3 pt-2">
          <button
            onClick={() => { resetScanDraft(); navigate('/scan'); }}
            className="w-full bg-[#176B45] hover:bg-[#1eb968] active:scale-[0.98] transition text-white font-semibold text-sm py-3.5 rounded-xl flex items-center justify-center gap-2 shadow-md cursor-pointer"
          >
            <Camera className="w-4 h-4" />
            Scan Another Crop
          </button>

          <div className="flex w-full items-center gap-2">
            <button
              onClick={() => navigate('/history')}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-white/10 px-6 py-4 text-xs text-[#D1D5DB] transition hover:bg-white/15 hover:text-white cursor-pointer"
            >
              <Clock className="w-4 h-4 text-gray-400" />
              <span>View History</span>
            </button>

            <button
              onClick={() => setShowDeleteModal(true)}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-red-500/10 px-6 py-4 text-xs text-[#E04141] transition hover:bg-red-500/15 hover:underline cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete Scan</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Modal: Delete Confirmation ── */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div
            className="w-full max-w-[350px] bg-[#383B39] rounded-[28px] p-6 text-center text-white shadow-2xl flex flex-col items-center animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center mb-4 text-[#DC2626]">
              <Trash2 className="w-8 h-8" />
            </div>
            <h2 className="text-lg font-bold mb-2">Delete this scan?</h2>
            <p className="text-xs text-[#D1D5DB] leading-relaxed mb-6">
              This assessment will be removed from your scan history. This action cannot be undone.
            </p>
            <div className="w-full flex flex-col gap-2.5">
              <button
                onClick={handleDelete}
                className="w-full py-3.5 rounded-xl bg-[#DC2626] hover:bg-red-700 font-semibold text-sm transition cursor-pointer"
              >
                Delete Scan
              </button>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="w-full py-2.5 text-sm text-[#A1A7A3] hover:text-white transition font-medium cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
          <div className="absolute inset-0 -z-10" onClick={() => setShowDeleteModal(false)} />
        </div>
      )}
    </div>
  );
};
