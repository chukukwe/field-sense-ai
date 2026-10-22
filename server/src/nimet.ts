export interface SeasonalRainfallRequest {
  state: string;
  lga: string;
  year: number;
}

export interface SeasonalRainfallRecord {
  state: string;
  lga: string;
  year: number;
  onset?: string;
  cessation?: string;
  lengthOfSeason?: number;
  annualRainfall?: number;
}

export type SeasonalRainfallResult =
  | { status: 'available'; record: SeasonalRainfallRecord }
  | { status: 'no_record'; state: string; lga: string; year: number };

export class NimetServiceError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number,
    public readonly publicMessage: string,
    public readonly retryable = false,
  ) {
    super(code);
    this.name = 'NimetServiceError';
  }
}

interface NimetSrpRecord {
  state?: unknown;
  state_name?: unknown;
  lga?: unknown;
  lga_name?: unknown;
  year?: unknown;
  onset?: unknown;
  cessation?: unknown;
  season_end?: unknown;
  length_of_season?: unknown;
  season_length?: unknown;
  annual_rainfall?: unknown;
}

const BASE_URL = 'https://api.nimet.gov.ng/api';
const CACHE_TTL_MS = 12 * 60 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 8_000;
const MAX_CACHE_ENTRIES = 500;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizePlaceName(value: string): string {
  const normalized = value.toLowerCase().trim().replace(/\s+/g, ' ');
  return normalized === 'fct' ? 'federal capital territory' : normalized;
}

function validateRequest(input: SeasonalRainfallRequest): void {
  if (typeof input.state !== 'string' || input.state.trim().length < 2 || input.state.length > 100
    || typeof input.lga !== 'string' || input.lga.trim().length < 2 || input.lga.length > 100
    || !Number.isSafeInteger(input.year) || input.year < 2000 || input.year > 2100) {
    throw new NimetServiceError('NIMET_REQUEST_INVALID', 400, 'Choose a valid state, local area, and year.');
  }
}

function optionalText(value: unknown): string | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value !== 'string' || value.length > 100 || /[<>]/.test(value)) {
    throw new NimetServiceError('NIMET_RESPONSE_INVALID', 502, 'NiMet returned data the app could not read.');
  }
  return value;
}

function optionalNumber(value: unknown, label: string, min: number, max: number): number | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const numberValue = typeof value === 'number' ? value : typeof value === 'string' && value.trim() !== '' ? Number(value) : NaN;
  if (!Number.isFinite(numberValue) || numberValue < min || numberValue > max) {
    throw new NimetServiceError('NIMET_RESPONSE_INVALID', 502, `NiMet returned an invalid ${label} value.`);
  }
  return numberValue;
}

function parseRecord(value: unknown): SeasonalRainfallRecord {
  if (!isRecord(value)) throw new NimetServiceError('NIMET_RESPONSE_INVALID', 502, 'NiMet returned data the app could not read.');
  const raw = value as NimetSrpRecord;
  const state = raw.state_name ?? raw.state;
  const lga = raw.lga_name ?? raw.lga;
  if (typeof state !== 'string' || state.trim().length === 0
    || typeof lga !== 'string' || lga.trim().length === 0
    || !Number.isSafeInteger(raw.year)) {
    throw new NimetServiceError('NIMET_RESPONSE_INVALID', 502, 'NiMet returned a rainfall record without its location or year.');
  }
  const onset = optionalText(raw.onset);
  const cessation = optionalText(raw.season_end ?? raw.cessation);
  const lengthOfSeason = optionalNumber(raw.season_length ?? raw.length_of_season, 'season length', 1, 366);
  const annualRainfall = optionalNumber(raw.annual_rainfall, 'annual rainfall', 0, 20_000);
  return {
    state: state.trim(),
    lga: lga.trim(),
    year: raw.year as number,
    ...(onset !== undefined ? { onset } : {}),
    ...(cessation !== undefined ? { cessation } : {}),
    ...(lengthOfSeason !== undefined ? { lengthOfSeason } : {}),
    ...(annualRainfall !== undefined ? { annualRainfall } : {}),
  };
}

export function createNimetService(
  apiKey: string | undefined,
  fetcher: typeof fetch = fetch,
  now: () => number = Date.now,
) {
  const cache = new Map<string, { value: SeasonalRainfallResult; savedAt: number }>();

  return {
    async getSeasonalRainfall(input: SeasonalRainfallRequest): Promise<SeasonalRainfallResult> {
      validateRequest(input);
      const state = input.state.trim();
      const lga = input.lga.trim();
      const key = `${normalizePlaceName(state)}|${normalizePlaceName(lga)}|${input.year}`;
      const cached = cache.get(key);
      if (cached && now() - cached.savedAt < CACHE_TTL_MS) return cached.value;
      if (cached) cache.delete(key);

      if (!apiKey?.trim()) {
        throw new NimetServiceError('NIMET_NOT_CONFIGURED', 503, 'NiMet data is not set up yet. Add NIMET_API_KEY to the backend environment, then restart the server.', true);
      }

      const url = new URL(`${BASE_URL}/srp`);
      url.search = new URLSearchParams({ state, lga_name: lga, year: String(input.year) }).toString();
      let response: Response;
      try {
        response = await fetcher(url, {
          headers: { 'x-api-key': apiKey.trim(), Accept: 'application/json' },
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        });
      } catch {
        throw new NimetServiceError('NIMET_UNAVAILABLE', 503, 'NiMet could not be reached. Try again later.', true);
      }

      if (response.status === 401 || response.status === 403) {
        throw new NimetServiceError('NIMET_AUTH_FAILED', 503, 'NiMet did not accept the server key. Check NIMET_API_KEY in the backend settings.', true);
      }
      if (response.status === 429) {
        throw new NimetServiceError('NIMET_RATE_LIMITED', 429, 'NiMet is receiving too many requests. Try again later.', true);
      }
      if (!response.ok) {
        throw new NimetServiceError('NIMET_UPSTREAM_ERROR', 502, 'NiMet could not return rainfall data right now.', true);
      }

      const body: unknown = await response.json().catch(() => null);
      if (!Array.isArray(body)) {
        throw new NimetServiceError('NIMET_RESPONSE_INVALID', 502, 'NiMet returned data the app could not read.');
      }
      const records = body.map(parseRecord);
      const matching = records.filter((record) => normalizePlaceName(record.state) === normalizePlaceName(state)
        && normalizePlaceName(record.lga) === normalizePlaceName(lga)
        && record.year === input.year);
      if (matching.length > 1) {
        throw new NimetServiceError('NIMET_RESPONSE_AMBIGUOUS', 502, 'NiMet returned more than one matching rainfall record.');
      }
      const result: SeasonalRainfallResult = matching[0]
        ? { status: 'available', record: matching[0] }
        : { status: 'no_record', state, lga, year: input.year };
      if (cache.size >= MAX_CACHE_ENTRIES) cache.delete(cache.keys().next().value!);
      cache.set(key, { value: result, savedAt: now() });
      return result;
    },
  };
}
