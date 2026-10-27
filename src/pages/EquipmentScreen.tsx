import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Tractor, Users, MapPin, RefreshCw } from 'lucide-react';
import { TopHeader } from '../components/common/TopHeader';
import { useAuth } from '../context/useAuth';
import { equipmentTasks, type EquipmentView } from '../../shared/equipment';

const inputClass='mt-1 w-full rounded-xl border border-[#454B47] bg-[#181B19] p-3 text-sm text-white';
const buttonClass='rounded-xl bg-[#176B45] px-4 py-3 text-sm font-semibold text-white disabled:opacity-50';
const statusLabels={open:'Seeking an operator',quoted:'Quote proposed · joining closed',confirmed:'Booking confirmed',in_progress:'Work in progress',completed:'Completed',cancelled:'Cancelled'};
const money=(kobo:number)=>new Intl.NumberFormat('en-NG',{style:'currency',currency:'NGN',maximumFractionDigits:2}).format(kobo/100);
function Field({label,children}:{label:string;children:ReactNode}){return <label className="block text-xs text-gray-300">{label}{children}</label>;}
function memberFields(name:string){return <>
  <Field label="Your name"><input name="name" className={inputClass} defaultValue={name} required minLength={2} maxLength={60} autoComplete="name" /></Field>
  <Field label="Mobile number"><input name="phone" type="tel" className={inputClass} required placeholder="08012345678" autoComplete="tel" pattern="(0[789][01][0-9]{8}|\+234[789][01][0-9]{8})" /></Field>
  <Field label="Your farm size (hectares)"><input name="hectares" type="number" step="0.01" min="0.01" max="100" className={inputClass} required placeholder="e.g. 0.5" /></Field>
  <p className="text-xs text-gray-400">1 hectare ≈ 2.47 acres. Use your best estimate; confirm the measured area with the operator before agreeing a quote. Member numbers are shared with the coordinator. The coordinator’s number is visible to group members.</p>
</>;}
export function EquipmentScreen(){
  const {user,fullName}=useAuth();
  const [mine,setMine]=useState(false),[rows,setRows]=useState<EquipmentView[]>([]),[selected,setSelected]=useState<EquipmentView|null>(null);
  const [creating,setCreating]=useState(false),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
  const [reload,setReload]=useState(0);
  const [requestId,setRequestId]=useState(()=>crypto.randomUUID());
  const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Africa/Lagos',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  async function request(path:string,body?:unknown,signal?:AbortSignal){
    if(!user)throw new Error('Sign in to continue.');
    const token=await user.getIdToken();
    const base=(import.meta.env.VITE_API_BASE_URL??'').replace(/\/$/,'');
    const response=await fetch(`${base}/api/equipment${path}`,{method:body?'POST':'GET',headers:{Authorization:`Bearer ${token}`,...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined,signal:signal?AbortSignal.any([signal,AbortSignal.timeout(25000)]):AbortSignal.timeout(25000),cache:'no-store'});
    const data=await response.json().catch(()=>null);
    if(!response.ok)throw new Error(typeof data?.error==='string'?data.error:'Could not load tractor requests. Please try again.');
    return data;
  }
  useEffect(()=>{
    const controller=new AbortController();setLoading(true);setRows([]);setError('');
    void request(`?mine=${mine}`,undefined,controller.signal).then(data=>{if(!controller.signal.aborted)setRows(data);}).catch(e=>{if(!controller.signal.aborted)setError(e instanceof Error?e.message:'Unable to load requests.');}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});
    return ()=>controller.abort();
    // The account is remounted by ApplicationLayout when the signed-in user changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[mine,reload,user]);
  async function mutate(body:Record<string,unknown>,create=false){
    if(busy)return;setBusy(true);setError('');setNotice('');
    try {
      const data=await request(create?'':`/${selected!.id}`,create?{...body,requestId}:{...body,version:selected!.version});
      setSelected(data);if(create)setRequestId(crypto.randomUUID());setCreating(false);setReload(n=>n+1);setNotice('Saved.');
    }catch(e){setError(e instanceof Error?e.message:'Could not save. Refresh to check whether it went through before trying again.');}
    finally{setBusy(false);}
  }
  function submitMember(event:FormEvent<HTMLFormElement>,create:boolean){
    event.preventDefault();const f=new FormData(event.currentTarget),member={name:String(f.get('name')),phone:String(f.get('phone')),hectares:Number(f.get('hectares'))};
    void mutate(create?{community:f.get('community'),task:f.get('task'),startDate:f.get('startDate'),endDate:f.get('endDate'),member}:{action:'join',member},create);
  }
  const me=selected?.members.find(m=>m.isMe);
  const closed=selected&&['completed','cancelled'].includes(selected.status);
  return <div><TopHeader title="Tractor Together" onBack={()=>{if(selected||creating){setSelected(null);setCreating(false);setError('');}else history.back();}} />
    <div className="space-y-4 px-4 pb-8">
      <section className="rounded-2xl border border-[#286446] bg-[#173D2B] p-5">
        <Tractor className="mb-2 h-7 w-7 text-green-300"/><h1 className="text-xl font-bold">More farms. One tractor trip.</h1>
        <p className="mt-2 text-sm text-gray-200">Join nearby farmers to arrange tractor work and share the agreed cost.</p>
        <p className="mt-3 flex items-center gap-1 text-xs text-green-200"><MapPin size={14}/> Eket, Akwa Ibom · pilot</p>
      </section>
      <p className="text-xs leading-relaxed text-gray-300">For ploughing, harrowing and ridging. Check that farms are close together, accessible and suitable for the equipment. Operators and availability are arranged by your group; FarmPal does not supply a tractor.</p>
      {error&&<div role="alert" className="rounded-xl border border-red-800 bg-red-950/40 p-3 text-sm text-red-200">{error}<button disabled={busy} className="mt-2 block underline" onClick={()=>{setSelected(null);setReload(n=>n+1);}}>Refresh requests</button></div>}
      {notice&&<p role="status" className="text-sm text-green-300">{notice}</p>}
      {!selected&&!creating&&<>
        <button className={`${buttonClass} w-full`} onClick={()=>{setCreating(true);setError('');setNotice('');}}>Start a tractor request</button>
        <div className="flex gap-2" role="group" aria-label="Request list">
          {[false,true].map(value=><button key={String(value)} aria-pressed={mine===value} className={`flex-1 rounded-xl px-3 py-2 text-sm ${mine===value?'bg-[#176B45]':'bg-[#343A36]'}`} onClick={()=>setMine(value)}>{value?'My groups':'Open in Eket'}</button>)}
          <button aria-label="Refresh requests" onClick={()=>setReload(n=>n+1)} className="px-2"><RefreshCw size={18}/></button>
        </div>
        {loading?<p role="status">Loading requests…</p>:rows.length===0&&!error?<div className="rounded-2xl bg-[#292C2A] p-6"><Users className="mb-2 text-green-300"/><h2 className="font-bold">{mine?'You haven’t joined a group yet':'No open requests yet'}</h2><p className="mt-2 text-sm text-gray-300">{mine?'Start a request or join an open group in Eket.':'Be the first to organise tractor work in your community. Invite neighbouring farmers to join through FarmPal.'}</p></div>:null}
        {rows.map(r=><button key={r.id} onClick={()=>{setSelected(r);setNotice('');setError('');}} className="block w-full rounded-2xl border border-[#414842] bg-[#292C2A] p-4 text-left"><span className="text-xs text-green-300">{statusLabels[r.status]}</span><h2 className="mt-1 font-bold">{r.task} · {r.community}</h2><p className="mt-2 text-sm text-gray-300">{r.startDate} to {r.endDate}</p><p className="mt-1 text-xs text-gray-400">{r.memberCount} farm{r.memberCount===1?'':'s'} · {r.hectares.toFixed(2)} ha {r.isMember?'· You’re in this group':''}</p></button>)}
        <p className="text-xs text-gray-400">Showing up to 100 recent requests. Only open groups appear in the Eket list.</p>
      </>}
      {creating&&<form onSubmit={e=>submitMember(e,true)} className="space-y-4 rounded-2xl bg-[#292C2A] p-4"><h2 className="font-bold">Start your group</h2>
        <Field label="Community / village in Eket"><input name="community" required minLength={2} maxLength={100} className={inputClass} placeholder="Community name only, no home address"/></Field>
        <Field label="Tractor task"><select name="task" className={`${inputClass} farm-guide-select`}>{equipmentTasks.map(t=><option key={t}>{t}</option>)}</select></Field>
        <Field label="Preferred start date"><input name="startDate" type="date" min={today} required className={inputClass}/></Field>
        <Field label="Latest acceptable date"><input name="endDate" type="date" min={today} required className={inputClass}/></Field>
        {memberFields(fullName)}<p className="text-xs text-gray-300">As coordinator, you’ll arrange the operator, record their full quote and confirm the booking after all farmers accept.</p>
        <button disabled={busy} className={buttonClass}>{busy?'Saving…':'Create request'}</button><button type="button" disabled={busy} className="ml-4 text-sm" onClick={()=>setCreating(false)}>Cancel</button>
      </form>}
      {selected&&<section className="space-y-4 rounded-2xl border border-[#414842] bg-[#292C2A] p-4">
        <p className="text-xs text-green-300">{statusLabels[selected.status]}</p><h2 className="text-lg font-bold">{selected.task} · {selected.community}</h2>
        <p className="text-sm">{selected.startDate} to {selected.endDate}</p><p className="text-sm text-gray-300">{selected.memberCount} farms · {selected.hectares.toFixed(2)} hectares</p>
        {!selected.isMember&&selected.status==='open'&&<form onSubmit={e=>submitMember(e,false)} className="space-y-4"><h3 className="font-bold">Join this request</h3>{memberFields(fullName)}<p className="text-xs text-gray-300">Joining expresses interest. You must accept a quote later before a booking can be confirmed.</p><button disabled={busy||selected.endDate<today} className={buttonClass}>{busy?'Joining…':'Join group'}</button></form>}
        {selected.isMember&&<>
          <h3 className="font-semibold">Farms in this group</h3>
          {selected.members.map((m,i)=><div key={i} className="rounded-xl bg-[#1D211E] p-3 text-sm"><p className="font-semibold">{m.name}{m.isMe?' (you)':''}</p><p className="text-gray-300">{m.hectares} ha{m.shareKobo!==null?` · ${money(m.shareKobo)}`:''}</p>{m.phone&&<a className="text-green-300 underline" href={`tel:${m.phone}`}>{m.phone}</a>}{selected.quote&&<p className="mt-1 text-xs text-gray-400">{m.accepted?'Quote accepted':'Not accepted'} · {m.paid?'Payment reported by farmer':'No payment recorded'}</p>}</div>)}
          {selected.quote&&<div className="space-y-2 rounded-xl border border-amber-700 p-3 text-sm"><h3 className="font-bold">Operator quote recorded by coordinator</h3><p>{selected.quote.operator} · <a className="underline" href={`tel:${selected.quote.phone}`}>{selected.quote.phone}</a></p><p>{selected.quote.date} · Total {money(selected.quote.totalKobo)}</p><p className="whitespace-pre-wrap">{selected.quote.terms}</p><p className="text-xs text-gray-300">Cost is split by hectares. Includes only the terms recorded here. Confirm transport, fuel, equipment suitability and the operator’s availability directly. FarmPal has not verified this operator or quote.</p>{selected.status==='quoted'&&!me?.accepted&&<button disabled={busy} className={buttonClass} onClick={()=>void mutate({action:'accept'})}>Accept my share: {money(me?.shareKobo??0)}</button>}</div>}
          {selected.isOwner&&!closed&&<>
            {['open','quoted'].includes(selected.status)&&<details><summary className="cursor-pointer text-green-300">Record / replace an operator quote</summary><form className="mt-3 space-y-3" onSubmit={e=>{e.preventDefault();const f=new FormData(e.currentTarget);void mutate({action:'quote',quote:{operator:f.get('operator'),phone:f.get('phone'),date:f.get('date'),totalKobo:Math.round(Number(f.get('total'))*100),terms:f.get('terms')}});}}>
              <Field label="Operator’s name"><input name="operator" required minLength={2} maxLength={80} className={inputClass}/></Field>
              <Field label="Operator’s mobile"><input name="phone" type="tel" required className={inputClass}/></Field>
              <Field label="Agreed work date"><input name="date" type="date" min={selected.startDate>today?selected.startDate:today} max={selected.endDate} required className={inputClass}/></Field>
              <Field label="Full group price (₦), including agreed extra charges"><input name="total" type="number" min="1" max="1000000" step="0.01" required className={inputClass}/></Field>
              <Field label="Terms: work, transport/fuel, payment and cancellation agreement"><textarea name="terms" required minLength={2} maxLength={600} className={inputClass}/></Field>
              <p className="text-xs text-gray-300">Saving a quote closes joining and resets everyone’s acceptance. Obtain the operator’s permission before sharing their number with the group.</p><button disabled={busy} className={buttonClass}>Save quote</button>
            </form></details>}
            {selected.status==='quoted'&&<div className="flex flex-wrap gap-2"><button disabled={busy||!selected.members.every(m=>m.accepted)} className={buttonClass} onClick={()=>void mutate({action:'confirm'})}>Confirm booking</button><button disabled={busy} className="text-sm underline" onClick={()=>void mutate({action:'reopen'})}>Remove quote and reopen</button></div>}
            {selected.status==='confirmed'&&<button disabled={busy} className={buttonClass} onClick={()=>void mutate({action:'start'})}>Mark work started</button>}
            {selected.status==='in_progress'&&<button disabled={busy} className={buttonClass} onClick={()=>{if(window.confirm('Has the agreed tractor work been completed for every farm?'))void mutate({action:'complete'});}}>Mark all work complete</button>}
            <button disabled={busy} className="block text-sm text-red-300 underline" onClick={()=>{if(window.confirm('Cancel this group request? Settle any payments directly with the operator.'))void mutate({action:'cancel'});}}>Cancel group request</button>
          </>}
          {!selected.isOwner&&['open','quoted'].includes(selected.status)&&<button disabled={busy} className="text-sm text-red-300 underline" onClick={()=>{if(window.confirm('Leave this group? Any proposed quote will be removed so the remaining farms can agree a new price.'))void mutate({action:'leave'});}}>Leave group</button>}
          {['confirmed','in_progress'].includes(selected.status)&&<button disabled={busy} className={buttonClass} onClick={()=>void mutate({action:me?.paid?'unpaid':'paid'})}>{me?.paid?'Undo my payment record':'I have paid the operator directly'}</button>}
          <p className="text-xs leading-relaxed text-gray-400">Payments happen directly with the operator. Payment records are self-reported, not receipts or payment verification. Confirmed bookings are coordinator-reported. If plans change after confirmation, contact the coordinator; cancellation does not issue a refund.</p>
        </>}
        <button disabled={busy} className="text-sm text-green-300 underline" onClick={()=>{setSelected(null);setReload(n=>n+1);setNotice('');}}>Back to requests</button>
      </section>}
    </div>
  </div>;
}
