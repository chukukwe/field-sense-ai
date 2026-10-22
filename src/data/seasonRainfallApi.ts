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

export class SeasonalRainfallApiError extends Error {
  readonly code: string;

  constructor(message: string, code = 'NIMET_UNAVAILABLE') {
    super(message);
    this.name = 'SeasonalRainfallApiError';
    this.code = code;
  }
}

const apiBase = (import.meta.env?.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') ?? '';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validOptionalText(value: unknown): boolean {
  return value === undefined || (typeof value === 'string' && value.length > 0 && value.length <= 100);
}

function validOptionalNumber(value: unknown, min: number, max: number): boolean {
  return value === undefined || (typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max);
}

function validRecord(value: unknown, year: number): value is SeasonalRainfallRecord {
  if (!isRecord(value)) return false;
  const allowedKeys = ['state', 'lga', 'year', 'onset', 'cessation', 'lengthOfSeason', 'annualRainfall'];
  return Object.keys(value).every((key) => allowedKeys.includes(key))
    && typeof value.state === 'string' && value.state.length > 0
    && typeof value.lga === 'string' && value.lga.length > 0
    && value.year === year
    && validOptionalText(value.onset)
    && validOptionalText(value.cessation)
    && validOptionalNumber(value.lengthOfSeason, 1, 366)
    && validOptionalNumber(value.annualRainfall, 0, 20_000);
}

export async function fetchSeasonalRainfall(
  lgaId: number,
  year: number,
  fetcher: typeof fetch = fetch,
): Promise<SeasonalRainfallResult> {
  if (!Number.isSafeInteger(lgaId) || lgaId < 1 || !Number.isSafeInteger(year) || year < 2000 || year > 2100) {
    throw new SeasonalRainfallApiError('Choose a valid local area and year.', 'REQUEST_INVALID');
  }
  let response: Response;
  try {
    const query = new URLSearchParams({ lgaId: String(lgaId), year: String(year) });
    response = await fetcher(`${apiBase}/api/season/rainfall?${query}`, {
      cache: 'default',
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    throw new SeasonalRainfallApiError('Could not reach NiMet data. Crop timing is still available. Try again later.', 'NETWORK_ERROR');
  }
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const error = isRecord(body) && isRecord(body.error) ? body.error : null;
    throw new SeasonalRainfallApiError(
      error && typeof error.message === 'string' ? error.message : 'NiMet data could not be loaded. Crop timing is still available.',
      error && typeof error.code === 'string' ? error.code : 'NIMET_UNAVAILABLE',
    );
  }
  if (!isRecord(body)) throw new SeasonalRainfallApiError('NiMet returned data the app could not read.', 'INVALID_RESPONSE');
  if (body.status === 'no_record' && typeof body.state === 'string' && typeof body.lga === 'string' && body.year === year) {
    return { status: 'no_record', state: body.state, lga: body.lga, year };
  }
  if (body.status === 'available' && validRecord(body.record, year)) return { status: 'available', record: body.record };
  throw new SeasonalRainfallApiError('NiMet returned data the app could not read.', 'INVALID_RESPONSE');
}
