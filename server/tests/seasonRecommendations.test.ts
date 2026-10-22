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

  it('returns LGAs with the stored zone and review marker for a selected state', async () => {
    const app = createTestApp();
    const state = recommendations.listStates().find((entry) => entry.name === 'Oyo');
    assert.ok(state);
    const response = await request(app).get(`/api/season/states/${state.id}/lgas`);
    assert.equal(response.status, 200);
    assert.equal(response.body.state.name, 'Oyo');
    assert.equal(response.body.lgas.length, 33);
    const ibadan = response.body.lgas.find((lga: { name: string }) => lga.name === 'Ibadan North');
    assert.equal(ibadan.zone.name, 'Derived Savanna');
    assert.equal(ibadan.needsReview, true);
    assert.equal((await request(app).get('/api/season/states/not-a-number/lgas')).status, 400);
    assert.equal((await request(app).get('/api/season/states/9999/lgas')).status, 404);
  });

  it('returns plant-now, harvest-now, and next-month calendar rows with draft status', async () => {
    const app = createTestApp();
    const response = await request(app).get('/api/season/recommendations/637');
    assert.equal(response.status, 200);
    assert.equal(response.body.location.lga, 'Ibadan North');
    assert.equal(response.body.location.state, 'Oyo');
    assert.equal(response.body.location.zoneNeedsReview, true);
    assert.equal(response.body.calendar.timeZone, 'Africa/Lagos');
    assert.equal(response.body.calendar.status, 'draft');
    assert.match(response.body.calendar.notice, /draft data/i);
    for (const key of ['plantNow', 'harvestNow', 'plantNextMonth']) {
      assert.ok(Array.isArray(response.body[key]));
      assert.ok(response.body[key].every((entry: { status: string }) => entry.status === 'draft'));
    }
    assert.equal((await request(app).get('/api/season/recommendations/nope')).status, 400);
    assert.equal((await request(app).get('/api/season/recommendations/9999')).status, 404);
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
