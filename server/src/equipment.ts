import { Router, json } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { equipmentTasks, equipmentView, type EquipmentRequest } from '../../shared/equipment.js';

const text=(max:number)=>z.string().trim().min(2).max(max).refine(s=>!/[<>]/.test(s)&&![...s].some(c=>c.charCodeAt(0)<32));
const phone=z.string().trim().regex(/^(?:\+234|0)[789][01]\d{8}$/, 'Enter a Nigerian mobile number, such as 08012345678.');
const date=z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(s=>Number.isFinite(Date.parse(s))&&new Date(s).toISOString().slice(0,10)===s);
const hectares=z.number().min(.01).max(100).refine(n=>Math.abs(n*100-Math.round(n*100))<.000001);
const member=z.object({name:text(60),phone,hectares}).strict();
const create=z.object({ requestId:z.string().uuid(), community:text(100), task:z.enum(equipmentTasks), startDate:date, endDate:date, member }).strict();
const quote=z.object({operator:text(80),phone,date,totalKobo:z.number().int().min(100).max(100_000_000),terms:text(600)}).strict();
const action=z.discriminatedUnion('action',[
  z.object({action:z.literal('join'),member}).strict(),
  z.object({action:z.literal('quote'),quote}).strict(),
  ...(['leave','reopen','accept','confirm','start','complete','cancel','paid','unpaid'] as const).map(a=>z.object({action:z.literal(a)}).strict()),
]);
export class EquipmentError extends Error { constructor(public status:number,message:string){super(message);} }
function requireCondition(ok:unknown,message:string,status=409):asserts ok {if(!ok)throw new EquipmentError(status,message);}
export function lagosToday(){return new Intl.DateTimeFormat('en-CA',{timeZone:'Africa/Lagos',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());}
export function createEquipment(raw:unknown,uid:string,today=lagosToday()):EquipmentRequest {
  const input=create.parse(raw);
  requireCondition(input.startDate>=today&&input.endDate>=input.startDate,'Choose a future date range in the right order.',400);
  requireCondition(Date.parse(input.endDate)-Date.parse(input.startDate)<=31*86400000,'Keep the preferred date range within 31 days.',400);
  const now=new Date().toISOString();
  return {id:input.requestId,ownerUid:uid,memberUids:[uid],community:input.community,task:input.task,startDate:input.startDate,endDate:input.endDate,
    members:[{...input.member,uid,accepted:false,paid:false}],status:'open',quote:null,createdAt:now,updatedAt:now,version:1};
}
export function changeEquipment(existing:EquipmentRequest,raw:unknown,uid:string,today=lagosToday()):EquipmentRequest {
  const input=action.parse(raw), r=structuredClone(existing), me=r.members.find(m=>m.uid===uid);
  const owner=r.ownerUid===uid;
  requireCondition(!['completed','cancelled'].includes(r.status),'This request is closed.');
  if(input.action==='join') {
    requireCondition(r.status==='open'&&r.endDate>=today,'This request is no longer open to join.');
    requireCondition(!me,'You have already joined.'); requireCondition(r.members.length<20,'This group has reached 20 farms.');
    r.members.push({...input.member,uid,accepted:false,paid:false}); r.memberUids.push(uid);
  } else {
    requireCondition(me,'Join this group before taking this action.',403);
    if(input.action==='leave') {
      requireCondition(!owner,'The coordinator must cancel the request instead of leaving.');
      requireCondition(['open','quoted'].includes(r.status),'Contact the coordinator to resolve changes to a confirmed booking.');
      r.members=r.members.filter(m=>m.uid!==uid); r.memberUids=r.memberUids.filter(id=>id!==uid);
      r.quote=null;r.status='open';r.members.forEach(m=>{m.accepted=false;m.paid=false;});
    } else if(input.action==='accept') {
      requireCondition(r.status==='quoted'&&r.quote&&r.quote.date>=today,'There is no current quote to accept.');me.accepted=true;
    } else if(input.action==='paid'||input.action==='unpaid') {
      requireCondition(['confirmed','in_progress'].includes(r.status),'Record payment after the booking is confirmed.');
      me.paid=input.action==='paid';
    } else {
      requireCondition(owner,'Only the coordinator can do this.',403);
      if(input.action==='quote') {
        requireCondition(['open','quoted'].includes(r.status),'This booking already has agreed terms.');
        requireCondition(input.quote.date>=today&&input.quote.date>=r.startDate&&input.quote.date<=r.endDate,'Choose an operator date within the requested dates.',400);
        r.quote=input.quote;r.status='quoted';r.members.forEach(m=>{m.accepted=false;m.paid=false;});
      } else if(input.action==='reopen') {
        requireCondition(r.status==='quoted','Only a proposed quote can be reopened.');r.quote=null;r.status='open';r.members.forEach(m=>m.accepted=false);
      } else if(input.action==='confirm') {
        requireCondition(r.status==='quoted'&&r.quote&&r.quote.date>=today&&r.members.every(m=>m.accepted),'Every farmer must accept the current quote first.');r.status='confirmed';
      } else if(input.action==='start') {
        requireCondition(r.status==='confirmed','Confirm the booking first.');r.status='in_progress';
      } else if(input.action==='complete') {
        requireCondition(r.status==='in_progress','Start the job before marking it complete.');r.status='completed';
      } else if(input.action==='cancel') {r.status='cancelled';}
    }
  }
  r.version++; r.updatedAt=new Date().toISOString(); return r;
}
export interface EquipmentStore {
  list(uid:string,mine:boolean):Promise<EquipmentRequest[]>;
  create(request:EquipmentRequest):Promise<EquipmentRequest>;
  update(id:string,change:(r:EquipmentRequest)=>EquipmentRequest):Promise<EquipmentRequest>;
}
export function equipmentRouter(store:EquipmentStore,verify:(token:string)=>Promise<{uid:string}>,keyGenerator:(req:import('express').Request)=>string) {
  const router=Router();
  router.use(rateLimit({windowMs:60*60*1000,limit:120,keyGenerator,standardHeaders:'draft-8',legacyHeaders:false}));
  router.use(async(req,res,next)=>{
    res.setHeader('Cache-Control','private, no-store');
    const token=/^Bearer\s+(\S+)$/i.exec(req.header('authorization')??'')?.[1];
    if(!token){res.status(401).json({error:'Sign in to use shared tractor hiring.'});return;}
    try {res.locals.uid=(await verify(token)).uid;next();}catch{res.status(401).json({error:'Your session could not be verified. Sign in again.'});}
  });
  router.use(json({limit:'8kb'}));
  router.get('/',async(req,res,next)=>{
    try {const uid=res.locals.uid as string; const rows=await store.list(uid,req.query.mine==='true');
      res.json(rows.map(r=>equipmentView(r,uid)));}catch(e){next(e);}
  });
  router.post('/',async(req,res,next)=>{
    try {const uid=res.locals.uid as string,r=createEquipment(req.body,uid);const saved=await store.create(r);res.status(201).json(equipmentView(saved,uid));}catch(e){next(e);}
  });
  router.post('/:id',async(req,res,next)=>{
    try {const id=z.string().uuid().parse(req.params.id),uid=res.locals.uid as string;
      const r=await store.update(id,old=>{
        requireCondition(req.body?.version===old.version,'This request changed. Refresh it before trying again.');
        const {version:_,...input}=req.body;return changeEquipment(old,input,uid);
      });res.json(equipmentView(r,uid));}catch(e){next(e);}
  });
  router.use((e:unknown,_req:import('express').Request,res:import('express').Response,_next:import('express').NextFunction)=>{
    if(e instanceof z.ZodError){res.status(400).json({error:'Check the form fields, phone number and farm size (up to two decimals).'});return;}
    if(e instanceof EquipmentError){res.status(e.status).json({error:e.message});return;}
    const status=(e as {status?:number})?.status;
    res.status(status===413?413:status===400?400:503).json({error:status===413?'This request is too large.':status===400?'Invalid request.':'Tractor requests are unavailable. Please try again.'});
  });
  return router;
}
