export interface SeasonDatabaseState {
  id: number;
  code: string;
  name: string;
}

export interface SeasonDatabaseLga {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  zone: { code: string; name: string; rainySeasonType: 'bimodal' | 'unimodal' | 'unknown' };
  zoneSource: SeasonZoneSource | null;
  needsReview: boolean;
}

export interface SeasonZoneSource {
  key: string;
  title: string;
  publisher: string;
  url: string;
  publicationYear: number;
  license: string;
}

export interface SeasonPlanningWindow {
  crop: string;
  category: string;
  season: string;
  activity: 'plant' | 'harvest';
  monthStart: number;
  monthEnd: number;
  status: 'draft' | 'reviewed' | 'verified';
  farmingSystem: string;
  evidenceScope: string;
  reviewNotes: string;
  sources: Array<SeasonDatabaseEntry['sources'][number]>;
}

export interface SeasonDatabaseEntry {
  crop: string;
  category: string;
  localNames?: string;
  season: string;
  activity: 'plant' | 'harvest';
  month: number;
  status: 'draft' | 'reviewed' | 'verified';
  source: string;
  farmingSystem?: string;
  variety?: string;
  evidenceScope?: string;
  reviewNotes?: string;
  sources: Array<{ key: string; title: string; publisher: string; url: string; publicationYear: number; geographicScope: string; license?: string; retrievedAt?: string }>;
}

export interface SeasonDatabasePlan {
  location: {
    lgaId: number;
    lga: string;
    state: string;
    zone: { code: string; name: string; rainySeasonType: 'bimodal' | 'unimodal' | 'unknown' };
    coordinates: { latitude: number; longitude: number };
    zoneSource: SeasonZoneSource | null;
    zoneNeedsReview: boolean;
  };
  calendar: {
    month: number;
    monthName: string;
    nextMonth: number;
    nextMonthName: string;
    timeZone: 'Africa/Lagos';
    status: 'sourced' | 'unavailable';
    notice: string;
  };
  locationReview: { lgaId: number; status: 'reviewed'; note: string } | null;
  zoneRecommendations: { zoneCode: string; zoneName: string; scope: 'agroecological-zone'; status: 'source_window' | 'unavailable'; source: SeasonZoneSource | null; message: string };
  planningWindows: SeasonPlanningWindow[];
  cropTiming: {
    status: 'sourced' | 'unavailable';
    message?: string;
    observations: Array<{
      crop: string;
      category: string;
      activity: 'plant' | 'harvest';
      monthStart: number | null;
      monthEnd: number | null;
      evidenceCount: number;
      surveyYears: number[];
      sourceCropNames: string[];
      status: 'sourced';
      geographicScope: string;
      source: { title: string; publisher: string; url: string; publicationYear: number; license: string };
    }>;
  };
  plantNow: SeasonDatabaseEntry[];
  harvestNow: SeasonDatabaseEntry[];
  plantNextMonth: SeasonDatabaseEntry[];
  emptyMessages: {
    plantNow?: string;
    harvestNow?: string;
    plantNextMonth?: string;
  };
}

export class SeasonPlanningApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SeasonPlanningApiError';
  }
}

const apiBase = (import.meta.env?.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') ?? '';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readZoneSource(value: unknown): value is SeasonZoneSource {
  return isRecord(value) && typeof value.key === 'string' && typeof value.title === 'string'
    && typeof value.publisher === 'string' && typeof value.url === 'string' && value.url.startsWith('https://')
    && Number.isInteger(value.publicationYear) && typeof value.license === 'string';
}

async function requestJson(path: string, fetcher: typeof fetch): Promise<Record<string, unknown>> {
  let response: Response;
  try {
    response = await fetcher(`${apiBase}${path}`, {
      // These shared lists are cached by the API for five minutes. Respect
      // that cache so revisiting the picker does not spend rate-limit calls.
      cache: 'default',
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    throw new SeasonPlanningApiError('Could not reach the crop database. Check your connection, then refresh the page.');
  }
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message = isRecord(body) && isRecord(body.error) && typeof body.error.message === 'string'
      ? body.error.message : 'The crop database could not load. Refresh the page to try again.';
    throw new SeasonPlanningApiError(message);
  }
  if (!isRecord(body)) throw new SeasonPlanningApiError('The crop database returned an invalid response.');
  return body;
}

function isPositiveId(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
}

function readState(value: unknown): SeasonDatabaseState | null {
  if (!isRecord(value) || !isPositiveId(value.id) || typeof value.code !== 'string' || typeof value.name !== 'string') return null;
  return { id: value.id, code: value.code, name: value.name };
}

function readLga(value: unknown): SeasonDatabaseLga | null {
  if (!isRecord(value) || !isPositiveId(value.id) || typeof value.name !== 'string'
    || typeof value.latitude !== 'number' || !Number.isFinite(value.latitude)
    || typeof value.longitude !== 'number' || !Number.isFinite(value.longitude)
    || typeof value.needsReview !== 'boolean'
    || !isRecord(value.zone) || typeof value.zone.code !== 'string' || typeof value.zone.name !== 'string'
    || (value.zone.rainySeasonType !== 'bimodal' && value.zone.rainySeasonType !== 'unimodal' && value.zone.rainySeasonType !== 'unknown')
    || !(value.zoneSource === null || readZoneSource(value.zoneSource))) return null;
  return {
    id: value.id,
    name: value.name,
    latitude: value.latitude,
    longitude: value.longitude,
    zone: { code: value.zone.code, name: value.zone.name, rainySeasonType: value.zone.rainySeasonType },
    zoneSource: value.zoneSource as SeasonZoneSource | null,
    needsReview: value.needsReview,
  };
}

export async function fetchSeasonStates(fetcher: typeof fetch = fetch): Promise<SeasonDatabaseState[]> {
  const body = await requestJson('/api/season/states', fetcher);
  if (!Array.isArray(body.states)) throw new SeasonPlanningApiError('The state list is incomplete. Refresh the page to try again.');
  const states = body.states.map((value: unknown) => readState(value));
  if (states.some((state) => !state)) throw new SeasonPlanningApiError('The state list contains invalid data. Refresh the page to try again.');
  return states as SeasonDatabaseState[];
}

export async function fetchSeasonLgas(stateId: number, fetcher: typeof fetch = fetch): Promise<{ state: SeasonDatabaseState; lgas: SeasonDatabaseLga[] }> {
  const body = await requestJson(`/api/season/states/${stateId}/lgas`, fetcher);
  const state = readState(body.state);
  if (!state || state.id !== stateId || !Array.isArray(body.lgas)) throw new SeasonPlanningApiError('The local-area list is incomplete. Refresh the page to try again.');
  const lgas = body.lgas.map((value: unknown) => readLga(value));
  if (lgas.some((lga) => !lga)) throw new SeasonPlanningApiError('The local-area list contains invalid data. Refresh the page to try again.');
  return { state, lgas: lgas as SeasonDatabaseLga[] };
}

function readEntry(value: unknown): value is SeasonDatabaseEntry {
  return isRecord(value) && typeof value.crop === 'string' && typeof value.category === 'string'
    && typeof value.season === 'string' && (value.activity === 'plant' || value.activity === 'harvest')
    && Number.isInteger(value.month) && Number(value.month) >= 1 && Number(value.month) <= 12
    && (value.status === 'draft' || value.status === 'reviewed' || value.status === 'verified') && typeof value.source === 'string'
    && (!('localNames' in value) || typeof value.localNames === 'string')
    && Array.isArray(value.sources) && value.sources.every((source) => isRecord(source)
      && typeof source.key === 'string' && typeof source.title === 'string' && typeof source.publisher === 'string'
      && typeof source.url === 'string' && source.url.startsWith('https://') && Number.isInteger(source.publicationYear)
      && typeof source.geographicScope === 'string'
      && (!('license' in source) || typeof source.license === 'string')
      && (!('retrievedAt' in source) || (typeof source.retrievedAt === 'string' && !Number.isNaN(Date.parse(source.retrievedAt)))));
}

export async function fetchLgaSeasonPlan(lgaId: number, fetcher: typeof fetch = fetch): Promise<SeasonDatabasePlan> {
  const body = await requestJson(`/api/season/recommendations/${lgaId}`, fetcher);
  if (!isRecord(body.location) || !isPositiveId(body.location.lgaId) || typeof body.location.lga !== 'string'
    || body.location.lgaId !== lgaId
    || typeof body.location.state !== 'string' || !isRecord(body.location.zone)
    || typeof body.location.zone.code !== 'string' || typeof body.location.zone.name !== 'string'
    || !(['bimodal', 'unimodal', 'unknown'] as unknown[]).includes(body.location.zone.rainySeasonType)
    || !(body.location.zoneSource === null || readZoneSource(body.location.zoneSource))
    || typeof body.location.zoneNeedsReview !== 'boolean'
    || !isRecord(body.calendar) || !Number.isInteger(body.calendar.month) || !Number.isInteger(body.calendar.nextMonth)
    || typeof body.calendar.monthName !== 'string' || typeof body.calendar.nextMonthName !== 'string'
    || body.calendar.timeZone !== 'Africa/Lagos'
    || !(['sourced', 'unavailable'] as unknown[]).includes(body.calendar.status)
    || typeof body.calendar.notice !== 'string') {
    throw new SeasonPlanningApiError('The crop calendar returned incomplete data. Try again.');
  }
  const groups = ['plantNow', 'harvestNow', 'plantNextMonth'] as const;
  for (const key of groups) {
    if (!Array.isArray(body[key]) || body[key].length !== 0 || !body[key].every(readEntry)) throw new SeasonPlanningApiError('The crop calendar contains unsupported planting recommendations. Try again.');
  }
  if (body.locationReview !== null) throw new SeasonPlanningApiError('The crop calendar returned unsupported review data.');
  if (!isRecord(body.zoneRecommendations)
    || body.zoneRecommendations.zoneCode !== body.location.zone.code
    || body.zoneRecommendations.zoneName !== body.location.zone.name
    || body.zoneRecommendations.scope !== 'agroecological-zone'
    || !(['source_window', 'unavailable'] as unknown[]).includes(body.zoneRecommendations.status)
    || !(body.zoneRecommendations.source === null || readZoneSource(body.zoneRecommendations.source))
    || typeof body.zoneRecommendations.message !== 'string') {
    throw new SeasonPlanningApiError('The crop calendar returned an invalid zone source status.');
  }
  if (!Array.isArray(body.planningWindows) || !body.planningWindows.every((entry) => isRecord(entry)
    && typeof entry.crop === 'string' && typeof entry.category === 'string' && typeof entry.season === 'string'
    && (entry.activity === 'plant' || entry.activity === 'harvest')
    && Number.isInteger(entry.monthStart) && Number(entry.monthStart) >= 1 && Number(entry.monthStart) <= 12
    && Number.isInteger(entry.monthEnd) && Number(entry.monthEnd) >= Number(entry.monthStart) && Number(entry.monthEnd) <= 12
    && (entry.status === 'draft' || entry.status === 'reviewed' || entry.status === 'verified')
    && typeof entry.farmingSystem === 'string' && typeof entry.evidenceScope === 'string'
    && typeof entry.reviewNotes === 'string' && Array.isArray(entry.sources) && entry.sources.length > 0
    && entry.sources.every((source) => isRecord(source) && typeof source.key === 'string'
      && typeof source.title === 'string' && typeof source.publisher === 'string'
      && typeof source.url === 'string' && source.url.startsWith('https://')
      && Number.isInteger(source.publicationYear) && typeof source.geographicScope === 'string'
      && typeof source.license === 'string'
      && typeof source.retrievedAt === 'string' && !Number.isNaN(Date.parse(source.retrievedAt))))) {
    throw new SeasonPlanningApiError('The crop calendar returned invalid source-backed windows.');
  }
  if ((body.zoneRecommendations.status === 'unavailable' && (body.planningWindows.length !== 0 || body.zoneRecommendations.source !== null))
    || (body.zoneRecommendations.status === 'source_window' && (body.planningWindows.length === 0 || !readZoneSource(body.zoneRecommendations.source)))) {
    throw new SeasonPlanningApiError('The source window status does not match the returned calendar entries.');
  }
  if (!isRecord(body.cropTiming) || !(['sourced','unavailable'] as unknown[]).includes(body.cropTiming.status)
    || !Array.isArray(body.cropTiming.observations) || !body.cropTiming.observations.every((item) => isRecord(item)
      && typeof item.crop === 'string' && typeof item.category === 'string'
      && (item.activity === 'plant' || item.activity === 'harvest')
      && (item.monthStart === null || (Number.isInteger(item.monthStart) && Number(item.monthStart) >= 1 && Number(item.monthStart) <= 12))
      && (item.monthEnd === null || (Number.isInteger(item.monthEnd) && Number(item.monthEnd) >= 1 && Number(item.monthEnd) <= 12))
      && (item.monthStart !== null || item.monthEnd !== null)
      && isPositiveId(item.evidenceCount) && Array.isArray(item.surveyYears) && item.surveyYears.every((year) => Number.isInteger(year))
      && Array.isArray(item.sourceCropNames) && item.sourceCropNames.every((name) => typeof name === 'string')
      && item.status === 'sourced' && typeof item.geographicScope === 'string' && isRecord(item.source)
      && typeof item.source.title === 'string' && typeof item.source.publisher === 'string'
      && typeof item.source.url === 'string' && item.source.url.startsWith('https://')
      && Number.isInteger(item.source.publicationYear) && typeof item.source.license === 'string')) {
    throw new SeasonPlanningApiError('The crop calendar returned invalid source records. Try again.');
  }
  if (body.cropTiming.status === 'unavailable' && body.cropTiming.observations.length !== 0) {
    throw new SeasonPlanningApiError('Unavailable crop data cannot include observations. Try again.');
  }
  if (!isRecord(body.emptyMessages)
    || Object.values(body.emptyMessages).some((message) => typeof message !== 'string')) {
    throw new SeasonPlanningApiError('The crop calendar returned invalid empty-period messages. Try again.');
  }
  return body as unknown as SeasonDatabasePlan;
}
