export interface CurrentWeather {
  observedAtLocal: string;
  temperatureC?: number;
  relativeHumidityPct?: number;
  precipitationMm?: number;
  weatherCode?: number;
}

export interface ForecastDay {
  date: string;
  precipitationMm?: number;
  precipitationProbabilityPct?: number;
  temperatureMinC?: number;
  temperatureMaxC?: number;
  weatherCode?: number;
}

export interface WeatherForecast {
  locationId: 'eket' | 'device';
  locationLabel: 'Eket, Akwa Ibom' | 'Current location';
  latitude: number;
  longitude: number;
  source: 'Open-Meteo';
  timeZone: string;
  retrievedAt: string;
  current: CurrentWeather | null;
  forecastDays: ForecastDay[];
}

export type WeatherRequestLocation =
  | { kind: 'eket' }
  | { kind: 'coordinates'; latitude: number; longitude: number };

interface WeatherProviderResponse {
  latitude?: unknown;
  longitude?: unknown;
  timezone?: unknown;
  current?: {
    time?: unknown;
    temperature_2m?: unknown;
    relative_humidity_2m?: unknown;
    precipitation?: unknown;
    weather_code?: unknown;
  };
  daily?: {
    time?: unknown;
    precipitation_sum?: unknown;
    precipitation_probability_max?: unknown;
    temperature_2m_min?: unknown;
    temperature_2m_max?: unknown;
    weather_code?: unknown;
  };
}

export const EKET_LATITUDE = 4.636638;
export const EKET_LONGITUDE = 7.953654;
const MAX_COORDINATE_DISTANCE = 0.5;
const MIN_TEMPERATURE_C = -90;
const MAX_TEMPERATURE_C = 60;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function validCalendarDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  return new Date(Date.UTC(year!, month! - 1, day!)).toISOString().slice(0, 10) === value;
}

function validLocalDateTime(value: unknown): value is string {
  if (typeof value !== 'string' || !/^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})$/.test(value)) return false;
  const date = value.slice(0, 10);
  const hour = Number(value.slice(11, 13));
  const minute = Number(value.slice(14, 16));
  return validCalendarDate(date) && hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59;
}

function optionalNumberSeries(value: unknown, length: number): Array<number | undefined> | undefined {
  if (!Array.isArray(value) || value.length !== length) return undefined;
  if (!value.every((item) => item === null || isFiniteNumber(item))) return undefined;
  return value.map((item) => isFiniteNumber(item) ? item : undefined);
}

function validTemperature(value: number): boolean {
  return value >= MIN_TEMPERATURE_C && value <= MAX_TEMPERATURE_C;
}

function validWeatherCode(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= 0 && (value as number) <= 99;
}

function validTimeZone(value: unknown): value is string {
  if (typeof value !== 'string' || value.length > 100) return false;
  try {
    new Intl.DateTimeFormat('en', { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

function parseOptionalMetric(
  value: unknown,
  isValid: (numberValue: number) => boolean,
  label: string,
): number | undefined {
  if (value === undefined || value === null) return undefined;
  if (!isFiniteNumber(value) || !isValid(value)) throw new Error(`Weather provider returned an invalid ${label}.`);
  return value;
}

function parseCurrent(value: unknown): CurrentWeather | null {
  if (value === undefined || value === null) return null;
  if (!isRecord(value) || !validLocalDateTime(value.time)) throw new Error('Weather provider returned invalid current conditions.');
  const temperatureC = parseOptionalMetric(value.temperature_2m, validTemperature, 'temperature');
  const relativeHumidityPct = parseOptionalMetric(value.relative_humidity_2m, (item) => item >= 0 && item <= 100, 'humidity');
  const precipitationMm = parseOptionalMetric(value.precipitation, (item) => item >= 0 && item <= 1000, 'precipitation');
  const weatherCode = value.weather_code === undefined || value.weather_code === null
    ? undefined
    : validWeatherCode(value.weather_code) ? value.weather_code : undefined;
  if (value.weather_code !== undefined && value.weather_code !== null && weatherCode === undefined) {
    throw new Error('Weather provider returned an invalid current weather code.');
  }
  if (temperatureC === undefined && relativeHumidityPct === undefined && precipitationMm === undefined && weatherCode === undefined) return null;
  return {
    observedAtLocal: value.time,
    ...(temperatureC !== undefined ? { temperatureC } : {}),
    ...(relativeHumidityPct !== undefined ? { relativeHumidityPct } : {}),
    ...(precipitationMm !== undefined ? { precipitationMm } : {}),
    ...(weatherCode !== undefined ? { weatherCode } : {}),
  };
}

export async function getWeatherForecastForLocation(
  location: WeatherRequestLocation,
  fetcher: typeof fetch = fetch,
  now = new Date(),
): Promise<WeatherForecast> {
  const latitude = location.kind === 'eket' ? EKET_LATITUDE : location.latitude;
  const longitude = location.kind === 'eket' ? EKET_LONGITUDE : location.longitude;
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90
    || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    throw new Error('Weather request coordinates are invalid.');
  }
  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.search = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    current: 'temperature_2m,relative_humidity_2m,precipitation,weather_code',
    daily: 'precipitation_sum,precipitation_probability_max,temperature_2m_min,temperature_2m_max,weather_code',
    temperature_unit: 'celsius',
    precipitation_unit: 'mm',
    timezone: 'auto',
    forecast_days: '7',
  }).toString();
  const response = await fetcher(url, { signal: AbortSignal.timeout(8_000) });
  if (!response.ok) throw new Error('Weather provider returned an error.');
  const rawBody: unknown = await response.json();
  if (!isRecord(rawBody)) throw new Error('Weather provider returned an invalid response.');
  const body = rawBody as WeatherProviderResponse;
  if (!isFiniteNumber(body.latitude) || body.latitude < -90 || body.latitude > 90
    || !isFiniteNumber(body.longitude) || body.longitude < -180 || body.longitude > 180
    || Math.abs(body.latitude - latitude) > MAX_COORDINATE_DISTANCE
    || Math.abs(body.longitude - longitude) > MAX_COORDINATE_DISTANCE
    || !validTimeZone(body.timezone)
    || (location.kind === 'eket' && body.timezone !== 'Africa/Lagos')) {
    throw new Error('Weather provider returned a response for an unexpected location.');
  }

  const daily = body.daily;
  const dates = daily?.time;
  if (!Array.isArray(dates) || !dates.every(validCalendarDate) || dates.length === 0 || dates.length > 7
    || dates.some((date, index) => index > 0 && date <= dates[index - 1]!)) {
    throw new Error('Weather provider returned invalid forecast dates.');
  }
  const precipitation = daily?.precipitation_sum === undefined
    ? Array<number | undefined>(dates.length).fill(undefined)
    : optionalNumberSeries(daily.precipitation_sum, dates.length);
  const probability = daily?.precipitation_probability_max === undefined
    ? Array<number | undefined>(dates.length).fill(undefined)
    : optionalNumberSeries(daily.precipitation_probability_max, dates.length);
  const minimum = daily?.temperature_2m_min === undefined
    ? Array<number | undefined>(dates.length).fill(undefined)
    : optionalNumberSeries(daily.temperature_2m_min, dates.length);
  const maximum = daily?.temperature_2m_max === undefined
    ? Array<number | undefined>(dates.length).fill(undefined)
    : optionalNumberSeries(daily.temperature_2m_max, dates.length);
  const weatherCodes = daily?.weather_code === undefined
    ? Array<number | undefined>(dates.length).fill(undefined)
    : optionalNumberSeries(daily.weather_code, dates.length);
  if (!precipitation || !probability || !minimum || !maximum || !weatherCodes
    || precipitation.some((value) => value !== undefined && (value < 0 || value > 1000))
    || probability.some((value) => value !== undefined && (value < 0 || value > 100))
    || minimum.some((value) => value !== undefined && !validTemperature(value))
    || maximum.some((value) => value !== undefined && !validTemperature(value))
    || weatherCodes.some((value) => value !== undefined && !validWeatherCode(value))
    || minimum.some((value, index) => value !== undefined && maximum[index] !== undefined && value > maximum[index]!)) {
    throw new Error('Weather provider returned incomplete forecast data.');
  }
  const forecastDays = dates.map((date, index) => {
    const day = {
      date: date as string,
      ...(precipitation[index] !== undefined ? { precipitationMm: precipitation[index] } : {}),
      ...(probability[index] !== undefined ? { precipitationProbabilityPct: probability[index] } : {}),
      ...(minimum[index] !== undefined ? { temperatureMinC: minimum[index] } : {}),
      ...(maximum[index] !== undefined ? { temperatureMaxC: maximum[index] } : {}),
      ...(weatherCodes[index] !== undefined ? { weatherCode: weatherCodes[index] } : {}),
    } satisfies ForecastDay;
    if (Object.keys(day).length === 1) throw new Error('Weather provider returned a forecast day without weather values.');
    return day;
  });

  return {
    locationId: location.kind === 'eket' ? 'eket' : 'device',
    locationLabel: location.kind === 'eket' ? 'Eket, Akwa Ibom' : 'Current location',
    latitude,
    longitude,
    source: 'Open-Meteo',
    timeZone: body.timezone,
    retrievedAt: now.toISOString(),
    current: parseCurrent(body.current),
    forecastDays,
  };
}

export function getEketForecast(fetcher: typeof fetch = fetch, now = new Date()): Promise<WeatherForecast> {
  return getWeatherForecastForLocation({ kind: 'eket' }, fetcher, now);
}
