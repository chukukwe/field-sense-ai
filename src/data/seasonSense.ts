import { nigeriaFarmingZones, type NigeriaFarmingZone } from './nigeriaRegions.js';

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

export interface DeviceCoordinates {
  latitude: number;
  longitude: number;
}

export interface ResolvedFarmingLocation {
  country: 'Nigeria';
  state: string;
  localArea?: string;
  zone: NigeriaFarmingZone;
}

const EKET_LATITUDE = 4.636638;
const EKET_LONGITUDE = 7.953654;

interface GeolocationLike {
  getCurrentPosition: (
    onSuccess: (position: { coords: DeviceCoordinates }) => void,
    onError: (error: { code: number }) => void,
    options: { enableHighAccuracy: boolean; timeout: number; maximumAge: number },
  ) => void;
}

export class DeviceLocationError extends Error {
  readonly code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = 'DeviceLocationError';
    this.code = code;
  }
}

export function requestDeviceCoordinates(geolocation: GeolocationLike | null | undefined): Promise<DeviceCoordinates> {
  if (!geolocation) {
    return Promise.reject(new DeviceLocationError('This browser does not support device location. Enter Eket manually instead.', 'UNSUPPORTED'));
  }
  return new Promise((resolve, reject) => {
    geolocation.getCurrentPosition((position) => {
      const { latitude, longitude } = position.coords;
      if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90
        || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
        reject(new DeviceLocationError('The device returned invalid coordinates. Try again or enter Eket manually.', 'INVALID_COORDINATES'));
        return;
      }
      resolve({ latitude, longitude });
    }, (error) => {
      if (error.code === 1) reject(new DeviceLocationError('Location permission was denied. Allow location access in your browser settings or enter Eket manually.', 'PERMISSION_DENIED'));
      else if (error.code === 2) reject(new DeviceLocationError('Your location is unavailable. Check your device location settings or enter Eket manually.', 'POSITION_UNAVAILABLE'));
      else if (error.code === 3) reject(new DeviceLocationError('Finding your location took too long. Try again or enter Eket manually.', 'TIMEOUT'));
      else reject(new DeviceLocationError('Could not get your location. Try again or enter Eket manually.', 'LOCATION_ERROR'));
    }, { enableHighAccuracy: true, timeout: 15_000, maximumAge: 30_000 });
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isValidCalendarDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year!, month! - 1, day!));
  return date.toISOString().slice(0, 10) === value;
}

function isValidLocalDateTime(value: unknown): value is string {
  if (typeof value !== 'string' || !/^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})$/.test(value)) return false;
  return isValidCalendarDate(value.slice(0, 10))
    && Number(value.slice(11, 13)) <= 23 && Number(value.slice(14, 16)) <= 59;
}

function validWeatherCode(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= 0 && (value as number) <= 99;
}

function validOptionalNumber(value: unknown, minimum: number, maximum: number): boolean {
  return value === undefined || (isFiniteNumber(value) && value >= minimum && value <= maximum);
}

function isValidTimeZone(value: unknown): value is string {
  if (typeof value !== 'string' || value.length > 100) return false;
  try {
    new Intl.DateTimeFormat('en', { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

function isValidCurrent(value: unknown): value is CurrentWeather | null {
  if (value === null) return true;
  if (!isRecord(value) || !isValidLocalDateTime(value.observedAtLocal)
    || Object.keys(value).some((key) => !['observedAtLocal', 'temperatureC', 'relativeHumidityPct', 'precipitationMm', 'weatherCode'].includes(key))
    || !validOptionalNumber(value.temperatureC, -90, 60)
    || !validOptionalNumber(value.relativeHumidityPct, 0, 100)
    || !validOptionalNumber(value.precipitationMm, 0, 1000)
    || (value.weatherCode !== undefined && !validWeatherCode(value.weatherCode))) return false;
  return Object.keys(value).length > 1;
}

export function isValidWeatherForecast(value: unknown): value is WeatherForecast {
  if (!isRecord(value)) return false;
  const forecast = value as Partial<WeatherForecast>;
  const isEket = forecast.locationId === 'eket' && forecast.locationLabel === 'Eket, Akwa Ibom';
  const isDevice = forecast.locationId === 'device' && forecast.locationLabel === 'Current location';
  if ((!isEket && !isDevice) || forecast.source !== 'Open-Meteo'
    || !isFiniteNumber(forecast.latitude) || forecast.latitude < -90 || forecast.latitude > 90
    || !isFiniteNumber(forecast.longitude) || forecast.longitude < -180 || forecast.longitude > 180
    || (isEket && (forecast.timeZone !== 'Africa/Lagos' || forecast.latitude !== EKET_LATITUDE || forecast.longitude !== EKET_LONGITUDE))
    || !isValidTimeZone(forecast.timeZone)
    || Object.keys(forecast).some((key) => !['locationId', 'locationLabel', 'latitude', 'longitude', 'source', 'timeZone', 'retrievedAt', 'current', 'forecastDays'].includes(key))
    || typeof forecast.retrievedAt !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(forecast.retrievedAt)
    || !Number.isFinite(Date.parse(forecast.retrievedAt))
    || !isValidCurrent(forecast.current)
    || !Array.isArray(forecast.forecastDays) || forecast.forecastDays.length < 1 || forecast.forecastDays.length > 7) return false;
  let previousDate = '';
  return forecast.forecastDays.every((day) => {
    if (!isRecord(day) || !isValidCalendarDate(day.date) || day.date <= previousDate
      || Object.keys(day).some((key) => !['date', 'precipitationMm', 'precipitationProbabilityPct', 'temperatureMinC', 'temperatureMaxC', 'weatherCode'].includes(key))
      || !validOptionalNumber(day.precipitationMm, 0, 1000)
      || !validOptionalNumber(day.precipitationProbabilityPct, 0, 100)
      || !validOptionalNumber(day.temperatureMinC, -90, 60)
      || !validOptionalNumber(day.temperatureMaxC, -90, 60)
      || (day.temperatureMinC !== undefined && day.temperatureMaxC !== undefined && day.temperatureMinC > day.temperatureMaxC)
      || (day.weatherCode !== undefined && !validWeatherCode(day.weatherCode))
      || !['precipitationMm', 'precipitationProbabilityPct', 'temperatureMinC', 'temperatureMaxC', 'weatherCode'].some((key) => day[key] !== undefined)) return false;
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
  const rainfallDays = forecast.forecastDays.filter((day) => day.precipitationMm !== undefined);
  const crop = { cassava: 'Cassava', maize: 'Maize', yam: 'Yam', okra: 'Okra' }[cropId];
  if (rainfallDays.length === 0) return `Open-Meteo did not return rainfall values for this forecast. It cannot support a rainfall summary for ${crop}.`;
  const zeroRainCount = rainfallDays.filter((day) => day.precipitationMm === 0).length;
  if (zeroRainCount === rainfallDays.length) {
    return `Open-Meteo forecasts no rain across these ${rainfallDays.length} returned day${rainfallDays.length === 1 ? '' : 's'} for ${crop}. This short-range forecast does not confirm dry soil or a season-long dry spell. Check field moisture and local agricultural guidance before scheduling planting or field work.`;
  }
  const rainDays = rainfallDays.length - zeroRainCount;
  return `Open-Meteo forecasts rain on ${rainDays} of ${rainfallDays.length} returned day${rainfallDays.length === 1 ? '' : 's'} for ${crop}. This short-range forecast does not confirm field conditions or crop damage. Check drainage, soil moisture and local agricultural guidance.`;
}

export class SeasonWeatherError extends Error {
  readonly code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = 'SeasonWeatherError';
    this.code = code;
  }
}

export class FarmingLocationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FarmingLocationError';
  }
}

const apiBase = (import.meta.env?.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') ?? '';

export async function requestFarmingLocation(
  idToken: string,
  coordinates: DeviceCoordinates,
  fetcher: typeof fetch = fetch,
): Promise<ResolvedFarmingLocation | null> {
  if (!Number.isFinite(coordinates.latitude) || coordinates.latitude < -90 || coordinates.latitude > 90
    || !Number.isFinite(coordinates.longitude) || coordinates.longitude < -180 || coordinates.longitude > 180) {
    throw new FarmingLocationError('The device returned invalid coordinates. Try again.');
  }
  let response: Response;
  try {
    response = await fetcher(`${apiBase}/api/season/location`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${idToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(coordinates),
      cache: 'no-store',
      signal: AbortSignal.timeout(8_000),
    });
  } catch {
    throw new FarmingLocationError('Could not identify your farming zone. Weather can still be shown. Try again later.');
  }
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message = isRecord(body) && isRecord(body.error) && typeof body.error.message === 'string'
      ? body.error.message : 'Could not identify your farming zone. Weather can still be shown.';
    throw new FarmingLocationError(message);
  }
  if (!isRecord(body) || !('location' in body)) throw new FarmingLocationError('The location service returned an invalid result.');
  if (body.location === null) return null;
  if (!isRecord(body.location)) throw new FarmingLocationError('The location service returned an invalid result.');
  const location = body.location;
  const zone = location.zone;
  if (location.country !== 'Nigeria'
    || typeof location.state !== 'string'
    || !nigeriaFarmingZones.some((knownZone) => knownZone === zone)
    || ('localArea' in location && typeof location.localArea !== 'string')) {
    throw new FarmingLocationError('The location service returned an invalid result.');
  }
  return {
    country: 'Nigeria',
    state: location.state,
    ...(typeof location.localArea === 'string' ? { localArea: location.localArea } : {}),
    zone: zone as NigeriaFarmingZone,
  };
}

export async function requestWeatherForecast(
  idToken: string,
  location: WeatherRequestLocation,
  fetcher: typeof fetch = fetch,
): Promise<WeatherForecast> {
  if (location.kind === 'coordinates' && (!Number.isFinite(location.latitude) || location.latitude < -90 || location.latitude > 90
    || !Number.isFinite(location.longitude) || location.longitude < -180 || location.longitude > 180)) {
    throw new SeasonWeatherError('The device returned invalid coordinates. Enter Eket manually instead.', 'LOCATION_INVALID');
  }
  let response: Response;
  try {
    const requestUrl = `${apiBase}/api/season/weather${location.kind === 'eket' ? '?location=eket' : ''}`;
    response = await fetcher(requestUrl, {
      method: location.kind === 'eket' ? 'GET' : 'POST',
      headers: {
        Authorization: `Bearer ${idToken}`,
        ...(location.kind === 'coordinates' ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(location.kind === 'coordinates' ? { body: JSON.stringify({ latitude: location.latitude, longitude: location.longitude }) } : {}),
      cache: 'no-store',
      signal: AbortSignal.timeout(12_000),
    });
  } catch {
    throw new SeasonWeatherError('Could not reach the weather service. Weather is optional; you can retry.', 'NETWORK_ERROR');
  }
  if (!response.ok) {
    const body: unknown = await response.json().catch(() => null);
    const message = isRecord(body) && isRecord(body.error) && typeof body.error.message === 'string'
      ? body.error.message : 'The short-term forecast is unavailable. Weather is optional; you can retry.';
    throw new SeasonWeatherError(message, 'WEATHER_UNAVAILABLE');
  }
  const body: unknown = await response.json().catch(() => null);
  if (!isValidWeatherForecast(body)
    || (location.kind === 'eket' && body.locationId !== 'eket')
    || (location.kind === 'coordinates' && (body.locationId !== 'device'
      || body.latitude !== location.latitude || body.longitude !== location.longitude))) {
    throw new SeasonWeatherError('The weather service returned incomplete or mismatched location data. Weather is optional; you can retry.', 'INVALID_RESPONSE');
  }
  return body;
}

export function requestEketForecast(idToken: string, fetcher: typeof fetch = fetch): Promise<WeatherForecast> {
  return requestWeatherForecast(idToken, { kind: 'eket' }, fetcher);
}
