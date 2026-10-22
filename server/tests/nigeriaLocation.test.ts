import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import request from 'supertest';
import { getNigeriaFarmingLocation, getNigeriaFarmingZone, matchManualFarmingLocation } from '../../src/data/nigeriaRegions.js';
import { createApp } from '../src/app.js';
import { createNigeriaReverseGeocoder } from '../src/location.js';

describe('Nigeria farming-zone location lookup', () => {
  it('maps confirmed state and local-area examples to NAERLS farming zones', () => {
    assert.deepEqual(getNigeriaFarmingLocation('Akwa Ibom', 'Eket'), { state: 'Akwa Ibom', zone: 'Humid Forest' });
    assert.equal(getNigeriaFarmingZone('Yobe', 'Damaturu'), 'Sudan Savanna');
    assert.equal(getNigeriaFarmingZone('Yobe', 'Potiskum'), 'Sahel Savanna');
    assert.equal(getNigeriaFarmingZone('Kaduna', "Jema'a"), 'Southern Guinea Savanna');
    assert.equal(getNigeriaFarmingZone('Kaduna', 'Kaduna'), 'Northern Guinea Savanna');
    assert.equal(getNigeriaFarmingZone('Plateau', 'Jos North'), 'Mid Altitude');
    assert.equal(getNigeriaFarmingZone('Plateau', 'Wase'), 'Southern Guinea Savanna');
    assert.equal(getNigeriaFarmingZone('Cross River', 'Obudu'), 'Derived Savanna');
    assert.equal(getNigeriaFarmingZone('Cross River'), null, 'mixed zones need local-area information');
    assert.equal(getNigeriaFarmingZone('France', 'Paris'), null);
    assert.deepEqual(matchManualFarmingLocation('Eket, Akwa Ibom'), { state: 'Akwa Ibom', localArea: 'Eket', zone: 'Humid Forest' });
    assert.deepEqual(matchManualFarmingLocation('Kaduna, Kaduna'), { state: 'Kaduna', localArea: 'Kaduna', zone: 'Northern Guinea Savanna' });
    assert.equal(matchManualFarmingLocation('Kaduna'), null, 'manual entry must include an LGA for mixed-zone states');
  });

  it('uses reverse geocoding only for plausible Nigerian coordinates and validates the returned state', async () => {
    let calls = 0;
    let requestedUrl = '';
    let userAgent = '';
    const geocode = createNigeriaReverseGeocoder(async (input, init) => {
      calls += 1;
      requestedUrl = String(input);
      userAgent = new Headers(init?.headers).get('user-agent') ?? '';
      return Response.json({ address: { country_code: 'ng', state: 'Akwa Ibom', county: 'Eket' } });
    }, 'https://nominatim.example/reverse', 'FieldVoiceAI/test', Date.now, async () => undefined);
    const coordinates = { latitude: 4.65, longitude: 7.93 };
    assert.deepEqual(await geocode(coordinates), { country: 'Nigeria', state: 'Akwa Ibom', zone: 'Humid Forest', localArea: 'Eket' });
    assert.equal(new URL(requestedUrl).searchParams.get('format'), 'jsonv2');
    assert.equal(new URL(requestedUrl).searchParams.get('zoom'), '8');
    assert.equal(userAgent, 'FieldVoiceAI/test');
    assert.deepEqual(await geocode(coordinates), { country: 'Nigeria', state: 'Akwa Ibom', zone: 'Humid Forest', localArea: 'Eket' });
    assert.equal(calls, 1, 'the reverse lookup is cached');
    assert.equal(await geocode({ latitude: 40, longitude: -74 }), null, 'locations outside Nigeria are not sent to the provider');
  });

  it('does not return a zone for a non-Nigerian result or a location missing its local area in a mixed-zone state', async () => {
    const createLookup = (address: unknown) => createNigeriaReverseGeocoder(async () => Response.json({ address }), 'https://nominatim.example/reverse', 'FieldVoiceAI/test', Date.now, async () => undefined);
    assert.equal(await createLookup({ country_code: 'gh', state: 'Akwa Ibom', county: 'Eket' })({ latitude: 7, longitude: 8 }), null);
    assert.equal(await createLookup({ country_code: 'ng', state: 'Kaduna' })({ latitude: 10, longitude: 7 }), null);
    assert.deepEqual(await createLookup({ country_code: 'ng', state: 'Kaduna', county: 'Kaduna' })({ latitude: 10, longitude: 7 }), {
      country: 'Nigeria', state: 'Kaduna', zone: 'Northern Guinea Savanna', localArea: 'Kaduna',
    });
    const malformed = createNigeriaReverseGeocoder(async () => Response.json({}), 'https://nominatim.example/reverse', 'FieldVoiceAI/test', Date.now, async () => undefined);
    await assert.rejects(malformed({ latitude: 10, longitude: 7 }));
    const unavailable = createNigeriaReverseGeocoder(async () => new Response('unavailable', { status: 503 }), 'https://nominatim.example/reverse', 'FieldVoiceAI/test', Date.now, async () => undefined);
    await assert.rejects(unavailable({ latitude: 10, longitude: 7 }));
  });

  it('protects the location endpoint and returns unresolved locations without guessing', async () => {
    const app = createApp({
      allowedOrigins: ['http://localhost:5173'],
      verifyIdToken: async (token) => ({ uid: token }),
      claimScan: async () => 'missing',
      saveAssessment: async () => undefined,
      failScan: async () => undefined,
      assessImage: async () => ({}),
      resolveDeviceLocation: async ({ latitude }) => latitude > 6
        ? null
        : { country: 'Nigeria', state: 'Akwa Ibom', localArea: 'Eket', zone: 'Humid Forest' },
    });
    assert.equal((await request(app).post('/api/season/location').send({ latitude: 4.65, longitude: 7.93 })).status, 401);
    const matched = await request(app).post('/api/season/location').set('Authorization', 'Bearer user-a').send({ latitude: 4.65, longitude: 7.93 });
    assert.equal(matched.status, 200);
    assert.deepEqual(matched.body.location, { country: 'Nigeria', state: 'Akwa Ibom', localArea: 'Eket', zone: 'Humid Forest' });
    const unresolved = await request(app).post('/api/season/location').set('Authorization', 'Bearer user-a').send({ latitude: 7, longitude: 8 });
    assert.equal(unresolved.status, 200);
    assert.equal(unresolved.body.location, null);
    const invalid = await request(app).post('/api/season/location').set('Authorization', 'Bearer user-a').send({ latitude: 91, longitude: 8 });
    assert.equal(invalid.status, 400);
  });
});
