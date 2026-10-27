import assert from 'node:assert/strict';
import {test,after} from 'node:test';
import {fileURLToPath} from 'node:url';
import {Window} from 'happy-dom';
import react from '@vitejs/plugin-react';
import {createServer} from 'vite';
const browser=new Window({url:'http://localhost/equipment'});
const originals=new Map();
for(const [key,value] of Object.entries({window:browser,document:browser.document,navigator:browser.navigator,HTMLElement:browser.HTMLElement,Node:browser.Node,Event:browser.Event,MouseEvent:browser.MouseEvent,FormData:browser.FormData,IS_REACT_ACT_ENVIRONMENT:true})){
  originals.set(key,Object.getOwnPropertyDescriptor(globalThis,key));Object.defineProperty(globalThis,key,{value,configurable:true,writable:true});
}
const oldFetch=globalThis.fetch;
const server=await createServer({configFile:false,root:fileURLToPath(new URL('../../',import.meta.url)),appType:'custom',plugins:[{name:'equipment-fixtures',load(id){
  const path=id.replaceAll('\\','/');
  if(path.endsWith('/src/context/useAuth.ts'))return `const user={uid:'owner',getIdToken:async()=> 'token'};export function useAuth(){return {user,fullName:'Ada Farmer'};}`;
  if(path.endsWith('/src/components/common/TopHeader.tsx'))return 'export function TopHeader(){return null;}';
  return null;
}},react()],server:{middlewareMode:true,hmr:false,ws:false}});
const React=await import('react');const {act,createElement:h}=React;const {createRoot}=await import('react-dom/client');
const {EquipmentScreen}=await server.ssrLoadModule('/src/pages/EquipmentScreen.tsx');
const group={id:'test',community:'Ikot village',task:'Ploughing',startDate:'2090-01-01',endDate:'2090-01-05',status:'open',hectares:1,memberCount:1,isMember:true,isOwner:true,version:1,quote:null,members:[{name:'Ada',hectares:1,isMe:true,accepted:false,paid:false,shareKobo:null,phone:'08012345678'}]};
const btn=(host,text)=>{const b=[...host.querySelectorAll('button')].find(b=>b.textContent.includes(text));assert.ok(b,`Missing ${text}`);return b;};
const click=async b=>act(async()=>{b.dispatchEvent(new browser.MouseEvent('click',{bubbles:true}));});
async function mount(){const host=document.createElement('div');document.body.append(host);const root=createRoot(host);await act(async()=>root.render(h(EquipmentScreen)));return {host,close:async()=>{await act(async()=>root.unmount());host.remove();}};}
test('pilot empty state contains no fabricated operators or quotes',async()=>{
  globalThis.fetch=async()=>Response.json([]);const m=await mount();try{assert.match(m.host.textContent,/Eket, Akwa Ibom/);assert.match(m.host.textContent,/No open requests yet/);assert.match(m.host.textContent,/does not supply a tractor/);await click(btn(m.host,'My groups'));assert.match(m.host.textContent,/You haven’t joined/);}finally{await m.close();}
});
test('creation sends hectares, Nigerian contact, dates and a stable retry ID',async()=>{
  const bodies=[];globalThis.fetch=async(_url,opts)=>{if(opts.method==='POST'){bodies.push(JSON.parse(opts.body));return Response.json({error:'Temporary failure'},{status:503});}return Response.json([]);};
  const m=await mount();try{await click(btn(m.host,'Start a tractor request'));const form=m.host.querySelector('form');
    for(const [name,value] of Object.entries({community:'Ikot village',phone:'08012345678',hectares:'0.5',startDate:'2090-01-01',endDate:'2090-01-05'}))form.elements.namedItem(name).value=value;
    await act(async()=>form.dispatchEvent(new browser.Event('submit',{bubbles:true,cancelable:true})));
    assert.match(m.host.textContent,/Temporary failure/);assert.equal(bodies[0].member.hectares,.5);
    await act(async()=>form.dispatchEvent(new browser.Event('submit',{bubbles:true,cancelable:true})));
    assert.equal(bodies[0].requestId,bodies[1].requestId);assert.match(bodies[0].requestId,/^[a-f0-9-]{36}$/);
  }finally{await m.close();}
});
test('quoted group displays own cost and requires acceptance before confirmation',async()=>{
  const quoted={...group,status:'quoted',quote:{operator:'Operator',phone:'08087654321',date:'2090-01-03',totalKobo:500000,terms:'Transport included'},members:[{...group.members[0],shareKobo:500000}]};
  globalThis.fetch=async()=>Response.json([quoted]);const m=await mount();try{await click(btn(m.host,'Ikot village'));assert.match(m.host.textContent,/₦5,000/);assert.equal(btn(m.host,'Confirm booking').disabled,true);assert.ok(btn(m.host,'Accept my share'));assert.match(m.host.textContent,/has not verified this operator/);}finally{await m.close();}
});
after(async()=>{globalThis.fetch=oldFetch;await server.close();await browser.happyDOM.close();for(const [key,desc] of originals){if(desc)Object.defineProperty(globalThis,key,desc);else delete globalThis[key];}});
