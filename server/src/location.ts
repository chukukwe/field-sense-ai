import { getNigeriaFarmingLocation, type NigeriaFarmingZone } from '../../src/data/nigeriaRegions.js';

export interface DeviceLocationCoordinates {
  latitude: number;
  longitude: number;
}

export interface ResolvedNigeriaLocation {
  country: 'Nigeria';
  state: string;
  localArea?: string;
  zone: NigeriaFarmingZone;
}

interface ReverseGeocodeResponse {
  address?: {
    country_code?: unknown;
    state?: unknown;
    county?: unknown;
    city_district?: unknown;
    municipality?: unknown;
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isInNigeriaBounds({ latitude, longitude }: DeviceLocationCoordinates): boolean {
  return latitude >= 4 && latitude <= 14 && longitude >= 2.5 && longitude <= 15.5;
}

export function createNigeriaReverseGeocoder(
  fetcher: typeof fetch = fetch,
  endpoint = 'https://nominatim.openstreetmap.org/reverse',
  userAgent = 'FieldVoiceAI/1.0',
  now: () => number = Date.now,
  wait: (milliseconds: number) => Promise<void> = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)),
) {
  const cache = new Map<string, { value: ResolvedNigeriaLocation | null; savedAt: number }>();
  let lastRequestStartedAt = 0;
  let requestQueue = Promise.resolve();

  return async function resolveDeviceLocation(coordinates: DeviceLocationCoordinates): Promise<ResolvedNigeriaLocation | null> {
    const { latitude, longitude } = coordinates;
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90
      || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
      throw new Error('Invalid device coordinates.');
    }
    if (!isInNigeriaBounds(coordinates)) return null;

    const cacheKey = `${latitude.toFixed(3)},${longitude.toFixed(3)}`;
    const cached = cache.get(cacheKey);
    if (cached && now() - cached.savedAt < 24 * 60 * 60 * 1000) return cached.value;
    if (cached) cache.delete(cacheKey);

    let releaseQueue!: () => void;
    const previousRequest = requestQueue;
    requestQueue = new Promise<void>((resolve) => { releaseQueue = resolve; });
    await previousRequest;
    try {
      const refreshedCache = cache.get(cacheKey);
      if (refreshedCache && now() - refreshedCache.savedAt < 24 * 60 * 60 * 1000) return refreshedCache.value;
      const delay = Math.max(0, 1_100 - (now() - lastRequestStartedAt));
      if (delay > 0) await wait(delay);
      lastRequestStartedAt = now();

      const url = new URL(endpoint);
      url.search = new URLSearchParams({
        format: 'jsonv2',
        addressdetails: '1',
        zoom: '8',
        lat: String(latitude),
        lon: String(longitude),
      }).toString();
      const response = await fetcher(url, {
        headers: { 'User-Agent': userAgent, Accept: 'application/json' },
        signal: AbortSignal.timeout(5_000),
      });
      if (!response.ok) throw new Error(`Reverse geocoder returned HTTP ${response.status}.`);
      const body: unknown = await response.json().catch(() => null);
      if (!isRecord(body)) throw new Error('Reverse geocoder returned malformed data.');
      const address = (body as ReverseGeocodeResponse).address;
      if (!address || typeof address.country_code !== 'string') {
        throw new Error('Reverse geocoder did not return a country.');
      }
      const localArea = [address.county, address.city_district, address.municipality]
        .find((value): value is string => typeof value === 'string' && value.trim().length > 0);
      const region = address.country_code.toLowerCase() === 'ng'
        ? getNigeriaFarmingLocation(address.state, localArea)
        : null;
      const result = region
        ? { country: 'Nigeria' as const, ...region, ...(localArea ? { localArea } : {}) }
        : null;
      if (cache.size >= 500) cache.delete(cache.keys().next().value!);
      cache.set(cacheKey, { value: result, savedAt: now() });
      return result;
    } finally {
      releaseQueue();
    }
  };
}
