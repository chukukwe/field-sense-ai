import type { SeasonalRainfallRecord, SeasonalRainfallResult } from '../../shared/seasonalRainfall.js';
export type { SeasonalRainfallResult } from '../../shared/seasonalRainfall.js';
export interface SeasonalRainfallRequest { state: string; lga: string; year: number }
export class NimetServiceError extends Error {
  constructor(public readonly code: string, public readonly status: number, public readonly publicMessage: string, public readonly retryable = false) { super(code); }
}
const normalize = (value: string) => value.trim().toLowerCase().replace(/\s+/g, ' ').replace(/^fct$/, 'federal capital territory');
const invalid = () => new NimetServiceError('NIMET_RESPONSE_INVALID', 502, 'The seasonal outlook could not be checked. Please try again later.', true);
function record(value: unknown): SeasonalRainfallRecord {
  if (!value || typeof value !== 'object') throw invalid();
  const raw = value as Record<string, unknown>;
  const state = raw.state_name ?? raw.state;
  const lga = raw.lga_name ?? raw.lga;
  if (typeof state !== 'string' || !state.trim() || state.length > 100 || typeof lga !== 'string' || !lga.trim() || lga.length > 100 || !Number.isSafeInteger(raw.year)) throw invalid();
  const year = raw.year as number;
  const number = (value: unknown, max: number) => {
    if (value === undefined || value === null || value === '') return undefined;
    const result = typeof value === 'number' ? value : typeof value === 'string' && value.trim() ? Number(value) : NaN;
    if (!Number.isFinite(result) || result < 0 || result > max) throw invalid();
    return result;
  };
  const date = (value: unknown) => {
    if (value === undefined || value === null || value === '') return undefined;
    if (typeof value !== 'string') throw invalid();
    const parts = /^(\d{1,2})[- ]([A-Za-z]{3,9})(?:[- ](\d{4}))?$/.exec(value.trim());
    const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const month = parts ? months.findIndex((name) => name.toLowerCase() === parts[2]!.toLowerCase() || name.slice(0, 3).toLowerCase() === parts[2]!.toLowerCase()) : -1;
    if (!parts || month < 0 || (parts[3] && Number(parts[3]) !== year)) throw invalid();
    const day = Number(parts[1]);
    const parsed = new Date(Date.UTC(year, month, day));
    if (parsed.getUTCMonth() !== month || parsed.getUTCDate() !== day) throw invalid();
    return `${day} ${months[month]}`;
  };
  const lengthOfSeason = number(raw.season_length ?? raw.length_of_season, 366);
  if (lengthOfSeason !== undefined && (!Number.isInteger(lengthOfSeason) || lengthOfSeason < 1)) throw invalid();
  return { state: state.trim(), lga: lga.trim(), year, onset: date(raw.onset), cessation: date(raw.season_end ?? raw.cessation), lengthOfSeason, annualRainfall: number(raw.annual_rainfall, 20000) };
}

export function createNimetService(apiKey: string | undefined, fetcher: typeof fetch = fetch, now = Date.now) {
  const cache = new Map<string, { data: SeasonalRainfallResult; savedAt: number }>();
  const pending = new Map<string, Promise<SeasonalRainfallResult>>();
  return { async getSeasonalRainfall(input: SeasonalRainfallRequest): Promise<SeasonalRainfallResult> {
    if (!input.state?.trim() || input.state.length > 100 || !input.lga?.trim() || input.lga.length > 100 || !Number.isInteger(input.year) || input.year < 2000 || input.year > 2100) throw new NimetServiceError('NIMET_REQUEST_INVALID', 400, 'Choose a valid area and year.');
    if (!apiKey?.trim()) throw new NimetServiceError('NIMET_NOT_CONFIGURED', 503, 'The seasonal outlook is not available right now.', true);
    const key = `${normalize(input.state)}|${normalize(input.lga)}|${input.year}`;
    const cached = cache.get(key);
    if (cached && now() - cached.savedAt < 12 * 60 * 60 * 1000) return cached.data;
    cache.delete(key);
    if (pending.has(key)) return pending.get(key)!;
    const request = (async (): Promise<SeasonalRainfallResult> => {
      const url = new URL('https://api.nimet.gov.ng/api/srp');
      url.search = new URLSearchParams({ state: input.state, lga_name: input.lga, year: String(input.year) }).toString();
      let body: unknown;
      try {
        const response = await fetcher(url, { headers: { 'x-api-key': apiKey.trim(), Accept: 'application/json' }, signal: AbortSignal.timeout(10000) });
        if (response.status === 401 || response.status === 403) throw new NimetServiceError('NIMET_AUTH_FAILED', 503, 'The seasonal outlook is not available right now.', true);
        if (response.status === 429) throw new NimetServiceError('NIMET_RATE_LIMITED', 429, 'The seasonal outlook is busy. Try again later.', true);
        if (!response.ok) throw new NimetServiceError('NIMET_UPSTREAM_ERROR', 502, 'NiMet could not return the outlook. Try again later.', true);
        body = await response.json();
      } catch (error) {
        if (error instanceof NimetServiceError) throw error;
        throw new NimetServiceError('NIMET_UNAVAILABLE', 503, 'The seasonal outlook could not be reached. Try again later.', true);
      }
      if (!Array.isArray(body) || body.length > 2000) throw invalid();
      const matching = body.map(record).filter((row) => normalize(row.state) === normalize(input.state) && normalize(row.lga) === normalize(input.lga) && row.year === input.year);
      if (matching.length > 1) throw invalid();
      const fetchedAt = new Date(now()).toISOString();
      const data: SeasonalRainfallResult = matching[0] ? { status: 'available', record: matching[0], fetchedAt } : { status: 'no_record', ...input, fetchedAt };
      if (cache.size >= 500) cache.delete(cache.keys().next().value!);
      cache.set(key, { data, savedAt: now() });
      return data;
    })();
    pending.set(key, request);
    try { return await request; } finally { pending.delete(key); }
  } };
}
