import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { fetchLgaSeasonPlan, fetchSeasonLgas, fetchSeasonStates, SeasonPlanningApiError } from '../../src/data/seasonPlanningApi.js';

describe('Season Recommendation database client', () => {
  it('loads shared states without an account token and validates the result', async () => {
    let requestedUrl = '';
    let requestedAuthorization: string | null = null;
    const states = await fetchSeasonStates(async (input, init) => {
      requestedUrl = String(input);
      requestedAuthorization = new Headers(init?.headers).get('Authorization');
      return Response.json({ states: [{ id: 1, code: 'AB', name: 'Abia' }] });
    });
    assert.equal(requestedUrl, '/api/season/states');
    assert.equal(requestedAuthorization, null);
    assert.deepEqual(states, [{ id: 1, code: 'AB', name: 'Abia' }]);
    await assert.rejects(
      fetchSeasonStates(async () => Response.json({ states: [{ id: 0, code: 'AB', name: 'Abia' }] })),
      SeasonPlanningApiError,
    );
  });

  it('validates LGA lists and crop-calendar groups before returning them to the screen', async () => {
    const lgas = await fetchSeasonLgas(1, async () => Response.json({
      state: { id: 1, code: 'AB', name: 'Abia' },
      lgas: [{
        id: 2, name: 'Aba North', latitude: 5.1, longitude: 7.4,
        zone: { code: 'HUMID', name: 'Humid Forest', rainySeasonType: 'bimodal' },
        zoneSource: 'latitude_band', needsReview: true,
      }],
    }));
    assert.equal(lgas.lgas[0]?.name, 'Aba North');
    assert.equal(lgas.lgas[0]?.needsReview, true);

    const plan = await fetchLgaSeasonPlan(2, async () => Response.json({
      location: {
        lgaId: 2, lga: 'Aba North', state: 'Abia',
        zone: { code: 'HUMID', name: 'Humid Forest', rainySeasonType: 'bimodal' },
        coordinates: { latitude: 5.1, longitude: 7.4 }, zoneSource: 'latitude_band', zoneNeedsReview: true,
      },
      calendar: {
        month: 10, monthName: 'October', nextMonth: 11, nextMonthName: 'November',
        timeZone: 'Africa/Lagos', status: 'draft', notice: 'Draft data only.',
      },
      plantNow: [{ crop: 'Cassava', category: 'root_tuber', season: 'main_season', activity: 'plant', month: 10, status: 'draft', source: 'Draft' }],
      harvestNow: [],
      plantNextMonth: [],
      emptyMessages: { harvestNow: 'None listed.', plantNextMonth: 'None listed.' },
    }));
    assert.equal(plan.location.lga, 'Aba North');
    assert.equal(plan.plantNow[0]?.status, 'draft');
    assert.equal(plan.calendar.timeZone, 'Africa/Lagos');
    await assert.rejects(
      fetchLgaSeasonPlan(2, async () => Response.json({
        location: plan.location,
        calendar: plan.calendar,
        plantNow: [{ ...plan.plantNow[0], month: 13 }],
        harvestNow: [],
        plantNextMonth: [],
        emptyMessages: {},
      })),
      SeasonPlanningApiError,
    );
  });
});
