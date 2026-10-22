import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { getEketForecast, getWeatherForecastForLocation } from '../src/weather.js';
import type { WeatherForecast, WeatherRequestLocation } from '../src/weather.js';

const upstream = {
  latitude: 4.625,
  longitude: 7.875,
  timezone: 'Africa/Lagos',
  current: {
    time: '2026-10-22T13:00',
    temperature_2m: 28.3,
    relative_humidity_2m: 76,
    precipitation: 0.1,
    weather_code: 3,
  },
  daily: {
    time: ['2026-10-22', '2026-10-23'],
    precipitation_sum: [1.2, 0],
    precipitation_probability_max: [60, 5],
    temperature_2m_min: [23.1, 22.8],
    temperature_2m_max: [29.4, 30.2],
    weather_code: [61, 2],
  },
};

function createTestApp(forecast: (location: WeatherRequestLocation) => Promise<WeatherForecast>, weatherLimiterMax = 30) {
  return createApp({
    allowedOrigins: ['http://localhost:5173'],
    verifyIdToken: async (token) => { if (token === 'invalid-token') throw new Error('invalid'); return { uid: token === 'valid-token' ? 'farmer-1' : token }; },
    claimScan: async () => 'missing',
    saveAssessment: async () => undefined,
    failScan: async () => undefined,
    assessImage: async () => ({}),
    getWeatherForecast: forecast,
    weatherLimiterMax,
  });
}

describe('Eket short-term weather forecast', () => {
  it('requests verified Eket coordinates, local units, current conditions, and daily values', async () => {
    let requestedUrl = '';
    const forecast = await getEketForecast(async (input) => {
      requestedUrl = String(input);
      return Response.json(upstream);
    }, new Date('2026-10-22T12:00:00.000Z'));
    const url = new URL(requestedUrl);
    assert.equal(url.searchParams.get('latitude'), '4.636638');
    assert.equal(url.searchParams.get('longitude'), '7.953654');
    assert.equal(url.searchParams.get('timezone'), 'auto');
    assert.equal(url.searchParams.get('temperature_unit'), 'celsius');
    assert.equal(url.searchParams.get('precipitation_unit'), 'mm');
    assert.match(url.searchParams.get('current') ?? '', /relative_humidity_2m/);
    assert.match(url.searchParams.get('daily') ?? '', /precipitation_probability_max/);
    assert.equal(forecast.forecastDays.length, 2);
    assert.deepEqual(forecast.forecastDays[0], {
      date: '2026-10-22', precipitationMm: 1.2, precipitationProbabilityPct: 60,
      temperatureMinC: 23.1, temperatureMaxC: 29.4, weatherCode: 61,
    });
    assert.deepEqual(forecast.current, {
      observedAtLocal: '2026-10-22T13:00', temperatureC: 28.3,
      relativeHumidityPct: 76, precipitationMm: 0.1, weatherCode: 3,
    });
    assert.equal(forecast.latitude, 4.636638);
    assert.equal(forecast.longitude, 7.953654);
    assert.equal(forecast.timeZone, 'Africa/Lagos');
    assert.equal(forecast.retrievedAt, '2026-10-22T12:00:00.000Z');
  });

  it('accepts and returns a complete seven-day forecast without changing its dates', async () => {
    const sevenDays = {
      ...upstream,
      daily: {
        time: Array.from({ length: 7 }, (_, index) => `2026-10-${String(22 + index).padStart(2, '0')}`),
        precipitation_sum: [0, 1, 2, 3, 4, 5, 6],
        temperature_2m_min: [22, 22, 22, 22, 22, 22, 22],
        temperature_2m_max: [30, 30, 30, 30, 30, 30, 30],
      },
    };
    const result = await getEketForecast(async () => Response.json(sevenDays));
    assert.equal(result.forecastDays.length, 7);
    assert.equal(result.forecastDays[0]?.date, '2026-10-22');
    assert.equal(result.forecastDays.at(-1)?.date, '2026-10-28');
  });

  it('keeps absent optional values absent instead of filling them in', async () => {
    const result = await getEketForecast(async () => Response.json({
      ...upstream,
      current: { time: '2026-10-22T13:00', temperature_2m: 27, relative_humidity_2m: null, precipitation: null, weather_code: null },
      daily: {
        time: ['2026-10-22'], precipitation_sum: [null], precipitation_probability_max: [null],
        temperature_2m_min: [23], temperature_2m_max: [30], weather_code: [null],
      },
    }));
    assert.deepEqual(result.current, { observedAtLocal: '2026-10-22T13:00', temperatureC: 27 });
    assert.deepEqual(result.forecastDays[0], { date: '2026-10-22', temperatureMinC: 23, temperatureMaxC: 30 });
  });

  it('requests device coordinates and uses the timezone returned for that location', async () => {
    let requestedUrl = '';
    const result = await getWeatherForecastForLocation({ kind: 'coordinates', latitude: 5.4, longitude: 7.8 }, async (input) => {
      requestedUrl = String(input);
      return Response.json({ ...upstream, latitude: 5.375, longitude: 7.75, timezone: 'Europe/London' });
    });
    const url = new URL(requestedUrl);
    assert.equal(url.searchParams.get('latitude'), '5.4');
    assert.equal(url.searchParams.get('longitude'), '7.8');
    assert.equal(url.searchParams.get('timezone'), 'auto');
    assert.equal(result.locationId, 'device');
    assert.equal(result.locationLabel, 'Current location');
    assert.equal(result.latitude, 5.4);
    assert.equal(result.longitude, 7.8);
    assert.equal(result.timeZone, 'Europe/London');
    await assert.rejects(getWeatherForecastForLocation({ kind: 'coordinates', latitude: 91, longitude: 7.8 }, async () => Response.json(upstream)));
  });

  it('rejects provider errors, timeouts, bad coordinates, and malformed data without filling forecasts', async () => {
    await assert.rejects(getEketForecast(async () => new Response('unavailable', { status: 503 })));
    await assert.rejects(getEketForecast(async () => { throw new DOMException('Timed out', 'TimeoutError'); }));
    await assert.rejects(getEketForecast(async () => Response.json({ ...upstream, latitude: 40 })));
    await assert.rejects(getEketForecast(async () => Response.json({ ...upstream, timezone: 'Not/A_Time_Zone' })));
    await assert.rejects(getEketForecast(async () => new Response('not json', { status: 200 })));
    await assert.rejects(getEketForecast(async () => Response.json({ ...upstream, daily: { ...upstream.daily, temperature_2m_max: [28] } })));
    await assert.rejects(getEketForecast(async () => Response.json({ ...upstream, daily: { ...upstream.daily, precipitation_sum: ['bad', 0] } })));
    await assert.rejects(getEketForecast(async () => Response.json({ ...upstream, daily: { ...upstream.daily, time: ['2026-02-31', '2026-10-23'] } })));
    await assert.rejects(getEketForecast(async () => Response.json({ ...upstream, daily: { ...upstream.daily, precipitation_sum: [-1, 0] } })));
    await assert.rejects(getEketForecast(async () => Response.json({ ...upstream, daily: { ...upstream.daily, temperature_2m_min: [31, 22] } })));
    await assert.rejects(getEketForecast(async () => Response.json({ ...upstream, daily: { ...upstream.daily, precipitation_probability_max: [60, 101] } })));
    await assert.rejects(getEketForecast(async () => Response.json({ ...upstream, current: { ...upstream.current, relative_humidity_2m: 101 } })));
  });

  it('authenticates requests, accepts only the supported location, and returns an honest unavailable state', async () => {
    const app = createTestApp(async () => { throw new Error('upstream down'); });
    assert.equal((await request(app).get('/api/season/weather?location=eket')).status, 401);
    const unsupported = await request(app).get('/api/season/weather?location=uyo').set('Authorization', 'Bearer valid-token');
    assert.equal(unsupported.status, 400);
    assert.equal(unsupported.body.error.code, 'LOCATION_UNSUPPORTED');
    const unavailable = await request(app).get('/api/season/weather?location=eket').set('Authorization', 'Bearer valid-token');
    assert.equal(unavailable.status, 503);
    assert.equal(unavailable.body.error.code, 'WEATHER_UNAVAILABLE');
    assert.equal(unavailable.body.forecast, undefined);
  });

  it('returns the forecast to authenticated users only', async () => {
    const expected = await getEketForecast(async () => Response.json(upstream));
    const app = createTestApp(async () => expected);
    const result = await request(app).get('/api/season/weather?location=eket').set('Authorization', 'Bearer valid-token');
    assert.equal(result.status, 200);
    assert.deepEqual(result.body, expected);
  });

  it('accepts only valid authenticated device coordinates and never substitutes Eket', async () => {
    let receivedLocation: WeatherRequestLocation | undefined;
    const responseForecast: WeatherForecast = {
      ...(await getWeatherForecastForLocation({ kind: 'coordinates', latitude: 5.4, longitude: 7.8 }, async () => Response.json({
        ...upstream, latitude: 5.375, longitude: 7.75, timezone: 'Europe/London',
      }))),
    };
    const app = createTestApp(async (location) => { receivedLocation = location; return responseForecast; });
    const ok = await request(app).post('/api/season/weather').set('Authorization', 'Bearer valid-token').send({ latitude: 5.4, longitude: 7.8 });
    assert.equal(ok.status, 200);
    assert.deepEqual(receivedLocation, { kind: 'coordinates', latitude: 5.4, longitude: 7.8 });
    const invalid = await request(app).post('/api/season/weather').set('Authorization', 'Bearer valid-token').send({ latitude: 91, longitude: 7.8 });
    assert.equal(invalid.status, 400);
    assert.equal(invalid.body.error.code, 'LOCATION_INVALID');
    const incomplete = await request(app).post('/api/season/weather').set('Authorization', 'Bearer valid-token').send({ latitude: 5.4 });
    assert.equal(incomplete.status, 400);
    const unauthenticated = await request(app).post('/api/season/weather').send({ latitude: 5.4, longitude: 7.8 });
    assert.equal(unauthenticated.status, 401);
  });

  it('limits authenticated users independently after Firebase token verification', async () => {
    const app = createTestApp(async () => getEketForecast(async () => Response.json(upstream)), 1);
    const requestWeather = (token: string) => request(app).get('/api/season/weather?location=eket').set('Authorization', `Bearer ${token}`);
    assert.equal((await requestWeather('user-a')).status, 200);
    assert.equal((await requestWeather('user-a')).status, 429);
    assert.equal((await requestWeather('user-b')).status, 200);
    assert.equal((await request(app).get('/api/season/weather?location=eket').set('Authorization', 'Bearer invalid-token')).status, 401);
  });
});
