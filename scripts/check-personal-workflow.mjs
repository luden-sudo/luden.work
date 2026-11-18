import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
const url=code=>'data:text/javascript;base64,'+Buffer.from(code).toString('base64');
function compile(file){return ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;}
const finance=url(compile('src/lib/finance.ts'));
const management=url(compile('src/lib/management.ts').replace(/(['"])\.\/finance\1/g,JSON.stringify(finance)));
const amount=url(compile('src/lib/amount.ts'));
const i18n=url(compile('src/lib/i18n.ts').replace(/(['"])\.\/i18n-en\1/g,JSON.stringify(url(compile('src/lib/i18n-en.ts')))).replace(/(['"])\.\/i18n-en-public\1/g,JSON.stringify(url(compile('src/lib/i18n-en-public.ts')))));
function dependencies(code){for(const [name,target]of [['react',import.meta.resolve('react')],['react/jsx-runtime',import.meta.resolve('react/jsx-runtime')],['lucide-react',import.meta.resolve('lucide-react')],['@/lib/management',management],['@/lib/i18n',i18n],['@/lib/amount',amount]])code=code.replaceAll(JSON.stringify(name),JSON.stringify(target)).replaceAll("'"+name+"'",JSON.stringify(target));return code;}
const {ItemForm}=await import(url(dependencies(compile('src/components/management-forms.tsx'))));
const {default:OrderStatus}=await import(url(dependencies(compile('src/components/management-order-status.tsx'))));
const {emptyManagement}=await import(management);
const accounts=[{id:'cash',name:'Gestiones · Banco',kind:'Banco',scope:'business',opening_balance:0}];
for(const purpose of ['personal','vinted','amigos']){
 const data={...emptyManagement(purpose==='amigos'?'amigos':'ventas'),model:'Zapatillas',cost:8.57,phone_cost:.66,package_name:'Destinatario',sale:purpose==='personal'?'Para mí':purpose==='amigos'?'Vendido':'Disponible'};
 const html=renderToStaticMarkup(React.createElement(ItemForm,{item:{id:'example',version:1,data},activity:data.activity,accounts,busy:false,onSave:async()=>{}}));
 assert.equal((html.match(/name="package_name"/g)||[]).length,1);
 for(const name of ['cost','email','color','phone_number','tracking',purpose==='vinted'?'shipping_status':'delivery_status'])assert.equal((html.match(new RegExp('name="'+name+'"','g'))||[]).length,1,name);
 assert.equal(html.includes('name="price"'),purpose!=='personal');
 assert.ok(html.includes('>Vinted</button>'));
 const status=renderToStaticMarkup(React.createElement(OrderStatus,{data,payment:purpose==='amigos'?'unpaid':'no-buyer',compact:true}));
 if(purpose==='personal')assert.ok(!status.includes('Sin comprador'));
}
const create=renderToStaticMarkup(React.createElement(ItemForm,{activity:'ventas',accounts,busy:false,onSave:async()=>{}}));
assert.ok(create.includes('Elige una cuenta de Caja'));assert.ok(create.includes('pagado aparte'));assert.ok(create.includes('Crear pedido y registrar pago'));
console.log('PASS: personal/Vinted/friend forms preserve optional inputs, show distinct recipient, hide personal sale price and explain cash payments.');
for(const activity of ['amigos','ventas']){
 const base={...emptyManagement(activity),sale:'Vendido',delivery_status:'pending',shipping_status:'pending'};
 for(const options of [{overviewState:'pending'},{compact:false},{compact:true}]){
  const render=data=>renderToStaticMarkup(React.createElement(OrderStatus,{data,payment:'unpaid',...options}));
  assert.ok(render({...base,tracking:'Pedido'}).includes('Pedido'));
  assert.ok(render({...base,tracking:'En casa'}).includes('En casa'));
  const final={...base,tracking:activity==='amigos'?'Entregado':'Enviado',delivery_status:activity==='amigos'?'delivered':'pending',shipping_status:activity==='ventas'?'sent':'pending'};
  const html=render(final);
  assert.ok(!html.includes('mg-status-row--tracking'));
  assert.ok(!html.includes('En casa'));
  assert.ok(!render({...final,tracking:'En casa'}).includes('En casa'));
  assert.ok(html.includes('Sin cobrar'));
  if(!options.compact)assert.ok(html.includes(activity==='amigos'?'Entregado':'Enviado'));
  assert.ok(render({...final,...base,tracking:'Pedido'}).includes('Pedido'));
  assert.ok(render({...final,tracking:'Cancelado'}).includes('Cancelado'));
 }
}
console.log('PASS: delivered friend/shipped Vinted orders hide obsolete tracking, preserve delivery and collection, and restore tracking when reverted.');
