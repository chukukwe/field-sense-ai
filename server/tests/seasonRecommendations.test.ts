import assert from 'node:assert/strict';
import { after, describe, it } from 'node:test';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { createSeasonRecommendationService } from '../src/seasonRecommendations.js';

const recommendations = createSeasonRecommendationService();
after(() => recommendations.close());

function createTestApp(withDatabase = true) {
  return createApp({
    allowedOrigins: ['http://localhost:5173'],
    verifyIdToken: async (token) => {
      if (token === 'invalid-token') throw new Error('Invalid token');
      return { uid: token === 'valid-token' ? 'farmer-1' : token };
    },
    claimScan: async () => 'missing',
    saveAssessment: async () => undefined,
    failScan: async () => undefined,
    assessImage: async () => ({}),
    ...(withDatabase ? { seasonRecommendations: recommendations } : {}),
  });
}

const auth = { Authorization: 'Bearer valid-token' };

describe('season crop database API', () => {
  it('lists shared draft database states without requiring a user account', async () => {
    const app = createTestApp();
    const response = await request(app).get('/api/season/states');
    assert.equal(response.status, 200);
    assert.equal(response.body.states.length, 37);
    assert.ok(response.body.states.some((state: { name: string }) => state.name === 'Federal Capital Territory'));
    assert.equal((await request(app).get('/api/season/states').set('Authorization', 'Bearer invalid-token')).status, 200);
  });

  it('returns LGA zones with NAERLS provenance and review markers for a selected state', async () => {
    const app = createTestApp();
    const state = recommendations.listStates().find((entry) => entry.name === 'Oyo');
    assert.ok(state);
    const response = await request(app).get(`/api/season/states/${state.id}/lgas`);
    assert.equal(response.status, 200);
    assert.equal(response.body.state.name, 'Oyo');
    assert.equal(response.body.lgas.length, 33);
    const ibadan = response.body.lgas.find((lga: { name: string }) => lga.name === 'Ibadan North');
    assert.equal(ibadan.zone.name, 'Derived Savanna');
    assert.equal(ibadan.zone.code, 'DERIVED_SAVANNA');
    assert.equal(ibadan.zoneSource.key, 'naerls_nfhl_ecological_zones_2024');
    assert.equal(ibadan.needsReview, false);
    assert.equal((await request(app).get('/api/season/states/not-a-number/lgas')).status, 400);
    assert.equal((await request(app).get('/api/season/states/9999/lgas')).status, 404);
  });

  it('keeps source planting windows separate from historical timing', async () => {
    const app = createTestApp();
    const response = await request(app).get('/api/season/recommendations/637');
    assert.equal(response.status, 200);
    assert.equal(response.body.location.lga, 'Ibadan North');
    assert.equal(response.body.location.state, 'Oyo');
    assert.equal(response.body.location.zoneNeedsReview, false);
    assert.equal(response.body.location.zoneSource.key, 'naerls_nfhl_ecological_zones_2024');
    assert.equal(response.body.calendar.timeZone, 'Africa/Lagos');
    assert.equal(response.body.calendar.status, 'unavailable');
    assert.match(response.body.calendar.notice, /no reliable crop timing data/i);
    for (const key of ['plantNow', 'harvestNow', 'plantNextMonth']) {
      assert.ok(Array.isArray(response.body[key]));
      assert.equal(response.body[key].length, 0);
    }
    assert.equal(response.body.cropTiming.status, 'unavailable');
    assert.deepEqual(response.body.cropTiming.observations, []);
    assert.equal(response.body.zoneRecommendations.status, 'source_window');
    assert.equal(response.body.zoneRecommendations.source.key, 'bonn_nigeria_maize_cassava_calendar_2023');
    assert.equal(response.body.planningWindows.length, 2);
    assert.ok(response.body.planningWindows.every((entry: { status: string; monthStart: number; monthEnd: number }) =>
      entry.status === 'draft' && entry.monthStart === 3 && entry.monthEnd === 8));
    assert.equal((await request(app).get('/api/season/recommendations/nope')).status, 400);
    assert.equal((await request(app).get('/api/season/recommendations/9999')).status, 404);
  });

  it('returns historical reports only for exact source-covered Akwa Ibom LGAs', () => {
    const state = recommendations.listStates().find((entry) => entry.name === 'Akwa Ibom');
    assert.ok(state);
    const locations = recommendations.listLgas(state.id);
    assert.ok(locations);
    const uyo = locations.lgas.find((entry) => entry.name === 'Uyo');
    const eket = locations.lgas.find((entry) => entry.name === 'Eket');
    assert.ok(uyo && eket);
    const uyoPlan = recommendations.getPlan(uyo.id, new Date('2026-10-15T12:00:00.000Z'));
    const eketPlan = recommendations.getPlan(eket.id, new Date('2026-10-15T12:00:00.000Z'));
    assert.ok(uyoPlan && eketPlan);
    assert.equal(uyoPlan.calendar.status, 'sourced');
    assert.ok(uyoPlan.cropTiming.observations.length > 0);
    assert.ok(uyoPlan.cropTiming.observations.every((item) => item.status === 'sourced'));
    assert.ok(uyoPlan.cropTiming.observations.every((item) => item.source.url.startsWith('https://')));
    assert.equal(uyoPlan.planningWindows.length, 0);
    assert.equal(uyoPlan.zoneRecommendations.status, 'unavailable');
    assert.equal(uyoPlan.zoneRecommendations.source, null);
    assert.match(uyoPlan.zoneRecommendations.message, /does not identify which local areas/i);
    assert.equal(uyoPlan.plantNow.length, 0);
    assert.equal(eketPlan.calendar.status, 'unavailable');
    assert.equal(eketPlan.cropTiming.status, 'unavailable');
    assert.equal(eketPlan.planningWindows.length, 0);
    assert.equal(eketPlan.zoneRecommendations.status, 'unavailable');
    assert.equal(eketPlan.zoneRecommendations.source, null);
    assert.equal(eketPlan.plantNow.length, 0);
  });

  it('uses NAERLS zone keys for draft windows and keeps unverified locations empty', () => {
    const oyo = recommendations.listStates().find((entry) => entry.name === 'Oyo');
    assert.ok(oyo);
    const lgas = recommendations.listLgas(oyo.id);
    assert.ok(lgas);
    const ibadanNorth = lgas.lgas.find((entry) => entry.name === 'Ibadan North');
    const ibadanSouthWest = lgas.lgas.find((entry) => entry.name === 'Ibadan South West');
    assert.ok(ibadanNorth && ibadanSouthWest);
    assert.equal(ibadanNorth.zone.code, ibadanSouthWest.zone.code);
    const first = recommendations.getPlan(ibadanNorth.id);
    const second = recommendations.getPlan(ibadanSouthWest.id);
    assert.ok(first && second);
    assert.equal(first.zoneRecommendations.status, 'source_window');
    assert.equal(first.zoneRecommendations.zoneCode, second.zoneRecommendations.zoneCode);
    assert.equal(first.zoneRecommendations.source?.key, 'bonn_nigeria_maize_cassava_calendar_2023');
    assert.equal(first.planningWindows.length, 2);
    assert.match(first.zoneRecommendations.message, /draft source window/i);
    const anambra = recommendations.listStates().find((entry) => entry.name === 'Anambra');
    assert.ok(anambra);
    const ayamelum = recommendations.listLgas(anambra.id)?.lgas.find((entry) => entry.name === 'Ayamelum');
    assert.ok(ayamelum);
    assert.equal(ayamelum.zone.code, 'UNVERIFIED');
    assert.equal(ayamelum.needsReview, true);
    const unknownPlan = recommendations.getPlan(ayamelum.id);
    assert.ok(unknownPlan);
    assert.equal(unknownPlan.zoneRecommendations.status, 'unavailable');
    assert.deepEqual(unknownPlan.planningWindows, []);
  });

  it('records source provenance for all canonical LGAs without using legacy latitude guesses', () => {
    const states = recommendations.listStates();
    let total = 0;
    let mapped = 0;
    let unverified = 0;
    for (const state of states) {
      const result = recommendations.listLgas(state.id);
      assert.ok(result);
      total += result.lgas.length;
      for (const lga of result.lgas) {
        assert.equal(lga.zoneSource?.key, 'naerls_nfhl_ecological_zones_2024');
        if (lga.zone.code === 'UNVERIFIED') unverified += 1;
        else mapped += 1;
      }
    }
    assert.equal(total, 774);
    assert.equal(mapped, 766);
    assert.equal(unverified, 8);
  });

  it('exposes draft windows only for zones covered by the Bonn planting source', () => {
    const supported = new Set(['DERIVED_SAVANNA', 'NORTHERN_GUINEA', 'SOUTHERN_GUINEA']);
    const observedZones = new Map<string, number>();
    for (const state of recommendations.listStates()) {
      const result = recommendations.listLgas(state.id);
      assert.ok(result);
      for (const lga of result.lgas) {
        if (lga.zone.code !== 'UNVERIFIED' && !lga.needsReview && !observedZones.has(lga.zone.code)) {
          observedZones.set(lga.zone.code, lga.id);
        }
      }
    }
    assert.deepEqual([...observedZones.keys()].sort(), [
      'DERIVED_SAVANNA','HUMID_FOREST','MID_ALTITUDE','NORTHERN_GUINEA','SAHEL','SOUTHERN_GUINEA','SUDAN',
    ]);
    for (const [zoneCode, lgaId] of observedZones) {
      const plan = recommendations.getPlan(lgaId);
      assert.ok(plan);
      if (supported.has(zoneCode)) {
        assert.equal(plan.zoneRecommendations.status, 'source_window');
        assert.equal(plan.planningWindows.length, 2);
        assert.ok(plan.planningWindows.every((entry) => entry.status === 'draft'));
        assert.ok(plan.planningWindows.every((entry) => entry.sources.some((source) => source.key === 'bonn_nigeria_maize_cassava_calendar_2023')));
      } else {
        assert.equal(plan.zoneRecommendations.status, 'unavailable');
        if (zoneCode === 'HUMID_FOREST') {
          assert.match(plan.zoneRecommendations.message, /does not identify which local areas/i);
        }
        assert.deepEqual(plan.planningWindows, []);
      }
      assert.deepEqual(plan.plantNow, []);
      assert.deepEqual(plan.harvestNow, []);
      assert.deepEqual(plan.plantNextMonth, []);
    }
  });

  it('uses Africa/Lagos month boundaries and rolls December forward to January', () => {
    const plan = recommendations.getPlan(390, new Date('2026-12-31T23:30:00.000Z'));
    assert.ok(plan);
    assert.equal(plan.location.lga, 'Kano Municipal');
    assert.equal(plan.calendar.month, 1);
    assert.equal(plan.calendar.monthName, 'January');
    assert.equal(plan.calendar.nextMonth, 2);
    assert.equal(plan.calendar.nextMonthName, 'February');
    assert.equal(plan.calendar.timeZone, 'Africa/Lagos');
  });

  it('returns a clear unavailable response if the database service is not configured', async () => {
    const response = await request(createTestApp(false)).get('/api/season/states').set(auth);
    assert.equal(response.status, 503);
    assert.equal(response.body.error.code, 'SEASON_DATA_UNAVAILABLE');
  });
});
