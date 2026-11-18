import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const moduleURL=source=>'data:text/javascript;base64,'+Buffer.from(source).toString('base64');
const compile=path=>ts.transpile(readFileSync(path,'utf8'),{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022});
const finance=moduleURL(compile('src/lib/finance.ts')),day=moduleURL(compile('src/lib/day-plan.ts'));
const reminderURL=moduleURL(compile('src/lib/finance-reminders.ts').replace("'./finance'",JSON.stringify(finance)).replace("'./day-plan'",JSON.stringify(day)));
const {financeReminder,financeReminderDue,financePayload}=await import(reminderURL);
const debt={id:'1',person:'Iván',title:'Ropa Hacoo',direction:'me_deben',total:20,due_date:null,start_date:'2026-10-01'};
const normalize=text=>text.replace(/\s/g,' ');
assert.equal(normalize(financeReminder([debt],[],true).title),'Iván te debe 20,00 €');
assert.equal(normalize(financeReminder([debt],[{debt_id:'1',amount:5}],true).title),'Iván te debe 15,00 €');
assert.equal(financeReminder([debt],[{debt_id:'1',amount:20}],true),null);
assert.equal(financeReminder([],[],true),null);
assert.equal(financeReminder([{...debt,total:0.3}],[{debt_id:'1',amount:0.1},{debt_id:'1',amount:0.2}],true),null);
assert.equal(normalize(financeReminder([{...debt,direction:'debo'}],[],true).title),'Debes 20,00 € a Iván');
const privatePayload=financeReminder([debt],[],false);
assert.doesNotMatch(JSON.stringify(privatePayload),/Iván|20|Hacoo/);
assert.equal(privatePayload.url,'/dinero?tab=deudas');
assert.equal(financePayload(new Date('2026-10-09T07:00:00Z'),privatePayload).tag,'aurum-finance-2026-10-09');
assert.equal(financeReminderDue(new Date('2026-10-09T07:00:00Z'),9),true);
assert.equal(financeReminderDue(new Date('2026-10-09T07:09:59Z'),9),true);
assert.equal(financeReminderDue(new Date('2026-10-09T07:10:00Z'),9),false);
assert.equal(financeReminderDue(new Date('2026-12-09T08:00:00Z'),9),true);
assert.equal(financeReminderDue(new Date('2026-10-25T08:00:00Z'),9),true);
assert.equal(financeReminderDue(new Date(),24),false);
assert.equal(financeReminder([debt,{...debt,id:'2',person:'Jose',due_date:'2026-10-02'}],[],true).title.startsWith('Jose'),true);
assert.match(financeReminder([debt,{...debt,id:'2'}],[],true).body,/1 más/);

// Exercise the actual HTTP handlers with an isolated PostgREST-shaped store, never real subscriptions.
const tables={luden_push_subscriptions:[],luden_push_deliveries:[],luden_finance_push_deliveries:[],luden_day_blocks:[],luden_day_done:[],luden_day_changes:[]};
const sent=[];let failure=0;
class Query{
 constructor(table){this.table=table;this.filters=[];this.action='read';}
 select(){return this;} eq(key,value){this.filters.push(row=>row[key]===value);return this;} match(values){for(const [key,value]of Object.entries(values))this.eq(key,value);return this;}
 gte(){return this;} lte(){return this;}
 insert(value){this.action='insert';this.value=value;return this;} update(value){this.action='update';this.value=value;return this;} delete(){this.action='delete';return this;}
 maybeSingle(){this.single=true;return this;}
 then(resolve,reject){try{
  const rows=tables[this.table],matches=rows.filter(row=>this.filters.every(f=>f(row)));let data=matches;
  if(this.action==='insert'){
   const value=this.value;
   const duplicate=rows.some(row=>this.table==='luden_push_subscriptions'?row.endpoint===value.endpoint:row.subscription_id===value.subscription_id&&row.day===value.day&&(this.table==='luden_finance_push_deliveries'||row.event_key===value.event_key));
   if(duplicate)return Promise.resolve({data:null,error:{code:'23505'}}).then(resolve,reject);
   const row={id:String(rows.length+1),routine_enabled:true,finance_enabled:false,finance_hour:9,finance_details:false,...value};rows.push(row);data=[row];
  }
  if(this.action==='update')for(const row of matches)Object.assign(row,this.value);
  if(this.action==='delete')tables[this.table]=rows.filter(row=>!matches.includes(row));
  return Promise.resolve({data:this.single?data[0]||null:data,error:null}).then(resolve,reject);
 }catch(error){return Promise.reject(error).then(resolve,reject);}}
}
globalThis.__pushTest={db:{from:table=>new Query(table)},sent,reminder:privatePayload,send:async(subscription,payload)=>{if(failure){const error=new Error('provider unavailable');error.statusCode=failure;throw error;}sent.push({subscription,payload});}};
const server=moduleURL(`export const admin=()=>globalThis.__pushTest.db;export const sessionAdmin=async()=>globalThis.__pushTest.db;export const profileAdmin=()=>globalThis.__pushTest.db;export const requireProfile=async()=> 'luden';export const configValue=async()=>'';export const authorized=async request=>request.headers.get('cookie')==='valid';export const noStore={'Cache-Control':'no-store'};export const fail=(error,status=400)=>Response.json({error},{status});`);
const pushStub=moduleURL('export const sendPush=(...args)=>globalThis.__pushTest.send(...args);');
const reminderStub=moduleURL('export const readFinanceReminder=async()=>globalThis.__pushTest.reminder;export const readFinanceReminders=async()=>({privateReminder:globalThis.__pushTest.reminder,detailedReminder:globalThis.__pushTest.reminder});');
const routes=await import(moduleURL(compile('src/app/api/notifications/route.ts').replace("'@/lib/day-server'",JSON.stringify(server)).replace("'@/lib/push-server'",JSON.stringify(pushStub)).replace("'@/lib/finance-push-server'",JSON.stringify(reminderStub))));
const subscription={endpoint:'https://fcm.googleapis.com/fcm/send/isolated-test',keys:{auth:'test',p256dh:'test'}};
const request=(method,body,cookie='valid')=>new Request('https://aurum.test/api/notifications',{method,headers:{cookie,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});
assert.equal((await routes.GET(request('GET',null,''))).status,401);
assert.equal((await routes.POST(request('POST',{subscription:{...subscription,endpoint:'https://attacker.test'},topic:'finance'}))).status,400);
assert.equal((await routes.POST(request('POST',{subscription,topic:'finance',hour:24}))).status,400);
assert.equal((await routes.POST(request('POST',{subscription,topic:'finance',hour:11,details:true}))).status,200);
assert.equal(tables.luden_push_subscriptions[0].routine_enabled,false);
assert.equal(tables.luden_push_subscriptions[0].finance_hour,11);
assert.equal((await routes.POST(request('POST',{subscription}))).status,200); // compatibility: legacy day caller
assert.equal(tables.luden_push_subscriptions[0].finance_enabled,true);
assert.equal(tables.luden_push_subscriptions[0].routine_enabled,true);
assert.equal((await (await routes.DELETE(request('DELETE',{endpoint:subscription.endpoint}))).json()).release,false);
assert.equal(tables.luden_push_subscriptions[0].finance_enabled,true);
assert.equal((await (await routes.DELETE(request('DELETE',{endpoint:subscription.endpoint,topic:'finance'}))).json()).release,true);
assert.equal(tables.luden_push_subscriptions.length,0);

// Real dispatch loop: once per day, topic separation, retry and expired endpoints.
const now=new Date(),hour=Number(new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Madrid',hour:'2-digit',hourCycle:'h23'}).format(now));
tables.luden_push_subscriptions.push({id:'finance-only',subscription,routine_enabled:false,finance_enabled:true,finance_hour:hour,finance_details:false});
const eventStub=moduleURL("export const notificationEvents=()=>[{block:{id:'block',title:'Rutina',time:'09:00',description:''},kind:'before',day:'test',key:'before',ttl:300}];");
const dispatcher=await import(moduleURL(compile('src/lib/push-server.ts').replace("'./profiles'",JSON.stringify(moduleURL("export const profiles=[{id:'luden'}];"))).replace("'web-push'",JSON.stringify(moduleURL('export default {sendNotification:(subscription,json)=>globalThis.__pushTest.send(subscription,JSON.parse(json))};'))).replace("'./day-server'",JSON.stringify(server)).replace("'./day-plan'",JSON.stringify(day)).replace("'./notification-events'",JSON.stringify(eventStub)).replace("'./finance-reminders'",JSON.stringify(moduleURL(compile('src/lib/finance-reminders.ts').replace("'./finance'",JSON.stringify(finance)).replace("'./day-plan'",JSON.stringify(moduleURL(compile('src/lib/day-plan.ts').replace(/export function localMinute\([\s\S]*?\n\}/,'export function localMinute(){return '+hour+'*60;}'))))))).replace("'./finance-push-server'",JSON.stringify(reminderStub))));
assert.equal((await dispatcher.dispatchNotifications()).sent,1);
assert.equal(sent.at(-1).payload.url,'/dinero?tab=deudas');
assert.equal((await dispatcher.dispatchNotifications()).sent,0);
assert.equal(tables.luden_push_deliveries.length,0);
tables.luden_finance_push_deliveries=[];failure=503;
assert.equal((await dispatcher.dispatchNotifications()).failed,1);assert.equal(tables.luden_finance_push_deliveries.length,0);
failure=0;assert.equal((await dispatcher.dispatchNotifications()).sent,1);
tables.luden_finance_push_deliveries=[];globalThis.__pushTest.reminder=null;assert.equal((await dispatcher.dispatchNotifications()).sent,0);assert.equal(tables.luden_finance_push_deliveries.length,0);
globalThis.__pushTest.reminder=privatePayload;failure=410;assert.equal((await dispatcher.dispatchNotifications()).failed,1);assert.equal(tables.luden_push_subscriptions.length,0);

const handlers={};let displayed,navigated;
const context={URL,self:{location:{origin:'https://aurum.test'},addEventListener:(name,handler)=>handlers[name]=handler,registration:{showNotification:async(title,options)=>{displayed={title,...options};}},clients:{matchAll:async()=>[],openWindow:async url=>{navigated=url;}}}};
vm.runInNewContext(readFileSync('public/sw.js','utf8'),context);
let task;handlers.push({data:{json:()=>({...privatePayload})},waitUntil:p=>task=p});await task;
handlers.notificationclick({notification:{...displayed,close(){}},waitUntil:p=>task=p});await task;
assert.equal(navigated,'https://aurum.test/dinero?tab=deudas');
handlers.push({data:{json:()=>({url:'https://attacker.test'})},waitUntil:p=>task=p});await task;
handlers.notificationclick({notification:{...displayed,close(){}},waitUntil:p=>task=p});await task;
assert.equal(navigated,'https://aurum.test/hoy');
console.log('PASS finance notifications: exact balances, privacy, Madrid/DST, consent separation, auth, deduplication, retry, expiry and safe debt deep links.');

// Client lifecycle: no unsolicited permission prompt; disabling one topic preserves the other.
const client=await import(moduleURL(compile('src/lib/push-client.ts').replace("'./profile-client'",JSON.stringify(moduleURL("export const profileHeader=()=> 'luden';")))));
let permissionCalls=0,unsubscribed=0,sub=null;
const prefs={routine_enabled:false,finance_enabled:false,finance_details:false,finance_hour:9};
const order=[];
const reg={pushManager:{getSubscription:async()=>sub,subscribe:async()=>sub={...subscription,toJSON:()=>subscription,unsubscribe:async()=>{unsubscribed++;sub=null;}}}};
globalThis.Notification={permission:'default',requestPermission:async()=>{order.push('permission');permissionCalls++;globalThis.Notification.permission='granted';return 'granted';}};
globalThis.window={Notification:globalThis.Notification,PushManager:{}};
Object.defineProperty(globalThis,'navigator',{configurable:true,value:{serviceWorker:{register:async()=>{order.push('register');return reg;},ready:Promise.resolve(reg)}}});
globalThis.fetch=async(url,options)=>{
 const body=options.body?JSON.parse(options.body):null;
 if(options.method==='POST'){
  if(body.topic==='finance')Object.assign(prefs,{finance_enabled:true,finance_hour:body.hour,finance_details:body.details});
  else prefs.routine_enabled=true;
  return Response.json({ok:true});
 }
 if(options.method==='DELETE'){prefs[body.topic==='finance'?'finance_enabled':'routine_enabled']=false;return Response.json({release:!prefs.finance_enabled&&!prefs.routine_enabled});}
 return Response.json({publicKey:'AQID',...prefs});
};
await client.pushPreferences();assert.equal(permissionCalls,0);
order.length=0;await client.enablePush('finance',{hour:10,details:true,test:true});
assert.equal(order[0],'permission');assert.equal(permissionCalls,1);assert.equal(prefs.routine_enabled,false);
await client.enablePush('day');assert.equal(permissionCalls,1);
await client.disablePush('finance');assert.equal(prefs.routine_enabled,true);assert.equal(unsubscribed,0);
await client.disablePush('day');assert.equal(unsubscribed,1);
globalThis.window={};assert.equal(client.pushSupported(),false);await assert.rejects(()=>client.enablePush('finance'),/pantalla de inicio/);
console.log('PASS client: permission only from activation, topic separation, release only when both disabled, unsupported-iPhone guidance.');
