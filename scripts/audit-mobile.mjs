// Local-only UI audit. All database requests are intercepted; no real records are written.
// Install Playwright separately and set PLAYWRIGHT_MODULE to its index.mjs if needed.
import { mkdirSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const { webkit } = await import(process.env.PLAYWRIGHT_MODULE || '../work/qa-runtime/node_modules/playwright/index.mjs');
const origin = process.env.AUDIT_ORIGIN || 'http://127.0.0.1:3100';
assert.match(origin, /^http:\/\/(127\.0\.0\.1|localhost):\d+$/);
const output = 'work/mobile-audit';
mkdirSync(output, { recursive: true });
const now = new Date();
const date = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-15`;
const tables = {
  luden_accounts: [
    {id:'bank',name:'BBVA',kind:'Banco',opening_balance:1000},
    {id:'cash',name:'Efectivo',kind:'Efectivo',opening_balance:100},
    {id:'savings',name:'Ahorro',kind:'Ahorro',opening_balance:200},
  ],
  luden_settings: {id:'luden',currency:'EUR',salary:1500,monthly_budget:800,goal_name:'Viaje',savings_goal:1000},
  luden_transactions: [
    {id:'salary',title:'Nómina de septiembre',account_id:'bank',amount:1500,type:'ingreso',category:'Nómina',date},
    {id:'cost',title:'Compra Hacoo para varios pedidos',account_id:'bank',amount:30,type:'gasto',category:'Trabajo Hacoo',date},
    {id:'sale',title:'Venta Hacoo',account_id:'bank',amount:50,type:'ingreso',category:'Trabajo Hacoo',date},
    {id:'coffee',title:'Café',account_id:'cash',amount:2.5,type:'gasto',category:'Restaurantes',micro:true,date},
    {id:'transfer',title:'Ahorro mensual',account_id:'bank',destination_account_id:'savings',amount:100,type:'traspaso',category:'Traspaso',date},
  ],
  luden_budgets: [{category:'Restaurantes',amount:50},{category:'__aurum_project__:Ropa Hacoo',amount:200}],
  luden_debts: [
    {id:'receivable',title:'Ropa Hacoo',person:'Iván',direction:'me_deben',total:15,payment_type:'Único',start_date:date,due_date:null,notes:'',created_at:date},
    {id:'payable',title:'Compra compartida',person:'Juan',direction:'debo',total:20,payment_type:'Único',start_date:date,due_date:null,notes:'',created_at:date},
    {id:'settled',title:'Ropa Hacoo',person:'Jose',direction:'me_deben',total:17,payment_type:'Único',start_date:date,due_date:null,notes:'',created_at:date},
  ],
  luden_debt_payments: [
    {id:'partial',debt_id:'receivable',amount:5,account_id:'bank',date,notes:'__aurum_debt_payment_v1__:{"category":"Trabajo Hacoo","note":"Bizum"}'},
    {id:'out',debt_id:'payable',amount:10,account_id:'bank',date,notes:''},
    {id:'full',debt_id:'settled',amount:17,account_id:'bank',date,notes:''},
  ],
};
const browser = await webkit.launch({headless:true});
const issues=[]; let checks=0;
try {
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:1,locale:'es-ES',serviceWorkers:'block'});
  let authenticated=false;
  await context.route('**/*',async route=>{
    const url=new URL(route.request().url());
    if(url.pathname==='/api/session'){
      if(route.request().method()==='POST')authenticated=route.request().postDataJSON().pin===process.env.APP_PIN;
      return route.fulfill({status:route.request().method()==='POST'&&!authenticated?401:200,json:{authenticated,error:authenticated?undefined:'PIN incorrecto'}});
    }
    if(url.pathname.startsWith('/api/finance/')) {
      const table=url.pathname.split('/').pop();
      if(table==='luden_budgets'&&route.request().method()==='POST'){
        const value=route.request().postDataJSON();const rows=Array.isArray(value)?value:[value];
        tables.luden_budgets.push(...rows);return route.fulfill({json:rows});
      }
      // Writes are blocked intentionally. This audit must never hit the real backend.
      if(route.request().method()!=='GET') return route.fulfill({status:400,contentType:'application/json',body:JSON.stringify({message:'Audit: writes blocked'})});
      return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(tables[table] || [])});
    }
    if(url.origin===origin) return route.continue();
    return route.abort();
  });
  const page=await context.newPage();
  page.on('pageerror',e=>issues.push({state:'runtime',error:e.message}));
  await page.goto(origin+'/dinero');
  await page.getByLabel('PIN de acceso').fill('000000');
  await page.getByRole('button',{name:'Entrar',exact:true}).click();
  await page.getByText('PIN incorrecto').waitFor();
  await page.getByLabel('PIN de acceso').fill(process.env.APP_PIN);
  await page.getByRole('button',{name:'Entrar',exact:true}).click();
  await page.locator('.balance-hero strong').waitFor();
  assert.match(await page.locator('.balance-hero strong').innerText(), /2829,50|2\.829,50/);
  assert.match(await page.locator('.project-result strong').innerText(),/25,00/);
  const sizes=[[320,568],[360,780],[375,667],[375,812],[390,844],[393,852],[402,874],[414,736],[414,896],[420,912],[428,926],[430,932],[440,956],[844,390],[956,440],[1280,800]];
  async function inspect(state,shot=false){
    await page.evaluate(async()=>{ await Promise.race([Promise.all(document.getAnimations().filter(a=>a.effect?.getTiming().iterations!==Infinity).map(a=>a.finished.catch(()=>{}))),new Promise(resolve=>setTimeout(resolve,1000))]); });
    checks++;
    const defects=await page.evaluate(()=>{
      const scope=document.querySelector('dialog[open]') || document.body;
      const nodes=[...scope.querySelectorAll('button,input,select,h1,h2,strong,.movement-account,.bottom-nav,.dialog')];
      return nodes.flatMap(el=>{
        const r=el.getBoundingClientRect(),s=getComputedStyle(el);
        if(!r.width||!r.height||s.visibility==='hidden'||s.display==='none')return [];
        const label=(el.getAttribute('aria-label')||el.textContent||el.tagName).trim().slice(0,65);
        if(r.left < -1 || r.right>innerWidth+1)return [{kind:'overflow',label,left:r.left,right:r.right}];
        if(el.matches('button')&&(r.width<43.5||r.height<43.5))return [{kind:'small-target',label,w:r.width,h:r.height}];
        return [];
      });
    });
    if(defects.length)issues.push({state,defects});
    if(shot)await page.screenshot({path:`${output}/${state}.png`,fullPage:false});
  }
  for(const theme of ['dark','light']){
    await page.locator('.theme-control').click();
    await page.getByRole('group',{name:'Elegir apariencia'}).getByRole('button',{name:theme==='dark'?'Oscuro':'Claro',exact:true}).click();
    for(const [width,height] of sizes){
      console.log(`Checking ${theme} ${width}x${height}`);
      await page.setViewportSize({width,height});
      for(const tab of ['Resumen','Movimientos','Cuentas','Deudas','Límites','Ajustes']){
        const nav=page.locator(width<=800?'.bottom-nav':'.sidebar');
        if(tab==='Ajustes'&&width<=800)await page.getByRole('button',{name:'Ajustes',exact:true}).filter({visible:true}).click();
        else await nav.getByRole('button',{name:tab,exact:true}).click();
        await inspect(`${theme}-${width}x${height}-${tab}`, [320,390,844].includes(width));
      }
      await page.getByRole('button',{name:'Añadir movimiento',exact:true}).click();
      await inspect(`${theme}-${width}x${height}-form`,[320,390,844].includes(width));
      await page.getByRole('button',{name:'Traspaso',exact:true}).click();
      assert.notEqual(await page.locator('[name="account_id"]').inputValue(),await page.locator('[name="destination_account_id"]').inputValue());
      await page.locator('[name="account_id"]').selectOption('cash');
      assert.notEqual(await page.locator('[name="account_id"]').inputValue(),await page.locator('[name="destination_account_id"]').inputValue());
      await page.getByRole('button',{name:'Cerrar',exact:true}).click();
    }
  }
  await page.setViewportSize({width:390,height:844});
  await page.locator('.bottom-nav').getByRole('button',{name:'Deudas',exact:true}).click();
  await page.getByRole('button',{name:/Historial/}).click();
  assert.equal(await page.locator('.debt-card').count(),1);
  assert.match(await page.locator('.debt-card').innerText(),/Jose/);
  await page.getByRole('button',{name:/Pendientes/}).click();
  assert.equal(await page.locator('.debt-card').count(),2);
  await page.getByRole('button',{name:'Añadir deuda',exact:true}).click();
  await inspect('debt-form',true);
  await page.getByRole('button',{name:'Cerrar',exact:true}).click();
  await page.locator('.bottom-nav').getByRole('button',{name:'Cuentas',exact:true}).click();
  assert.match(await page.locator('.accounts-grid').innerText(),/2432,00|2\.432,00/);
  await page.getByRole('button',{name:'Añadir cuenta',exact:true}).click();
  await inspect('account-form',true);
  await page.getByRole('button',{name:'Cerrar',exact:true}).click();
  await page.locator('.bottom-nav').getByRole('button',{name:'Límites',exact:true}).click();
  await page.getByRole('button',{name:'Añadir límite',exact:true}).click();
  await inspect('budget-form',true);
  await page.getByRole('button',{name:'Cerrar',exact:true}).click();
  await page.locator('.bottom-nav').getByRole('button',{name:'Resumen',exact:true}).click();
  await page.getByRole('button',{name:'Personalizar Ropa Hacoo',exact:true}).click();
  await inspect('project-form',true);
  await page.getByRole('button',{name:'Cerrar',exact:true}).click();
  await page.locator('.bottom-nav').getByRole('button',{name:'Deudas',exact:true}).click();
  await page.getByRole('button',{name:'Registrar cobro',exact:true}).click();
  await inspect('debt-payment-form',true);
  await page.getByRole('button',{name:'Cerrar',exact:true}).click();
  await page.locator('.bottom-nav').getByRole('button',{name:'Movimientos',exact:true}).click();
  await page.getByLabel('Buscar movimientos').fill('no-existe-123');
  await page.getByText('Sin resultados',{exact:true}).waitFor();
  await page.getByLabel('Buscar movimientos').fill('');
  await page.getByLabel('Buscar movimientos').focus();
  assert.equal(await page.getByLabel('Buscar movimientos').evaluate(el=>getComputedStyle(el).outlineStyle),'none');
  await page.evaluate(()=>document.documentElement.style.fontSize='200%');
  await inspect('large-text',true);
  await context.close();
} finally {
  await browser.close();
  writeFileSync(`${output}/report.json`,JSON.stringify({checks,issues},null,2));
  console.log(JSON.stringify({checks,issueStates:issues.length,sample:issues.slice(0,6)},null,2));
}
