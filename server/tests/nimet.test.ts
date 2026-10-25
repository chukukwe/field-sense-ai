import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import request from 'supertest';
import { createNimetService, NimetServiceError } from '../src/nimet.js';
import { createApp } from '../src/app.js';
import { farmGuideData } from '../../src/data/farmGuideData.js';
const input = { state: 'Akwa Ibom', lga: 'Eket', year: 2026 };
const raw = { state_name: 'akwa ibom', lga_name: 'eket', year: 2026, onset: '3-Mar', season_end: '17-Dec', season_length: 289, annual_rainfall: 2792 };
describe('NiMet seasonal rainfall integration', () => {
  it('uses a private header, exact location matching and explicit prediction year', async () => {
    const service = createNimetService('private-test-key', async (url, init) => {
      const parsed = new URL(String(url));
      assert.equal(parsed.origin, 'https://api.nimet.gov.ng');
      assert.equal(parsed.searchParams.get('lga_name'), 'Eket');
      assert.equal(new Headers(init?.headers).get('x-api-key'), 'private-test-key');
      assert.equal(parsed.href.includes('private-test-key'), false);
      return Response.json([{ ...raw, lga_name: 'esit - eket' }, raw]);
    });
    const result = await service.getSeasonalRainfall(input);
    assert.equal(result.status, 'available');
    if (result.status !== 'available') throw new Error('Missing result');
    assert.equal(result.record.onset, '3 March');
    assert.equal(result.record.annualRainfall, 2792);
    assert.equal(JSON.stringify(result).includes('private-test-key'), false);
  });
  it('does not substitute a partial location match or another year', async () => {
    for (const records of [[], [{ ...raw, lga_name: 'esit - eket' }], [{ ...raw, year: 2025 }]]) {
      const service = createNimetService('key', async () => Response.json(records));
      assert.equal((await service.getSeasonalRainfall(input)).status, 'no_record');
    }
  });
  it('rejects duplicates, impossible dates and invalid measurements', async () => {
    for (const records of [[raw, raw], [{...raw,onset:'31-Feb'}], [{...raw,annual_rainfall:-1}], [{...raw,season_length:400}], [{...raw,onset:'3-Mar-2025'}]]) {
      await assert.rejects(createNimetService('key', async () => Response.json(records)).getSeasonalRainfall(input), NimetServiceError);
    }
  });
  it('distinguishes missing values from zero rainfall', async () => {
    const result = await createNimetService('key', async () => Response.json([{...raw,onset:null,annual_rainfall:0}])).getSeasonalRainfall(input);
    assert.equal(result.status, 'available');
    if (result.status === 'available') { assert.equal(result.record.onset, undefined); assert.equal(result.record.annualRainfall,0); }
  });
  it('caches by area/year, coalesces concurrent requests, and refreshes after expiry', async () => {
    let calls=0; let time=Date.parse('2026-10-25T12:00:00Z');
    const service=createNimetService('key',async()=>{calls++;return Response.json([raw]);},()=>time);
    const results=await Promise.all([service.getSeasonalRainfall(input),service.getSeasonalRainfall(input)]);
    assert.equal(calls,1); assert.deepEqual(results[0],results[1]);
    time+=1000; await service.getSeasonalRainfall(input); assert.equal(calls,1);
    time+=12*60*60*1000; await service.getSeasonalRainfall(input); assert.equal(calls,2);
    await service.getSeasonalRainfall({...input,year:2027}); assert.equal(calls,3);
  });
  it('does not cache failures or leak upstream responses', async () => {
    let calls=0;
    const service=createNimetService('private-key', async()=>++calls===1?new Response('private-key upstream detail',{status:503}):Response.json([raw]));
    await assert.rejects(service.getSeasonalRainfall(input),(error:unknown)=>error instanceof NimetServiceError && !error.publicMessage.includes('private-key'));
    assert.equal((await service.getSeasonalRainfall(input)).status,'available');
    for (const status of [401,403,429,500]) await assert.rejects(createNimetService('key',async()=>new Response('private detail',{status})).getSeasonalRainfall(input),NimetServiceError);
  });
  it('requires configuration and handles malformed provider responses', async () => {
    await assert.rejects(createNimetService(undefined).getSeasonalRainfall(input),NimetServiceError);
    await assert.rejects(createNimetService('key',async()=>Response.json({data:[raw]})).getSeasonalRainfall(input),NimetServiceError);
  });
  it('authenticates the route and validates dataset IDs before contacting NiMet', async () => {
    let calls=0;
    const app=createApp({allowedOrigins:[],verifyIdToken:async()=>({uid:'test'}),claimScan:async()=> 'missing',saveAssessment:async()=>{},failScan:async()=>{},assessImage:async()=>({}),getSeasonalRainfall:async(value)=>{calls++;return createNimetService('key',async()=>Response.json([raw])).getSeasonalRainfall(value);}});
    const state=farmGuideData.states.find(x=>x.name==='Akwa Ibom')!;
    const lga=farmGuideData.locations.find(x=>x.stateId===state.id&&x.name==='Eket')!;
    const path=`/api/farm-guide/rainfall?stateId=${state.id}&lgaId=${lga.id}&year=2026`;
    assert.equal((await request(app).get(path)).status,401);
    assert.equal((await request(app).get('/api/farm-guide/rainfall?stateId=1&lgaId='+lga.id+'&year=2026').set('Authorization','Bearer test')).status,400);
    assert.equal(calls,0);
    const response=await request(app).get(path).set('Authorization','Bearer test');
    assert.equal(response.status,200); assert.equal(response.body.record.lga,'eket'); assert.match(response.headers['cache-control'] ?? '',/no-store/); assert.equal(calls,1);
  });
});
