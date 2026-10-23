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
        zone: { code: 'HUMID_FOREST', name: 'Humid Forest', rainySeasonType: 'bimodal' },
        zoneSource: { key: 'naerls', title: 'States in Nigeria by Ecological Zone', publisher: 'NAERLS', url: 'https://nfhl.naerls.gov.ng/zones', publicationYear: 2024, license: 'Attribution; reuse terms not stated' }, needsReview: false,
      }],
    }));
    assert.equal(lgas.lgas[0]?.name, 'Aba North');
    assert.equal(lgas.lgas[0]?.needsReview, false);

    const plan = await fetchLgaSeasonPlan(2, async () => Response.json({
      location: {
        lgaId: 2, lga: 'Aba North', state: 'Abia',
        zone: { code: 'HUMID_FOREST', name: 'Humid Forest', rainySeasonType: 'bimodal' },
        coordinates: { latitude: 5.1, longitude: 7.4 }, zoneSource: { key: 'naerls', title: 'States in Nigeria by Ecological Zone', publisher: 'NAERLS', url: 'https://nfhl.naerls.gov.ng/zones', publicationYear: 2024, license: 'Attribution; reuse terms not stated' }, zoneNeedsReview: false,
      },
      calendar: {
        month: 10, monthName: 'October', nextMonth: 11, nextMonthName: 'November',
        timeZone: 'Africa/Lagos', status: 'sourced', notice: 'Historical survey data.',
      },
      locationReview: null,
      zoneRecommendations: { zoneCode: 'HUMID_FOREST', zoneName: 'Humid Forest', scope: 'agroecological-zone', status: 'source_window', source: { key: 'bonn_calendar', title: 'Crop calender of Maize & Cassava in Nigeria', publisher: 'University of Bonn', url: 'https://bonndata.uni-bonn.de/dataset.xhtml?persistentId=doi:10.60507/FK2/PI929D', publicationYear: 2023, license: 'Open Data Commons Attribution License (ODC-By) v1.0' }, message: 'Draft source window.' },
      planningWindows: [{
        crop: 'Cassava', category: 'root_tuber', season: 'Source sowing period', activity: 'plant', monthStart: 3, monthEnd: 8,
        status: 'draft', farmingSystem: 'Not specified', evidenceScope: 'Parts of named states', reviewNotes: 'Not field-specific.',
        sources: [{ key: 'bonn_calendar', title: 'Crop calender of Maize & Cassava in Nigeria', publisher: 'University of Bonn', url: 'https://bonndata.uni-bonn.de/dataset.xhtml?persistentId=doi:10.60507/FK2/PI929D', publicationYear: 2023, geographicScope: 'Parts of states', license: 'ODC-By v1.0', retrievedAt: '2026-10-23' }],
      }],
      cropTiming: { status: 'sourced', observations: [{
        crop: 'Cassava', category: 'root_tuber', activity: 'plant', monthStart: 3, monthEnd: 3,
        evidenceCount: 12, surveyYears: [2018, 2023], sourceCropNames: ['Cassava'], status: 'sourced',
        geographicScope: 'Observed household plots matched to an exact LGA name.',
        source: { title: 'African Crop Calendar', publisher: 'Survey authors', url: 'https://doi.org/10.6084/m9.figshare.28659557', publicationYear: 2026, license: 'CC BY 4.0' },
      }] },
      plantNow: [],
      harvestNow: [],
      plantNextMonth: [],
      emptyMessages: { harvestNow: 'None listed.', plantNextMonth: 'None listed.' },
    }));
    assert.equal(plan.location.lga, 'Aba North');
    assert.equal(plan.cropTiming.status, 'sourced');
    assert.equal(plan.cropTiming.observations[0]?.source.license, 'CC BY 4.0');
    assert.equal(plan.calendar.timeZone, 'Africa/Lagos');
    assert.equal(plan.zoneRecommendations.status, 'source_window');
    assert.equal(plan.planningWindows[0]?.monthStart, 3);
    assert.equal(plan.planningWindows[0]?.monthEnd, 8);
    await assert.rejects(
      fetchLgaSeasonPlan(2, async () => Response.json({
        location: plan.location,
        calendar: plan.calendar,
        locationReview: null,
        zoneRecommendations: plan.zoneRecommendations,
        planningWindows: plan.planningWindows,
        plantNow: [{ crop: 'Cassava', category: 'root_tuber', season: 'main', activity: 'plant', month: 13, status: 'draft', source: 'Draft', sources: [] }],
        harvestNow: [],
        plantNextMonth: [],
        emptyMessages: {},
      })),
      SeasonPlanningApiError,
    );
  });
});
