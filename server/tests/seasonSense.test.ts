import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { forecastCoverage, isValidWeatherForecast, requestDeviceCoordinates, requestEketForecast, requestFarmingLocation, requestWeatherForecast, DeviceLocationError, FarmingLocationError, SeasonWeatherError, weatherObservation, type WeatherForecast } from '../../src/data/seasonSense.js';
import { getRecommendationEvidenceGap, getSeasonRecommendations, getSouthernPlanningRecommendations, getZoneDemoRecommendations, getZoneSampleSeason, isSouthernPlanningRegion, matchSupportedLocation, seasonSenseSources } from '../../src/data/seasonRecommendations.js';
import { nigeriaFarmingZones } from '../../src/data/nigeriaRegions.js';
import { seasonDemoRecommendations } from '../../src/data/seasonDemo.js';

const forecast: WeatherForecast = {
  locationId: 'eket', locationLabel: 'Eket, Akwa Ibom', source: 'Open-Meteo',
  latitude: 4.636638, longitude: 7.953654,
  timeZone: 'Africa/Lagos',
  retrievedAt: '2026-10-22T10:00:00.000Z',
  current: { observedAtLocal: '2026-10-22T11:00', temperatureC: 28, relativeHumidityPct: 72, precipitationMm: 0 },
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

  it('shows a source-based southern Nigeria planning list independently from device weather', () => {
    assert.equal(isSouthernPlanningRegion('Southern Nigeria'), true);
    assert.equal(isSouthernPlanningRegion('South Nigeria'), true);
    assert.equal(isSouthernPlanningRegion('Uyo, Akwa Ibom'), false);
    const plan = getSouthernPlanningRecommendations();
    assert.deepEqual(plan.map((crop) => crop.id), ['maize', 'cassava']);
    assert.ok(plan.every((crop) => crop.sources.length > 0 && crop.plantingWindow.length > 0));
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

  it('filters the sample crop list by NAERLS farming zone and broad current season', () => {
    assert.equal(nigeriaFarmingZones.length, 7);
    for (const zone of nigeriaFarmingZones) {
      const rainySeason = getZoneDemoRecommendations(zone, '2026-07-15');
      const drySeason = getZoneDemoRecommendations(zone, '2026-01-15');
      assert.ok(rainySeason.length >= 5, `${zone} has a useful sample list for the rainy-season preview`);
      assert.ok(drySeason.length >= 3, `${zone} has a useful sample list for the dry-season preview`);
      assert.ok(rainySeason.every((crop) => crop.sources.length === 0 && /sample/i.test(crop.why)));
    }
    assert.equal(getZoneSampleSeason('Humid Forest', '2026-10-22'), 'rainy-season sample');
    assert.equal(getZoneSampleSeason('Sahel Savanna', '2026-10-22'), 'dry-season sample');
    assert.notDeepEqual(
      getZoneDemoRecommendations('Sahel Savanna', '2026-07-15').map((crop) => crop.id),
      getZoneDemoRecommendations('Humid Forest', '2026-07-15').map((crop) => crop.id),
    );
  });

  it('requests an authenticated farming-zone lookup and validates its result', async () => {
    let url = '';
    let body = '';
    let authorization = '';
    const location = { country: 'Nigeria' as const, state: 'Akwa Ibom', localArea: 'Eket', zone: 'Humid Forest' as const };
    const result = await requestFarmingLocation('location-token', { latitude: 4.65, longitude: 7.93 }, async (input, init) => {
      url = String(input);
      body = String(init?.body);
      authorization = new Headers(init?.headers).get('authorization') ?? '';
      return Response.json({ location });
    });
    assert.equal(url, '/api/season/location');
    assert.equal(body, JSON.stringify({ latitude: 4.65, longitude: 7.93 }));
    assert.equal(authorization, 'Bearer location-token');
    assert.deepEqual(result, location);
    assert.equal(await requestFarmingLocation('token', { latitude: 4.65, longitude: 7.93 }, async () => Response.json({ location: null })), null);
    await assert.rejects(requestFarmingLocation('token', { latitude: 4.65, longitude: 7.93 }, async () => Response.json({ location: { ...location, zone: 'Political Zone' } })), FarmingLocationError);
    await assert.rejects(requestFarmingLocation('token', { latitude: 91, longitude: 7.93 }, async () => Response.json({ location })), FarmingLocationError);
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

  it('requests device location only through the click handler helper and uses bounded high-accuracy options', async () => {
    let options: { enableHighAccuracy: boolean; timeout: number; maximumAge: number } | undefined;
    const coords = await requestDeviceCoordinates({
      getCurrentPosition(onSuccess, _onError, requestOptions) {
        options = requestOptions;
        onSuccess({ coords: { latitude: 5.4, longitude: 7.8 } });
      },
    });
    assert.deepEqual(coords, { latitude: 5.4, longitude: 7.8 });
    assert.deepEqual(options, { enableHighAccuracy: true, timeout: 15_000, maximumAge: 30_000 });
  });

  it('shows clear device-location errors for unsupported browsers, denied access, unavailable position, and timeout', async () => {
    await assert.rejects(requestDeviceCoordinates(undefined), (error: unknown) => error instanceof DeviceLocationError && error.code === 'UNSUPPORTED');
    for (const [browserCode, expectedCode] of [[1, 'PERMISSION_DENIED'], [2, 'POSITION_UNAVAILABLE'], [3, 'TIMEOUT']] as const) {
      await assert.rejects(requestDeviceCoordinates({
        getCurrentPosition(_onSuccess, onError) { onError({ code: browserCode }); },
      }), (error: unknown) => error instanceof DeviceLocationError && error.code === expectedCode);
    }
    await assert.rejects(requestDeviceCoordinates({
      getCurrentPosition(onSuccess) { onSuccess({ coords: { latitude: 91, longitude: 7.8 } }); },
    }), (error: unknown) => error instanceof DeviceLocationError && error.code === 'INVALID_COORDINATES');
  });

  it('sends device coordinates to the authenticated backend without converting them to an Eket request', async () => {
    const deviceForecast: WeatherForecast = {
      ...forecast,
      locationId: 'device',
      locationLabel: 'Current location',
      latitude: 5.4,
      longitude: 7.8,
      timeZone: 'Africa/Lagos',
    };
    let method = '';
    let body = '';
    let authorization = '';
    const result = await requestWeatherForecast('device-token', { kind: 'coordinates', latitude: 5.4, longitude: 7.8 }, async (input, init) => {
      assert.equal(String(input), '/api/season/weather');
      method = init?.method ?? '';
      body = String(init?.body ?? '');
      authorization = new Headers(init?.headers).get('authorization') ?? '';
      return Response.json(deviceForecast);
    });
    assert.equal(method, 'POST');
    assert.deepEqual(JSON.parse(body), { latitude: 5.4, longitude: 7.8 });
    assert.equal(authorization, 'Bearer device-token');
    assert.deepEqual(result, deviceForecast);
    await assert.rejects(requestWeatherForecast('token', { kind: 'coordinates', latitude: 91, longitude: 0 }, async () => Response.json(deviceForecast)), (error: unknown) => error instanceof SeasonWeatherError && error.code === 'LOCATION_INVALID');
    await assert.rejects(requestWeatherForecast('token', { kind: 'coordinates', latitude: 5.4, longitude: 7.8 }, async () => Response.json({ ...deviceForecast, latitude: 4.636638 })), (error: unknown) => error instanceof SeasonWeatherError && error.code === 'INVALID_RESPONSE');
  });

  it('accepts missing optional values without inventing them and validates the Eket timezone', () => {
    const partial = {
      ...forecast,
      current: { observedAtLocal: '2026-10-22T11:00', temperatureC: 28 },
      forecastDays: [{ date: '2026-10-22', temperatureMinC: 23, temperatureMaxC: 30 }],
    };
    assert.equal(isValidWeatherForecast(partial), true);
    assert.equal(isValidWeatherForecast({ ...partial, timeZone: 'UTC' }), false);
    assert.equal(isValidWeatherForecast({ ...partial, current: { observedAtLocal: '2026-02-31T11:00', temperatureC: 28 } }), false);
    assert.equal(isValidWeatherForecast({ ...partial, current: { observedAtLocal: '2026-10-22T11:00', relativeHumidityPct: 101 } }), false);
    assert.equal(isValidWeatherForecast({ ...partial, forecastDays: [{ date: '2026-10-22' }] }), false);
  });

  it('reports unavailable, malformed, and network weather responses without fabricating values', async () => {
    await assert.rejects(requestEketForecast('token', async () => Response.json({ error: { message: 'Weather unavailable.' } }, { status: 503 })), (error: unknown) => error instanceof SeasonWeatherError && error.code === 'WEATHER_UNAVAILABLE');
    await assert.rejects(requestEketForecast('token', async () => Response.json({ ...forecast, forecastDays: [] })), (error: unknown) => error instanceof SeasonWeatherError && error.code === 'INVALID_RESPONSE');
    await assert.rejects(requestEketForecast('token', async () => Response.json({ ...forecast, forecastDays: [{ ...forecast.forecastDays[0]!, date: '2026-02-31' }] })), (error: unknown) => error instanceof SeasonWeatherError && error.code === 'INVALID_RESPONSE');
    await assert.rejects(requestEketForecast('token', async () => { throw new Error('offline'); }), (error: unknown) => error instanceof SeasonWeatherError
      && error.code === 'NETWORK_ERROR'
      && error.message === 'Could not reach the weather service. Weather is optional; you can retry.');
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
    assert.match(weatherObservation('cassava', { ...forecast, forecastDays: [{ date: '2026-10-22', temperatureMinC: 23 }] }) ?? '', /did not return rainfall values/);
    assert.equal(weatherObservation('cassava', null), null);
  });

  it('keeps sample crop cards available when the optional weather request fails', async () => {
    const before = structuredClone(seasonDemoRecommendations);
    await assert.rejects(requestEketForecast('token', async () => { throw new Error('offline'); }));
    assert.deepEqual(seasonDemoRecommendations, before);
    assert.ok(seasonDemoRecommendations.length > 0);
  });
});
