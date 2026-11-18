import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import ts from 'typescript';
const require=createRequire(import.meta.url),cache=new Map();
function load(path){
 if(cache.has(path))return cache.get(path).exports;
 const loaded={exports:{}};cache.set(path,loaded);
 const code=ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 new Function('exports','require','module',code)(loaded.exports,name=>{if(name.startsWith('@/'))name='./src/'+name.slice(2);else if(name.startsWith('./')||name.startsWith('../'))name='./'+require('node:path').posix.join(require('node:path').posix.dirname(path),name);if(name.startsWith('./src/')){const base=name.slice(2);for(const ext of ['.ts','.tsx'])if(fs.existsSync(base+ext))return load(base+ext);}return require(name);},loaded);
 return loaded.exports;
}
const React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
const {ItemForm}=load('src/components/management-forms.tsx'),{emptyManagement}=load('src/lib/management.ts');
const accounts=[{id:'bank',name:'Caja · Banco',kind:'Banco',scope:'business',opening_balance:0}];
for(const [activity,sale] of [['amigos','Vendido'],['ventas','Disponible'],['ventas','Para mí']]){
 for(const editing of [false,true]){
  if(!editing&&sale!==emptyManagement(activity).sale)continue;
  const data={...emptyManagement(activity),sale,email:'compras@example.com',package_name:'Nombre del paquete'};
  const html=renderToStaticMarkup(React.createElement(ItemForm,{activity,accounts,busy:false,item:editing?{id:'order',data,version:1}:undefined,onSave:async()=>{}}));
  const names=[...html.matchAll(/<input\b[^>]*\bname="([^"]+)"/g)].map(match=>match[1]);
  const priority=['email','model','cost','size','package_name','person'];
  assert.deepEqual(names.filter(name=>priority.includes(name)),priority);
  assert.equal(names[0],'email');assert.equal(names.filter(name=>name==='email').length,1);
  assert.ok(html.includes('<legend>Datos del pedido</legend>'));assert.ok(html.includes(sale==='Para mí'?'<legend>Pago del pedido</legend>':'<legend>Venta y pago</legend>'));
  assert.ok(html.indexOf('name="email"')<html.indexOf('<details'));
  assert.equal(names.includes('price'),sale!=='Para mí');
  if(editing){assert.ok(html.includes('value="compras@example.com"'));assert.ok(html.includes('value="Nombre del paquete"'));}
 }
}
const bonus=renderToStaticMarkup(React.createElement(ItemForm,{activity:'bonos',accounts,busy:false,onSave:async()=>{}}));
assert.ok(bonus.includes('name="cost"'));assert.ok(bonus.includes('name="price"'));assert.ok(!bonus.includes('name="email"'));
console.log('PASS: visible purchase email first; model, cost, size, package and person ordered once for new/edited friends, Vinted and personal orders. Bonus fields preserved.');
const {AppSidebar}=load('src/components/area-nav.tsx');
for(const active of ['hoy','rutinas','dinero','gestiones']){
 const html=renderToStaticMarkup(React.createElement(AppSidebar,{active,profileName:'Perfil de prueba'}));
 for(const route of ['/hoy','/rutinas','/dinero','/gestiones'])assert.ok(html.includes(`href="${route}"`));
 assert.equal([...html.matchAll(/aria-current="page"/g)].length,1);
 assert.ok(html.includes('Perfil de prueba'));
}
console.log('PASS: shared navigation preserves all four sections, one current section and the selected profile.');
const {EventForm}=load('src/components/management-forms.tsx');
const receivingAccounts=[...accounts,{id:'bbva',name:'BBVA',kind:'Banco',scope:'personal',opening_balance:0},{id:'cash',name:'Efectivo',kind:'Efectivo',scope:'personal',opening_balance:0},{id:'crypto',name:'Cripto',kind:'Cripto',scope:'personal',opening_balance:0},{id:'savings',name:'Ahorro',kind:'Ahorro',scope:'personal',opening_balance:0}];
for(const kind of ['cobro','compra','gasto','reembolso_proveedor','devolucion_cliente']){
 const html=renderToStaticMarkup(React.createElement(EventForm,{item:{id:'order',data:emptyManagement('amigos')},snapshot:{accounts:receivingAccounts,events:[],movements:[],debts:[],debtPayments:[]},kind,busy:false,onSave:async()=>{}}));
 const select=html.match(/<select name="account_id"[^>]*>([\s\S]*?)<\/select>/)?.[1];assert.ok(select);
 for(const account of receivingAccounts)assert.equal(select.includes(`value="${account.id}"`),kind==='cobro'||account.scope==='business',`${kind}: wrong account visibility for ${account.name}`);
}
console.log('PASS: collections offer all accounts including BBVA, cash, crypto and savings; purchases/expenses/refunds retain Caja restrictions.');
