import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, ChevronDown, CloudRain, LoaderCircle, RefreshCw, Sprout } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { TopHeader } from '../components/common/TopHeader';
import { fetchLgaSeasonPlan, fetchSeasonLgas, fetchSeasonStates, SeasonPlanningApiError } from '../data/seasonPlanningApi';
import type { SeasonDatabaseEntry, SeasonDatabaseLga, SeasonDatabasePlan, SeasonDatabaseState } from '../data/seasonPlanningApi';
import { getCropPreviewImage } from '../data/seasonRecommendations';
import { fetchSeasonalRainfall, SeasonalRainfallApiError } from '../data/seasonRainfallApi';
import type { SeasonalRainfallResult } from '../data/seasonRainfallApi';

type Screen = 'location' | 'recommendations' | 'details';
interface SavedView {
  screen: 'recommendations' | 'details';
  stateId: number;
  lgaId: number;
  cropKey?: string;
}
interface ActiveLocation {
  stateId: number;
  lgaId: number;
}

const PERSISTED_VIEW_KEY = 'fieldvoice-season-recommendation-db-preview-v1';

function readPersistedView(): SavedView | null {
  try {
    const value: unknown = JSON.parse(window.localStorage.getItem(PERSISTED_VIEW_KEY) ?? 'null');
    if (typeof value !== 'object' || value === null || !('screen' in value) || !('stateId' in value) || !('lgaId' in value)) return null;
    const saved = value as Partial<SavedView>;
    if ((saved.screen !== 'recommendations' && saved.screen !== 'details')
      || !Number.isSafeInteger(saved.stateId) || Number(saved.stateId) < 1
      || !Number.isSafeInteger(saved.lgaId) || Number(saved.lgaId) < 1
      || (saved.screen === 'details' && typeof saved.cropKey !== 'string')) return null;
    return saved as SavedView;
  } catch {
    return null;
  }
}

function savedCropId(cropKey: string | undefined): string {
  return cropKey?.startsWith('calendar:') ? cropKey : '';
}

function lagosToday(): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Lagos', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date());
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? '';
  return `${part('year')}-${part('month')}-${part('day')}`;
}

function monthLabel(date: string): string {
  const [year, month, day] = date.split('-').map(Number);
  return new Intl.DateTimeFormat('en-NG', { month: 'long', year: 'numeric', timeZone: 'Africa/Lagos' })
    .format(new Date(Date.UTC(year!, month! - 1, day!)));
}

function cropSlug(name: string): string {
  return name.trim().toLocaleLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function calendarCropId(entry: SeasonDatabaseEntry): string {
  return `calendar:${entry.activity}:${entry.season}:${cropSlug(entry.crop)}`;
}

function titleCase(value: string): string {
  return value.split('_').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
}

export const SeasonSenseScreen: React.FC = () => {
  const navigate = useNavigate();
  const [savedView] = useState(readPersistedView);
  const [screen, setScreen] = useState<Screen>(savedView?.screen ?? 'location');
  const [states, setStates] = useState<SeasonDatabaseState[]>([]);
  const [lgas, setLgas] = useState<SeasonDatabaseLga[]>([]);
  const [selectedStateId, setSelectedStateId] = useState<number | ''>(savedView?.stateId ?? '');
  const [selectedLgaId, setSelectedLgaId] = useState<number | ''>(savedView?.lgaId ?? '');
  const [activeLocation, setActiveLocation] = useState<ActiveLocation | null>(savedView ? { stateId: savedView.stateId, lgaId: savedView.lgaId } : null);
  const [selectedCropId, setSelectedCropId] = useState(savedCropId(savedView?.cropKey));
  const [today] = useState(lagosToday);
  const [statesError, setStatesError] = useState('');
  const [lgasError, setLgasError] = useState('');
  const [loadingLgas, setLoadingLgas] = useState(Boolean(savedView?.stateId));
  const [loadingRecommendations, setLoadingRecommendations] = useState(savedView?.screen === 'recommendations');
  const [seasonPlan, setSeasonPlan] = useState<SeasonDatabasePlan | null>(null);
  const [recommendationsError, setRecommendationsError] = useState('');
  const [seasonalRainfall, setSeasonalRainfall] = useState<SeasonalRainfallResult | null>(null);
  const [loadingRainfall, setLoadingRainfall] = useState(Boolean(savedView?.lgaId));
  const [rainfallError, setRainfallError] = useState('');
  const [rainfallRetry, setRainfallRetry] = useState(0);

  useEffect(() => {
    let active = true;
    void fetchSeasonStates()
      .then((result) => { if (active) { setStates(result); setStatesError(''); } })
      .catch((error: unknown) => {
        if (active) setStatesError(error instanceof SeasonPlanningApiError ? error.message : 'Could not load states. Refresh the page to try again.');
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!selectedStateId) return;
    let active = true;
    void fetchSeasonLgas(selectedStateId)
      .then((result) => { if (active) { setLgas(result.lgas); setLgasError(''); } })
      .catch((error: unknown) => {
        if (active) setLgasError(error instanceof SeasonPlanningApiError ? error.message : 'Could not load local areas. Refresh the page to try again.');
      })
      .finally(() => { if (active) setLoadingLgas(false); });
    return () => { active = false; };
  }, [selectedStateId]);

  useEffect(() => {
    const lgaId = activeLocation?.lgaId;
    if (screen !== 'recommendations' || !lgaId) return;
    let active = true;
    void fetchLgaSeasonPlan(lgaId)
      .then((result) => { if (active) setSeasonPlan(result); })
      .catch((error: unknown) => {
        if (active) setRecommendationsError(error instanceof SeasonPlanningApiError
          ? error.message : 'Could not load the crop calendar. Refresh the page to try again.');
      })
      .finally(() => { if (active) setLoadingRecommendations(false); });
    return () => { active = false; };
  }, [screen, activeLocation?.lgaId]);

  useEffect(() => {
    const lgaId = activeLocation?.lgaId;
    if (screen !== 'recommendations' || !lgaId) return;
    let active = true;
    const year = Number(today.slice(0, 4));
    void fetchSeasonalRainfall(lgaId, year)
      .then((result) => { if (active) setSeasonalRainfall(result); })
      .catch((error: unknown) => {
        if (active) setRainfallError(error instanceof SeasonalRainfallApiError
          ? error.message : 'NiMet data could not be loaded. Crop timing is still available.');
      })
      .finally(() => { if (active) setLoadingRainfall(false); });
    return () => { active = false; };
  }, [screen, activeLocation?.lgaId, today, rainfallRetry]);

  const selectedState = states.find((state) => state.id === selectedStateId);
  const selectedLga = lgas.find((lga) => lga.id === selectedLgaId);
  const activeState = states.find((state) => state.id === activeLocation?.stateId);
  const activeLga = lgas.find((lga) => lga.id === activeLocation?.lgaId);
  const activeZone = activeLga?.zone.name ?? null;
  const planSections = useMemo(() => seasonPlan ? [
    { key: 'plant-now', title: `Plant this month · ${seasonPlan.calendar.monthName}`, entries: seasonPlan.plantNow, empty: seasonPlan.emptyMessages.plantNow },
    { key: 'harvest-now', title: `Harvest this month · ${seasonPlan.calendar.monthName}`, entries: seasonPlan.harvestNow, empty: seasonPlan.emptyMessages.harvestNow },
    { key: 'plant-next', title: `Plant next month · ${seasonPlan.calendar.nextMonthName}`, entries: seasonPlan.plantNextMonth, empty: seasonPlan.emptyMessages.plantNextMonth },
  ] : [], [seasonPlan]);
  const planEntries = useMemo(() => planSections.flatMap((section) => section.entries), [planSections]);
  const selectedCrop = planEntries.find((entry) => calendarCropId(entry) === selectedCropId) ?? null;
  const loadingStates = states.length === 0 && !statesError;
  const locationError = statesError || lgasError;

  useEffect(() => {
    if (screen === 'location' || !activeLocation) return;
    const value: SavedView = {
      screen: screen === 'details' ? 'details' : 'recommendations',
      stateId: activeLocation.stateId,
      lgaId: activeLocation.lgaId,
      ...(screen === 'details' && selectedCropId ? { cropKey: selectedCropId } : {}),
    };
    try { window.localStorage.setItem(PERSISTED_VIEW_KEY, JSON.stringify(value)); }
    catch { /* Keep the current screen usable if browser storage is unavailable. */ }
  }, [screen, activeLocation, selectedCropId]);

  const showRecommendations = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedState || !selectedLga) return;
    setActiveLocation({ stateId: selectedState.id, lgaId: selectedLga.id });
    setSeasonPlan(null);
    setRecommendationsError('');
    setLoadingRecommendations(true);
    setSeasonalRainfall(null);
    setLoadingRainfall(true);
    setRainfallError('');
    setSelectedCropId('');
    setScreen('recommendations');
  };

  const changeArea = () => {
    setSelectedStateId(activeLocation?.stateId ?? '');
    setSelectedLgaId(activeLocation?.lgaId ?? '');
    setSelectedCropId('');
    setScreen('location');
  };

  const returnToRecommendations = () => {
    setSelectedCropId('');
    setLoadingRecommendations(true);
    setRecommendationsError('');
    setScreen('recommendations');
  };

  return (
    <div className="flex flex-col pb-2">
      <TopHeader
        variant="detail"
        title="Season Recommendation"
        showHelp
        onBack={screen === 'location' ? () => navigate('/') : screen === 'details' ? returnToRecommendations : changeArea}
      />

      <main className="flex flex-col gap-4 px-4">
        {screen !== 'location' && activeLocation && (!activeState || !activeLga) && (
          <div role={locationError ? 'alert' : 'status'} className="rounded-2xl border border-[#323633] bg-[#292C2A] p-4 text-xs leading-relaxed text-[#D1D5DB]">
            {locationError ? 'Your saved location could not load. Go back and choose it again.' : 'Loading your saved state and local area…'}
          </div>
        )}

        {screen === 'location' && (
          <>
            <section className="rounded-2xl border border-[#235840] bg-[#1B4733] p-5 shadow-lg">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-[#234A38] text-[#A7F3D0]">
                <Sprout className="h-6 w-6" aria-hidden="true" />
              </div>
              <h1 className="text-[22px] font-extrabold leading-tight tracking-tight text-white">Plan your next planting season</h1>
              <p className="mt-2 text-[13px] leading-relaxed text-white/80">Choose your state and local area to preview sample crops for its farming zone.</p>
            </section>

            <form onSubmit={showRecommendations} className="rounded-2xl border border-[#323633] bg-[#292C2A] p-4">
              <label htmlFor="season-state" className="text-sm font-bold text-white">State</label>
              <div className="relative mt-2">
                <select
                  id="season-state"
                  value={selectedStateId}
                  onChange={(event) => {
                    const value = Number(event.target.value);
                    const validId = Number.isSafeInteger(value) && value > 0 ? value : '';
                    setSelectedStateId(validId);
                    setSelectedLgaId('');
                    setLgas([]);
                    setLoadingLgas(Boolean(validId));
                    setLgasError('');
                  }}
                  disabled={loadingStates || states.length === 0}
                  className="min-h-12 w-full appearance-none rounded-xl border border-[#444A45] bg-[#202321] px-3 pr-12 text-sm text-white outline-none focus:border-[#22C55E] disabled:opacity-60"
                >
                  <option value="">{loadingStates ? 'Loading states…' : 'Select a state'}</option>
                  {states.map((state) => <option key={state.id} value={state.id}>{state.name}</option>)}
                </select>
                <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#A1A7A3]" aria-hidden="true" />
              </div>

              <label htmlFor="season-lga" className="mt-4 block text-sm font-bold text-white">Local government area (LGA)</label>
              <div className="relative mt-2">
                <select
                  id="season-lga"
                  value={selectedLgaId}
                  onChange={(event) => {
                    const value = Number(event.target.value);
                    setSelectedLgaId(Number.isSafeInteger(value) && value > 0 ? value : '');
                    setLgasError('');
                  }}
                  disabled={!selectedStateId || loadingLgas || lgas.length === 0}
                  className="min-h-12 w-full appearance-none rounded-xl border border-[#444A45] bg-[#202321] px-3 pr-12 text-sm text-white outline-none focus:border-[#22C55E] disabled:opacity-60"
                >
                  <option value="">{loadingLgas ? 'Loading local areas…' : 'Select an LGA'}</option>
                  {lgas.map((lga) => <option key={lga.id} value={lga.id}>{lga.name}</option>)}
                </select>
                <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#A1A7A3]" aria-hidden="true" />
              </div>
              <p className="mt-2 text-[11px] leading-relaxed text-[#A1A7A3]">Your LGA is matched to a broad farming zone. Some zone assignments are approximate and need local review.</p>
              {locationError && <p role="alert" className="mt-3 rounded-xl border border-[#70403B] bg-[#382321] p-3 text-xs leading-relaxed text-[#FCA5A5]">{locationError}</p>}
              <button type="submit" disabled={!selectedLga || loadingLgas} className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#176B45] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#1eb968] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60">
                View crop planning windows
              </button>
            </form>

            <div className="rounded-2xl border border-[#323633] bg-[#292C2A] p-4">
              <h2 className="text-sm font-bold text-white">About this calendar</h2>
              <p className="mt-2 text-xs leading-relaxed text-[#D1D5DB]">Crop timing comes from the planning database and is still marked draft. The LGA-to-zone map is approximate in some areas. Use the calendar to explore, then confirm dates with a local extension worker.</p>
            </div>
          </>
        )}

        {screen === 'recommendations' && activeLocation && activeState && activeLga && activeZone && (
          <>
            <section className="rounded-2xl border border-[#323633] bg-[#292C2A] p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h1 className="text-base font-bold text-white">{activeLga.name}, {activeState.name}</h1>
                  <p className="mt-1 text-xs text-[#A1A7A3]">Farming zone: {activeZone}{activeLga.needsReview ? ' · check local zone' : ''}</p>
                  <p className="mt-1 text-xs text-[#A1A7A3]">{monthLabel(today)}</p>
                </div>
                <button type="button" onClick={changeArea} className="shrink-0 whitespace-nowrap rounded-lg px-2 py-1 text-xs font-semibold text-[#22C55E] hover:bg-[#202321]">Change area</button>
              </div>
              <p className="mt-3 rounded-xl bg-[#202321] p-3 text-[11px] leading-relaxed text-[#D1D5DB]">
                {seasonPlan?.calendar.status === 'verified'
                  ? 'These calendar entries have been checked, but planting dates still depend on your field and the current rains.'
                  : seasonPlan?.calendar.status === 'mixed'
                    ? 'Some calendar entries are checked and others are still draft. Planting dates still depend on your field and the current rains.'
                    : 'These crop timing records are still draft. The zone map may need local review. Confirm dates with an agricultural extension worker before planting.'}
              </p>
            </section>

            <section aria-labelledby="seasonal-rainfall-heading" className="rounded-2xl border border-[#323633] bg-[#292C2A] p-4">
              <div className="flex items-center gap-2">
                <CloudRain className="h-4 w-4 text-[#60A5FA]" aria-hidden="true" />
                <h2 id="seasonal-rainfall-heading" className="text-sm font-bold text-white">NiMet seasonal rainfall</h2>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-[#A1A7A3]">Rainfall information for {activeLga.name}, {activeState.name} in {today.slice(0, 4)}. It adds local context; it does not choose crops or guarantee rain on a certain day.</p>
              <a href="https://nimet.gov.ng/weatherapi" target="_blank" rel="noreferrer" className="mt-1 inline-flex text-[11px] font-semibold text-[#93C5FD] underline underline-offset-2">Data from NiMet</a>
              {loadingRainfall ? (
                <div role="status" className="mt-3 flex items-center gap-2 text-xs text-[#D1D5DB]">
                  <LoaderCircle className="h-4 w-4 animate-spin text-[#60A5FA]" aria-hidden="true" />
                  Checking NiMet rainfall data…
                </div>
              ) : rainfallError ? (
                <div className="mt-3">
                  <p role="status" className="text-xs leading-relaxed text-[#FCA5A5]">{rainfallError} Crop calendar entries remain available below.</p>
                  <button type="button" onClick={() => { setLoadingRainfall(true); setRainfallError(''); setRainfallRetry((value) => value + 1); }} className="mt-2 inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2 text-xs font-semibold text-[#22C55E] hover:bg-[#202321]">
                    <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" /> Retry NiMet data
                  </button>
                </div>
              ) : seasonalRainfall?.status === 'no_record' ? (
                <p role="status" className="mt-3 text-xs leading-relaxed text-[#D1D5DB]">NiMet has no seasonal rainfall record for this local area in {seasonalRainfall.year}. Crop calendar entries remain available below.</p>
              ) : seasonalRainfall?.status === 'available' ? (
                <>
                  <dl className="mt-3 grid grid-cols-2 gap-2">
                    {seasonalRainfall.record.onset && <div className="rounded-xl bg-[#202321] p-3"><dt className="text-[10px] text-[#A1A7A3]">Expected rain start</dt><dd className="mt-1 text-xs font-semibold text-white">{seasonalRainfall.record.onset}</dd></div>}
                    {seasonalRainfall.record.cessation && <div className="rounded-xl bg-[#202321] p-3"><dt className="text-[10px] text-[#A1A7A3]">Expected rain end</dt><dd className="mt-1 text-xs font-semibold text-white">{seasonalRainfall.record.cessation}</dd></div>}
                    {seasonalRainfall.record.lengthOfSeason !== undefined && <div className="rounded-xl bg-[#202321] p-3"><dt className="text-[10px] text-[#A1A7A3]">Season length</dt><dd className="mt-1 text-xs font-semibold text-white">{seasonalRainfall.record.lengthOfSeason}</dd></div>}
                    {seasonalRainfall.record.annualRainfall !== undefined && <div className="rounded-xl bg-[#202321] p-3"><dt className="text-[10px] text-[#A1A7A3]">Annual rainfall</dt><dd className="mt-1 text-xs font-semibold text-white">{seasonalRainfall.record.annualRainfall}</dd></div>}
                  </dl>
                  {!seasonalRainfall.record.onset && !seasonalRainfall.record.cessation
                    && seasonalRainfall.record.lengthOfSeason === undefined && seasonalRainfall.record.annualRainfall === undefined
                    && <p role="status" className="mt-3 text-xs text-[#D1D5DB]">NiMet returned a record but no rainfall details for this area.</p>}
                </>
              ) : null}
            </section>

            <section aria-labelledby="zone-crops-heading" className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-2 px-1">
                <h2 id="zone-crops-heading" className="text-sm font-bold text-white">Crop planning calendar</h2>
                <span className="rounded-full bg-[#302B20] px-2.5 py-1 text-[10px] font-semibold text-[#FCD34D]">
                  {seasonPlan?.calendar.status === 'verified' ? 'Verified data' : seasonPlan?.calendar.status === 'mixed' ? 'Mixed review' : 'Draft data'}
                </span>
              </div>
              <p className="px-1 text-xs leading-relaxed text-[#A1A7A3]">Timing changes with rainfall, crop variety, soil and field conditions. This calendar does not know your farm’s planting history.</p>
              {loadingRecommendations ? (
                <div role="status" className="flex min-h-24 items-center justify-center gap-2 rounded-2xl border border-[#323633] bg-[#292C2A] text-sm text-[#D1D5DB]">
                  <LoaderCircle className="h-5 w-5 animate-spin text-[#22C55E]" aria-hidden="true" />
                  Loading crop calendar…
                </div>
              ) : recommendationsError ? (
                <p role="alert" className="rounded-2xl border border-[#70403B] bg-[#382321] p-4 text-xs leading-relaxed text-[#FCA5A5]">{recommendationsError}</p>
              ) : planSections.map((section) => (
                <section key={section.key} className="flex flex-col gap-3" aria-label={section.title}>
                  <h3 className="px-1 text-sm font-bold text-white">{section.title}</h3>
                  {section.entries.length === 0 ? (
                    <p className="rounded-2xl border border-[#323633] bg-[#292C2A] p-4 text-xs text-[#A1A7A3]">{section.empty ?? 'No calendar entries are listed for this period.'}</p>
                  ) : section.entries.map((entry) => {
                    const image = getCropPreviewImage(entry.crop);
                    return (
                      <article key={calendarCropId(entry)} className="overflow-hidden rounded-2xl border border-[#323633] bg-[#292C2A] shadow-sm">
                        <div className="flex items-center gap-3 p-4">
                          {image ? <img src={image} alt={`${entry.crop} plant`} className="h-16 w-16 shrink-0 rounded-xl bg-[#181B19] object-cover" loading="lazy" /> : <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-[#1B4733] text-[#A7F3D0]"><Sprout className="h-7 w-7" aria-hidden="true" /></div>}
                          <div className="min-w-0 flex-1">
                            <h4 className="text-sm font-bold text-white">{entry.crop}</h4>
                            <p className="mt-1 text-[11px] text-[#D1D5DB]">{titleCase(entry.category)} · {titleCase(entry.season)}</p>
                            {entry.localNames && <p className="mt-1 text-[10px] leading-relaxed text-[#A1A7A3]">Also called: {entry.localNames}</p>}
                          </div>
                        </div>
                        <div className="border-t border-[#3B403C] px-4 py-3">
                          <p className="text-[11px] font-semibold text-[#FCD34D]">Draft calendar entry</p>
                          <button type="button" onClick={() => { setSelectedCropId(calendarCropId(entry)); setScreen('details'); }} className="mt-2 inline-flex min-h-10 items-center gap-1.5 rounded-lg px-2 text-xs font-semibold text-[#22C55E] hover:bg-[#202321]">
                            View crop details <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </section>
              ))}
            </section>
          </>
        )}

        {screen === 'details' && selectedCrop && activeState && activeLga && activeZone && seasonPlan && (
          <>
            <article className="overflow-hidden rounded-2xl border border-[#323633] bg-[#292C2A]">
              {getCropPreviewImage(selectedCrop.crop) && <img src={getCropPreviewImage(selectedCrop.crop)} alt={`${selectedCrop.crop} plant`} className="h-40 w-full bg-[#181B19] object-cover" />}
              <div className="p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-[#A1A7A3]">Crop calendar · {activeLga.name}, {activeState.name}</p>
                <h1 className="mt-1 text-xl font-bold text-white">{selectedCrop.crop}</h1>
                <p className="mt-2 text-xs leading-relaxed text-[#D1D5DB]">This draft entry lists {selectedCrop.activity === 'plant' ? 'planting' : 'harvest'} during {titleCase(selectedCrop.season).toLowerCase()} for the {activeZone} zone.</p>
              </div>
            </article>

            <section className="rounded-2xl border border-[#323633] bg-[#292C2A] p-4">
              <h2 className="text-sm font-bold text-white">Calendar period</h2>
              <p className="mt-2 text-xs font-semibold text-[#BBF7D0]">{selectedCrop.activity === 'plant' ? 'Plant' : 'Harvest'} · {new Intl.DateTimeFormat('en-NG', { month: 'long', timeZone: 'Africa/Lagos' }).format(new Date(Date.UTC(2024, selectedCrop.month - 1, 15)))} · {titleCase(selectedCrop.season)}</p>
              <p className="mt-1 text-xs leading-relaxed text-[#D1D5DB]">This is a broad zone-level calendar entry. It does not confirm the right date for your field.</p>
            </section>

            <section className="rounded-2xl border border-[#323633] bg-[#292C2A] p-4">
              <h2 className="text-sm font-bold text-white">Conditions to check</h2>
              <ul className="mt-3 space-y-2">{[
                'Check that rains or irrigation provide enough water for this crop.',
                'Consider your soil, seed variety, and the crop grown in this field last season.',
                ...(activeLga.needsReview ? ['The LGA farming-zone assignment is approximate and needs local review.'] : []),
              ].map((item) => <li key={item} className="flex gap-2 text-xs leading-relaxed text-[#D1D5DB]"><span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#22C55E]" aria-hidden="true" />{item}</li>)}</ul>
            </section>

            <section className="rounded-2xl border border-[#323633] bg-[#292C2A] p-4">
              <h2 className="text-sm font-bold text-white">Practical guidance</h2>
              <p className="mt-3 text-xs leading-relaxed text-[#D1D5DB]">Ask your local agricultural extension worker to check the crop, planting period, and rotation for your area.</p>
            </section>

            <section className="rounded-2xl border border-[#70403B] bg-[#382321] p-4">
              <h2 className="text-sm font-bold text-white">Risks and limits</h2>
              <ul className="mt-2 space-y-2"><li className="text-xs leading-relaxed text-[#F2D1CE]">• The calendar is draft data and has not been verified by an agronomist.</li><li className="text-xs leading-relaxed text-[#F2D1CE]">• Zone assignments are approximate and may not reflect conditions on your farm.</li></ul>
            </section>

            <button type="button" onClick={returnToRecommendations} className="flex min-h-11 w-full items-center justify-center rounded-xl bg-[#292C2A] text-sm font-semibold text-white hover:bg-[#383B39]">Back to recommendations</button>
          </>
        )}

        {screen === 'details' && !selectedCrop && activeLocation && (
          <div className="rounded-2xl border border-[#323633] bg-[#292C2A] p-4 text-xs leading-relaxed text-[#D1D5DB]">
            <p>{loadingRecommendations ? 'Loading crop calendar…' : 'That crop is not available in this calendar.'}</p>
            <button type="button" onClick={returnToRecommendations} className="mt-3 font-semibold text-[#22C55E]">Back to recommendations</button>
          </div>
        )}

        <p className="px-1 pb-2 text-[10px] leading-relaxed text-[#777D78]">These broad planting windows do not account for your previous crop or field conditions. Confirm your rotation with a local agricultural extension worker.</p>
      </main>
    </div>
  );
};
