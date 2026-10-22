import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { createNimetService, NimetServiceError } from '../src/nimet.js';
import type { SeasonalRainfallRequest, SeasonalRainfallResult } from '../src/nimet.js';
import type { LgaSeasonPlan, SeasonRecommendationService } from '../src/seasonRecommendations.js';

const sampleRecord = {
  state: 'Akwa Ibom',
  lga: 'Eket',
  year: 2026,
  onset: '15 May',
  cessation: '20 October',
  length_of_season: 158,
  annual_rainfall: 1125,
};

const samplePlan = {
  location: { lgaId: 8, lga: 'Eket', state: 'Akwa Ibom' },
} as LgaSeasonPlan;

function testPlanService(): SeasonRecommendationService {
  return {
    listStates: () => [{ id: 1, code: 'AK', name: 'Akwa Ibom' }],
    listLgas: () => null,
    getPlan: (lgaId) => lgaId === 8 ? samplePlan : null,
    close: () => undefined,
  } as SeasonRecommendationService;
}

function createTestApp(getSeasonalRainfall: (input: SeasonalRainfallRequest) => Promise<SeasonalRainfallResult>) {
  return createApp({
    allowedOrigins: ['http://localhost:5173'],
    verifyIdToken: async () => ({ uid: 'farmer-1' }),
    claimScan: async () => 'missing',
    saveAssessment: async () => undefined,
    failScan: async () => undefined,
    assessImage: async () => ({}),
    seasonRecommendations: testPlanService(),
    getSeasonalRainfall,
  });
}

describe('NiMet seasonal rainfall service', () => {
  it('uses the official base URL, encoded location query, and private API key header', async () => {
    let requestUrl = '';
    let requestKey: string | null = null;
    const key = 'private-test-key';
    const service = createNimetService(key, async (input, init) => {
      requestUrl = String(input);
      requestKey = new Headers(init?.headers).get('x-api-key');
      return Response.json([{ ...sampleRecord, state: 'Akwa & Ibom', lga: 'Eket / West' }]);
    });
    const result = await service.getSeasonalRainfall({ state: 'Akwa & Ibom', lga: 'Eket / West', year: 2026 });
    const url = new URL(requestUrl);
    assert.equal(url.origin, 'https://api.nimet.gov.ng');
    assert.equal(url.pathname, '/api/srp');
    assert.equal(url.searchParams.get('state'), 'Akwa & Ibom');
    assert.equal(url.searchParams.get('lga_name'), 'Eket / West');
    assert.match(url.href, /Akwa\+%26\+Ibom/);
    assert.match(url.href, /Eket\+%2F\+West/);
    assert.equal(url.searchParams.get('year'), '2026');
    assert.equal(requestKey, key);
    assert.deepEqual(result, {
      status: 'available',
      record: {
        state: 'Akwa & Ibom', lga: 'Eket / West', year: 2026, onset: '15 May', cessation: '20 October',
        lengthOfSeason: 158, annualRainfall: 1125,
      },
    });
    assert.equal(JSON.stringify(result).includes(key), false);
  });

  it('returns no_record for empty results and does not confuse partial name matches with exact matches', async () => {
    const service = createNimetService('test-key', async () => Response.json([
      { ...sampleRecord, lga: 'Eket East' },
    ]));
    assert.deepEqual(await service.getSeasonalRainfall({ state: 'Akwa Ibom', lga: 'Eket', year: 2026 }), {
      status: 'no_record', state: 'Akwa Ibom', lga: 'Eket', year: 2026,
    });
    const emptyService = createNimetService('test-key', async () => Response.json([]));
    assert.equal((await emptyService.getSeasonalRainfall({ state: 'Akwa Ibom', lga: 'Eket', year: 2026 })).status, 'no_record');
    const punctuationDifferenceService = createNimetService('test-key', async () => Response.json([
      { ...sampleRecord, lga: 'E-ket' },
    ]));
    assert.equal((await punctuationDifferenceService.getSeasonalRainfall({ state: 'Akwa Ibom', lga: 'Eket', year: 2026 })).status, 'no_record');
  });

  it('matches case and spaces exactly and preserves records with missing optional values', async () => {
    const service = createNimetService('test-key', async () => Response.json([{
      state: ' AKWA   IBOM ', lga: 'eket', year: 2026, annual_rainfall: null,
    }]));
    assert.deepEqual(await service.getSeasonalRainfall({ state: 'Akwa Ibom', lga: 'Eket', year: 2026 }), {
      status: 'available', record: { state: 'AKWA   IBOM', lga: 'eket', year: 2026 },
    });
  });

  it('parses the live NiMet SRP field names while returning the normalized record shape', async () => {
    // Sanitized fixture: it mirrors the observed API keys, with fabricated values.
    const liveShapeFixture = [{
      id: 123,
      onset: '12 May',
      season_end: '18 October',
      season_length: 160,
      annual_rainfall: 1180,
      year: 2026,
      lga_id: 41,
      lga_name: 'Eket',
      state_id: 3,
      state_name: 'Akwa Ibom',
    }];
    const service = createNimetService('test-key', async () => Response.json(liveShapeFixture));
    assert.deepEqual(await service.getSeasonalRainfall({ state: 'Akwa Ibom', lga: 'Eket', year: 2026 }), {
      status: 'available',
      record: {
        state: 'Akwa Ibom', lga: 'Eket', year: 2026, onset: '12 May', cessation: '18 October',
        lengthOfSeason: 160, annualRainfall: 1180,
      },
    });
  });

  it('rejects invalid input before contacting NiMet', async () => {
    let calls = 0;
    const service = createNimetService('test-key', async () => { calls += 1; return Response.json([]); });
    await assert.rejects(service.getSeasonalRainfall({ state: 'Akwa Ibom', lga: 'Eket', year: 1999 }), NimetServiceError);
    await assert.rejects(service.getSeasonalRainfall({ state: '', lga: 'Eket', year: 2026 }), NimetServiceError);
    assert.equal(calls, 0);
  });

  it('returns a clear configuration error when the key is missing and never contacts NiMet', async () => {
    let calls = 0;
    const service = createNimetService(undefined, async () => { calls += 1; return Response.json([]); });
    await assert.rejects(service.getSeasonalRainfall({ state: 'Akwa Ibom', lga: 'Eket', year: 2026 }), (error: unknown) => {
      assert.ok(error instanceof NimetServiceError);
      assert.equal(error.code, 'NIMET_NOT_CONFIGURED');
      assert.match(error.publicMessage, /NIMET_API_KEY/);
      return true;
    });
    assert.equal(calls, 0);
  });

  it('handles network failures, timeouts, NiMet auth errors, rate limits, and server errors without retries', async () => {
    let calls = 0;
    const service = createNimetService('private-test-key', async () => {
      calls += 1;
      throw new DOMException('timed out', 'TimeoutError');
    });
    await assert.rejects(service.getSeasonalRainfall({ state: 'Akwa Ibom', lga: 'Eket', year: 2026 }), (error: unknown) => {
      assert.ok(error instanceof NimetServiceError);
      assert.equal(error.code, 'NIMET_UNAVAILABLE');
      return true;
    });
    assert.equal(calls, 1);
    for (const [status, code] of [[401, 'NIMET_AUTH_FAILED'], [403, 'NIMET_AUTH_FAILED'], [429, 'NIMET_RATE_LIMITED'], [500, 'NIMET_UPSTREAM_ERROR']] as const) {
      const failing = createNimetService('private-test-key', async () => new Response('provider error', { status }));
      await assert.rejects(failing.getSeasonalRainfall({ state: 'Akwa Ibom', lga: 'Eket', year: 2026 }), (error: unknown) => {
        assert.ok(error instanceof NimetServiceError);
        assert.equal(error.code, code);
        assert.equal(error.publicMessage.includes('private-test-key'), false);
        return true;
      });
    }
  });

  it('rejects malformed JSON, unexpected fields, and invalid rainfall measurements', async () => {
    for (const response of [
      new Response('not json', { status: 200 }),
      Response.json({ data: [sampleRecord] }),
      Response.json([{ ...sampleRecord, year: undefined }]),
      Response.json([{ ...sampleRecord, annual_rainfall: -1 }]),
      Response.json([{ ...sampleRecord, length_of_season: 'unknown' }]),
      Response.json([{ ...sampleRecord, onset: '<script>' }]),
    ]) {
      const service = createNimetService('test-key', async () => response);
      await assert.rejects(service.getSeasonalRainfall({ state: 'Akwa Ibom', lga: 'Eket', year: 2026 }), NimetServiceError);
    }
  });

  it('isolates cache entries by location and year and does not cache failures', async () => {
    let calls = 0;
    const service = createNimetService('test-key', async (input) => {
      calls += 1;
      const url = new URL(String(input));
      return Response.json([{ ...sampleRecord, state: url.searchParams.get('state'), lga: url.searchParams.get('lga_name'), year: Number(url.searchParams.get('year')) }]);
    });
    await service.getSeasonalRainfall({ state: 'Akwa Ibom', lga: 'Eket', year: 2026 });
    await service.getSeasonalRainfall({ state: 'Akwa Ibom', lga: 'Eket', year: 2026 });
    await service.getSeasonalRainfall({ state: 'Akwa Ibom', lga: 'Uyo', year: 2026 });
    await service.getSeasonalRainfall({ state: 'Akwa Ibom', lga: 'Eket', year: 2027 });
    assert.equal(calls, 3);

    let retryCalls = 0;
    const failureThenSuccess = createNimetService('test-key', async () => {
      retryCalls += 1;
      return retryCalls === 1 ? new Response('failure', { status: 503 }) : Response.json([sampleRecord]);
    });
    await assert.rejects(failureThenSuccess.getSeasonalRainfall({ state: 'Akwa Ibom', lga: 'Eket', year: 2026 }));
    assert.equal((await failureThenSuccess.getSeasonalRainfall({ state: 'Akwa Ibom', lga: 'Eket', year: 2026 })).status, 'available');
    assert.equal(retryCalls, 2);
  });
});

describe('NiMet seasonal rainfall API route', () => {
  it('validates the database LGA and year, returning normalized rainfall without the API key', async () => {
    let received: SeasonalRainfallRequest | undefined;
    const app = createTestApp(async (input) => {
      received = input;
      return { status: 'available', record: { state: 'Akwa Ibom', lga: 'Eket', year: 2026, lengthOfSeason: 158, annualRainfall: 1125 } };
    });
    const response = await request(app).get('/api/season/rainfall?lgaId=8&year=2026');
    assert.equal(response.status, 200);
    assert.deepEqual(received, { state: 'Akwa Ibom', lga: 'Eket', year: 2026 });
    assert.equal(JSON.stringify(response.body).includes('private-test-key'), false);
    assert.equal((await request(app).get('/api/season/rainfall?lgaId=bad&year=2026')).status, 400);
    assert.equal((await request(app).get('/api/season/rainfall?lgaId=8&year=2200')).status, 400);
    assert.equal((await request(app).get('/api/season/rainfall?lgaId=999&year=2026')).status, 404);
  });

  it('keeps crop recommendations available when the NiMet request fails', async () => {
    const app = createTestApp(async () => { throw new NimetServiceError('NIMET_UNAVAILABLE', 503, 'NiMet is unavailable.', true); });
    const rainfall = await request(app).get('/api/season/rainfall?lgaId=8&year=2026');
    assert.equal(rainfall.status, 503);
    assert.equal(rainfall.body.error.code, 'NIMET_UNAVAILABLE');
    const plan = await request(app).get('/api/season/recommendations/8');
    assert.equal(plan.status, 200);
    assert.equal(plan.body.location.lga, 'Eket');
  });

  it('keeps rejected credentials out of API responses', async () => {
    const secret = 'do-not-return-this-key';
    let sentKey: string | null = null;
    const logged: string[] = [];
    const originalLog = console.log;
    const originalWarn = console.warn;
    const originalError = console.error;
    console.log = (...values: unknown[]) => { logged.push(values.map(String).join(' ')); };
    console.warn = (...values: unknown[]) => { logged.push(values.map(String).join(' ')); };
    console.error = (...values: unknown[]) => { logged.push(values.map(String).join(' ')); };
    const service = createNimetService(secret, async (_input, init) => {
      sentKey = new Headers(init?.headers).get('x-api-key');
      return new Response('unauthorized', { status: 401 });
    });
    try {
      const app = createTestApp((input) => service.getSeasonalRainfall(input));
      const response = await request(app).get('/api/season/rainfall?lgaId=8&year=2026');
      assert.equal(sentKey, secret);
      assert.equal(response.status, 503);
      assert.equal(response.text.includes(secret), false);
      assert.equal(response.body.error.message.includes(secret), false);
    } finally {
      console.log = originalLog;
      console.warn = originalWarn;
      console.error = originalError;
    }
    assert.equal(logged.some((line) => line.includes(secret)), false);
  });
});
