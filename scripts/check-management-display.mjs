import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const compile=path=>ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext}}).outputText;
const url=code=>'data:text/javascript;base64,'+Buffer.from(code).toString('base64');
const finance=url(compile('src/lib/finance.ts'));
const {emptyManagement,managementAmountLabel,managementStatusLabels,orderPaymentState,orderDelivered,itemTotals,managementSummary,orderTotalCost,ORDER_PHONE_COST,splitExpense,money}=await import(url(compile('src/lib/management.ts').replace(/(['"])\.\/finance\1/g,JSON.stringify(finance))));
const imported={source_key:'xlsx:test:Sheet:8',data:{...emptyManagement(),warnings:['Revisar importación']}};
const before=JSON.stringify(imported);
assert.equal(managementAmountLabel(imported,0),'Sin confirmar');
assert.equal(managementAmountLabel(imported,15),money(15));
assert.equal(managementAmountLabel({...imported,source_key:'manual:test'},0),money(0));
assert.equal(managementAmountLabel({...imported,data:{...imported.data,warnings:[]}},0),money(0));
assert.equal(JSON.stringify(imported),before);
console.log('PASS: unreviewed imported zeros, confirmed zeros, manual entries, known amounts and no data mutation.');
for(const [refund_status,exchange_status,expected] of [
  ['requested','none',['Reembolso pedido','Por pedir']],
  ['received','requested',['Intercambio pedido','Por pedir','Reembolso recibido']],
  ['received','completed',['Por pedir','Reembolso recibido','Intercambio completado']],
  ['none','none',['Por pedir']],
]){
  const data={...emptyManagement(),tracking:'Por pedir',sale:'Disponible',refund_status,exchange_status};
  const original=JSON.stringify(data);
  assert.deepEqual(managementStatusLabels(data).map(s=>s.label),expected);
  assert.equal(JSON.stringify(data),original);
}
assert.deepEqual(managementStatusLabels({...emptyManagement(),tracking:'Por revisar',sale:'Por revisar'}).map(s=>s.label),['Revisar datos']);
function luminance(hex){return hex.match(/\w\w/g).map(c=>parseInt(c,16)/255).map(c=>c<=.04045?c/12.92:((c+.055)/1.055)**2.4).reduce((v,c,i)=>v+c*[.2126,.7152,.0722][i],0);}
const css=fs.readFileSync('src/app/gestiones/management.css','utf8');
for(const name of ['warning','success','home']){
 const backgrounds=[...css.matchAll(new RegExp('--mg-'+name+'-bg:(#[a-f0-9]{6})','g'))].map(m=>m[1]);
 const texts=[...css.matchAll(new RegExp('--mg-'+name+'-text:(#[a-f0-9]{6})','g'))].map(m=>m[1]);
 assert.equal(backgrounds.length,2);
 for(let i=0;i<2;i++){const a=luminance(backgrounds[i]),b=luminance(texts[i]);assert.ok((Math.max(a,b)+.05)/(Math.min(a,b)+.05)>=4.5,name+' contrast');}
}
console.log('PASS: refund/exchange states, priority, no duplicate review labels and AA state contrast in both themes.');
const friend={id:'friend',source_key:'manual:friend',data:{...emptyManagement('amigos'),price:20,cost:5}};
assert.equal(friend.data.sale,'Vendido');
assert.equal(orderPaymentState(friend,[]),'unpaid');
assert.equal(itemTotals(friend,[]).remaining,20);
assert.equal(itemTotals(friend,[]).profit,15);
assert.ok(!managementStatusLabels(friend.data).some(s=>['Reservado','Vendido'].includes(s.label)));
const receipt={id:'receipt',item_id:'friend',kind:'cobro',amount:5,voided:false,details:{}};
assert.equal(orderPaymentState(friend,[receipt]),'partial');
assert.equal(itemTotals(friend,[receipt]).remaining,15);
assert.equal(orderPaymentState(friend,[receipt,{...receipt,id:'rest',amount:15}]),'paid');
assert.equal(orderPaymentState(friend,[{...receipt,voided:true}]),'unpaid');
const delivered={...friend,data:{...friend.data,delivery_status:'delivered'}};
assert.equal(orderDelivered(delivered.data),true);
assert.equal(orderPaymentState(delivered,[]),'unpaid');
assert.equal(orderDelivered({...friend.data,tracking:'Entregado'}),true);
assert.equal(orderDelivered({...friend.data,tracking:'Entregado',delivery_status:'pending'}),false);
assert.equal(orderPaymentState({...friend,data:{...friend.data,price:0}},[]),'no-price');
assert.equal(orderPaymentState({...friend,data:{...friend.data,tracking:'Cancelado'}},[]),'cancelled');
assert.equal(itemTotals({...friend,data:{...friend.data,sale:'Disponible'}},[]).remaining,20);
const sale={...friend,data:{...friend.data,activity:'ventas',sale:'Disponible'}};
assert.equal(orderPaymentState(sale,[]),'no-buyer');
assert.equal(orderPaymentState({...sale,data:{...sale.data,sale:'Reservado'}},[]),'unpaid');
console.log('PASS: friends assigned, unpaid/partial/paid/voided receipts, zero price, cancellation, independent delivery, legacy states and sales.');
assert.equal(ORDER_PHONE_COST,.66);
const refunded={...friend,data:{...friend.data,cost:3.7,phone_cost:.66,refund_cost_adjusted:true}};
assert.equal(orderTotalCost(refunded.data),4.36);
assert.equal(itemTotals(refunded,[]).profit,15.64);
assert.equal(itemTotals(refunded,[]).expectedProfit,15.64);
assert.equal(itemTotals({...refunded,data:{...refunded.data,activity:'ventas',sale:'Disponible'}},[]).profit,0);
assert.equal(itemTotals({...refunded,data:{...refunded.data,activity:'ventas',sale:'Disponible'}},[]).expectedProfit,15.64);
assert.equal(itemTotals(refunded,[]).payable,3.7);
assert.equal(itemTotals(refunded,[{...receipt,kind:'reembolso_proveedor',amount:10}]).profit,15.64);
for(const count of [1,2,3,4,7,100]){
 const shares=splitExpense(.66,count);
 assert.equal(Math.round(shares.reduce((a,b)=>a+b,0)*100),66);
 assert.ok(shares.every(a=>a>=0&&a<=.66));
}
assert.equal(orderTotalCost({...friend.data,cost:10,phone_cost:.66,expenses:1}),11.66);
assert.equal(orderTotalCost({...friend.data,cost:10}),10);
console.log('PASS: nonrefundable phone fee, 4.36 total after refund, profit, payable, legacy cost preservation and single per-order fee split to cents.');
for(const activity of ['amigos','ventas']){
 const cancelled={...friend,data:{...friend.data,activity,tracking:'Cancelado',sale:'Vendido',price:15,cost:6.5}};
 const totals=itemTotals(cancelled,[]),summary=managementSummary([cancelled],[]);
 assert.equal(totals.profit,0);assert.equal(totals.expectedProfit,0);assert.equal(summary.agreed,0);
 const paid=[{...receipt,item_id:cancelled.id,amount:15}];
 assert.equal(itemTotals(cancelled,paid).collected,15);
 assert.equal(managementSummary([cancelled],paid).cashFlow,15);
}
console.log('PASS: cancelled orders exclude agreed sales and margin without erasing real receipts.');

const personal={...friend,data:emptyManagement('ventas')};
assert.equal(personal.data.tracking,'Pedido');assert.equal(personal.data.sale,'Para mí');
assert.equal(orderPaymentState(personal,[]),'no-buyer');
assert.equal(itemTotals({...personal,data:{...personal.data,cost:10,phone_cost:.66}},[]).stock,0);
assert.equal(itemTotals({...personal,data:{...personal.data,cost:10,phone_cost:.66}},[]).profit,0);
assert.equal(itemTotals({...personal,data:{...personal.data,cost:10,phone_cost:.66}},[]).payable,10);
console.log('PASS: personal orders default to Pedido, no sale stock/profit, phone excluded from cash payable.');
const {orderVisualState}=await import(url(compile('src/lib/management.ts').replace(/(['"])\.\/finance\1/g,JSON.stringify(finance))));
for(const data of [{...friend.data,tracking:'En casa'},{...sale.data,tracking:'En casa'}]){
 const home={...friend,data};
 assert.equal(managementStatusLabels(data).find(s=>s.key==='tracking').tone,'home');
 assert.equal(orderVisualState(home,[]).key,'home');
 assert.equal(orderVisualState(home,[{...receipt,amount:20}]).key,'home');
 assert.equal(orderVisualState({...home,data:{...data,refund_status:'requested'}},[]).key,'refund-pending');
 assert.equal(orderVisualState({...home,data:{...data,exchange_status:'requested'}},[]).key,'exchange-pending');
 assert.equal(managementStatusLabels({...data,tracking:'Pedido'}).find(s=>s.key==='tracking').tone,'info');
}
assert.equal(managementStatusLabels({...personal.data,tracking:'En casa'}).find(s=>s.key==='tracking').tone,'info');
console.log('PASS: distinct home color for friends/Vinted only, AA in both themes; refund/exchange priority and other tracking colors preserved.');
