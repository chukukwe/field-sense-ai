import { describe,it } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import supertest from 'supertest';
import { createEquipment,changeEquipment,equipmentRouter,EquipmentError,type EquipmentStore } from '../src/equipment.js';
import { equipmentView,equipmentShares,type EquipmentRequest } from '../../shared/equipment.js';
const day='2090-01-01';
const farmer={name:'Ada Farmer',phone:'08012345678',hectares:.5};
const input={requestId:'7475298f-d7a9-40fc-8f4c-41152f65e883',community:'Ikot community',task:'Ploughing',startDate:day,endDate:'2090-01-05',member:farmer};
const quote={operator:'Local Operator',phone:'08087654321',date:'2090-01-03',totalKobo:10001,terms:'Includes transport and fuel. Pay on completion.'};
const id='7475298f-d7a9-40fc-8f4c-41152f65e883';
const make=()=>createEquipment(input,'owner',day);
describe('shared tractor booking invariants',()=>{
  it('rejects malformed contacts, impossible dates and unsupported tasks',()=>{
    for(const value of [{...input,startDate:'2090-02-30'},{...input,startDate:'2089-01-01'},{...input,task:'Spraying'}, {...input,member:{...farmer,phone:'hello'}},{...input,member:{...farmer,hectares:.001}}]) assert.throws(()=>createEquipment(value,'owner',day));
  });
  it('keeps totals exact for unequal areas and rounding',()=>{
    for(const total of [101,10001,100_000_000]){
      const shares=equipmentShares([{hectares:.01},{hectares:.57},{hectares:100}],total);
      assert.equal(shares.reduce((a,b)=>a+b,0),total);assert.ok(shares.every(Number.isInteger));
    }
  });
  it('enforces quote acceptance and locks membership before confirmation',()=>{
    let r=changeEquipment(make(),{action:'join',member:{...farmer,name:'Second farmer',hectares:1}},'second',day);
    assert.throws(()=>changeEquipment(r,{action:'quote',quote},'second',day),EquipmentError);
    r=changeEquipment(r,{action:'quote',quote},'owner',day);
    assert.throws(()=>changeEquipment(r,{action:'join',member:farmer},'third',day));
    assert.throws(()=>changeEquipment(r,{action:'confirm'},'owner',day));
    r=changeEquipment(r,{action:'accept'},'owner',day);r=changeEquipment(r,{action:'accept'},'second',day);
    r=changeEquipment(r,{action:'confirm'},'owner',day);
    assert.equal(r.status,'confirmed');assert.throws(()=>changeEquipment(r,{action:'leave'},'second',day));
    assert.throws(()=>changeEquipment(r,{action:'quote',quote},'owner',day));
    r=changeEquipment(r,{action:'paid'},'second',day);assert.equal(r.members[1]?.paid,true);
    r=changeEquipment(r,{action:'start'},'owner',day);r=changeEquipment(r,{action:'complete'},'owner',day);
    assert.throws(()=>changeEquipment(r,{action:'cancel'},'owner',day));
  });
  it('invalidates quotes and all acceptances when a member leaves or a quote changes',()=>{
    let r=changeEquipment(make(),{action:'join',member:farmer},'second',day);
    r=changeEquipment(r,{action:'quote',quote},'owner',day);r=changeEquipment(r,{action:'accept'},'owner',day);
    r=changeEquipment(r,{action:'quote',quote:{...quote,totalKobo:12000}},'owner',day);assert.ok(r.members.every(m=>!m.accepted));
    r=changeEquipment(r,{action:'leave'},'second',day);assert.equal(r.quote,null);assert.equal(r.status,'open');
  });
  it('does not expose contacts or identities in public listings',()=>{
    let r=changeEquipment(make(),{action:'join',member:farmer},'second',day);
    r=changeEquipment(r,{action:'quote',quote},'owner',day);
    const publicView=equipmentView(r,'outsider');assert.deepEqual(publicView.members,[]);assert.equal(publicView.quote,null);assert.equal('ownerUid' in publicView,false);
    const memberView=equipmentView(r,'second');assert.equal(memberView.members[0]?.phone,farmer.phone);assert.equal(memberView.members[1]?.phone,farmer.phone);
    assert.ok(equipmentView(r,'owner').members.every(m=>m.phone));
  });
  it('rejects expired joins, duplicate membership, and outsider updates',()=>{
    assert.throws(()=>changeEquipment(make(),{action:'join',member:farmer},'owner',day));
    assert.throws(()=>changeEquipment(make(),{action:'join',member:farmer},'other','2090-02-01'));
    assert.throws(()=>changeEquipment(make(),{action:'accept'},'outsider',day));
    assert.throws(()=>changeEquipment(make(),{action:'leave'},'owner',day));
  });
});
describe('tractor request HTTP boundary',()=>{
  function setup(){
    const rows=new Map<string,EquipmentRequest>([[id,make()]]);
    const store:EquipmentStore={list:async()=>[...rows.values()],create:async r=>{rows.set(r.id,r);return r;},update:async(key,fn)=>{const r=rows.get(key);if(!r)throw new EquipmentError(404,'Missing');const next=fn(r);rows.set(key,next);return next;}};
    const app=express();app.use('/api/equipment',equipmentRouter(store,async token=>{if(token==='bad')throw Error();return {uid:token};},()=> 'test'));
    return supertest(app);
  }
  it('requires authentication and returns private no-store responses',async()=>{
    const api=setup();assert.equal((await api.get('/api/equipment')).status,401);
    assert.equal((await api.get('/api/equipment').set('Authorization','Bearer bad')).status,401);
    const response=await api.get('/api/equipment').set('Authorization','Bearer outsider');assert.equal(response.status,200);assert.match(response.headers['cache-control']??'',/no-store/);assert.deepEqual(response.body[0].members,[]);
  });
  it('rejects stale updates, protects owner actions and validates payloads',async()=>{
    const api=setup();const join=await api.post(`/api/equipment/${id}`).set('Authorization','Bearer second').send({version:1,action:'join',member:farmer});assert.equal(join.status,200);
    assert.equal((await api.post(`/api/equipment/${id}`).set('Authorization','Bearer third').send({version:1,action:'join',member:farmer})).status,409);
    assert.equal((await api.post(`/api/equipment/${id}`).set('Authorization','Bearer second').send({version:2,action:'quote',quote})).status,403);
    assert.equal((await api.post('/api/equipment').set('Authorization','Bearer owner').send({...input,ownerUid:'spoof'})).status,400);
  });
});

describe('Firestore tractor persistence',()=>{
  it('keeps retry IDs bound to their original owner and preserves the saved request',async()=>{
    const {firestoreEquipmentStore}=await import('../src/equipmentStore.js');
    const documents=new Map();
    const db={collection:()=>({doc:(id:string)=>({id})}),runTransaction:async (fn:(tx:{get:(ref:{id:string})=>Promise<{exists:boolean;data:()=>EquipmentRequest|undefined}>;create:(ref:{id:string},r:EquipmentRequest)=>unknown;set:(ref:{id:string},r:EquipmentRequest)=>unknown})=>Promise<EquipmentRequest>)=>fn({get:async ref=>({exists:documents.has(ref.id),data:()=>documents.get(ref.id)}),create:(ref,r)=>documents.set(ref.id,structuredClone(r)),set:(ref,r)=>documents.set(ref.id,structuredClone(r))})};
    const store=firestoreEquipmentStore(db as unknown as import('firebase-admin/firestore').Firestore);
    const original=make();await store.create(original);
    const retry={...make(),community:'Changed on retry'};
    assert.equal((await store.create(retry)).community,original.community);
    await assert.rejects(store.create({...retry,ownerUid:'attacker'}),EquipmentError);
    const updated=await store.update(id,r=>changeEquipment(r,{action:'join',member:farmer},'second',day));
    assert.equal(updated.version,2);assert.equal(documents.get(id).members.length,2);
    await assert.rejects(store.update('missing',r=>r),EquipmentError);
  });
});
