import React, { useEffect, useState } from 'react';
import { CalendarDays, ChevronDown, LoaderCircle, MapPin, Sprout } from 'lucide-react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { TopHeader } from '../components/common/TopHeader';
import { farmGuideCropDetails } from '../data/farmGuideCropDetails';
import {
  farmGuideData,
  getFarmGuideCalendarEntries,
  getFarmGuideLocation,
  getFarmGuideSeasonLabels,
  getFarmGuideZone,
  type FarmGuideActivity,
} from '../data/farmGuideData';
import { saveFarmGuideLocation } from '../data/farmGuideLocationStorage';

const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const seasonNames: Record<string, string> = {
  dry_season: 'Dry season',
  first_season: 'First season',
  main_season: 'Main season',
  second_season: 'Second season',
};

function getCurrentLagosMonth() {
  return Number(new Intl.DateTimeFormat('en', { month: 'numeric', timeZone: 'Africa/Lagos' }).format(new Date()));
}

function formatSeasonName(season: string) {
  return seasonNames[season] ?? season.replaceAll('_', ' ');
}

export const FarmGuidePlanScreen: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const stateId = Number(searchParams.get('stateId'));
  const lgaId = Number(searchParams.get('lgaId'));
  const state = farmGuideData.states.find((item) => item.id === stateId);
  const lga = getFarmGuideLocation(lgaId);
  const isLocationValid = Boolean(state && lga && lga.stateId === state.id);
  const zone = isLocationValid && lga ? getFarmGuideZone(lga.zoneId) : undefined;
  const [isPreparing, setIsPreparing] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState('Matching your area to its farming zone…');
  const [openCardKey, setOpenCardKey] = useState<string | null>(null);

  useEffect(() => {
    const messageTimer = window.setTimeout(() => setLoadingMessage('Organizing the seasonal crop calendar…'), 600);
    const finishTimer = window.setTimeout(() => setIsPreparing(false), 2000);
    return () => {
      window.clearTimeout(messageTimer);
      window.clearTimeout(finishTimer);
    };
  }, []);

  useEffect(() => {
    if (isLocationValid && state && lga) saveFarmGuideLocation(state.id, lga.id);
  }, [isLocationValid, lga, state]);

  if (!isLocationValid || !state || !lga || !zone) return <Navigate to="/farm-guide" replace />;

  const month = getCurrentLagosMonth();
  const nextMonth = (month % 12) + 1;
  const monthName = monthNames[month - 1] ?? 'This month';
  const nextMonthName = monthNames[nextMonth - 1] ?? 'Next month';
  const seasons = getFarmGuideSeasonLabels(zone.id, month).map(formatSeasonName);
  const changeLocationUrl = `/farm-guide/area?stateId=${state.id}&lgaId=${lga.id}`;

  return (
    <div className="flex flex-col gap-4 pb-6">
      <TopHeader variant="detail" title="Farm Guide" onBack={() => navigate('/', { replace: true })} />

      {isPreparing ? (
        <main className="px-4" aria-live="polite" aria-busy="true">
          <div className="flex min-h-[260px] flex-col items-center justify-center rounded-2xl border border-[#235840] bg-[#1B4733] px-6 py-8 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-[#A7F3D0]">
              <LoaderCircle className="h-7 w-7 animate-spin" aria-hidden="true" />
            </span>
            <h2 className="mt-4 text-base font-bold text-white">Putting your farm plan together</h2>
            <p className="mt-2 text-xs text-white/80" role="status">{loadingMessage}</p>
            <div className="mt-5 h-1.5 w-full max-w-56 overflow-hidden rounded-full bg-white/15" aria-hidden="true">
              <div className="farm-guide-progress h-full w-2/5 rounded-full bg-[#5EE49A]" />
            </div>
            <p className="mt-4 text-[10px] text-white/60">Using your selected area and current season</p>
          </div>
        </main>
      ) : (
        <main className="px-4 flex flex-col gap-4">
          <section className="rounded-2xl border border-[#323633] bg-[#292C2A] p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-[#A1A7A3]">Your farm plan</p>
                <h2 className="mt-1 text-base font-bold text-white">{lga.name}, {state.name}</h2>
                <div className="mt-2 flex items-start gap-2 text-[#A7F3D0]">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  <div>
                    <p className="text-[11px] text-[#A1A7A3]">Estimated farming zone</p>
                    <p className="text-xs font-semibold text-white">{zone.name}</p>
                  </div>
                </div>
              </div>
              <button type="button" onClick={() => navigate(changeLocationUrl, { replace: true })} className="shrink-0 rounded-lg px-2 py-1 text-xs font-semibold text-[#1EB968] hover:bg-white/5">Change area</button>
            </div>
            <div className="mt-3 flex items-center gap-2 rounded-xl bg-[#202321] p-3">
              <CalendarDays className="h-4 w-4 shrink-0 text-[#1EB968]" aria-hidden="true" />
              <div>
                <p className="text-[11px] font-semibold text-white">{monthName} season window</p>
                <p className="text-[11px] text-[#D1D5DB]">{seasons.length ? seasons.join(' · ') : 'No season window is listed for this month.'}</p>
              </div>
            </div>
            {lga.needsReview && <p className="mt-3 text-[10px] leading-relaxed text-[#FFD29D]">This LGA’s zone assignment is approximate and needs local review.</p>}
          </section>

          <section className="flex flex-col gap-3" aria-live="polite">
            <div className="px-1">
              <h2 className="text-sm font-bold text-white">Crop calendar</h2>
              <p className="mt-1 text-[11px] text-[#A1A7A3]">Crop windows for {zone.name} in {monthName}.</p>
            </div>
            <CropWindowList
              title={`Plant this month · ${monthName}`}
              activity="plant"
              entries={getFarmGuideCalendarEntries(zone.id, month, 'plant')}
              openCardKey={openCardKey}
              onToggle={setOpenCardKey}
            />
            <CropWindowList
              title={`Harvest this month · ${monthName}`}
              activity="harvest"
              entries={getFarmGuideCalendarEntries(zone.id, month, 'harvest')}
              openCardKey={openCardKey}
              onToggle={setOpenCardKey}
            />
            <CropWindowList
              title={`Plant next month · ${nextMonthName}`}
              activity="plant"
              entries={getFarmGuideCalendarEntries(zone.id, nextMonth, 'plant')}
              openCardKey={openCardKey}
              onToggle={setOpenCardKey}
            />
          </section>
        </main>
      )}
    </div>
  );
};

type CalendarEntry = ReturnType<typeof getFarmGuideCalendarEntries>[number] & { crop: string };

const CropWindowList: React.FC<{
  title: string;
  activity: FarmGuideActivity;
  entries: CalendarEntry[];
  openCardKey: string | null;
  onToggle: (key: string | null) => void;
}> = ({ title, activity, entries, openCardKey, onToggle }) => (
  <section className="flex flex-col gap-2" aria-label={title}>
    <h3 className="px-1 text-sm font-bold text-white">{title}</h3>
    {entries.length ? entries.map((entry) => {
      const cardKey = `${activity}-${entry.month}-${entry.cropId}`;
      const detail = farmGuideCropDetails[entry.crop];
      const isOpen = openCardKey === cardKey;
      const detailPanelId = `crop-guide-${cardKey}`;
      return (
        <article key={cardKey} className="overflow-hidden rounded-2xl border border-[#323633] bg-[#292C2A]">
          <button
            type="button"
            aria-expanded={isOpen}
            aria-controls={detailPanelId}
            onClick={() => onToggle(isOpen ? null : cardKey)}
            className="flex w-full items-center gap-3 p-3 text-left transition hover:bg-white/[0.03] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#1EB968]"
          >
            {detail ? <img src={detail.image} alt={detail.imageAlt} className="h-16 w-16 shrink-0 rounded-xl object-cover" loading="lazy" /> : <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-[#174D38] text-[#A7F3D0]"><Sprout className="h-6 w-6" aria-hidden="true" /></span>}
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold text-white">{entry.crop}</span>
              <span className="mt-0.5 block text-[11px] text-[#A1A7A3]">{formatSeasonName(entry.seasonLabel)} · {activity === 'plant' ? 'Planting window' : 'Harvest window'}</span>
              <span className="mt-1 block text-[10px] font-medium text-[#1EB968]">{isOpen ? 'Hide crop details' : 'View crop details'}</span>
            </span>
            <ChevronDown className={`h-4 w-4 shrink-0 text-[#A1A7A3] transition-transform ${isOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
          </button>
          <div id={detailPanelId} hidden={!isOpen} className="border-t border-[#3B423E] px-4 pb-4 pt-3">
            {detail && (
              <>
                <p className="text-xs leading-relaxed text-[#D1D5DB]">{detail.about}</p>
                <h4 className="mt-3 text-xs font-bold text-white">How to plant</h4>
                <ul className="mt-2 flex flex-col gap-2">
                  {detail.plantingNotes.map((note) => <li key={note} className="flex gap-2 text-[11px] leading-relaxed text-[#D1D5DB]"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#1EB968]" aria-hidden="true" />{note}</li>)}
                </ul>
              </>
            )}
            {!detail && <p className="text-xs text-[#D1D5DB]">Crop planting details are not available.</p>}
          </div>
        </article>
      );
    }) : (
      <p className="rounded-2xl border border-[#323633] bg-[#292C2A] p-4 text-xs text-[#D1D5DB]">No crops are listed for this window.</p>
    )}
  </section>
);
