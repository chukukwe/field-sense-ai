export interface ForecastDay {
  date: string;
  precipitationMm: number;
  precipitationProbabilityPct?: number;
  temperatureMinC: number;
  temperatureMaxC: number;
}

export interface WeatherForecast {
  locationId: 'eket';
  locationLabel: 'Eket, Akwa Ibom';
  source: 'Open-Meteo';
  retrievedAt: string;
  forecastDays: ForecastDay[];
}

function isValidCalendarDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year!, month! - 1, day!));
  return date.toISOString().slice(0, 10) === value;
}

export function isValidWeatherForecast(value: unknown): value is WeatherForecast {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const forecast = value as Partial<WeatherForecast>;
  if (forecast.locationId !== 'eket' || forecast.locationLabel !== 'Eket, Akwa Ibom' || forecast.source !== 'Open-Meteo'
    || Object.keys(forecast).some((key) => !['locationId', 'locationLabel', 'source', 'retrievedAt', 'forecastDays'].includes(key))
    || typeof forecast.retrievedAt !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(forecast.retrievedAt)
    || !Number.isFinite(Date.parse(forecast.retrievedAt))
    || !Array.isArray(forecast.forecastDays) || forecast.forecastDays.length < 1 || forecast.forecastDays.length > 7) return false;
  let previousDate = '';
  return forecast.forecastDays.every((day) => {
    if (typeof day !== 'object' || day === null || !isValidCalendarDate(day.date) || day.date <= previousDate
      || Object.keys(day).some((key) => !['date', 'precipitationMm', 'precipitationProbabilityPct', 'temperatureMinC', 'temperatureMaxC'].includes(key))
      || !Number.isFinite(day.precipitationMm) || day.precipitationMm < 0
      || !Number.isFinite(day.temperatureMinC) || !Number.isFinite(day.temperatureMaxC) || day.temperatureMinC > day.temperatureMaxC
      || (day.precipitationProbabilityPct !== undefined && (!Number.isFinite(day.precipitationProbabilityPct)
        || day.precipitationProbabilityPct < 0 || day.precipitationProbabilityPct > 100))) return false;
    previousDate = day.date;
    return true;
  });
}

export function forecastCoverage(forecast: WeatherForecast): { start: string; end: string } | null {
  if (!isValidWeatherForecast(forecast)) return null;
  return { start: forecast.forecastDays[0]!.date, end: forecast.forecastDays.at(-1)!.date };
}

export type WeatherContextCrop = 'cassava' | 'maize' | 'yam' | 'okra';

export function weatherObservation(cropId: WeatherContextCrop, forecast: WeatherForecast | null): string | null {
  if (!forecast || !isValidWeatherForecast(forecast)) return null;
  const days = forecast.forecastDays;
  const zeroRainCount = days.filter((day) => day.precipitationMm === 0).length;
  const crop = { cassava: 'Cassava', maize: 'Maize', yam: 'Yam', okra: 'Okra' }[cropId];
  if (zeroRainCount === days.length) {
    return `Open-Meteo forecasts no rain across these ${days.length} returned day${days.length === 1 ? '' : 's'} for ${crop}. This short-range forecast does not confirm dry soil or a season-long dry spell. Check field moisture and local agricultural guidance before scheduling planting or field work.`;
  }
  const rainDays = days.length - zeroRainCount;
  return `Open-Meteo forecasts rain on ${rainDays} of ${days.length} returned day${days.length === 1 ? '' : 's'} for ${crop}. This short-range forecast does not confirm field conditions or crop damage. Check drainage, soil moisture and local agricultural guidance.`;
}

export class SeasonWeatherError extends Error {
  readonly code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = 'SeasonWeatherError';
    this.code = code;
  }
}

const apiBase = (import.meta.env?.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') ?? '';

export async function requestEketForecast(idToken: string, fetcher: typeof fetch = fetch): Promise<WeatherForecast> {
  let response: Response;
  try {
    response = await fetcher(`${apiBase}/api/season/weather?location=eket`, {
      headers: { Authorization: `Bearer ${idToken}` },
      cache: 'no-store',
    });
  } catch {
    throw new SeasonWeatherError('Could not reach the weather service. Sourced seasonal crop guidance remains available without a current forecast.', 'NETWORK_ERROR');
  }
  if (!response.ok) {
    const body: unknown = await response.json().catch(() => null);
    const message = typeof body === 'object' && body !== null && 'error' in body
      && typeof body.error === 'object' && body.error !== null && 'message' in body.error && typeof body.error.message === 'string'
      ? body.error.message : 'The short-term forecast is unavailable. Sourced seasonal crop guidance remains available without a current forecast.';
    throw new SeasonWeatherError(message, 'WEATHER_UNAVAILABLE');
  }
  const body: unknown = await response.json().catch(() => null);
  if (!isValidWeatherForecast(body)) throw new SeasonWeatherError('The weather service returned incomplete data. Sourced seasonal crop guidance remains available without a current forecast.', 'INVALID_RESPONSE');
  return body;
}
