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

interface WeatherProviderResponse {
  daily?: {
    time?: unknown;
    precipitation_sum?: unknown;
    precipitation_probability_max?: unknown;
    temperature_2m_min?: unknown;
    temperature_2m_max?: unknown;
  };
}

function numericSeries(value: unknown): number[] | undefined {
  if (!Array.isArray(value) || !value.every((item) => typeof item === 'number' && Number.isFinite(item))) return undefined;
  return value as number[];
}

function validCalendarDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  return new Date(Date.UTC(year!, month! - 1, day!)).toISOString().slice(0, 10) === value;
}

export async function getEketForecast(fetcher: typeof fetch = fetch, now = new Date()): Promise<WeatherForecast> {
  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.search = new URLSearchParams({
    latitude: '4.636638',
    longitude: '7.953654',
    daily: 'precipitation_sum,precipitation_probability_max,temperature_2m_min,temperature_2m_max',
    timezone: 'Africa/Lagos',
    forecast_days: '7',
  }).toString();
  const response = await fetcher(url, { signal: AbortSignal.timeout(8_000) });
  if (!response.ok) throw new Error('Weather provider returned an error.');
  const body = await response.json() as WeatherProviderResponse;
  const daily = body.daily;
  const dates = daily?.time;
  const precipitation = numericSeries(daily?.precipitation_sum);
  const rawProbability = daily?.precipitation_probability_max;
  const probability = numericSeries(daily?.precipitation_probability_max);
  const minimum = numericSeries(daily?.temperature_2m_min);
  const maximum = numericSeries(daily?.temperature_2m_max);
  if (!Array.isArray(dates) || !dates.every(validCalendarDate)
    || !precipitation || !minimum || !maximum || dates.length === 0
    || dates.length > 7 || dates.some((date, index) => index > 0 && date <= dates[index - 1]!)
    || dates.length !== precipitation.length || dates.length !== minimum.length || dates.length !== maximum.length
    || (rawProbability !== undefined && !probability)
    || (probability && dates.length !== probability.length)
    || precipitation.some((value) => value < 0)
    || (probability && probability.some((value) => value < 0 || value > 100))
    || minimum.some((value, index) => value > maximum[index]!)) {
    throw new Error('Weather provider returned incomplete forecast data.');
  }
  return {
    locationId: 'eket',
    locationLabel: 'Eket, Akwa Ibom',
    source: 'Open-Meteo',
    retrievedAt: now.toISOString(),
    forecastDays: dates.map((date, index) => ({
      date: date as string,
      precipitationMm: precipitation[index]!,
      ...(probability ? { precipitationProbabilityPct: probability[index]! } : {}),
      temperatureMinC: minimum[index]!,
      temperatureMaxC: maximum[index]!,
    })),
  };
}
