import assert from 'node:assert/strict';
import { after, describe, it } from 'node:test';
import { getFallbackSeasonPlanningDemos, getSeasonPlanningDemo, getSeasonPlanningDemos } from '../../src/data/seasonPlanningDemo.js';
import { createSeasonRecommendationService } from '../src/seasonRecommendations.js';

const recommendations = createSeasonRecommendationService();
after(() => recommendations.close());

describe('SeasonSense illustrative fallback guides', () => {
  it('provides detailed, explicitly demo-labelled plans for every supported farming zone', () => {
    const zones = ['SAHEL', 'SUDAN', 'NORTHERN_GUINEA', 'SOUTHERN_GUINEA', 'DERIVED_SAVANNA', 'HUMID_FOREST', 'MID_ALTITUDE'];
    for (const zoneCode of zones) {
      const plans = getSeasonPlanningDemos(zoneCode);
      assert.ok(plans.length > 0, `${zoneCode} should have fallback examples`);
      for (const plan of plans) {
        assert.equal(plan.zoneCode, zoneCode);
        assert.equal(plan.status, 'demo');
        assert.equal(plan.source.type, 'illustrative');
        assert.equal(plan.source.label, 'FieldSense illustrative content');
        assert.ok(plan.planningPeriod.length > 20);
        assert.ok(plan.zoneContext.length > 20);
        assert.ok(plan.landPreparation.length > 20);
        assert.ok(plan.planting.length > 20);
        assert.ok(plan.water.length > 20);
        assert.ok(plan.nutrients.length > 20);
        assert.ok(plan.risks.length > 0);
        assert.ok(plan.maintenance.length > 0);
        assert.ok(plan.timeline.length > 2);
        assert.match(plan.harvest, /No sourced harvest date or yield/i);
        assert.doesNotMatch(plan.planningPeriod, /\b(January|February|March|April|May|June|July|August|September|October|November|December)\b/i);
      }
    }
    assert.deepEqual(getSeasonPlanningDemos('UNVERIFIED'), []);
  });

  it('keeps available source crops first and gives uncovered crops separate demo cards', () => {
    const sourceCropNames = ['Maize', 'Cassava'];
    const fallback = getFallbackSeasonPlanningDemos('DERIVED_SAVANNA', sourceCropNames);
    assert.ok(fallback.length > 0);
    assert.ok(fallback.every((plan) => !sourceCropNames.some((crop) => crop.toLowerCase() === plan.crop.toLowerCase())));
    assert.equal(getSeasonPlanningDemo('DERIVED_SAVANNA', 'maize')?.status, 'demo');
    assert.equal(getSeasonPlanningDemo('DERIVED_SAVANNA', 'cassava')?.status, 'demo');
  });

  it('updates the examples and crop details when the selected zone or crop changes', () => {
    const sahel = getSeasonPlanningDemos('SAHEL');
    const humidForest = getSeasonPlanningDemos('HUMID_FOREST');
    assert.notDeepEqual(sahel.map((plan) => plan.crop), humidForest.map((plan) => plan.crop));
    assert.notEqual(sahel[0]?.zoneContext, humidForest[0]?.zoneContext);
    assert.equal(getSeasonPlanningDemo('SAHEL', 'cowpea')?.zoneCode, 'SAHEL');
    assert.equal(getSeasonPlanningDemo('SAHEL', 'plantain'), null);
  });

  it('does not add demo records to source windows or historical records', () => {
    const lga = recommendations.listStates().find((state) => state.name === 'Oyo');
    assert.ok(lga);
    const ibadan = recommendations.listLgas(lga.id)?.lgas.find((entry) => entry.name === 'Ibadan North');
    assert.ok(ibadan);
    const plan = recommendations.getPlan(ibadan.id, new Date('2026-10-15T12:00:00Z'));
    assert.ok(plan);
    assert.ok(plan.planningWindows.length > 0);
    assert.ok(plan.planningWindows.every((entry) => entry.status === 'draft' || entry.status === 'reviewed' || entry.status === 'verified'));
    assert.ok(plan.cropTiming.observations.every((entry) => entry.status === 'sourced'));
    assert.deepEqual(plan.plantNow, []);
    assert.equal(JSON.stringify(plan).includes('demo:'), false);
    const fallback = getFallbackSeasonPlanningDemos(ibadan.zone.code, plan.planningWindows.map((entry) => entry.crop));
    assert.ok(fallback.length > 0);
    assert.ok(fallback.every((entry) => entry.status === 'demo'));
    assert.ok(fallback.every((entry) => !plan.planningWindows.some((source) => source.crop.toLowerCase() === entry.crop.toLowerCase())));
  });
});
