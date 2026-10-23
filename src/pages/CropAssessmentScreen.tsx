import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  Play,
  Pause,
  Camera,
  Clock,
  Phone,
  Headphones,
  WifiOff,
  HelpCircle,
  Image as ImageIcon,
} from 'lucide-react';
import { TopHeader } from '../components/common/TopHeader';
import { ScanImage } from '../components/common/ScanImage';
import { useApp } from '../context/useApp';
import { useAuth } from '../context/useAuth';
import { getScanPhoto } from '../data/photoStore';
import { AssessmentRequestError, requestCropAssessment } from '../data/assessmentApi';
import { simpleConfidence, simpleLikelihood } from '../data/assessmentLanguage';
import { usePidginAssessment } from '../data/usePidginAssessment';
import { PidginAssessmentControls } from '../components/common/PidginAssessmentControls';

type AssessmentVariant = 'single' | 'multiple' | 'unidentified' | 'unclear' | 'offline';

const STEPS_SINGLE = [
  {
    num: 1,
    title: 'Isolate infected stems',
    desc: 'Cut and safely destroy heavily affected stems away from healthy plants.',
  },
  {
    num: 2,
    title: 'Check for whiteflies',
    desc: 'Inspect leaf undersides in early morning for small white insects.',
  },
  {
    num: 3,
    title: 'Use clean stem cuttings',
    desc: 'Source certified disease-free stem varieties from your local ADP extension office in Eket.',
  },
  {
    num: 4,
    title: 'Maintain weeding and soil moisture',
    desc: 'Reduce weed competition that harbors insect vectors.',
  },
];

const STEPS_UNIDENTIFIED = [
  {
    num: 1,
    title: 'Retake a clearer photo',
    desc: 'Take a sharp close-up in natural shade or morning light, focusing on the boundary between green and yellow leaf tissue.',
  },
  {
    num: 2,
    title: 'Check the underside of leaves',
    desc: 'Look for whiteflies, aphids, or insect webbing that might not show on camera.',
  },
  {
    num: 3,
    title: 'Monitor plant for 48 hours',
    desc: 'Note if symptoms spread to new shoots or neighbouring stands.',
  },
];

export const CropAssessmentScreen: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const { scans, resetScanDraft, applyAssessment, markScanFailed } = useApp();
  const { user } = useAuth();
  const photoUploadError = typeof location.state === 'object' && location.state !== null
    && 'photoUploadError' in location.state && typeof location.state.photoUploadError === 'string'
    ? location.state.photoUploadError
    : '';

  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);
  const [audioProgress, setAudioProgress] = useState<number>(38);
  const [showSaveModal, setShowSaveModal] = useState<boolean>(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryError, setRetryError] = useState('');

  // Allow switching between Figma states for verification
  const showStateSwitcher = import.meta.env.DEV && searchParams.get('debugStates') === 'true';
  const initialVariant: AssessmentVariant = showStateSwitcher && id === 'offline' ? 'offline' : 'single';
  const [variant, setVariant] = useState<AssessmentVariant>(initialVariant);

  const progressRef = useRef<number>(audioProgress);
  const playIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    progressRef.current = audioProgress;
  }, [audioProgress]);

  const toggleAudio = () => {
    setIsPlayingAudio((prev) => {
      const nowPlaying = !prev;
      if (nowPlaying) {
        playIntervalRef.current = setInterval(() => {
          setAudioProgress((p) => {
            if (p >= 100) {
              clearInterval(playIntervalRef.current!);
              setIsPlayingAudio(false);
              return 0;
            }
            return p + 0.5;
          });
        }, 100);
      } else {
        if (playIntervalRef.current) clearInterval(playIntervalRef.current);
      }
      return nowPlaying;
    });
  };

  // Only render the requested scan; never substitute another scan for an invalid ID.
  const scan = id === 'offline' && showStateSwitcher ? undefined : scans.find((item) => item.id === id);
  const { language, setLanguage, translated, display: displayAssessment, loading: translationLoading, error: translationError } = usePidginAssessment(scan?.id, scan?.assessment);
  const isSampleScan = Boolean(scan && /^scan-[1-4]$/.test(scan.id));
  const photoSrc = scan?.imageUrl ?? '/assets/cassava-leaf-sample.png';
  const cropLabel = scan?.customCropName || scan?.cropType || 'Cassava';

  const retryAssessment = async () => {
    if (!scan?.photoStorageKey || !user || isRetrying || scan.dataScope !== 'cloud') return;
    setIsRetrying(true);
    setRetryError('');
    applyAssessment(scan.id, undefined, 'processing', 'Your crop photo is being assessed.');
    try {
      const image = await getScanPhoto(scan.photoStorageKey);
      if (!image) throw new Error('The saved photo is not available on this device.');
      const assessment = await requestCropAssessment({
        image,
        cropType: scan.cropType,
        customCropName: scan.customCropName,
        observations: scan.userObservations ?? '',
        scanId: scan.id,
        idToken: await user.getIdToken(),
      });
      applyAssessment(scan.id, assessment, assessment.status, assessment.summary);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'The assessment could not be completed. You can retry this scan.';
      setRetryError(message);
      if (error instanceof AssessmentRequestError && error.code === 'ALREADY_PROCESSING') {
        applyAssessment(scan.id, undefined, 'processing', 'This scan is still being assessed. Its result will appear after processing finishes.');
        setIsRetrying(false);
        return;
      }
      await markScanFailed(scan.id, message);
    } finally {
      setIsRetrying(false);
    }
  };

  const handleScanAnother = () => {
    resetScanDraft();
    navigate('/scan');
  };

  if (!scan && !(id === 'offline' && showStateSwitcher)) {
    return (
      <div className="flex flex-col gap-4 pb-8">
        <TopHeader
          variant="detail"
          title="Crop Assessment"
          showHelp
          onBack={() => navigate('/')}
        />
        <div className="px-4 flex flex-col gap-4">
          <div className="bg-[#292C2A] border border-[#323633] rounded-2xl p-5">
            <h2 className="text-base font-bold text-white">Scan not found</h2>
            <p className="text-xs text-[#D1D5DB] leading-relaxed mt-2">
              This scan is not available in your account. No assessment result can be shown.
            </p>
          </div>
          <button
            onClick={() => navigate('/history')}
            className="bg-[#176B45] hover:bg-[#1eb968] text-white py-3 rounded-xl text-xs font-semibold cursor-pointer transition"
          >
            View History
          </button>
        </div>
      </div>
    );
  }

  // Real server assessments and technical states use the same dark, green,
  // orange visual language as the exported assessment designs.
  if (scan && !scan.diagnosis && id !== 'offline') {
    const assessment = displayAssessment;
    const technicalFailure = scan.assessmentStatus === 'failed';
    const waiting = scan.assessmentStatus === 'pending' || scan.assessmentStatus === 'processing';
    const canStartOrRetry = scan.assessmentStatus === 'pending'
      || scan.assessmentStatus === 'unavailable'
      || technicalFailure
      || scan.assessmentStatus === 'processing';
    return (
      <div className="flex flex-col gap-4 pb-8">
        <TopHeader
          variant="detail"
          title="Crop Assessment"
          showHelp
          onBack={() => navigate('/')}
        />
        <div className="px-4 flex flex-col gap-4">
          {photoUploadError && (
            <div role="alert" className="bg-[#2E2319] border border-[#B36A2D] rounded-2xl p-4">
              <p className="text-xs text-[#D1D5DB] leading-relaxed">
                The scan record was saved, but the photo could not be saved to your account. It remains on this device for now. {photoUploadError}
              </p>
              <button
                onClick={() => navigate(`/scan/${scan.id}`)}
                className="mt-3 text-xs font-semibold text-[#FFB36B] underline underline-offset-2"
              >
                Open Scan Details to retry
              </button>
            </div>
          )}
          <div className={`${assessment?.status === 'completed' ? 'bg-[#1F2B25] border-[#176B45]' : 'bg-[#2E2319] border-[#B36A2D]'} border rounded-2xl p-5 flex flex-col gap-3`}>
            <h2 className="text-base font-bold text-white">
              {assessment ? (assessment.status === 'inconclusive' ? 'Assessment inconclusive' : 'Crop assessment')
                : waiting ? 'Assessment in progress' : technicalFailure ? 'Assessment could not be completed' : 'Assessment unavailable'}
            </h2>
            <p className="text-xs text-[#D1D5DB] leading-relaxed">
              {assessment?.summary ?? scan.summary}
            </p>
            <ScanImage scan={scan} alt={`${scan.cropType} scan`} className="w-full h-48 object-cover rounded-xl" />
            {scan.userObservations && (
              <p className="text-xs text-[#D1D5DB]">Your note: {scan.userObservations}</p>
            )}
            {assessment && <>
              <PidginAssessmentControls language={language} onLanguageChange={setLanguage} loading={translationLoading} error={translationError}
                text={language === 'pidgin' && translated ? [assessment.summary, assessment.confidenceReason, ...assessment.observedSymptoms, ...assessment.possibleCauses.flatMap((cause) => [cause.name, cause.explanation]), ...assessment.recommendedActions, ...assessment.preventionTips, assessment.whenToSeekHelp, ...assessment.limitations, assessment.disclaimer].join('. ') : ''} />
              <p className="text-[11px] text-[#A1A7A3]">Selected crop: <span className="text-white">{scan.customCropName || scan.cropType}</span> · How sure: <span className="text-white">{simpleConfidence(assessment.confidence)}</span></p>
              <p className="text-[11px] text-[#A1A7A3]">{assessment.confidenceReason}</p>
              {!!assessment.observedSymptoms.length && <div>
                <h3 className="text-xs font-bold text-white mb-1">Visible observations</h3>
                <ul className="list-disc pl-4 text-xs text-[#D1D5DB] space-y-1">{assessment.observedSymptoms.map((symptom, index) => <li key={`${index}-${symptom}`}>{symptom}</li>)}</ul>
              </div>}
              {!!assessment.possibleCauses.length && <div>
                <h3 className="text-xs font-bold text-white mb-1">Possible causes to consider</h3>
                <div className="flex flex-col gap-2">{assessment.possibleCauses.map((cause, index) => <div key={`${index}-${cause.name}`} className="bg-[#383B39] p-3 rounded-xl">
                  <p className="text-xs font-bold text-white">{cause.name} <span className="text-[#FF8A32] font-medium">· {simpleLikelihood(cause.likelihood)}</span></p>
                  <p className="text-[11px] text-[#D1D5DB] mt-1 leading-relaxed">{cause.explanation}</p>
                </div>)}</div>
              </div>}
              {[['Recommended next steps', assessment.recommendedActions], ['Prevention', assessment.preventionTips], ['Limitations', assessment.limitations]].map(([heading, items]) => (
                <div key={heading as string}>
                  <h3 className="text-xs font-bold text-white mb-1">{heading as string}</h3>
                  <ul className="list-disc pl-4 text-xs text-[#D1D5DB] space-y-1">{(items as string[]).map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}</ul>
                </div>
              ))}
              <div className="bg-[#383B39] rounded-xl p-3">
                <h3 className="text-xs font-bold text-white mb-1">When to seek help</h3>
                <p className="text-xs text-[#D1D5DB] leading-relaxed">{assessment.whenToSeekHelp}</p>
              </div>
              <p className="text-[10px] leading-relaxed text-[#A1A7A3]">{assessment.disclaimer}</p>
            </>}
            {canStartOrRetry && scan.dataScope === 'cloud' && scan.photoStorageKey && <button
              onClick={() => void retryAssessment()}
              disabled={isRetrying}
              className="w-full bg-[#176B45] hover:bg-[#1eb968] disabled:opacity-60 text-white py-3 rounded-xl text-xs font-semibold cursor-pointer transition"
            >{isRetrying ? 'Requesting assessment…' : technicalFailure ? 'Retry assessment' : scan.assessmentStatus === 'processing' ? 'Check assessment' : 'Start assessment'}</button>}
            {retryError && <p role="alert" className="text-xs text-[#FFB4A8]">{retryError}</p>}
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              onClick={handleScanAnother}
              className="bg-[#176B45] hover:bg-[#1eb968] text-white py-3 rounded-xl text-xs font-semibold cursor-pointer transition"
            >
              Scan Another
            </button>
            <button
              onClick={() => navigate('/history')}
              className="bg-[#292C2A] hover:bg-[#343835] text-white py-3 rounded-xl text-xs font-semibold cursor-pointer transition"
            >
              View History
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 pb-8">
      <TopHeader
        variant="detail"
        title="Crop Assessment"
        showHelp
        onBack={() => navigate('/')}
      />

      <div className="px-4 flex flex-col gap-4">
        {isSampleScan && (
          <p className="rounded-xl border border-[#B36A2D] bg-[#2E2319] px-3 py-2 text-[11px] leading-relaxed text-[#F2D1AE]">
            Sample assessment for demonstration only. This is not an AI result for your crop.
          </p>
        )}

        {/* ── Figma State Switcher (dev aid, matches all 5 exported Figma screens) ── */}
        {showStateSwitcher && <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] -mx-1 px-1">
          <span className="text-[#8F9490] shrink-0 font-medium">States:</span>
          {(['single', 'multiple', 'unidentified', 'unclear', 'offline'] as AssessmentVariant[]).map(
            (mode) => (
              <button
                key={mode}
                onClick={() => setVariant(mode)}
                className={`px-2.5 py-0.5 rounded-full capitalize whitespace-nowrap transition cursor-pointer shrink-0 ${
                  variant === mode
                    ? 'bg-[#176B45] text-white font-semibold'
                    : 'bg-[#292C2A] text-[#A1A7A3] hover:text-white'
                }`}
              >
                {mode}
              </button>
            )
          )}
        </div>}

        {/* ═══════════════════════════════════════════
            STATE: Connection Interrupted (Offline)
        ═══════════════════════════════════════════ */}
        {variant === 'offline' && (
          <>
            <div className="bg-[#2C1A1A] border border-[#DC2626] rounded-2xl p-6 text-center flex flex-col items-center gap-3">
              <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center text-[#DC2626]">
                <WifiOff className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white mb-1">Connection Interrupted</h3>
                <p className="text-xs text-[#D1D5DB] leading-relaxed">
                  Weak cellular tower signal in this farm sector. Your photo has been safely stored locally and will synchronise automatically once back online.
                </p>
              </div>
              <button
                onClick={() => setVariant('single')}
                className="w-full bg-[#176B45] hover:bg-[#1eb968] text-white py-3 rounded-xl text-xs font-semibold cursor-pointer transition"
              >
                Retry Analysis
              </button>
            </div>

            {/* Bottom actions still shown in offline state */}
            <div className="pt-2 flex flex-col gap-2.5">
              <button
                disabled
                className="w-full bg-[#1B382B] text-gray-500 font-semibold text-sm py-3.5 rounded-xl cursor-not-allowed"
              >
                Save Assessment
              </button>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  onClick={handleScanAnother}
                  className="bg-[#292C2A] hover:bg-[#343835] text-white py-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition"
                >
                  <Camera className="w-4 h-4 text-gray-300" />
                  Scan Another
                </button>
                <button
                  onClick={() => navigate('/history')}
                  className="bg-[#292C2A] hover:bg-[#343835] text-white py-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition"
                >
                  <Clock className="w-4 h-4 text-gray-300" />
                  View History
                </button>
              </div>
            </div>
          </>
        )}

        {/* ═══════════════════════════════════════════
            STATE: Image Unclear – Please Retake
        ═══════════════════════════════════════════ */}
        {variant === 'unclear' && (
          <>
            <div className="bg-[#292C2A] border border-[#FF8A32] rounded-2xl p-6 text-center flex flex-col items-center gap-3">
              <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center text-[#FF8A32]">
                <ImageIcon className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white mb-1">Image unclear – please retake</h3>
                <p className="text-xs text-[#D1D5DB] leading-relaxed">
                  The crop leaves were obscured by glare or low focus. For accurate identification in Nigerian daylight, hold phone 20 cm from leaf and shield direct sun glare with your shadow.
                </p>
              </div>
              <button
                onClick={handleScanAnother}
                className="w-full bg-[#176B45] hover:bg-[#1eb968] text-white py-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition"
              >
                <Camera className="w-4 h-4" />
                Retake leaf Photo
              </button>
            </div>

            <div className="pt-2 flex flex-col gap-2.5">
              <button
                disabled
                className="w-full bg-[#1B382B] text-gray-500 font-semibold text-sm py-3.5 rounded-xl cursor-not-allowed"
              >
                Save Assessment
              </button>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  onClick={handleScanAnother}
                  className="bg-[#292C2A] hover:bg-[#343835] text-white py-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition"
                >
                  <Camera className="w-4 h-4 text-gray-300" />
                  Scan Another
                </button>
                <button
                  onClick={() => navigate('/history')}
                  className="bg-[#292C2A] hover:bg-[#343835] text-white py-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition"
                >
                  <Clock className="w-4 h-4 text-gray-300" />
                  View History
                </button>
              </div>
            </div>
          </>
        )}

        {/* ═══════════════════════════════════════════
            STATES: single | multiple | unidentified
            (All share the photo + voice player block)
        ═══════════════════════════════════════════ */}
        {(variant === 'single' || variant === 'multiple' || variant === 'unidentified') && (
          <>
            {/* Photo + Voice Player Card */}
            <div className="bg-[#292C2A] rounded-2xl overflow-hidden border border-[#323633] shadow-md">
              <div className="relative aspect-square w-full bg-[#181B19]">
                {scan ? (
                  <ScanImage scan={scan} alt="Assessed crop leaf" className="w-full h-full object-cover" />
                ) : (
                  <img src={photoSrc} alt="Assessed crop leaf" className="w-full h-full object-cover" />
                )}
                <span className="absolute top-3 left-3 bg-black/60 backdrop-blur-md text-white text-[11px] px-3 py-1 rounded-full font-medium flex items-center gap-1.5 border border-white/10">
                  <Camera className="w-3.5 h-3.5" />
                  Your crop photo
                </span>
              </div>

              {/* Voice Note Player */}
              <div className="p-3.5 bg-[#242725] flex items-center gap-3">
                <button
                  onClick={toggleAudio}
                  aria-label={isPlayingAudio ? 'Pause voice note' : 'Play voice note'}
                  className="w-10 h-10 rounded-full bg-[#176B45] hover:bg-[#1eb968] active:scale-95 text-white flex items-center justify-center shrink-0 transition"
                >
                  {isPlayingAudio ? (
                    <Pause className="w-4 h-4 fill-white" />
                  ) : (
                    <Play className="w-4 h-4 fill-white ml-0.5" />
                  )}
                </button>

                <div className="flex-1 flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-semibold text-white">Voice Note</span>
                    <span className="text-[11px] text-[#8F9490]">0:42</span>
                  </div>
                  {/* Scrubbar */}
                  <div
                    className="w-full h-1.5 bg-[#383B39] rounded-full overflow-hidden cursor-pointer"
                    onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const pct = ((e.clientX - rect.left) / rect.width) * 100;
                      setAudioProgress(Math.min(100, Math.max(0, pct)));
                    }}
                  >
                    <div
                      className="h-full bg-[#176B45] rounded-full transition-all"
                      style={{ width: `${audioProgress}%` }}
                    />
                  </div>
                </div>

                <span className="bg-[#383B39] text-[#D1D5DB] text-[10px] font-semibold px-2.5 py-1 rounded-full shrink-0">
                  Pidgin
                </span>
              </div>

              <p className="text-[10px] text-[#8F9490] text-center pb-2.5 px-4">
                Sample voice advisory — AI-generated audio guidance coming in Phase 5
              </p>
            </div>

            {/* ── AI Diagnosis Summary ── */}
            <div className="bg-[#292C2A] rounded-2xl p-4 border border-[#323633]">
              <span className="text-[11px] font-bold text-[#FF8A32] uppercase tracking-wider">
                AI Diagnosis Summary
              </span>

              {/* ─ Single cause ─ */}
              {variant === 'single' && (
                <>
                  <div className="flex items-start justify-between mt-1 mb-3 gap-2">
                    <h3 className="text-base font-bold text-white">What we found</h3>
                    <span className="bg-[#174D38] text-[#22C55E] text-[11px] font-semibold px-2.5 py-0.5 rounded-full shrink-0">
                      Possible cause identified
                    </span>
                  </div>

                  <div className="flex flex-col gap-2.5">
                    <div className="bg-[#1F2B25] p-3.5 rounded-xl">
                      <p className="text-[11px] font-bold text-[#22C55E] mb-1.5">Observed on Leaf</p>
                      <p className="text-xs text-[#D1D5DB] leading-relaxed">
                        Yellow mosaic patches and angular brown lesions visible on the leaf surface.
                      </p>
                    </div>

                    <div className="bg-[#2E2822] border border-[#483726] p-3.5 rounded-xl">
                      <p className="text-[11px] font-bold text-[#FF8A32] mb-1.5">Primary Possible Cause</p>
                      <p className="text-xs text-[#D1D5DB] leading-relaxed">
                        Cassava Mosaic Disease (CMD) or nutritional deficiency stress.
                      </p>
                    </div>

                    <div className="bg-[#383B39] p-3.5 rounded-xl">
                      <p className="text-[11px] font-bold text-white mb-1.5">Why it matters</p>
                      <p className="text-xs text-[#D1D5DB] leading-relaxed">
                        Several plant stresses cause leaf spotting. Whitefly pests often spread CMD in early rainy season in Akwa Ibom.
                      </p>
                    </div>
                  </div>
                </>
              )}

              {/* ─ Multiple candidates ─ */}
              {variant === 'multiple' && (
                <>
                  <div className="flex items-start justify-between mt-1 mb-2 gap-2">
                    <h3 className="text-base font-bold text-white">Multiple Candidates Detected</h3>
                    <span className="bg-[#3E2F1E] text-[#FF8A32] text-[11px] font-semibold px-2.5 py-0.5 rounded-full shrink-0">
                      2 Matches
                    </span>
                  </div>
                  <p className="text-xs text-[#8F9490] mb-3 leading-snug">
                    Leaf symptoms correspond to two potential agronomic conditions prevalent in the Niger Delta soil belt:
                  </p>

                  <div className="flex flex-col gap-2.5">
                    <div className="bg-[#242826] p-3.5 rounded-xl border border-[#343835]">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h4 className="text-xs font-bold text-white leading-snug">1. Cassava Mosaic Geminivirus</h4>
                        <span className="text-[11px] font-semibold text-[#FF8A32] shrink-0">High Probability</span>
                      </div>
                      <p className="text-xs text-[#D1D5DB] leading-relaxed mb-2">
                        Severe leaf distortion, stunted growth, and yellow-green chlorotic mottling across younger leaves.
                      </p>
                      <div className="flex justify-between text-[11px] text-[#8F9490] border-t border-[#343835] pt-2">
                        <span>Common vector:</span>
                        <span className="text-white font-medium">Bemisia tabaci (Whitefly)</span>
                      </div>
                    </div>

                    <div className="bg-[#242826] p-3.5 rounded-xl border border-[#343835]">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h4 className="text-xs font-bold text-white leading-snug">2. Magnesium & Zinc Deficiency</h4>
                        <span className="text-[11px] font-semibold text-[#FF8A32] shrink-0">Secondary Match</span>
                      </div>
                      <p className="text-xs text-[#D1D5DB] leading-relaxed mb-2">
                        Interveinal chlorosis on older leaves caused by heavy rainwater leaching in Akwa Ibom sandy acidic soils.
                      </p>
                      <p className="text-[11px] text-white font-medium border-t border-[#343835] pt-2">
                        Soil leaching after continuous seasonal precipitation.
                      </p>
                    </div>
                  </div>
                </>
              )}

              {/* ─ Unable to identify ─ */}
              {variant === 'unidentified' && (
                <>
                  <div className="flex items-start justify-between mt-1 mb-3 gap-2">
                    <h3 className="text-base font-bold text-white">What we found</h3>
                    <span className="bg-[#3E2F1E] text-[#FF8A32] text-[11px] font-semibold px-2.5 py-0.5 rounded-full shrink-0">
                      Unable to identify cause
                    </span>
                  </div>

                  <div className="flex flex-col gap-2.5">
                    <div className="bg-[#1F2B25] p-3.5 rounded-xl">
                      <p className="text-[11px] font-bold text-[#22C55E] mb-1.5">Observed on Leaf</p>
                      <p className="text-xs text-[#D1D5DB] leading-relaxed">
                        Subtle irregular spotting or indistinct discoloration visible, but symptoms do not match known patterns for Cassava Mosaic Disease, Anthracnose, or bacterial blight with confidence.
                      </p>
                    </div>

                    <div className="bg-[#383B39] p-3.5 rounded-xl">
                      <p className="text-[11px] font-bold text-white mb-1.5">Why we can't be sure</p>
                      <p className="text-xs text-[#D1D5DB] leading-relaxed">
                        Symptoms are non-specific or could result from physical damage, sun scorch, or early nutritional stress. AI does not guess when evidence is unclear.
                      </p>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* ── Field Action Plan ── */}
            <div className="bg-[#292C2A] rounded-2xl p-4 border border-[#323633]">
              <div className="flex items-start justify-between mb-3 gap-2">
                <div>
                  <span className="text-[11px] font-bold text-[#FF8A32] uppercase tracking-wider block">
                    Field Action Plan
                  </span>
                  <h3 className="text-base font-bold text-white mt-0.5">What to do next</h3>
                </div>
                <span className="bg-[#174D38] text-[#22C55E] text-[11px] font-semibold px-2.5 py-0.5 rounded-full shrink-0 self-start">
                  {variant === 'unidentified' ? '3 Steps' : '4 Steps'}
                </span>
              </div>

              <div className="flex flex-col gap-2.5">
                {(variant === 'unidentified' ? STEPS_UNIDENTIFIED : STEPS_SINGLE).map((step) => (
                  <div key={step.num} className="bg-[#202321] p-3.5 rounded-xl flex gap-3">
                    <span className="w-5 h-5 min-w-[20px] rounded-full bg-[#176B45] text-white text-[11px] font-bold flex items-center justify-center mt-0.5">
                      {step.num}
                    </span>
                    <div>
                      <h4 className="text-xs font-bold text-white leading-snug">{step.title}</h4>
                      <p className="text-[11px] text-[#A1A7A3] mt-1 leading-snug">{step.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Expert Helpline Card ── */}
            <div className="bg-[#1F2B25] rounded-2xl p-4 border border-[#273B30] flex flex-col gap-3">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-[#176B45] flex items-center justify-center text-white shrink-0 mt-0.5">
                  <Headphones className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">When to get expert help</h4>
                  <p className="text-xs text-[#D1D5DB] mt-1 leading-relaxed">
                    If leaf yellowing spreads to more than 5 adjacent {cropLabel.toLowerCase()} stands within 48 hours, request on-site inspection from your zonal AKADEP officer.
                  </p>
                </div>
              </div>

              <button className="w-full bg-[#2E2822] hover:bg-[#3D3228] border border-[#483726] text-[#FF8A32] py-2.5 px-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition">
                <Phone className="w-3.5 h-3.5" />
                <span>Call AKADEP Helpline (Eket)</span>
              </button>
            </div>

            {/* ── Bottom Action Buttons ── */}
            <div className="flex flex-col gap-2.5 pt-1">
              {variant === 'unidentified' ? (
                <>
                  <button
                    onClick={handleScanAnother}
                    className="w-full bg-[#176B45] hover:bg-[#1eb968] active:scale-[0.98] transition text-white font-semibold text-sm py-3.5 rounded-xl flex items-center justify-center gap-2 shadow-md cursor-pointer"
                  >
                    <Camera className="w-4 h-4" />
                    Retake Photo
                  </button>
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      onClick={() => setShowSaveModal(true)}
                      className="bg-[#292C2A] hover:bg-[#343835] text-white py-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition"
                    >
                      Save to History
                    </button>
                    <button
                      onClick={() => navigate('/')}
                      className="bg-[#292C2A] hover:bg-[#343835] text-white py-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition"
                    >
                      Back to Home
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setShowSaveModal(true)}
                    className="w-full bg-[#176B45] hover:bg-[#1eb968] active:scale-[0.98] transition text-white font-semibold text-sm py-3.5 rounded-xl shadow-md cursor-pointer flex items-center justify-center gap-2"
                  >
                    Save Assessment
                  </button>
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      onClick={handleScanAnother}
                      className="bg-[#292C2A] hover:bg-[#343835] text-white py-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition"
                    >
                      <Camera className="w-4 h-4 text-gray-300" />
                      Scan Another
                    </button>
                    <button
                      onClick={() => navigate('/history')}
                      className="bg-[#292C2A] hover:bg-[#343835] text-white py-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition"
                    >
                      <Clock className="w-4 h-4 text-gray-300" />
                      View History
                    </button>
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </div>

      {/* ── Modal: Save Assessment Confirmation ── */}
      {showSaveModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div
            className="w-full max-w-[350px] bg-[#383B39] rounded-[28px] p-6 text-center text-white shadow-2xl flex flex-col items-center animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center mb-4 text-[#176B45]">
              <HelpCircle className="w-8 h-8" />
            </div>
            <h2 className="text-lg font-bold mb-2">Save this assessment?</h2>
            <p className="text-xs text-[#D1D5DB] leading-relaxed mb-6">
              This report will be linked to your scan history and field log for{' '}
              {cropLabel}, Eket.
            </p>
            <div className="w-full flex flex-col gap-2.5">
              <button
                onClick={() => {
                  setShowSaveModal(false);
                  navigate(`/scan/${scan?.id ?? 'scan-1'}`);
                }}
                className="w-full py-3.5 rounded-xl bg-[#176B45] hover:bg-[#1eb968] font-semibold text-sm transition cursor-pointer"
              >
                Save Assessment
              </button>
              <button
                onClick={() => setShowSaveModal(false)}
                className="w-full py-2.5 text-sm text-[#A1A7A3] hover:text-white transition font-medium cursor-pointer"
              >
                Not Now
              </button>
            </div>
          </div>
          <div className="absolute inset-0 -z-10" onClick={() => setShowSaveModal(false)} />
        </div>
      )}
    </div>
  );
};
