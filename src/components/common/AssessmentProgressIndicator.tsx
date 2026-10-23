import React from 'react';

type AssessmentProgressIndicatorProps = {
  progress: number;
  message: string;
};

export const AssessmentProgressIndicator: React.FC<AssessmentProgressIndicatorProps> = ({ progress, message }) => {
  const percent = Math.max(0, Math.min(100, Math.floor(progress)));
  return (
    <section className="w-full min-w-0 rounded-xl border border-[#323633] bg-[#181B19] p-3" aria-label="Crop assessment progress">
      <div className="mb-2 flex items-start justify-between gap-3">
        <p role="status" aria-live="polite" aria-atomic="true" className="min-h-5 min-w-0 flex-1 text-xs font-medium leading-5 text-[#D1D5DB]">
          {message}
        </p>
        <span className="shrink-0 text-xs font-bold tabular-nums text-white">{percent}%</span>
      </div>
      <div
        role="progressbar"
        aria-label="Estimated crop assessment progress"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-valuetext={`${percent}% — ${message}`}
        className="h-2 w-full overflow-hidden rounded-full bg-[#383B39]"
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#176B45] to-[#22C55E] transition-[width] duration-300 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>
    </section>
  );
};
