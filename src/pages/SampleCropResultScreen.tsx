import React from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { TopHeader } from '../components/common/TopHeader';
import { canOfferSampleCropResult, getSampleCropResult, type ProviderFailure } from '../data/sampleCropResults';
import { useApp } from '../context/useApp';
import type { CropType } from '../types';

interface SampleResultNavigationState {
  scanId?: unknown;
  source?: unknown;
  cropType?: unknown;
  failure?: unknown;
}

function isCropType(value: unknown): value is CropType {
  return ['Cassava', 'Plantain', 'Maize', 'Vegetables', 'Other'].includes(String(value));
}

export const SampleCropResultScreen: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { scans } = useApp();
  const state = location.state as SampleResultNavigationState | null;
  const cropType = isCropType(state?.cropType) ? state.cropType : undefined;
  const failure = typeof state?.failure === 'object' && state.failure !== null
    ? state.failure as ProviderFailure
    : undefined;
  const sample = cropType ? getSampleCropResult(cropType) : undefined;
  const scan = typeof state?.scanId === 'string' ? scans.find((item) => item.id === state.scanId) : undefined;
  const sameFailure = scan?.assessmentFailure?.code === failure?.code && scan?.assessmentFailure?.status === failure?.status;
  const allowed = Boolean(cropType && canOfferSampleCropResult(failure, cropType) && sample
    && scan?.assessmentStatus === 'failed' && !scan.assessment && !scan.diagnosis
    && scan.cropType === cropType && sameFailure);

  if (!allowed || !sample || typeof state?.scanId !== 'string' || !/^scan-[a-zA-Z0-9-]{1,80}$/.test(state.scanId)
    || (state.source !== 'assessment' && state.source !== 'scan-details')) return <Navigate to="/" replace />;

  const returnPath = state.source === 'assessment' ? `/assessment/${state.scanId}` : `/scan/${state.scanId}`;
  const result = sample.assessment;

  return (
    <div className="flex flex-col gap-4 pb-8">
      <TopHeader variant="detail" title="Sample result" showHelp onBack={() => navigate(returnPath, { replace: true })} />
      <main className="px-4 flex flex-col gap-4">
        <section className="rounded-2xl border border-[#5C3A1E] bg-[#2E2319] p-4">
          <span className="inline-flex rounded-full bg-[#3E2F1E] px-2.5 py-1 text-[11px] font-bold text-[#FFD29D]">Sample result</span>
          <h2 className="mt-3 text-base font-bold leading-snug text-white">Sample result — this was not checked from your photo.</h2>
          <p className="mt-1 text-xs leading-relaxed text-[#F2D1AE]">The crop check is unavailable right now. You can try your real scan again later.</p>
        </section>

        <section className="rounded-2xl border border-[#323633] bg-[#292C2A] p-4">
          <p className="text-[11px] font-semibold text-[#A7F3D0]">{sample.cropType} · prepared example</p>
          <h2 className="mt-1 text-base font-bold text-white">{sample.title}</h2>
          <p className="mt-1 text-xs leading-relaxed text-[#D1D5DB]">{sample.explanation}</p>
          <div className="mt-3 rounded-xl bg-[#383B39] p-3">
            <h3 className="text-xs font-bold text-white">Possible problem</h3>
            <p className="mt-1 text-xs text-[#D1D5DB]">{sample.possibleProblem}</p>
            <p className="mt-2 text-[11px] text-[#A1A7A3]">Sample only · Not checked from your photo</p>
          </div>
        </section>

        <InfoCard title="What may be seen" items={result.observedSymptoms} />
        <InfoCard title="What may be wrong" items={result.possibleCauses.map((cause) => `${cause.name}: ${cause.explanation}`)} />
        <InfoCard title="What to do next" items={result.recommendedActions} />
        <InfoCard title="How to stop it spreading" items={result.preventionTips} />
        <section className="rounded-2xl border border-[#323633] bg-[#292C2A] p-4">
          <h3 className="text-xs font-bold text-white">How sure?</h3>
          <p className="mt-1 text-xs text-[#D1D5DB]">Not sure — this is a prepared example, not a result from your crop.</p>
          <h3 className="mt-3 text-xs font-bold text-white">When to ask for help</h3>
          <p className="mt-1 text-xs leading-relaxed text-[#D1D5DB]">{result.whenToSeekHelp}</p>
        </section>
        <button type="button" onClick={() => navigate(returnPath, { replace: true })} className="w-full rounded-xl bg-[#176B45] py-3 text-xs font-semibold text-white transition hover:bg-[#1eb968]">Back to your scan</button>
      </main>
    </div>
  );
};

const InfoCard: React.FC<{ title: string; items: string[] }> = ({ title, items }) => (
  <section className="rounded-2xl border border-[#323633] bg-[#292C2A] p-4">
    <h3 className="text-xs font-bold text-white">{title}</h3>
    {items.length ? <ul className="mt-2 list-disc space-y-1 pl-4 text-xs leading-relaxed text-[#D1D5DB]">{items.map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}</ul>
      : <p className="mt-2 text-xs leading-relaxed text-[#D1D5DB]">No clear problem is listed in this sample.</p>}
  </section>
);
