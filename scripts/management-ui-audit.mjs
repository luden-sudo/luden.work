// Local UI fixtures only. Requests never reach real finance endpoints.
import {createRequire} from 'node:module';
import {randomUUID} from 'node:crypto';
import {mkdir} from 'node:fs/promises';
const require=createRequire(import.meta.url);
export async function createAudit({playwrightModule}={}){
 const {chromium}=require(playwrightModule||globalThis.process?.env?.PLAYWRIGHT_MODULE||'../work/qa-runtime/node_modules/playwright');
 const browser=await chromium.launch({headless:true});
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,locale:'es-ES',serviceWorkers:'block'});
 const page=await context.newPage(),calls=[],errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 const data={activity:'ventas',model:'Adidas Spezial',color:'Azul',size:'40',person:'Iván',email:'test@example.com',order_ref:'Pedido 001',cost:7,price:20,expenses:1,tracking:'En casa',sale:'Reservado',purchase_date:'2026-10-10',arrival_date:'2026-10-16',sale_date:'',delivery_date:'',next_action:'Entregar a Iván',review_date:'2026-10-18',photo:''};
 const item=(d)=>({id:randomUUID(),profile:'luden',data:d,version:1,source_key:null,archived:false,created_at:'2026-10-18',updated_at:'2026-10-18'});
 const fixture={items:[item(data),item({...data,model:'Onitsuka Tokuten edición especial color negro y crema',person:'Jose',tracking:'En camino',sale:'Disponible',next_action:''})],events:[],accounts:[{id:randomUUID(),name:'Gestiones · Efectivo',kind:'Efectivo',scope:'business',opening_balance:0},{id:randomUUID(),name:'Gestiones · Banco',kind:'Banco',scope:'business',opening_balance:0}],movements:[],debts:[],debtPayments:[]};
 await context.route('**/api/session',r=>r.fulfill({json:{authenticated:true,profile:{id:'luden',name:'luden'}}}));
 fixture.revision='1';
 await context.route('**/api/management*',async route=>{
  try{
   if(route.request().method()==='GET'){
    const query=new URL(route.request().url()).searchParams;
    const body=query.has('revision')?{revision:fixture.revision}:query.has('history')?{events:fixture.events.filter(e=>e.item_id===query.get('history'))}:fixture;
    await route.fulfill({json:body});return;
   }
   const p=route.request().postDataJSON();calls.push(p);
   if(p.action==='save_many'||p.action==='save')for(const row of p.action==='save_many'?p.payload.items:[p.payload]){
    const existing=fixture.items.find(i=>i.id===row.id);
    if(existing){existing.data=row.data;existing.version++;}else fixture.items.push({...item(row.data),source_key:row.source_key});
   }
   if(p.action==='event')fixture.events.push({id:randomUUID(),profile:'luden',voided:false,details:{},created_at:'2026-10-18',...p.payload});
   if(p.action==='case_status'){
    const current=fixture.items.find(i=>i.id===p.payload.id);
    if(p.payload.case_type==='refund'){
     current.data.refund_status=p.payload.status;
     if(p.payload.status==='received'){current.data.refund_original_cost=current.data.cost;current.data.cost=3.7;current.data.refund_cost_adjusted=true;}
     else if(current.data.refund_cost_adjusted){current.data.cost=current.data.refund_original_cost;current.data.refund_cost_adjusted=false;}
    }else current.data.exchange_status=p.payload.status;
    current.version++;
   }
   if(p.action==='archive'){fixture.items.find(i=>i.id===p.payload.id).archived=p.payload.archived;}
   fixture.revision=String(Number(fixture.revision)+1);
   await route.fulfill({json:{result:{}}});
  }catch(e){errors.push(e.message);await route.fulfill({status:500,json:{error:e.message}});}
 });
 await page.goto('http://localhost:3100/gestiones');
 await page.getByRole('heading',{name:'Artículos',exact:true}).waitFor({timeout:10000});
 await mkdir('work/management-audit',{recursive:true});
 return {browser,context,page,fixture,calls,errors};
}
