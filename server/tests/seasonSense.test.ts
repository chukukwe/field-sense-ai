import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { forecastCoverage, isValidWeatherForecast, requestEketForecast, SeasonWeatherError, weatherObservation, type WeatherForecast } from '../../src/data/seasonSense.js';
import { getRecommendationEvidenceGap, getSeasonRecommendations, matchSupportedLocation, seasonSenseSources } from '../../src/data/seasonRecommendations.js';

const forecast: WeatherForecast = {
  locationId: 'eket', locationLabel: 'Eket, Akwa Ibom', source: 'Open-Meteo',
  retrievedAt: '2026-10-22T10:00:00.000Z',
  forecastDays: [{ date: '2026-10-22', precipitationMm: 4.5, precipitationProbabilityPct: 70, temperatureMinC: 23, temperatureMaxC: 30 }],
};

describe('SeasonSense recommendation and weather helpers', () => {
  it('matches only the configured Eket location and reports unsupported or invalid inputs', () => {
    assert.deepEqual(matchSupportedLocation('Eket, Akwa Ibom, Nigeria'), { id: 'eket', label: 'Eket, Akwa Ibom' });
    assert.deepEqual(matchSupportedLocation(' Eket '), { id: 'eket', label: 'Eket, Akwa Ibom' });
    assert.equal(matchSupportedLocation('Akwa Ibom'), null);
    assert.equal(matchSupportedLocation('Uyo, Akwa Ibom'), null);
    assert.equal(getSeasonRecommendations('uyo', '2026-04-01').status, 'unsupported-location');
    assert.equal(getSeasonRecommendations('eket', '2026-02-31').status, 'invalid-date');
  });

  it('returns only crops whose cited planting windows include the selected date', () => {
    const earlyFebruary = getSeasonRecommendations('eket', '2026-02-10');
    assert.equal(earlyFebruary.status, 'ready');
    if (earlyFebruary.status === 'ready') assert.deepEqual(earlyFebruary.recommendations, []);

    const lateFebruary = getSeasonRecommendations('eket', '2026-02-21');
    assert.equal(lateFebruary.status, 'ready');
    if (lateFebruary.status === 'ready') assert.deepEqual(lateFebruary.recommendations.map((crop) => crop.id), ['maize']);

    const april = getSeasonRecommendations('eket', '2026-04-12');
    assert.equal(april.status, 'ready');
    if (april.status === 'ready') assert.deepEqual(april.recommendations.map((crop) => crop.id), ['cassava']);

    const august = getSeasonRecommendations('eket', '2026-08-12');
    assert.equal(august.status, 'ready');
    if (august.status === 'ready') assert.deepEqual(august.recommendations.map((crop) => crop.id), ['cassava', 'maize']);

    const october = getSeasonRecommendations('eket', '2026-10-22');
    assert.equal(october.status, 'ready');
    if (october.status === 'ready') assert.deepEqual(october.recommendations, []);
    assert.match(getRecommendationEvidenceGap('2026-10-22'), /do not include this date/);
  });

  it('keeps incomplete crop evidence visible without promoting it to a current recommendation', () => {
    assert.match(seasonSenseSources.okra.limitation, /does not have verified Eket/);
    assert.match(seasonSenseSources.yam.limitation, /does not establish an Eket-specific/);
    assert.match(seasonSenseSources.nimet.limitation, /not an Eket-specific crop recommendation/);
  });

  it('sends an authenticated weather request and accepts valid returned values', async () => {
    let url = '';
    let authorization = '';
    const result = await requestEketForecast('id-token', async (input, init) => {
      url = String(input);
      authorization = new Headers(init?.headers).get('authorization') ?? '';
      return Response.json(forecast);
    });
    assert.equal(url, '/api/season/weather?location=eket');
    assert.equal(authorization, 'Bearer id-token');
    assert.deepEqual(result, forecast);
  });

  it('reports unavailable, malformed, and network weather responses without fabricating values', async () => {
    await assert.rejects(requestEketForecast('token', async () => Response.json({ error: { message: 'Weather unavailable.' } }, { status: 503 })), (error: unknown) => error instanceof SeasonWeatherError && error.code === 'WEATHER_UNAVAILABLE');
    await assert.rejects(requestEketForecast('token', async () => Response.json({ ...forecast, forecastDays: [] })), (error: unknown) => error instanceof SeasonWeatherError && error.code === 'INVALID_RESPONSE');
    await assert.rejects(requestEketForecast('token', async () => Response.json({ ...forecast, forecastDays: [{ ...forecast.forecastDays[0]!, date: '2026-02-31' }] })), (error: unknown) => error instanceof SeasonWeatherError && error.code === 'INVALID_RESPONSE');
    await assert.rejects(requestEketForecast('token', async () => { throw new Error('offline'); }), (error: unknown) => error instanceof SeasonWeatherError && error.code === 'NETWORK_ERROR');
  });

  it('validates forecast coverage and keeps weather observations limited to returned forecast days', () => {
    assert.equal(isValidWeatherForecast(forecast), true);
    assert.equal(isValidWeatherForecast({ ...forecast, forecastDays: [] }), false);
    assert.equal(isValidWeatherForecast({ ...forecast, forecastDays: [{ ...forecast.forecastDays[0]!, precipitationProbabilityPct: 101 }] }), false);

    const complete = { ...forecast, forecastDays: Array.from({ length: 7 }, (_, index) => ({
      date: `2026-10-${String(22 + index).padStart(2, '0')}`, precipitationMm: index === 0 ? 0 : 1,
      temperatureMinC: 22, temperatureMaxC: 30,
    })) };
    assert.deepEqual(forecastCoverage(forecast), { start: '2026-10-22', end: '2026-10-22' });
    assert.deepEqual(forecastCoverage(complete), { start: '2026-10-22', end: '2026-10-28' });
    assert.equal(forecastCoverage({ ...forecast, forecastDays: [] }), null);
    assert.match(weatherObservation('cassava', { ...forecast, forecastDays: [{ ...forecast.forecastDays[0]!, precipitationMm: 0 }] }) ?? '', /does not confirm dry soil or a season-long dry spell/);
    assert.equal(weatherObservation('cassava', null), null);
  });
});
