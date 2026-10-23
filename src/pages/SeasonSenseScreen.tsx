import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronDown, CloudRain, LoaderCircle, RefreshCw, Sprout } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { TopHeader } from '../components/common/TopHeader';
import { fetchLgaSeasonPlan, fetchSeasonLgas, fetchSeasonStates, SeasonPlanningApiError } from '../data/seasonPlanningApi';
import type { SeasonDatabaseLga, SeasonDatabasePlan, SeasonDatabaseState, SeasonPlanningWindow } from '../data/seasonPlanningApi';
import { getCropPreviewImage } from '../data/seasonRecommendations';
import { getFallbackSeasonPlanningDemos, getSeasonPlanningDemo, getSeasonPlanningDemos } from '../data/seasonPlanningDemo';
import type { SeasonPlanningDemo } from '../data/seasonPlanningDemo';
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
  return cropKey?.startsWith('calendar:') || cropKey?.startsWith('demo:') ? cropKey : '';
}

function lagosToday(): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Lagos', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date());
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? '';
  return `${part('year')}-${part('month')}-${part('day')}`;
}

function cropSlug(name: string): string {
  return name.trim().toLocaleLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function calendarCropId(entry: SeasonPlanningWindow): string {
  return `calendar:${entry.activity}:${entry.season}:${cropSlug(entry.crop)}:${entry.monthStart}-${entry.monthEnd}`;
}

function demoCropId(entry: SeasonPlanningDemo): string {
  return entry.id;
}

function formatDemoUpdatedAt(value: string): string {
  return new Intl.DateTimeFormat('en-NG', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Africa/Lagos' })
    .format(new Date(`${value}T12:00:00+01:00`));
}

function planningMonthRange(entry: Pick<SeasonPlanningWindow, 'monthStart' | 'monthEnd'>): string {
  const formatMonth = (month: number) => new Intl.DateTimeFormat('en-NG', { month: 'long', timeZone: 'Africa/Lagos' })
    .format(new Date(Date.UTC(2024, month - 1, 15)));
  const start = formatMonth(entry.monthStart);
  const end = formatMonth(entry.monthEnd);
  return start === end ? start : `${start}–${end}`;
}

function planningWindowStatus(status: SeasonPlanningWindow['status']): string {
  if (status === 'verified') return 'Verified source entry · check local fit';
  if (status === 'reviewed') return 'Reviewed source entry · check local fit';
  return 'Draft · not verified planting advice';
}

function titleCase(value: string): string {
  return value.split('_').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
}

const SeasonPlanningDemoSections: React.FC<{ plan: SeasonPlanningDemo }> = ({ plan }) => (
  <div className="flex flex-col gap-3">
    <section className="rounded-2xl border border-[#66542E] bg-[#292C2A] p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-bold text-white">Illustrative crop guide</h2>
        <span className="rounded-full bg-[#3A3321] px-2.5 py-1 text-[10px] font-semibold text-[#FCD34D]">Demo data · Not verified</span>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-[#D1D5DB]">{plan.crop} · {plan.zoneName}</p>
      <p className="mt-2 text-xs leading-relaxed text-[#A1A7A3]">Example content only. It is not a verified planting recommendation and is not based on your field conditions.</p>
      <p className="mt-2 text-[11px] text-[#A1A7A3]">Content updated {formatDemoUpdatedAt(plan.updatedAt)} · {plan.source.label}</p>
    </section>

    <section className="rounded-2xl border border-[#323633] bg-[#292C2A] p-4">
      <h2 className="text-sm font-bold text-white">Planning period · illustrative</h2>
      <p className="mt-2 text-xs leading-relaxed text-[#D1D5DB]">{plan.planningPeriod}</p>
      <h3 className="mt-4 text-xs font-bold text-white">Zone context</h3>
      <p className="mt-1 text-xs leading-relaxed text-[#A1A7A3]">{plan.zoneContext}</p>
    </section>

    <section className="rounded-2xl border border-[#323633] bg-[#292C2A] p-4">
      <h2 className="text-sm font-bold text-white">Prepare and plant</h2>
      <h3 className="mt-3 text-xs font-bold text-[#BBF7D0]">Land preparation</h3>
      <p className="mt-1 text-xs leading-relaxed text-[#D1D5DB]">{plan.landPreparation}</p>
      <h3 className="mt-3 text-xs font-bold text-[#BBF7D0]">Planting</h3>
      <p className="mt-1 text-xs leading-relaxed text-[#D1D5DB]">{plan.planting}</p>
    </section>

    <section className="rounded-2xl border border-[#323633] bg-[#292C2A] p-4">
      <h2 className="text-sm font-bold text-white">Water and nutrients</h2>
      <p className="mt-2 text-xs leading-relaxed text-[#D1D5DB]">{plan.water}</p>
      <h3 className="mt-3 text-xs font-bold text-[#BBF7D0]">Nutrient management</h3>
      <p className="mt-1 text-xs leading-relaxed text-[#D1D5DB]">{plan.nutrients}</p>
    </section>

    <section className="rounded-2xl border border-[#323633] bg-[#292C2A] p-4">
      <h2 className="text-sm font-bold text-white">Monitor and maintain</h2>
      <h3 className="mt-3 text-xs font-bold text-[#BBF7D0]">Possible risks to monitor</h3>
      <ul className="mt-2 space-y-2">{plan.risks.map((item) => <li key={item} className="flex gap-2 text-xs leading-relaxed text-[#D1D5DB]"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#FCD34D]" aria-hidden="true" />{item}</li>)}</ul>
      <h3 className="mt-3 text-xs font-bold text-[#BBF7D0]">Care tasks</h3>
      <ul className="mt-2 space-y-2">{plan.maintenance.map((item) => <li key={item} className="flex gap-2 text-xs leading-relaxed text-[#D1D5DB]"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#22C55E]" aria-hidden="true" />{item}</li>)}</ul>
    </section>

    <section className="rounded-2xl border border-[#323633] bg-[#292C2A] p-4">
      <h2 className="text-sm font-bold text-white">Indicative crop timeline</h2>
      <ol className="mt-3 space-y-2">{plan.timeline.map((item, index) => <li key={item} className="flex gap-2 text-xs leading-relaxed text-[#D1D5DB]"><span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#1B4733] text-[10px] font-bold text-[#BBF7D0]">{index + 1}</span>{item}</li>)}</ol>
      <h3 className="mt-4 text-xs font-bold text-[#BBF7D0]">Harvest</h3>
      <p className="mt-1 text-xs leading-relaxed text-[#D1D5DB]">{plan.harvest}</p>
    </section>
  </div>
);

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
  const planEntries = useMemo(() => seasonPlan?.planningWindows ?? [], [seasonPlan]);
  const selectedCrop = planEntries.find((entry) => calendarCropId(entry) === selectedCropId) ?? null;
  const activeZoneCode = seasonPlan?.location.zone.code ?? activeLga?.zone.code ?? '';
  const fallbackDemos = useMemo(() => getFallbackSeasonPlanningDemos(
    activeZoneCode,
    planEntries.map((entry) => entry.crop),
  ), [activeZoneCode, planEntries]);
  const selectedDemoCrop = selectedCrop ? null : getSeasonPlanningDemos(activeZoneCode).find((entry) => demoCropId(entry) === selectedCropId) ?? null;
  const sourceCropGuide = selectedCrop ? getSeasonPlanningDemo(activeZoneCode, selectedCrop.crop) : null;
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

  const returnHomeFromPlanning = useCallback(() => {
    setSelectedCropId('');
    if (activeLocation) {
      try {
        window.localStorage.setItem(PERSISTED_VIEW_KEY, JSON.stringify({
          screen: 'recommendations',
          stateId: activeLocation.stateId,
          lgaId: activeLocation.lgaId,
        } satisfies SavedView));
      } catch { /* Keep navigation working if browser storage is unavailable. */ }
    }
    navigate('/', { replace: true });
  }, [activeLocation, navigate]);

  useEffect(() => {
    if (screen === 'location') return;
    const returnHomeOnBrowserBack = () => returnHomeFromPlanning();
    window.addEventListener('popstate', returnHomeOnBrowserBack);
    return () => window.removeEventListener('popstate', returnHomeOnBrowserBack);
  }, [screen, returnHomeFromPlanning]);

  return (
    <div className="flex flex-col pb-2">
      <TopHeader
        variant="detail"
        title="Season Recommendation"
        showHelp
        onBack={screen === 'location' ? () => navigate('/') : returnHomeFromPlanning}
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
              <p className="mt-2 text-[11px] leading-relaxed text-[#A1A7A3]">The farming zone comes from a published Nigerian agricultural-zone list. A few locations still need review.</p>
              {locationError && <p role="alert" className="mt-3 rounded-xl border border-[#70403B] bg-[#382321] p-3 text-xs leading-relaxed text-[#FCA5A5]">{locationError}</p>}
              <button type="submit" disabled={!selectedLga || loadingLgas} className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#176B45] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#1eb968] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60">
                View crop planning windows
              </button>
            </form>

            <div className="rounded-2xl border border-[#323633] bg-[#292C2A] p-4">
              <h2 className="text-sm font-bold text-white">About this calendar</h2>
              <p className="mt-2 text-xs leading-relaxed text-[#D1D5DB]">Source planting periods and historical crop reports are kept separate. Draft dates are not advice for your farm.</p>
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
                  {activeLga.zoneSource && <a href={activeLga.zoneSource.url} target="_blank" rel="noreferrer" className="mt-1 inline-flex text-[11px] font-semibold text-[#86EFAC] underline underline-offset-2">Zone source: {activeLga.zoneSource.title} · {activeLga.zoneSource.publicationYear}</a>}
                  <p className="mt-1 text-xs text-[#A1A7A3]">{seasonPlan?.cropTiming.status === 'sourced' ? 'Historical survey records' : 'No historical survey records'}</p>
                </div>
                <button type="button" onClick={changeArea} className="shrink-0 whitespace-nowrap rounded-lg px-2 py-1 text-xs font-semibold text-[#22C55E] hover:bg-[#202321]">Change area</button>
              </div>
              <p className="mt-3 rounded-xl bg-[#202321] p-3 text-[11px] leading-relaxed text-[#D1D5DB]">
                {seasonPlan?.calendar.notice ?? 'Historical crop records are not planting advice.'}
              </p>
            </section>

            <section aria-labelledby="seasonal-rainfall-heading" className="rounded-2xl border border-[#323633] bg-[#292C2A] p-4">
              <div className="flex items-center gap-2">
                <CloudRain className="h-4 w-4 text-[#60A5FA]" aria-hidden="true" />
                <h2 id="seasonal-rainfall-heading" className="text-sm font-bold text-white">NiMet seasonal rainfall</h2>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-[#A1A7A3]">Rainfall information for {activeLga.name}, {activeState.name} in {today.slice(0, 4)}. It adds local context; it does not choose crops or guarantee rain on a certain day.</p>
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
                <h2 id="zone-crops-heading" className="text-sm font-bold text-white">Crop planning guides</h2>
                <span className="rounded-full bg-[#153A2A] px-2.5 py-1 text-[10px] font-semibold text-[#86EFAC]">
                  {seasonPlan?.planningWindows.length ? 'Source + examples' : 'Illustrative examples'}
                </span>
              </div>
              {loadingRecommendations ? (
                <div role="status" className="flex min-h-16 items-center gap-2 rounded-2xl border border-[#323633] bg-[#292C2A] px-4 text-xs text-[#D1D5DB]">
                  <LoaderCircle className="h-5 w-5 animate-spin text-[#22C55E]" aria-hidden="true" />
                  Checking for source-backed crop windows. {fallbackDemos.length ? 'Clearly labelled examples are shown below while we check.' : 'No zone examples are shown until this location zone is confirmed.'}
                </div>
              ) : null}
              {recommendationsError && <p role="alert" className="rounded-2xl border border-[#70403B] bg-[#382321] p-4 text-xs leading-relaxed text-[#FCA5A5]">{recommendationsError} {fallbackDemos.length ? 'Illustrative guides remain available below.' : 'No zone-specific examples are shown because this zone is unverified.'}</p>}
              {!!planEntries.length && (
                <>
                  <div className="px-1">
                    <h3 className="text-xs font-bold text-white">Available source windows</h3>
                    <p className="mt-1 text-xs leading-relaxed text-[#A1A7A3]">Shown before examples because they come from a published calendar. Each entry shows its review status and may still need local confirmation.</p>
                  </div>
                  {planEntries.map((window, index) => <article key={`${window.crop}-${window.activity}-${window.monthStart}-${window.monthEnd}-${index}`} className="overflow-hidden rounded-2xl border border-[#323633] bg-[#292C2A]">
                  <div className="flex items-start gap-3 p-4">
                    {getCropPreviewImage(window.crop) ? <img src={getCropPreviewImage(window.crop)} alt={`${window.crop} plant`} className="h-16 w-16 shrink-0 rounded-xl bg-[#181B19] object-cover" loading="lazy" /> : <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-[#1B4733] text-[#A7F3D0]"><Sprout className="h-7 w-7" aria-hidden="true" /></div>}
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-white">{titleCase(window.crop)}</h3>
                      <p className="mt-1 text-xs text-[#D1D5DB]">Source {window.activity === 'plant' ? 'planting' : 'harvest'} period · {planningMonthRange(window)}</p>
                      <p className={`mt-1 text-[11px] ${window.status === 'verified' ? 'text-[#86EFAC]' : 'text-[#FCD34D]'}`}>{planningWindowStatus(window.status)}</p>
                    </div>
                  </div>
                  <div className="border-t border-[#3B403C] px-4 py-3 text-[11px] leading-relaxed text-[#A1A7A3]">
                    <p>Area named in source: {window.evidenceScope}</p>
                    <p className="mt-1">{window.reviewNotes}</p>
                    {window.sources.map((source) => <div key={source.key} className="mt-2">
                      <a href={source.url} target="_blank" rel="noreferrer" className="font-semibold text-[#86EFAC] underline underline-offset-2">{source.title}</a>
                      <p>{source.publisher} · published {source.publicationYear} · {source.license}</p>
                    </div>)}
                    <button type="button" onClick={() => { setSelectedCropId(calendarCropId(window)); setScreen('details'); }} className="mt-3 min-h-9 font-semibold text-[#22C55E]">View crop details</button>
                  </div>
                </article>)}
                  </>
              )}
              {!loadingRecommendations && !recommendationsError && fallbackDemos.length > 0 && !planEntries.length && seasonPlan?.zoneRecommendations.message && (
                <p role="status" className="rounded-2xl border border-[#323633] bg-[#292C2A] p-4 text-xs leading-relaxed text-[#A1A7A3]">{seasonPlan.zoneRecommendations.message} Illustrative guides are shown below and are not verified advice.</p>
              )}
              {!!fallbackDemos.length && (
                <div className="mt-1 flex flex-col gap-3" aria-label="Illustrative crop examples">
                  <div className="flex items-start justify-between gap-3 px-1">
                    <div>
                      <h3 className="text-xs font-bold text-white">Illustrative crop guides</h3>
                      <p className="mt-1 text-xs leading-relaxed text-[#A1A7A3]">These examples fill gaps where a source window is missing. They are not official dates, verified advice, or based on current field conditions.</p>
                    </div>
                    <span className="shrink-0 rounded-full bg-[#3A3321] px-2 py-1 text-[10px] font-semibold text-[#FCD34D]">Demo · Not verified</span>
                  </div>
                  {fallbackDemos.map((demo) => <article key={demo.id} className="overflow-hidden rounded-2xl border border-[#66542E] bg-[#292C2A]">
                    <div className="flex items-start gap-3 p-4">
                      {getCropPreviewImage(demo.crop) ? <img src={getCropPreviewImage(demo.crop)} alt={`${demo.crop} plant`} className="h-16 w-16 shrink-0 rounded-xl bg-[#181B19] object-cover" loading="lazy" /> : <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-[#1B4733] text-[#A7F3D0]"><Sprout className="h-7 w-7" aria-hidden="true" /></div>}
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-sm font-bold text-white">{demo.crop}</h4>
                          <span className="rounded-full bg-[#3A3321] px-2 py-0.5 text-[10px] font-semibold text-[#FCD34D]">Demo · Not verified</span>
                        </div>
                        <p className="mt-1 text-xs text-[#D1D5DB]">{demo.zoneName} · illustrative example</p>
                        <p className="mt-2 text-[11px] leading-relaxed text-[#A1A7A3]">{demo.planningPeriod}</p>
                      </div>
                    </div>
                    <div className="border-t border-[#3B403C] px-4 py-3 text-[11px] leading-relaxed text-[#A1A7A3]">
                      <p>{demo.zoneContext}</p>
                      <button type="button" onClick={() => { setSelectedCropId(demoCropId(demo)); setScreen('details'); }} className="mt-2 min-h-9 font-semibold text-[#22C55E]">View illustrative guide</button>
                    </div>
                  </article>)}
                </div>
              )}
              {!fallbackDemos.length && !planEntries.length && !loadingRecommendations && !recommendationsError && (
                <p role="status" className="rounded-2xl border border-[#323633] bg-[#292C2A] p-4 text-xs leading-relaxed text-[#A1A7A3]">This area's farming zone is not verified, so we cannot safely select zone-specific examples. Check the location assignment with an agricultural extension worker.</p>
              )}
            </section>

            <section aria-labelledby="historical-crops-heading" className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-2 px-1">
                <h2 id="historical-crops-heading" className="text-sm font-bold text-white">Historical crop records</h2>
                <span className="rounded-full bg-[#153A2A] px-2.5 py-1 text-[10px] font-semibold text-[#86EFAC]">
                  {seasonPlan?.cropTiming.status === 'sourced' ? 'Survey data' : 'No data yet'}
                </span>
              </div>
              <p className="px-1 text-xs leading-relaxed text-[#A1A7A3]">These records show what surveyed households reported in past years. They are separate from the source planting windows and are not advice for this season.</p>
              {loadingRecommendations ? (
                <div role="status" className="flex min-h-20 items-center justify-center gap-2 rounded-2xl border border-[#323633] bg-[#292C2A] text-sm text-[#D1D5DB]"><LoaderCircle className="h-5 w-5 animate-spin text-[#22C55E]" aria-hidden="true" />Loading historical reports…</div>
              ) : recommendationsError ? (
                <p role="alert" className="rounded-2xl border border-[#70403B] bg-[#382321] p-4 text-xs leading-relaxed text-[#FCA5A5]">{recommendationsError}</p>
              ) : seasonPlan?.cropTiming.status === 'unavailable' ? (
                <p className="rounded-2xl border border-[#323633] bg-[#292C2A] p-4 text-xs leading-relaxed text-[#A1A7A3]">No historical survey reports are available for this LGA.</p>
              ) : seasonPlan?.cropTiming.observations.map((observation, index) => {
                const monthName = (month: number | null) => month === null ? null : new Intl.DateTimeFormat('en-NG', { month: 'long', timeZone: 'Africa/Lagos' }).format(new Date(Date.UTC(2024, month - 1, 15)));
                const timing = observation.monthStart === observation.monthEnd
                  ? monthName(observation.monthStart) ?? 'Month not recorded'
                  : `${monthName(observation.monthStart) ?? 'Not recorded'}–${monthName(observation.monthEnd) ?? 'not recorded'}`;
                return <article key={`${observation.crop}-${observation.activity}-${observation.monthStart}-${observation.monthEnd}-${index}`} className="overflow-hidden rounded-2xl border border-[#323633] bg-[#292C2A]">
                  <div className="flex items-start gap-3 p-4">
                    {getCropPreviewImage(observation.crop) ? <img src={getCropPreviewImage(observation.crop)} alt={`${titleCase(observation.crop)} plant`} className="h-16 w-16 shrink-0 rounded-xl bg-[#181B19] object-cover" loading="lazy" /> : <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-[#1B4733] text-[#A7F3D0]"><Sprout className="h-7 w-7" aria-hidden="true" /></div>}
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-white">{titleCase(observation.crop)}</h3>
                      <p className="mt-1 text-xs text-[#D1D5DB]">Reported {observation.activity === 'plant' ? 'planting' : 'harvest'} period · {timing}</p>
                      <p className="mt-1 text-[11px] text-[#A1A7A3]">{observation.evidenceCount} survey {observation.evidenceCount === 1 ? 'record' : 'records'} · survey years {observation.surveyYears.join(', ') || 'not listed'}</p>
                    </div>
                  </div>
                  <div className="border-t border-[#3B403C] px-4 py-3 text-[11px] leading-relaxed text-[#A1A7A3]">
                    <p>Source scope: {observation.geographicScope}</p>
                    <p className="mt-1">Original crop labels: {observation.sourceCropNames.slice(0, 3).join(', ') || observation.crop}{observation.sourceCropNames.length > 3 ? `, and ${observation.sourceCropNames.length - 3} more` : ''}</p>
                    <a href={observation.source.url} target="_blank" rel="noreferrer" className="mt-2 inline-flex font-semibold text-[#86EFAC] underline underline-offset-2">{observation.source.title}</a>
                    <p>{observation.source.publisher} · published {observation.source.publicationYear} · {observation.source.license}</p>
                  </div>
                </article>;
              })}
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
                <p className="mt-2 text-xs leading-relaxed text-[#D1D5DB]">This source lists a broad {selectedCrop.activity === 'plant' ? 'planting' : 'harvest'} period for the {activeZone} zone. Status: {planningWindowStatus(selectedCrop.status)}. It does not assess this farm.</p>
              </div>
            </article>

            <section className="rounded-2xl border border-[#323633] bg-[#292C2A] p-4">
              <h2 className="text-sm font-bold text-white">Source period · {titleCase(selectedCrop.status)}</h2>
              <p className="mt-2 text-xs font-semibold text-[#BBF7D0]">{planningMonthRange(selectedCrop)} · {titleCase(selectedCrop.season)}</p>
              <p className="mt-1 text-xs leading-relaxed text-[#D1D5DB]">This is a broad zone-level source window. It does not confirm when to plant in your field.</p>
              <p className="mt-2 text-xs leading-relaxed text-[#A1A7A3]">Source area: {selectedCrop.evidenceScope}</p>
              <p className="mt-2 text-xs leading-relaxed text-[#A1A7A3]">{selectedCrop.reviewNotes}</p>
              {selectedCrop.sources.map((source) => <div key={source.key} className="mt-3 text-xs leading-relaxed text-[#A1A7A3]">
                <a href={source.url} target="_blank" rel="noreferrer" className="font-semibold text-[#86EFAC] underline underline-offset-2">{source.title}</a>
                <p>{source.publisher} · {source.publicationYear} · {source.license}</p>
              </div>)}
            </section>
            {activeLga.needsReview && <p role="note" className="rounded-2xl border border-[#70403B] bg-[#382321] p-4 text-xs leading-relaxed text-[#F2D1CE]">The LGA zone assignment needs local review. Do not use either the broad source window or the example below as a field decision.</p>}
            {sourceCropGuide && <SeasonPlanningDemoSections plan={sourceCropGuide} />}
            {!sourceCropGuide && <section className="rounded-2xl border border-[#70403B] bg-[#382321] p-4"><h2 className="text-sm font-bold text-white">Risks and limits</h2><p className="mt-2 text-xs leading-relaxed text-[#F2D1CE]">The source window is draft data and does not account for your field, soil, previous crop, variety, or current rainfall. Confirm decisions with a local extension worker.</p></section>}

            <button type="button" onClick={returnHomeFromPlanning} className="flex min-h-11 w-full items-center justify-center rounded-xl bg-[#292C2A] text-sm font-semibold text-white hover:bg-[#383B39]">Back to home</button>
          </>
        )}

        {screen === 'details' && selectedDemoCrop && activeState && activeLga && activeZone && (
          <>
            <article className="overflow-hidden rounded-2xl border border-[#66542E] bg-[#292C2A]">
              {getCropPreviewImage(selectedDemoCrop.crop) && <img src={getCropPreviewImage(selectedDemoCrop.crop)} alt={`${selectedDemoCrop.crop} plant`} className="h-40 w-full bg-[#181B19] object-cover" />}
              <div className="p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-[#A1A7A3]">Illustrative guide · {activeLga.name}, {activeState.name}</p>
                <h1 className="mt-1 text-xl font-bold text-white">{selectedDemoCrop.crop}</h1>
                <p className="mt-2 text-xs leading-relaxed text-[#D1D5DB]">Example for {activeZone}. It is not verified and does not use current field, soil, or weather measurements.</p>
              </div>
            </article>
            <SeasonPlanningDemoSections plan={selectedDemoCrop} />
            {activeLga.needsReview && <p role="note" className="rounded-2xl border border-[#70403B] bg-[#382321] p-4 text-xs leading-relaxed text-[#F2D1CE]">This LGA's farming-zone assignment needs review. Ask a local extension worker to confirm the zone before using even this illustrative guide for planning.</p>}
            <button type="button" onClick={returnHomeFromPlanning} className="flex min-h-11 w-full items-center justify-center rounded-xl bg-[#292C2A] text-sm font-semibold text-white hover:bg-[#383B39]">Back to home</button>
          </>
        )}

        {screen === 'details' && !selectedCrop && !selectedDemoCrop && activeLocation && (
          <div className="rounded-2xl border border-[#323633] bg-[#292C2A] p-4 text-xs leading-relaxed text-[#D1D5DB]">
            <p>{loadingRecommendations ? 'Loading crop guide…' : 'That crop is not available for this verified zone. The zone may need review.'}</p>
            <button type="button" onClick={returnHomeFromPlanning} className="mt-3 font-semibold text-[#22C55E]">Back to home</button>
          </div>
        )}

        <p className="px-1 pb-2 text-[10px] leading-relaxed text-[#777D78]">Published source windows, illustrative demo guides, and historical surveys are kept separate. Confirm crop choice, timing, and rotation with an agricultural extension worker.</p>
      </main>
    </div>
  );
};
