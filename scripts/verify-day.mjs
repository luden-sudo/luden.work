import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createHash} from 'node:crypto';
import {createClient} from '@supabase/supabase-js';
const origin=process.env.AUDIT_ORIGIN||'http://127.0.0.1:3102';
assert.match(origin,/^http:\/\/(localhost|127\.0\.0\.1):\d+$/);
const env=Object.fromEntries(fs.readFileSync('.env.local','utf8').split(/\r?\n/).filter(l=>/^[A-Z_]+=/.test(l)).map(line=>{const i=line.indexOf('=');return [line.slice(0,i),line.slice(i+1).replace(/^['"]|['"]$/g,'')];}));
const db=createClient(env.NEXT_PUBLIC_SUPABASE_URL,env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}});
let cookie='',testId='',widgetToken='';
async function request(path,body){return fetch(origin+path,{method:body?'POST':'GET',headers:{'Content-Type':'application/json',cookie},body:body?JSON.stringify(body):undefined});}
try{
  assert.equal((await request('/api/day')).status,401);
  assert.equal((await request('/api/session',{pin:'000000'})).status,401);
  const login=await request('/api/session',{pin:process.env.APP_PIN});assert.equal(login.status,200);cookie=login.headers.get('set-cookie').split(';')[0];
  const data=await (await request('/api/day')).json();assert.ok(data.blocks.length>=1);
  const title='QA temporary '+Date.now();
  const block={title,description:'Temporary verification',time:'00:01',weekdays:[0,1,2,3,4,5,6],kind:'rutina',remind:false};
  assert.equal((await request('/api/day',{block})).status,200);
  testId=(await (await request('/api/day')).json()).blocks.find(b=>b.title===title).id;
  const day=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Madrid',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  assert.equal((await request('/api/day',{action:'complete',block_id:testId,day,done:true})).status,200);
  assert.ok((await (await request('/api/day')).json()).done.some(d=>d.block_id===testId&&d.day===day));
  assert.equal((await request('/api/day',{block:{...block,id:testId,title:title+' edited'}})).status,200);
  assert.equal((await request('/api/day',{block:{...block,id:testId,weekdays:[]}})).status,400);
  const setup=await (await request('/api/widget/setup',{})).json();assert.ok(setup.script);
  new vm.Script('(async()=>{'+setup.script+'})()');
  widgetToken=JSON.parse(setup.script.match(/const TOKEN = ("[a-f0-9]+")/)[1]);
  assert.equal((await request('/api/widget')).status,401);
  const widget=await fetch(origin+'/api/widget',{headers:{Authorization:'Bearer '+widgetToken}});assert.equal(widget.status,200);assert.ok((await widget.json()).next);
  const push=await (await request('/api/notifications')).json();assert.ok(push.publicKey.length>40);
  assert.equal((await request('/api/notifications/dispatch',{})).status,401);
  const anon=createClient(env.NEXT_PUBLIC_SUPABASE_URL,env.NEXT_PUBLIC_SUPABASE_ANON_KEY,{auth:{persistSession:false}});
  assert.ok((await anon.from('luden_app_config').select('*')).error,'Private configuration must not be readable anonymously');
  console.log('PASS: shared PIN/session, protected API, create/edit/complete routines, validation, widget pairing and private push configuration.');
}finally{
  if(testId)await db.from('luden_day_blocks').delete().eq('id',testId);
  if(widgetToken)await db.from('luden_widget_tokens').delete().eq('token_hash',createHash('sha256').update(widgetToken).digest('hex'));
}
const {webkit}=await import(process.env.PLAYWRIGHT_MODULE||'../work/qa-runtime/node_modules/playwright/index.mjs');
const browser=await webkit.launch();
fs.mkdirSync('work/day-review',{recursive:true});
try{
  const context=await browser.newContext({isMobile:true,hasTouch:true,serviceWorkers:'block'});
  const session=cookie.split('=');await context.addCookies([{name:session[0],value:session.slice(1).join('='),url:origin}]);
  const page=await context.newPage();let checks=0;
  const fixtures={blocks:[{id:'fixture',title:'Actividad de prueba con un nombre largo',description:'Una descripción legible que se adapta al ancho disponible sin desbordar el contenido.',time:'09:00',weekdays:[0,1,2,3,4,5,6],kind:'trabajo',remind:true}],done:[]};
  await page.route('**/api/day',route=>route.fulfill({json:fixtures}));
  for(const theme of ['dark','light'])for(const [width,height]of [[320,568],[375,667],[390,844],[430,932],[844,390],[1280,800]]) {
    await page.setViewportSize({width,height});await page.goto(origin+'/hoy');
    await page.evaluate(t=>{document.documentElement.dataset.theme=t;localStorage.setItem('aurum-theme',t);},theme);
    await page.getByRole('heading',{name:'Tu día',exact:true}).waitFor();
    await page.getByRole('heading',{name:fixtures.blocks[0].title,exact:true}).first().waitFor();
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth),theme+' '+width+' page overflow');checks++;
    await page.getByRole('button',{name:'Actividad',exact:true}).click();
    await page.getByRole('dialog').waitFor();
    await page.evaluate(async()=>{await Promise.all(document.getAnimations().filter(a=>a.effect?.getTiming().iterations!==Infinity).map(a=>a.finished.catch(()=>{})));});
    const dialog=await page.getByRole('dialog').evaluate(d=>({width:d.scrollWidth,client:d.clientWidth}));assert.ok(dialog.width<=dialog.client+1,theme+' '+width+' dialog overflow');checks++;
    await page.screenshot({path:`work/day-review/${theme}-${width}-form.png`});
    await page.getByRole('button',{name:'Cancelar',exact:true}).click();
    await page.screenshot({path:`work/day-review/${theme}-${width}-today.png`});
  }
  await page.goto(origin+'/rutinas');await page.getByRole('heading',{name:'Todas las rutinas'}).waitFor();
  await page.getByRole('button',{name:'Ajustes de Mi día'}).click();await page.getByRole('heading',{name:'Widget de Scriptable'}).waitFor();
  await page.screenshot({path:'work/day-review/widget-settings.png'});
  console.log('PASS: '+checks+' responsive checks in WebKit, both themes; routines and Scriptable settings render.');
}finally{await browser.close();}
