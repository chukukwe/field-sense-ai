import type { SeasonalRainfallResult } from '../../shared/seasonalRainfall.js';
export async function fetchSeasonalRainfall(input: { stateId: number; lgaId: number; year: number; idToken: string; signal: AbortSignal }, fetcher: typeof fetch = fetch): Promise<SeasonalRainfallResult> {
  const base = (import.meta.env?.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') ?? '';
  const query = new URLSearchParams({ stateId: String(input.stateId), lgaId: String(input.lgaId), year: String(input.year) });
  const response = await fetcher(`${base}/api/farm-guide/rainfall?${query}`, { headers: { Authorization: `Bearer ${input.idToken}` }, signal: AbortSignal.any([input.signal, AbortSignal.timeout(20000)]), cache: 'no-store' });
  const body: unknown = await response.json();
  if (!response.ok || !body || typeof body !== 'object') throw new Error('Seasonal outlook unavailable.');
  const data = body as Record<string, unknown>;
  if (typeof data.fetchedAt !== 'string' || !Number.isFinite(Date.parse(data.fetchedAt))) throw new Error('Invalid outlook.');
  if (data.status === 'no_record' && data.year === input.year && typeof data.state === 'string' && typeof data.lga === 'string') return data as SeasonalRainfallResult;
  if (data.status === 'available' && data.record && typeof data.record === 'object') {
    const record = data.record as Record<string, unknown>;
    if (record.year !== input.year || typeof record.state !== 'string' || typeof record.lga !== 'string') throw new Error('Wrong outlook.');
    for (const field of ['onset','cessation']) if (record[field] !== undefined && (typeof record[field] !== 'string' || (record[field] as string).length > 100)) throw new Error('Invalid outlook.');
    for (const field of ['annualRainfall','lengthOfSeason']) if (record[field] !== undefined && (typeof record[field] !== 'number' || !Number.isFinite(record[field]) || (record[field] as number) < 0)) throw new Error('Invalid outlook.');
    return data as SeasonalRainfallResult;
  }
  throw new Error('Invalid outlook.');
}
