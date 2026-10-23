import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Camera,
  Upload,
  Image as ImageIcon,
  Repeat,
  Trash2,
  Mic,
  AlertTriangle,
  AlertOctagon,
  Radio,
} from 'lucide-react';
import { TopHeader } from '../components/common/TopHeader';
import { useApp } from '../context/useApp';
import type { CropType } from '../types';
import { cropOptions, validateCropSelection } from '../data/cropFamilies';

export const ScanScreen: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { scanDraft, setScanDraft, resetScanDraft } = useApp();

  const [errorBanner, setErrorBanner] = useState<'crop-required' | 'custom-name-required' | 'custom-name-invalid' | 'no-photo' | 'too-large' | 'not-image' | null>(null);
  const [cameraBlocked, setCameraBlocked] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);

  const galleryRef = useRef<HTMLInputElement>(null);
  const cameraVideoRef = useRef<HTMLVideoElement>(null);
  const recognitionRef = useRef<any>(null);

  /* Start voice recognition from FAB */
  useEffect(() => {
    if (searchParams.get('voice') === 'true') startSpeechRecognition();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Handlers ── */
  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = ''; // allow re-selecting same file

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setErrorBanner('not-image');
      return;
    }
    const sizeMb = Number((file.size / (1024 * 1024)).toFixed(1));
    if (file.size > 8 * 1024 * 1024) {
      setErrorBanner('too-large');
      return;
    }
    setErrorBanner(null);
    setCameraBlocked(false);
    const url = URL.createObjectURL(file);
    setScanDraft((prev) => ({ ...prev, photoFile: file, photoPreviewUrl: url, photoSizeMb: sizeMb }));
  };

  const removePhoto = () =>
    setScanDraft((prev) => ({ ...prev, photoFile: null, photoPreviewUrl: null, photoSizeMb: 0 }));

  useEffect(() => {
    if (cameraVideoRef.current && cameraStream) {
      cameraVideoRef.current.srcObject = cameraStream;
      void cameraVideoRef.current.play().catch(() => setCameraBlocked(true));
    }
    return () => cameraStream?.getTracks().forEach((track) => track.stop());
  }, [cameraStream]);

  const openCamera = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraBlocked(true);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
      setCameraBlocked(false);
      setCameraStream(stream);
    } catch {
      setCameraStream(null);
      setCameraBlocked(true);
    }
  };

  const captureCameraPhoto = () => {
    const video = cameraVideoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d');
    if (!context) return;
    context.drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], `fieldvoice-${Date.now()}.jpg`, { type: 'image/jpeg' });
      if (file.size > 8 * 1024 * 1024) {
        setErrorBanner('too-large');
        setCameraStream(null);
        return;
      }
      const url = URL.createObjectURL(file);
      setScanDraft((prev) => ({ ...prev, photoFile: file, photoPreviewUrl: url, photoSizeMb: Number((file.size / (1024 * 1024)).toFixed(1)) }));
      setCameraStream(null);
    }, 'image/jpeg', 0.9);
  };

  const selectCrop = (type: CropType) => {
    setScanDraft((prev) => ({ ...prev, cropType: type, customCropName: type === 'Other' ? prev.customCropName : '' }));
    if (errorBanner === 'crop-required' || errorBanner === 'custom-name-required' || errorBanner === 'custom-name-invalid') setErrorBanner(null);
  };

  const handleAnalyze = () => {
    const cropSelectionError = validateCropSelection(scanDraft.cropType, scanDraft.customCropName);
    if (cropSelectionError) {
      setErrorBanner(cropSelectionError);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (!scanDraft.photoPreviewUrl) {
      setErrorBanner('no-photo');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    navigate('/scanning');
  };

  const startSpeechRecognition = () => {
    const SR =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SR) return; // silent — manual typing fallback is already there

    if (recognitionRef.current) {
      recognitionRef.current.abort();
    }

    const rec = new SR();
    rec.lang = 'en-NG';
    rec.continuous = false;
    rec.interimResults = false;
    recognitionRef.current = rec;

    setIsRecording(true);

    rec.onresult = (e: any) => {
      const text = e.results[0][0].transcript;
      setScanDraft((prev) => ({
        ...prev,
        observations: (prev.observations ? `${prev.observations} ${text}` : text).slice(0, 1000),
      }));
    };
    rec.onerror = () => setIsRecording(false);
    rec.onend   = () => setIsRecording(false);
    rec.start();
  };

  /* ── Derived ── */
  const hasPhoto = !!scanDraft.photoPreviewUrl;

  return (
    <div className="flex flex-col gap-4 pb-6">
      <TopHeader
        variant="page"
        title="Scan a Crop"
        subtitle="Take a photo of the affected plant so we can help you investigate."
      />

      <div className="px-4 flex flex-col gap-4">

        {/* ── Validation Banners ── */}
        {errorBanner === 'crop-required' && (
          <div className="bg-[#2C1A1A] border border-[#5C2020] rounded-2xl p-4 flex gap-3 animate-in fade-in slide-in-from-top-2 duration-150">
            <AlertOctagon className="w-5 h-5 text-[#E04141] shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-[#E04141]">Crop selection required</p>
              <p className="text-xs text-[#E04141]/80 mt-0.5 leading-snug">
                Please select the affected crop type below before running the AI assessment
              </p>
            </div>
          </div>
        )}

        {errorBanner === 'no-photo' && (
          <div className="bg-[#2C1A1A] border border-[#5C2020] rounded-2xl p-4 flex gap-3 animate-in fade-in slide-in-from-top-2 duration-150">
            <AlertOctagon className="w-5 h-5 text-[#E04141] shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-[#E04141]">Crop photo required</p>
              <p className="text-xs text-[#E04141]/80 mt-0.5 leading-snug">
                Take a photo or choose an image before saving this scan.
              </p>
            </div>
          </div>
        )}

        {errorBanner === 'not-image' && (
          <div className="bg-[#2C1A1A] border border-[#5C2020] rounded-2xl p-4 flex gap-3 animate-in fade-in slide-in-from-top-2 duration-150">
            <AlertOctagon className="w-5 h-5 text-[#E04141] shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-[#E04141]">Choose a JPEG, PNG or WebP image</p>
              <p className="text-xs text-[#E04141]/80 mt-0.5 leading-snug">
                This file type cannot be used as a crop photo.
              </p>
            </div>
          </div>
        )}

        {errorBanner === 'too-large' && (
          <div className="bg-[#2E2319] border border-[#5C3A1E] rounded-2xl p-4 flex gap-3 animate-in fade-in slide-in-from-top-2 duration-150">
            <AlertTriangle className="w-5 h-5 text-[#FF8A32] shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-[#FF8A32]">Image file is too large (&gt;8MB)</p>
              <p className="text-xs text-[#FF8A32]/80 mt-0.5 leading-snug">
                Please compress the file or take a new direct photo using the camera view finder.
              </p>
            </div>
          </div>
        )}

        {/* Hidden inputs */}
        <input
          ref={galleryRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileSelected}
          className="hidden"
        />

        {/* ── Photo Area ── */}
        {cameraStream ? (
          <div className="bg-[#1F2B25] border border-dashed border-[#2E6040] rounded-2xl p-4 flex flex-col gap-3">
            <div className="relative rounded-xl overflow-hidden bg-black aspect-square">
              <video ref={cameraVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" aria-label="Camera preview" />
            </div>
            <button onClick={captureCameraPhoto} className="w-full bg-[#176B45] hover:bg-[#1eb968] text-white py-3 rounded-xl text-xs font-semibold cursor-pointer transition">Capture Photo</button>
            <button onClick={() => setCameraStream(null)} className="w-full bg-[#292C2A] text-white py-2.5 rounded-xl text-xs font-semibold cursor-pointer">Cancel</button>
          </div>
        ) : cameraBlocked ? (
          /* Camera blocked */
          <div className="bg-[#292C2A] rounded-2xl p-6 text-center flex flex-col items-center border border-[#323633] gap-3">
            <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center text-[#E04141]">
              <Camera className="w-7 h-7" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white mb-1">Camera Access Blocked</h4>
              <p className="text-xs text-[#D1D5DB] leading-relaxed">
                FieldVoice AI needs camera permission to photograph affected crop leaves directly in the field.
              </p>
            </div>
            <div className="bg-[#383B39] rounded-xl p-3.5 text-left w-full">
              <p className="text-xs font-bold text-white mb-1">No need to stop scanning</p>
              <p className="text-[11px] text-[#D1D5DB] leading-relaxed">
                You can pick an existing leaf photo straight from your device gallery without changing permissions now.
              </p>
            </div>
            <button
              onClick={() => galleryRef.current?.click()}
              className="w-full bg-[#176B45] hover:bg-[#1eb968] text-white py-3 rounded-xl text-xs font-semibold cursor-pointer transition"
            >
              Choose Photo from Gallery / Files
            </button>
            <button
              onClick={openCamera}
              className="text-xs text-[#A1A7A3] hover:text-white transition cursor-pointer"
            >
              Try Camera Again
            </button>
          </div>
        ) : !hasPhoto ? (
          /* Default: Add a crop photo */
          <div className="bg-[#1F2B25] border border-dashed border-[#2E6040] rounded-2xl p-5 text-center flex flex-col items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center text-[#176B45]">
              <ImageIcon className="w-7 h-7" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white mb-1">Add a crop photo</h4>
              <p className="text-xs text-[#D1D5DB]">Take a photo or choose one from your phone</p>
            </div>
            <div className="flex flex-col gap-2.5 w-full">
              <button
                onClick={openCamera}
                className="w-full bg-[#176B45] hover:bg-[#1eb968] active:scale-[0.98] transition text-white font-semibold text-xs py-3 rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                <Camera className="w-4 h-4" />
                Take Photo
              </button>
              <button
                onClick={() => galleryRef.current?.click()}
                className="w-full bg-[#27332D] hover:bg-[#32423A] active:scale-[0.98] transition text-[#FF8A32] font-semibold text-xs py-3 rounded-xl flex items-center justify-center gap-2 cursor-pointer"
              >
                <Upload className="w-4 h-4" />
                Upload Photo
              </button>
            </div>
          </div>
        ) : (
          /* Preview: photo loaded */
          <div className="bg-[#1F2B25] border border-dashed border-[#2E6040] rounded-2xl p-4 flex flex-col gap-3">
            <div className="relative rounded-xl overflow-hidden bg-black aspect-square">
              <img
                src={scanDraft.photoPreviewUrl!}
                alt="Selected leaf"
                className="w-full h-full object-cover"
              />
              <span className="absolute top-2.5 left-2.5 bg-black/60 backdrop-blur-md text-white text-[11px] px-2.5 py-0.5 rounded-full font-medium flex items-center gap-1.5 border border-white/10">
                <span className="w-2 h-2 rounded-full bg-[#22C55E]" />
                Photo ready ({scanDraft.photoSizeMb || 2.4} MB)
              </span>
            </div>
            <button
              onClick={() => galleryRef.current?.click()}
              className="w-full bg-[#292C2A] hover:bg-[#343835] text-white py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition"
            >
              <Repeat className="w-4 h-4 text-gray-300" />
              Replace Photo
            </button>
            <button
              onClick={removePhoto}
              className="w-full bg-[#2E2020] hover:bg-[#3D2525] text-[#E04141] py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition"
            >
              <Trash2 className="w-4 h-4" />
              Remove
            </button>
          </div>
        )}

        {/* ── Crop Selector ── */}
        <div className="bg-[#292C2A] rounded-2xl p-4 border border-[#323633]">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-bold text-white">
              What crop is affected? <span className="text-[#E04141]">*</span>
            </h3>
            <span className="text-xs font-semibold text-[#FF8A32]">Select 1</span>
          </div>
          <p className="text-[11px] text-[#8F9490] mb-3 leading-snug">
            Tuned for Akwa Ibom and Niger Delta coastal agricultural belts.
          </p>

          <div className="grid grid-cols-2 gap-2">
            {cropOptions.map((crop) => {
              const active = scanDraft.cropType === crop.type;
              return (
                <button
                  key={crop.type}
                  onClick={() => selectCrop(crop.type)}
                  className={`p-3 rounded-xl text-left transition cursor-pointer ${
                    active
                      ? 'bg-[#174D38] border border-[#22C55E]'
                      : 'bg-[#202321] border border-transparent hover:bg-[#252A26]'
                  }`}
                >
                  <p className="text-xs font-bold text-white">{crop.label}</p>
                  <p className="text-[10px] text-[#8F9490] mt-0.5">{crop.family}</p>
                </button>
              );
            })}
          </div>
          {scanDraft.cropType === 'Other' && <label className="mt-3 block text-xs font-semibold text-white">
            Enter crop name <span className="text-[#E04141]">*</span>
            <input required maxLength={80} value={scanDraft.customCropName}
              onChange={(event) => {
                const value = event.target.value;
                setScanDraft((prev) => ({ ...prev, customCropName: value }));
                if (validateCropSelection('Other', value) === null) setErrorBanner((current) => current === 'custom-name-required' || current === 'custom-name-invalid' ? null : current);
              }}
              placeholder="Type the name of your crop"
              className="mt-2 w-full rounded-xl border border-[#3B423E] bg-[#181B19] px-3 py-3 text-xs text-white placeholder:text-[#8F9490] focus:border-[#176B45] focus:outline-none" />
            {errorBanner === 'custom-name-required' && <span role="alert" className="mt-1 block text-[11px] text-[#FFB4A8]">Enter a crop name to continue.</span>}
            {errorBanner === 'custom-name-invalid' && <span role="alert" className="mt-1 block text-[11px] text-[#FFB4A8]">Use a crop name of up to 80 characters without angle brackets or control characters.</span>}
          </label>}
        </div>

        {/* ── Observations Input ── */}
        <div className="bg-[#292C2A] rounded-2xl p-4 border border-[#323633]">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-bold text-white">What have you noticed?</h3>
            <span className="text-xs font-semibold text-[#FF8A32]">Optional</span>
          </div>
          <p className="text-[11px] text-[#8F9490] mb-3 leading-snug">
            For example, yellow leaves, spots or holes.
          </p>

          <div className="relative">
            <textarea
              rows={4}
              maxLength={1000}
              value={scanDraft.observations}
              onChange={(e) => setScanDraft((p) => ({ ...p, observations: e.target.value }))}
              placeholder="Describe the changes you've seen on the plant..."
              className="w-full bg-[#181B19] text-white text-xs p-3.5 pr-14 rounded-xl border border-transparent focus:border-[#176B45] focus:outline-none placeholder-[#4B5563] resize-none leading-relaxed"
            />
            <button
              onClick={startSpeechRecognition}
              title="Start voice note (Pidgin / Eket / English)"
              aria-label="Start voice input"
              className={`absolute right-3 bottom-3.5 w-9 h-9 rounded-full bg-[#FF8A32] flex items-center justify-center text-white active:scale-90 shadow-md transition ${
                isRecording ? 'animate-pulse ring-4 ring-orange-400/30' : 'hover:brightness-110'
              }`}
            >
              <Mic className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-2 mt-2.5 text-[11px] text-[#8F9490]">
            <Radio className="w-3.5 h-3.5 shrink-0" />
            <span>Voice recognition: Eket / Pidgin / English</span>
          </div>
        </div>

        {/* ── Analyze Button ── */}
        <div className="flex flex-col items-center gap-2">
          <button
            onClick={handleAnalyze}
            className="w-full bg-[#176B45] hover:bg-[#1eb968] active:scale-[0.98] transition text-white font-semibold text-sm py-3.5 rounded-xl cursor-pointer shadow-md"
          >
            Analyze Crop
          </button>
          <p className="text-[11px] text-[#8F9490] text-center">
            AI results are guidance, not a confirmed diagnosis.
          </p>
        </div>

      </div>

      {/* ── Modal: Leave Scan ── */}
      {showLeaveModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div
            className="w-full max-w-[350px] bg-[#383B39] rounded-[28px] p-6 text-center text-white shadow-2xl flex flex-col items-center animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center mb-4 text-[#FF8A32]">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h2 className="text-lg font-bold mb-2">Leave this scan?</h2>
            <p className="text-xs text-[#D1D5DB] leading-relaxed mb-6">
              Your current scan has not been saved. If you leave, you may lose this assessment.
            </p>
            <div className="w-full flex flex-col gap-2.5">
              <button
                onClick={() => setShowLeaveModal(false)}
                className="w-full py-3.5 rounded-xl bg-[#176B45] hover:bg-[#1eb968] font-semibold text-sm transition cursor-pointer"
              >
                Continue Scanning
              </button>
              <button
                onClick={() => { setShowLeaveModal(false); resetScanDraft(); navigate('/'); }}
                className="w-full py-2.5 text-sm text-[#E04141] font-semibold hover:underline transition cursor-pointer"
              >
                Leave Scan
              </button>
            </div>
          </div>
          <div className="absolute inset-0 -z-10" onClick={() => setShowLeaveModal(false)} />
        </div>
      )}
    </div>
  );
};
