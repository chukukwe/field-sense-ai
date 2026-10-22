import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Camera, Clock, Trash2, Image as ImageIcon } from 'lucide-react';
import { TopHeader } from '../components/common/TopHeader';
import { ScanImage } from '../components/common/ScanImage';
import { useApp } from '../context/useApp';

export const ScanDetailsScreen: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { scans, deleteScan, setActiveModal } = useApp();

  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const scan = scans.find((item) => item.id === id);
  const diagnosis = scan?.diagnosis;
  const assessment = scan?.assessment;
  const isSampleScan = Boolean(scan && /^scan-[1-4]$/.test(scan.id));

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
            scan={scan}
            alt={scan.title}
            className="w-full h-full object-cover"
          />
          <span className="absolute top-3 left-3 bg-black/60 backdrop-blur-md text-white text-[11px] px-3 py-1 rounded-full font-medium flex items-center gap-1.5 border border-white/10">
            <ImageIcon className="w-3.5 h-3.5 shrink-0" />
            {scan.cropType} • Scanned {scan.date}
          </span>
        </div>

        {/* ── What Was Found ── */}
        <div className="bg-[#292C2A] rounded-2xl p-4 border border-[#323633]">
          <div className="flex items-center justify-between mb-3 gap-2">
            <h3 className="text-base font-bold text-white">
              {diagnosis || assessment ? 'What was found' : 'Scan status'}
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
            {/* Primary Diagnosis */}
            {diagnosis && (
              <div className="bg-[#1F2B25] p-3.5 rounded-xl border border-[#273B30]">
                <span className="text-[11px] font-bold text-[#FF8A32] block mb-0.5">
                  Primary Diagnosis
                </span>
                <h4 className="text-sm font-bold text-[#22C55E] mb-1 leading-snug">
                  {diagnosis.title}
                </h4>
                <p className="text-[11px] text-[#A1A7A3]">
                  Possible cause identified • Evidence based on visible symptoms
                </p>
              </div>
            )}

            {!diagnosis && !assessment && (
              <div className="bg-[#2E2319] p-3.5 rounded-xl border border-[#B36A2D]">
                <h4 className="text-sm font-bold text-white mb-1">{scan.assessmentStatus === 'failed' ? 'Assessment could not be completed' : 'No AI assessment available'}</h4>
                <p className="text-[11px] text-[#D1D5DB] leading-relaxed">{scan.summary}</p>
                {scan.userObservations && (
                  <p className="text-[11px] text-[#D1D5DB] mt-2">Your note: {scan.userObservations}</p>
                )}
              </div>
            )}

            {assessment && (
              <div className="bg-[#1F2B25] p-3.5 rounded-xl border border-[#273B30] flex flex-col gap-3">
                <div>
                  <span className="text-[11px] font-bold text-[#FF8A32] block mb-0.5">{assessment.status === 'inconclusive' ? 'Inconclusive visual assessment' : 'AI-assisted visual assessment'}</span>
                  <h4 className="text-sm font-bold text-white mb-1 leading-snug">{assessment.summary}</h4>
                  <p className="text-[11px] text-[#A1A7A3]">Crop: {assessment.cropIdentification} · Qualitative confidence: {assessment.confidence}</p>
                  <p className="text-[11px] text-[#A1A7A3] mt-1">{assessment.confidenceReason}</p>
                </div>
                {!!assessment.observedSymptoms.length && <div>
                  <h5 className="text-xs font-bold text-white mb-1">Visible observations</h5>
                  <ul className="list-disc pl-4 text-[11px] text-[#D1D5DB] space-y-1">{assessment.observedSymptoms.map((symptom, index) => <li key={`${index}-${symptom}`}>{symptom}</li>)}</ul>
                </div>}
                {!!assessment.possibleCauses.length && <div>
                  <h5 className="text-xs font-bold text-white mb-1">Possible causes</h5>
                  <div className="flex flex-col gap-2">{assessment.possibleCauses.map((cause, index) => <div key={`${index}-${cause.name}`} className="bg-[#383B39] p-3 rounded-xl">
                    <p className="text-xs font-bold text-white">{cause.name} <span className="text-[#FF8A32] font-medium">· {cause.likelihood.replace('_', ' ')}</span></p>
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
                  <h5 className="text-xs font-bold text-white mb-1">Visible Symptoms</h5>
                  <p className="text-xs text-[#D1D5DB] leading-relaxed">
                    {diagnosis.observedOnLeaf}
                  </p>
                </div>
              )}

              {diagnosis?.whyItMatters && (
                <div className="border-t border-white/10 pt-2.5">
                  <h5 className="text-xs font-bold text-white mb-1">Context & Spread</h5>
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
                  <h5 className="text-xs font-bold text-white mb-1">Assessment limitations</h5>
                  <ul className="list-disc pl-4 text-xs text-[#D1D5DB] leading-relaxed space-y-1">{assessment.limitations.map((limitation, index) => <li key={`${index}-${limitation}`}>{limitation}</li>)}</ul>
                </div>}
                <div className="border-t border-white/10 pt-2.5">
                  <h5 className="text-xs font-bold text-white mb-1">When to seek help</h5>
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
            onClick={() => navigate('/scan')}
            className="w-full bg-[#176B45] hover:bg-[#1eb968] active:scale-[0.98] transition text-white font-semibold text-sm py-3.5 rounded-xl flex items-center justify-center gap-2 shadow-md cursor-pointer"
          >
            <Camera className="w-4 h-4" />
            Scan Another Crop
          </button>

          <div className="flex items-center justify-between px-1">
            <button
              onClick={() => navigate('/history')}
              className="text-xs text-[#D1D5DB] hover:text-white flex items-center gap-1.5 transition cursor-pointer py-2"
            >
              <Clock className="w-4 h-4 text-gray-400" />
              <span>View History</span>
            </button>

            <button
              onClick={() => setShowDeleteModal(true)}
              className="text-xs text-[#E04141] hover:underline flex items-center gap-1.5 transition cursor-pointer py-2"
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
