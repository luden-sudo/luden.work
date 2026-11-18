import assert from 'node:assert/strict';
import fs from 'node:fs';
import {webcrypto} from 'node:crypto';
const origin=process.env.AUDIT_ORIGIN||'http://127.0.0.1:3103';
assert.match(origin,/^http:\/\/(localhost|127\.0\.0\.1):\d+$/);
let cookie='',id='';
const request=(body)=>fetch(origin+'/api/day',{method:body?'POST':'GET',headers:{'Content-Type':'application/json',cookie},body:body?JSON.stringify(body):undefined});
const login=await fetch(origin+'/api/session',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({pin:process.env.AUDIT_PIN})});
assert.equal(login.status,200);cookie=login.headers.get('set-cookie').split(';')[0];
const before=(await (await request()).json()).blocks;
const block={id:'',title:'QA plan '+webcrypto.randomUUID(),description:'Temporary test',time:'03:00',end_time:'04:00',plan_date:'2099-01-06',kind:'descanso',remind:false,weekdays:[]};
try {
 const created=await request({action:'save-plan',block});assert.equal(created.status,200);id=(await created.json()).id;assert.ok(id);
 assert.equal((await request({action:'save-plan',block:{...block,time:'03:30'}})).status,409);
 assert.equal((await request({action:'save-plan',block:{...block,plan_date:'2099-02-30'}})).status,400);
 assert.equal((await request({action:'save-plan',block:{...block,end_time:'02:00'}})).status,400);
 assert.equal((await request({action:'save-plan',block:{...block,id,time:'04:00',end_time:'05:00'}})).status,200);
 const saved=(await (await request()).json()).blocks.find(b=>b.id===id);assert.equal(saved.time,'04:00');assert.equal(saved.plan_date,block.plan_date);
 // A one-off plan cannot accidentally overwrite a recurring activity.
 const routine=before.find(b=>!b.plan_date);
 assert.equal((await request({action:'save-plan',block:{...block,id:routine.id,time:'06:00',end_time:'07:00'}})).status,404);
 const unauth=await fetch(origin+'/api/day',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'save-plan',block})});assert.equal(unauth.status,401);
}finally{if(id)assert.equal((await request({action:'delete',id})).status,200);}
const after=(await (await request()).json()).blocks;
assert.deepEqual(after.sort((a,b)=>a.id.localeCompare(b.id)),before.sort((a,b)=>a.id.localeCompare(b.id)));
console.log('PASS: authenticated plan create/edit/delete, overlap prevention, invalid date/time, routine isolation and complete test cleanup.');

// WebKit UI fixtures: no personal data is changed by browser checks.
const {webkit}=await import('../work/qa-runtime/node_modules/playwright/index.mjs');
const browser=await webkit.launch();
const fixture=JSON.parse(fs.readFileSync('scripts/day-seed.json','utf8')).map((b,i)=>({...b,id:String(i)}));
try{for(const width of [320,390,430,1280])for(const theme of ['dark','light']) {
 const context=await browser.newContext({viewport:{width,height:844},serviceWorkers:'block'});
 const page=await context.newPage();await page.clock.install({time:new Date('2026-10-05T13:00:00Z')});
 await page.addInitScript(t=>localStorage.setItem('aurum-theme',t),theme);
 await page.route('**/api/session',r=>r.fulfill({json:{authenticated:true}}));
 let items=structuredClone(fixture),lastSaved=null;
 await page.route('**/api/day',async r=>{
  if(r.request().method()==='POST'){
   const body=r.request().postDataJSON();
   if(body.action==='save-plan'){lastSaved={...body.block,id:body.block.id||'saved-plan'};items=[...items.filter(b=>b.id!==lastSaved.id),lastSaved];}
   if(body.action==='delete')items=items.filter(b=>b.id!==body.id);
   return r.fulfill({json:{ok:true}});
  }return r.fulfill({json:{blocks:items,done:[]}});
 });
 await page.goto(origin+'/hoy');await page.getByRole('button',{name:/Me ha surgido un plan/}).click();
 await page.getByLabel('Qué plan tienes').fill('Quedar con amigos');
 await page.getByRole('button',{name:'Mañana',exact:true}).click();
 await page.getByLabel('Desde',{exact:true}).fill('17:00');await page.getByLabel('Hasta',{exact:true}).fill('18:45');
 await page.getByRole('heading',{name:'Así queda tu día'}).waitFor();
 assert.match(await page.locator('.day-plan-resume').innerText(),/18:45.*Descansar/);
 await page.getByText('Ver horario adaptado',{exact:true}).click();
 assert.ok(await page.locator('dialog').evaluate(e=>e.scrollWidth<=e.clientWidth));
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.screenshot({path:`work/day-review/planner-${theme}-${width}.png`,fullPage:true});
 await page.getByRole('button',{name:'Añadir plan',exact:true}).click();
 await page.locator('.day-plan-saved').filter({hasText:'Quedar con amigos'}).waitFor();
 assert.equal(lastSaved.plan_date,'2026-10-06');
 await page.locator('.day-plan-saved').click();
 await page.getByLabel('Hasta',{exact:true}).fill('19:00');
 await page.getByRole('button',{name:'Guardar cambios',exact:true}).click();
 await page.locator('.day-plan-saved').filter({hasText:'19:00'}).waitFor();
 await page.locator('.day-plan-saved').click();await page.getByRole('button',{name:'Eliminar plan',exact:true}).click();
 await page.getByRole('button',{name:'Eliminar',exact:true}).click();
 await page.locator('.day-plan-saved').waitFor({state:'detached'});
 assert.equal(items.length,20);
 await context.close();
}}finally{await browser.close();}
console.log('PASS: 8 WebKit layouts, tomorrow preview, save/edit/cancel plan, no horizontal overflow.');
