import { FarmGuideRainfall } from '../components/common/FarmGuideRainfall';
import React, { useEffect, useState } from 'react';
import { ChevronDown, MapPin, Sprout } from 'lucide-react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { TopHeader } from '../components/common/TopHeader';
import { farmGuideCropDetails } from '../data/farmGuideCropDetails';
import { farmGuideData, getFarmGuideCalendarEntries, getFarmGuideLocation, getFarmGuideZone, type FarmGuideActivity } from '../data/farmGuideData';
import { saveFarmGuideLocation } from '../data/farmGuideLocationStorage';
import { cropCare, getLagosMonth, getPlanningMonth, getPlantingWindows, guideCheckedOn, guideSources, readGuidePreferences, saveGuidePreferences, type GuidePreferences, type WaterSupply } from '../data/farmGuidePlanning';

const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const seasonNames: Record<string, string> = { dry_season: 'Dry season', first_season: 'First season', main_season: 'Main season', second_season: 'Second season' };
function formatSeasonName(season: string) { return seasonNames[season] ?? season.replaceAll('_', ' '); }
const cropNames = [...new Set([...Object.keys(cropCare), ...Object.keys(farmGuideCropDetails)])];
const fieldClass = 'mt-2 w-full rounded-xl border border-[#3B423E] bg-[#181B19] p-3 text-xs text-white';
const sectionClass = 'rounded-2xl border border-[#323633] bg-[#292C2A] p-4';

export const FarmGuidePlanScreen: React.FC = () => {
  const [params] = useSearchParams();
  const stateId = Number(params.get('stateId'));
  const lgaId = Number(params.get('lgaId'));
  const lga = getFarmGuideLocation(lgaId);
  const state = farmGuideData.states.find((item) => item.id === stateId);
  const zone = lga && state && lga.stateId === state.id ? getFarmGuideZone(lga.zoneId) : undefined;
  if (!lga || !state || !zone) return <Navigate to="/farm-guide/area" replace />;
  return <AreaPlan key={`${state.id}-${lga.id}`} state={state} lga={lga} zone={zone} />;
};

const AreaPlan: React.FC<{
  state: (typeof farmGuideData.states)[number];
  lga: (typeof farmGuideData.locations)[number];
  zone: (typeof farmGuideData.zones)[number];
}> = ({ state, lga, zone }) => {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const month = getPlanningMonth(params.get('month'));
  const nextMonth = month % 12 + 1;
  const [preferences, setPreferences] = useState<GuidePreferences>(() => readGuidePreferences(state.id, lga.id, cropNames));
  const [openCardKey, setOpenCardKey] = useState<string | null>(null);
  const care = cropCare[preferences.crop];
  const detail = farmGuideCropDetails[preferences.crop];

  useEffect(() => { saveFarmGuideLocation(state.id, lga.id); }, [state.id, lga.id]);
  useEffect(() => { saveGuidePreferences(state.id, lga.id, preferences); }, [state.id, lga.id, preferences]);

  return <div className="flex flex-col gap-4 pb-6">
    <TopHeader variant="detail" title="Farm Guide" onBack={() => navigate('/', { replace: true })} />
    <main className="flex flex-col gap-4 px-4">
      <section className={sectionClass}>
        <div className="flex items-start justify-between gap-3">
          <div><p className="text-[11px] text-[#A1A7A3]">Your farm plan</p><h2 className="mt-1 text-base font-bold text-white">{lga.name}, {state.name}</h2></div>
          <button type="button" onClick={() => navigate(`/farm-guide/area?stateId=${state.id}&lgaId=${lga.id}`, { replace: true })} className="text-xs font-semibold text-[#1EB968]">Change area</button>
        </div>
        <div className="mt-3 flex gap-2"><MapPin className="h-4 w-4 shrink-0 text-[#1EB968]" /><div><p className="text-[11px] text-[#A1A7A3]">Estimated farming zone</p><p className="text-xs font-semibold text-white">{zone.name}</p></div></div>
        <p className="mt-2 text-[11px] leading-relaxed text-[#D1D5DB]">This is a broad area estimate. Farms in the same LGA can have different soil, rainfall and drainage.</p>
        {lga.needsReview && <p className="mt-2 text-[11px] text-[#FFD29D]">This LGA’s zone assignment still needs local review.</p>}
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="text-xs font-semibold text-white">Planning month<select className={fieldClass} value={month} onChange={(event) => { const next = new URLSearchParams(params); next.set('month', event.target.value); setParams(next, { replace: true }); setOpenCardKey(null); }}>{monthNames.map((name, index) => <option key={name} value={index + 1}>{name}{index + 1 === getLagosMonth() ? ' · current month' : ''}</option>)}</select></label>
          <label className="text-xs font-semibold text-white">Water supply<select className={fieldClass} value={preferences.water} onChange={(event) => setPreferences((old) => ({ ...old, water: event.target.value as WaterSupply }))}><option value="rainfall">Rainfall only</option><option value="irrigation">Reliable irrigation</option></select></label>
        </div>
        <p className="mt-2 text-[11px] text-[#A1A7A3]">Water supply and crop choices are saved on this device. {preferences.water === 'rainfall' ? 'Dry-season planting entries are hidden. Wait for dependable rains before planting.' : 'Irrigation does not remove heat, flooding or soil risks. Confirm a suitable crop and water plan locally.'}</p>
      </section>

      <FarmGuideRainfall stateId={state.id} lgaId={lga.id} areaName={`${lga.name}, ${state.name}`} />

      <section className="rounded-2xl border border-[#5C4930] bg-[#2E271C] p-4" aria-label="Before you plant">
        <h2 className="text-sm font-bold text-[#FFD29D]">Before you plant</h2>
        <p className="mt-2 text-xs leading-relaxed text-[#E4D8C4]">Calendar dates are draft seasonal estimates, not a live weather forecast or a confirmed planting recommendation for your farm.</p>
        <p className="mt-2 text-xs leading-relaxed text-[#E4D8C4]">Check that rain or irrigation can support the crop, the ground drains well, and the variety suits your area. Confirm timing with a local farm adviser.</p>
      </section>

      <section className="flex flex-col gap-3" aria-label="Crop calendar">
        <div><h2 className="text-sm font-bold text-white">Crop calendar · {monthNames[month - 1]}</h2><p className="mt-1 text-[11px] text-[#A1A7A3]">Use these windows for planning and local discussion. A missing entry does not mean a crop cannot grow here.</p></div>
        <CropWindowList title={`Possible planting windows · ${monthNames[month - 1]}`} activity="plant" entries={getPlantingWindows(zone.id, month, preferences.water)} openCardKey={openCardKey} onToggle={setOpenCardKey} />
        <CropWindowList title={`Typical harvest windows · ${monthNames[month - 1]}`} activity="harvest" entries={getFarmGuideCalendarEntries(zone.id, month, 'harvest')} openCardKey={openCardKey} onToggle={setOpenCardKey} />
        <p className="text-[11px] text-[#A1A7A3]">Harvest windows describe regional patterns. Your planting date, variety and crop maturity determine when your field is ready.</p>
        <CropWindowList title={`Plan ahead · ${monthNames[nextMonth - 1]}${month === 12 ? ' (next year)' : ''}`} activity="plant" entries={getPlantingWindows(zone.id, nextMonth, preferences.water)} openCardKey={openCardKey} onToggle={setOpenCardKey} />
      </section>

      <section className={sectionClass} aria-label="Crop care guide">
        <h2 className="text-sm font-bold text-white">Crop care guide</h2>
        <label className="mt-3 block text-xs font-semibold text-white">Choose a crop<select className={fieldClass} value={preferences.crop} onChange={(event) => setPreferences((old) => ({ ...old, crop: event.target.value }))}>{cropNames.map((crop) => <option key={crop}>{crop}</option>)}</select></label>
        <p className="mt-3 text-xs text-[#D1D5DB]">General guidance for {preferences.crop}. Availability here does not mean it is suitable for your selected farm or month.</p>
        {care ? <>
          <dl className="mt-4 flex flex-col gap-3">{[['Before planting', care.beforePlanting], ['Water and soil', care.water], ['Early crop care', care.earlyCare], ['Harvest planning', care.harvest]].map(([title, text]) => <div key={title}><dt className="text-xs font-semibold text-[#A7F3D0]">{title}</dt><dd className="mt-1 text-xs leading-relaxed text-[#D1D5DB]">{text}</dd></div>)}</dl>
          <p className="mt-4 text-[11px] leading-relaxed text-[#A1A7A3]">{care.scope}</p>
          <a className="mt-2 inline-block text-xs text-[#A7F3D0] underline" href={care.source.url} target="_blank" rel="noopener noreferrer">{care.source.title} ↗</a>
          <p className="mt-2 text-[10px] text-[#A1A7A3]">Sources checked {guideCheckedOn}. Local agronomist review is still needed.</p>
        </> : <>
          <p className="mt-3 text-[11px] text-[#FFD29D]">These introductory notes still need a crop-specific source review.</p>
          <ul className="mt-3 list-disc space-y-2 pl-4 text-xs leading-relaxed text-[#D1D5DB]">{detail?.plantingNotes.map((note) => <li key={note}>{note}</li>)}</ul>
        </>}
        <p className="mt-4 text-[11px] leading-relaxed text-[#D1D5DB]">Ask for soil and variety advice before choosing fertiliser. For pests or disease, identify the problem before choosing a treatment.</p>
        <a className="mt-3 inline-block text-xs text-[#A7F3D0] underline" href={guideSources.help.url} target="_blank" rel="noopener noreferrer">Find advice through NAERLS ↗</a>
      </section>
    </main>
  </div>;
};

type CalendarEntry = ReturnType<typeof getFarmGuideCalendarEntries>[number] & { crop: string };

const CropWindowList: React.FC<{
  title: string; activity: FarmGuideActivity; entries: CalendarEntry[];
  openCardKey: string | null; onToggle: (key: string | null) => void;
}> = ({ title, activity, entries, openCardKey, onToggle }) => <section className="flex flex-col gap-2" aria-label={title}>
  <h3 className="text-sm font-bold text-white">{title}</h3>
  {entries.length ? entries.map((entry) => {
    const key = `${activity}-${entry.month}-${entry.cropId}`;
    const detail = farmGuideCropDetails[entry.crop];
    const open = openCardKey === key;
    return <article key={key} className="overflow-hidden rounded-2xl border border-[#323633] bg-[#292C2A]">
      <button type="button" aria-expanded={open} aria-controls={`crop-${key}`} onClick={() => onToggle(open ? null : key)} className="flex w-full items-center gap-3 p-3 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#1EB968]">
        {detail ? <img src={detail.image} alt={detail.imageAlt} className="h-16 w-16 shrink-0 rounded-xl object-cover" loading="lazy" /> : <Sprout className="h-6 w-6 text-[#A7F3D0]" />}
        <span className="min-w-0 flex-1"><span className="block text-sm font-bold text-white">{entry.crop}</span><span className="mt-1 block text-[11px] text-[#A1A7A3]">{formatSeasonName(entry.seasonLabel)} · {entry.status === 'draft' ? 'Estimated window' : 'Source-reviewed window'}</span><span className="mt-1 block text-[10px] text-[#1EB968]">{open ? 'Hide crop details' : 'View crop details'}</span></span>
        <ChevronDown className={`h-4 w-4 text-[#A1A7A3] ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>
      <div id={`crop-${key}`} hidden={!open} className="border-t border-[#3B423E] p-4">
        <p className="text-xs text-[#FFD29D]">Confirm this window locally before planting or harvesting.</p>
        {detail && <><p className="mt-2 text-xs text-[#D1D5DB]">{detail.about}</p><h4 className="mt-3 text-xs font-bold text-white">How to plant</h4><ul className="mt-2 list-disc space-y-2 pl-4 text-[11px] text-[#D1D5DB]">{detail.plantingNotes.map((note) => <li key={note}>{note}</li>)}</ul></>}
        <p className="mt-3 text-[11px] text-[#A1A7A3]">{entry.seasonLabel === 'dry_season' && activity === 'plant' ? 'This dry-season entry needs a dependable water plan. ' : ''}See the crop care guide below for available sources and review status.</p>
      </div>
    </article>;
  }) : <p className={`${sectionClass} text-xs text-[#D1D5DB]`}>No matching crops are listed in the draft calendar for this window and water supply. Use the crop care guide and ask locally.</p>}
</section>;
