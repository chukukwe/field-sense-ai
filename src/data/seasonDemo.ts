import type { CropRecommendation } from './seasonRecommendations.js';
import type { ForecastDay, WeatherForecast } from './seasonSense.js';

export type DemoWeatherForecast = Omit<WeatherForecast, 'source'> & { source: 'Sample data' };

export const seasonDemoRecommendations: CropRecommendation[] = [
  {
    id: 'cassava',
    name: 'Cassava',
    image: '/assets/crop-cassava-clear.webp',
    summary: 'Sample crop card for preview only.',
    why: 'This sample entry demonstrates the crop details screen. It is not a real planting recommendation.',
    plantingWindow: 'Demo placeholder — no planting window provided',
    windowNote: 'No verified local planting schedule is represented by this sample.',
    considerations: ['Sample condition to check — replace with verified local guidance.'],
    guidance: ['Sample guidance — do not use this entry to make a planting decision.'],
    risks: ['This is placeholder content and has not been validated for Eket.'],
    sources: [],
  },
  {
    id: 'maize',
    name: 'Maize',
    image: '/assets/crop-maize-clear.webp',
    summary: 'Sample crop card for preview only.',
    why: 'This sample entry demonstrates the crop details screen. It is not a real planting recommendation.',
    plantingWindow: 'Demo placeholder — no planting window provided',
    windowNote: 'No verified local planting schedule is represented by this sample.',
    considerations: ['Sample condition to check — replace with verified local guidance.'],
    guidance: ['Sample guidance — do not use this entry to make a planting decision.'],
    risks: ['This is placeholder content and has not been validated for Eket.'],
    sources: [],
  },
];

function addDays(date: string, offset: number): string {
  const day = new Date(`${date}T12:00:00.000Z`);
  day.setUTCDate(day.getUTCDate() + offset);
  return day.toISOString().slice(0, 10);
}

export function getSeasonSenseDemoForecast(startDate: string): DemoWeatherForecast {
  const sampleValues = [
    { precipitationMm: 2.4, precipitationProbabilityPct: 45, temperatureMinC: 23, temperatureMaxC: 30 },
    { precipitationMm: 5.1, precipitationProbabilityPct: 65, temperatureMinC: 22, temperatureMaxC: 29 },
    { precipitationMm: 0.8, precipitationProbabilityPct: 25, temperatureMinC: 23, temperatureMaxC: 31 },
  ];
  const forecastDays: ForecastDay[] = sampleValues.map((values, index) => ({
    date: addDays(startDate, index),
    ...values,
  }));

  return {
    locationId: 'eket',
    locationLabel: 'Eket, Akwa Ibom',
    latitude: 4.636638,
    longitude: 7.953654,
    source: 'Sample data',
    timeZone: 'Africa/Lagos',
    retrievedAt: new Date().toISOString(),
    current: null,
    forecastDays,
  };
}
