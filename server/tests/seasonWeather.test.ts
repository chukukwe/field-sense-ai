import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { getEketForecast } from '../src/weather.js';
import type { WeatherForecast } from '../src/weather.js';

const upstream = {
  daily: {
    time: ['2026-10-22', '2026-10-23'],
    precipitation_sum: [1.2, 0],
    precipitation_probability_max: [60, 5],
    temperature_2m_min: [23.1, 22.8],
    temperature_2m_max: [29.4, 30.2],
  },
};

function createTestApp(forecast: () => Promise<WeatherForecast>, weatherLimiterMax = 30) {
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
  it('requests verified Eket coordinates and preserves only returned daily values', async () => {
    let requestedUrl = '';
    const forecast = await getEketForecast(async (input) => {
      requestedUrl = String(input);
      return Response.json(upstream);
    }, new Date('2026-10-22T12:00:00.000Z'));
    const url = new URL(requestedUrl);
    assert.equal(url.searchParams.get('latitude'), '4.636638');
    assert.equal(url.searchParams.get('longitude'), '7.953654');
    assert.equal(url.searchParams.get('timezone'), 'Africa/Lagos');
    assert.match(url.searchParams.get('daily') ?? '', /precipitation_probability_max/);
    assert.equal(forecast.forecastDays.length, 2);
    assert.deepEqual(forecast.forecastDays[0], {
      date: '2026-10-22', precipitationMm: 1.2, precipitationProbabilityPct: 60,
      temperatureMinC: 23.1, temperatureMaxC: 29.4,
    });
    assert.equal(forecast.retrievedAt, '2026-10-22T12:00:00.000Z');
  });

  it('accepts and returns a complete seven-day forecast without changing its dates', async () => {
    const sevenDays = {
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

  it('rejects provider errors and malformed or mismatched arrays without filling in forecasts', async () => {
    await assert.rejects(getEketForecast(async () => new Response('unavailable', { status: 503 })));
    await assert.rejects(getEketForecast(async () => Response.json({ daily: { ...upstream.daily, temperature_2m_max: [28] } })));
    await assert.rejects(getEketForecast(async () => Response.json({ daily: { ...upstream.daily, precipitation_sum: [null, 0] } })));
    await assert.rejects(getEketForecast(async () => Response.json({ daily: { ...upstream.daily, time: ['2026-02-31', '2026-10-23'] } })));
    await assert.rejects(getEketForecast(async () => Response.json({ daily: { ...upstream.daily, precipitation_sum: [-1, 0] } })));
    await assert.rejects(getEketForecast(async () => Response.json({ daily: { ...upstream.daily, temperature_2m_min: [31, 22] } })));
    await assert.rejects(getEketForecast(async () => Response.json({ daily: { ...upstream.daily, precipitation_probability_max: [60, 101] } })));
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

  it('limits authenticated users independently after Firebase token verification', async () => {
    const app = createTestApp(async () => getEketForecast(async () => Response.json(upstream)), 1);
    const requestWeather = (token: string) => request(app).get('/api/season/weather?location=eket').set('Authorization', `Bearer ${token}`);
    assert.equal((await requestWeather('user-a')).status, 200);
    assert.equal((await requestWeather('user-a')).status, 429);
    assert.equal((await requestWeather('user-b')).status, 200);
    assert.equal((await request(app).get('/api/season/weather?location=eket').set('Authorization', 'Bearer invalid-token')).status, 401);
  });
});
