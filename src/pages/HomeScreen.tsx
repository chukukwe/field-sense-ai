import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Camera,
  ArrowRight,
  Volume2,
  CheckCircle2,
  AlertOctagon,
  Clock,
  Sun,
  Check,
  Image as ImageIcon,
  Sprout,
} from 'lucide-react';
import { TopHeader } from '../components/common/TopHeader';
import { ScanImage } from '../components/common/ScanImage';
import { useApp } from '../context/useApp';
import type { ScanItem } from '../types';

/* Badge colours exactly matching the 3 variants in the Figma designs */
const getBadgeClasses = (variant: 'red' | 'amber' | 'green') => {
  if (variant === 'red') return 'bg-[#421D1D] text-[#E04141]';
  if (variant === 'amber') return 'bg-[#3E2F1E] text-[#FF8A32]';
  return 'bg-[#1B3E2D] text-[#22C55E]';
};

const FooterIcon: React.FC<{ icon: ScanItem['footerIcon'] }> = ({ icon }) => {
  if (icon === 'speaker') return <Volume2 className="w-4 h-4 text-gray-300" />;
  if (icon === 'check')   return <CheckCircle2 className="w-4 h-4 text-[#22C55E]" />;
  if (icon === 'alert')   return <AlertOctagon className="w-4 h-4 text-[#E04141]" />;
  return <Clock className="w-4 h-4 text-gray-400" />;
};

export const HomeScreen: React.FC = () => {
  const navigate = useNavigate();
  const { scans, resetScanDraft } = useApp();

  const recentScans = scans.slice(0, 3);
  const hasSampleScans = scans.some((scan) => /^scan-[1-4]$/.test(scan.id));

  return (
    <div className="flex flex-col">
      {/* ── App Header ── */}
      <TopHeader variant="home" />

      <div className="px-4 flex flex-col gap-4 pb-2">

        {hasSampleScans && (
          <p className="rounded-xl border border-[#B36A2D] bg-[#2E2319] px-3 py-2 text-[11px] leading-relaxed text-[#F2D1AE]">
            Sample history is for demonstration. These example crop observations are not results from an AI assessment of your plants.
          </p>
        )}

        {/* ── Hero Card ── */}
        <div className="relative bg-[#1B4733] rounded-2xl px-5 pt-5 pb-5 overflow-hidden shadow-lg border border-[#235840]">
          {/* subtle radial glow */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage:
                'radial-gradient(ellipse at 90% 10%, rgba(34,197,94,0.15) 0%, transparent 60%), ' +
                'radial-gradient(ellipse at 10% 90%, rgba(21,128,61,0.12) 0%, transparent 50%)',
            }}
          />
          <div className="relative z-10">
            <h2 className="text-[22px] font-extrabold text-white leading-tight tracking-tight">
              Let's keep your crops<br />healthy.
            </h2>
            <p className="text-[13px] text-white/80 mt-2 leading-relaxed font-normal">
              Spot possible crop problems early and find out what to do next.
            </p>

            <button
              onClick={() => { resetScanDraft(); navigate('/scan'); }}
              className="mt-4 w-full bg-[#176B45] hover:bg-[#1eb968] active:scale-[0.98] transition text-white font-semibold text-sm py-3 px-4 rounded-xl flex items-center justify-center gap-2 shadow-md cursor-pointer"
            >
              <Camera className="w-4 h-4" />
              Check a crop
            </button>
          </div>
        </div>

        <button type="button" aria-label="Open Farm Guide to see your crop plan" onClick={() => navigate('/farm-guide')} className="flex items-center gap-3 rounded-2xl border border-[#286446] bg-gradient-to-r from-[#1B4733] to-[#292C2A] p-4 text-left transition hover:border-[#1EB968] hover:shadow-[0_0_18px_rgba(30,185,104,0.12)]">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#174D38] text-[#A7F3D0]"><Sprout className="h-5 w-5" aria-hidden="true" /></span>
          <span className="min-w-0 flex-1"><span className="block text-sm font-bold text-white">Farm Guide</span><span className="mt-0.5 block text-xs text-[#D1D5DB]">See your farming zone and crop calendar.</span></span>
          <span className="flex shrink-0 items-center gap-1 rounded-lg bg-[#176B45] px-2.5 py-2 text-[10px] font-bold text-white sm:px-3 sm:text-xs">See plan</span>
        </button>

        {/* ── Recent Scans Section ── */}
        <div className="flex flex-col gap-3">
          {/* Section header */}
          <div className="flex items-center justify-between pt-1">
            <span className="text-sm font-bold text-white">
              Recent crop checks ({recentScans.length})
            </span>
            <button
              onClick={() => navigate('/history')}
              className="text-xs font-semibold text-[#1EB968] hover:underline cursor-pointer"
            >
              View all
            </button>
          </div>

          {/* Empty state */}
          {recentScans.length === 0 && (
            <div className="bg-[#292C2A] rounded-2xl p-7 text-center flex flex-col items-center border border-[#323633]">
              <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center mb-3 text-[#176B45]">
                <ImageIcon className="w-7 h-7" />
              </div>
              <h4 className="text-sm font-bold text-white mb-1">Your field history starts here</h4>
              <p className="text-xs text-[#A1A7A3] mb-4 max-w-[230px] leading-relaxed">
                Your crop checks will appear here after your first scan.
              </p>
              <button
                onClick={() => navigate('/scan')}
                className="bg-[#176B45] hover:bg-[#1eb968] text-white px-5 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer shadow-md"
              >
                Check your first crop
              </button>
            </div>
          )}

          {/* Scan cards */}
          {recentScans.map((item) => (
            <div
              key={item.id}
              onClick={() => navigate(`/scan/${item.id}`)}
              className="bg-[#292C2A] rounded-2xl p-4 border border-[#323633] hover:border-[#404540] transition cursor-pointer"
            >
              {/* Top row: thumbnail, name, badge */}
              <div className="flex items-center gap-3 mb-3">
                <ScanImage
                  scan={item}
                  fallbackIconOnly
                  alt={item.title}
                  className="w-12 h-12 rounded-xl object-cover bg-[#181B19] shrink-0"
                  loading="lazy"
                />
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-bold text-white leading-snug truncate">
                    {item.title}
                  </h4>
                  <span className="text-[11px] text-[#8F9490]">{item.date}</span>
                </div>
                <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full shrink-0 ${getBadgeClasses(item.statusVariant)}`}>
                  {item.status}
                </span>
              </div>

              {/* Summary quote box */}
              <div className="bg-[#383B39] rounded-xl p-3 mb-3">
                <p className="text-xs text-[#D1D5DB] leading-relaxed line-clamp-2">
                  {item.summary}
                </p>
              </div>

              {/* Footer: status + action link */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <FooterIcon icon={item.footerIcon} />
                  <span className="text-[11px] text-gray-300">{item.footerStatus}</span>
                </div>
                <span className="text-[11px] font-semibold text-[#1EB968] flex items-center gap-0.5">
                  {item.footerActionLabel}
                  <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* ── "For a Better Scan" Tips Card ── */}
        <div className="bg-[#1F2B25] rounded-2xl p-4 border border-[#273B30] mb-1">
          <Sun className="w-5 h-5 text-[#FF8A32] mb-2" />
          <h4 className="text-sm font-bold text-white">For a better scan</h4>
          <p className="text-xs text-[#D1D5DB] mt-1 leading-relaxed">
            Take a clear photo so we can see the leaves.
          </p>

          <ul className="mt-3 space-y-2">
            {[
              'Get close to the affected leaf.',
              'Use natural light when possible.',
              'Capture the affected area clearly.',
            ].map((tip) => (
              <li key={tip} className="flex items-center gap-2 text-xs text-white">
                <span className="w-4 h-4 min-w-[16px] rounded-full bg-[#176B45] flex items-center justify-center">
                  <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                </span>
                {tip}
              </li>
            ))}
          </ul>
        </div>

      </div>
    </div>
  );
};
