import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Volume2,
  CheckCircle2,
  AlertOctagon,
  Clock,
  Image as ImageIcon,
} from 'lucide-react';
import { TopHeader } from '../components/common/TopHeader';
import { ScanImage } from '../components/common/ScanImage';
import { useApp } from '../context/useApp';
import type { CropType, ScanItem } from '../types';

const getBadgeClasses = (variant: 'red' | 'amber' | 'green') => {
  if (variant === 'red')   return 'bg-[#421D1D] text-[#E04141]';
  if (variant === 'amber') return 'bg-[#3E2F1E] text-[#FF8A32]';
  return 'bg-[#1B3E2D] text-[#22C55E]';
};

const FooterIcon: React.FC<{ icon: ScanItem['footerIcon'] }> = ({ icon }) => {
  if (icon === 'speaker') return <Volume2 className="w-3.5 h-3.5 text-gray-300" />;
  if (icon === 'check')   return <CheckCircle2 className="w-3.5 h-3.5 text-[#22C55E]" />;
  if (icon === 'alert')   return <AlertOctagon className="w-3.5 h-3.5 text-[#E04141]" />;
  return <Clock className="w-3.5 h-3.5 text-gray-400" />;
};

interface HistoryFilterChipProps {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}

const HistoryFilterChip: React.FC<HistoryFilterChipProps> = ({ label, count, active, onClick }) => (
  <button
    onClick={onClick}
    className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shrink-0 ${
      active ? 'bg-[#176B45] text-white' : 'bg-[#F2F0E8] text-[#202321] hover:bg-white'
    }`}
  >
    {label}
    <span
      className={`w-5 h-5 rounded-full text-[11px] font-bold flex items-center justify-center ${
        active ? 'bg-[#114F33] text-white' : 'bg-[#D9D7CE] text-[#202321]'
      }`}
    >
      {count}
    </span>
  </button>
);

export const HistoryScreen: React.FC = () => {
  const navigate = useNavigate();
  const { scans } = useApp();
  const [filter, setFilter] = useState<'All' | CropType>('All');

  const cassavaCount  = scans.filter((s) => s.cropType === 'Cassava').length;
  const plantainCount = scans.filter((s) => s.cropType === 'Plantain').length;
  const hasSampleScans = scans.some((scan) => /^scan-[1-4]$/.test(scan.id));

  const displayed = filter === 'All' ? scans : scans.filter((s) => s.cropType === filter);

  return (
    <div className="flex flex-col gap-4 pb-4">
      <TopHeader
        variant="page"
        title="Crop check history"
        subtitle="See your earlier crop checks."
      />

      <div className="px-4 flex flex-col gap-4">
        {hasSampleScans && (
          <p className="rounded-xl border border-[#B36A2D] bg-[#2E2319] px-3 py-2 text-[11px] leading-relaxed text-[#F2D1AE]">
            Sample history is for demonstration. These example crop observations are not results from an AI assessment of your plants.
          </p>
        )}

        {/* Filter chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none -mx-0.5 px-0.5">
          <HistoryFilterChip
            label="All Crops"
            count={scans.length}
            active={filter === 'All'}
            onClick={() => setFilter('All')}
          />
          {cassavaCount > 0 && (
            <HistoryFilterChip
              label="Cassava"
              count={cassavaCount}
              active={filter === 'Cassava'}
              onClick={() => setFilter('Cassava')}
            />
          )}
          {plantainCount > 0 && (
            <HistoryFilterChip
              label="Plantain"
              count={plantainCount}
              active={filter === 'Plantain'}
              onClick={() => setFilter('Plantain')}
            />
          )}
        </div>

        {/* Empty state */}
        {displayed.length === 0 && (
          <div className="bg-[#292C2A] rounded-2xl p-8 text-center flex flex-col items-center border border-[#323633] mt-2">
            <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center mb-4 text-[#176B45]">
              <ImageIcon className="w-8 h-8" />
            </div>
            <h4 className="text-base font-bold text-white mb-2">No scans yet</h4>
            <p className="text-xs text-[#D1D5DB] leading-relaxed mb-6 max-w-[260px]">
              Your saved crop checks will appear here after your first scan.
            </p>
            <button
              onClick={() => navigate('/scan')}
              className="bg-[#176B45] hover:bg-[#1eb968] text-white px-5 py-3 rounded-xl text-xs font-semibold transition cursor-pointer shadow-md"
            >
              Scan your first crop
            </button>
          </div>
        )}

        {/* Scan cards */}
        {displayed.length > 0 && (
          <div className="flex flex-col gap-3">
            {displayed.map((item) => (
              <div
                key={item.id}
                onClick={() => navigate(`/scan/${item.id}`)}
                className="bg-[#292C2A] rounded-2xl p-4 border border-[#323633] hover:border-[#404540] transition cursor-pointer"
              >
                {/* Header row */}
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
                  <span
                    className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full shrink-0 ${getBadgeClasses(item.statusVariant)}`}
                  >
                    {item.status}
                  </span>
                </div>

                {/* Summary quote box */}
                <div className="bg-[#383B39] rounded-xl p-3 mb-3">
                  <p className="text-xs text-[#D1D5DB] leading-relaxed line-clamp-2">
                    {item.summary}
                  </p>
                </div>

                {/* Footer row */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <FooterIcon icon={item.footerIcon} />
                    <span
                      className={`text-[11px] ${
                        item.footerIcon === 'alert' ? 'text-[#E04141] font-semibold' : 'text-gray-300'
                      }`}
                    >
                      {item.footerStatus}
                    </span>
                  </div>
                  <span className="text-[11px] font-semibold text-[#1EB968] flex items-center gap-0.5">
                    {item.footerActionLabel}
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
