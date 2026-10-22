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
  zone: { code: string; name: string; rainySeasonType: 'bimodal' | 'unimodal' };
  zoneSource: string;
  needsReview: boolean;
}

export interface SeasonDatabaseEntry {
  crop: string;
  category: string;
  localNames?: string;
  season: string;
  activity: 'plant' | 'harvest';
  month: number;
  status: 'draft' | 'verified';
  source: string;
}

export interface SeasonDatabasePlan {
  location: {
    lgaId: number;
    lga: string;
    state: string;
    zone: { code: string; name: string; rainySeasonType: 'bimodal' | 'unimodal' };
    coordinates: { latitude: number; longitude: number };
    zoneSource: string;
    zoneNeedsReview: boolean;
  };
  calendar: {
    month: number;
    monthName: string;
    nextMonth: number;
    nextMonthName: string;
    timeZone: 'Africa/Lagos';
    status: 'draft' | 'mixed' | 'verified';
    notice: string;
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
    || typeof value.zoneSource !== 'string' || typeof value.needsReview !== 'boolean'
    || !isRecord(value.zone) || typeof value.zone.code !== 'string' || typeof value.zone.name !== 'string'
    || (value.zone.rainySeasonType !== 'bimodal' && value.zone.rainySeasonType !== 'unimodal')) return null;
  return {
    id: value.id,
    name: value.name,
    latitude: value.latitude,
    longitude: value.longitude,
    zone: { code: value.zone.code, name: value.zone.name, rainySeasonType: value.zone.rainySeasonType },
    zoneSource: value.zoneSource,
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
    && (value.status === 'draft' || value.status === 'verified') && typeof value.source === 'string'
    && (!('localNames' in value) || typeof value.localNames === 'string');
}

export async function fetchLgaSeasonPlan(lgaId: number, fetcher: typeof fetch = fetch): Promise<SeasonDatabasePlan> {
  const body = await requestJson(`/api/season/recommendations/${lgaId}`, fetcher);
  if (!isRecord(body.location) || !isPositiveId(body.location.lgaId) || typeof body.location.lga !== 'string'
    || typeof body.location.state !== 'string' || !isRecord(body.location.zone)
    || typeof body.location.zone.code !== 'string' || typeof body.location.zone.name !== 'string'
    || typeof body.location.zoneNeedsReview !== 'boolean'
    || !isRecord(body.calendar) || !Number.isInteger(body.calendar.month) || !Number.isInteger(body.calendar.nextMonth)
    || typeof body.calendar.monthName !== 'string' || typeof body.calendar.nextMonthName !== 'string'
    || body.calendar.timeZone !== 'Africa/Lagos'
    || (body.calendar.status !== 'draft' && body.calendar.status !== 'mixed' && body.calendar.status !== 'verified')
    || typeof body.calendar.notice !== 'string') {
    throw new SeasonPlanningApiError('The crop calendar returned incomplete data. Try again.');
  }
  const groups = ['plantNow', 'harvestNow', 'plantNextMonth'] as const;
  for (const key of groups) {
    if (!Array.isArray(body[key]) || !body[key].every(readEntry)) throw new SeasonPlanningApiError('The crop calendar contains invalid entries. Try again.');
  }
  if (!isRecord(body.emptyMessages)
    || Object.values(body.emptyMessages).some((message) => typeof message !== 'string')) {
    throw new SeasonPlanningApiError('The crop calendar returned invalid empty-period messages. Try again.');
  }
  return body as unknown as SeasonDatabasePlan;
}
