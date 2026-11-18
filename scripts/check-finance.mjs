import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
async function load(path) {
  const source = ts.transpile(readFileSync(new URL(path, import.meta.url), 'utf8'), {module:ts.ModuleKind.ESNext});
  return import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
}
const NativeNumberFormat=Intl.NumberFormat;
let formatterCount=0;
Intl.NumberFormat=class extends NativeNumberFormat {constructor(...args){super(...args);formatterCount++;}};
const {cents,totalAmounts,remainingDebt,accountChange,formatEuros}=await load('../src/lib/finance.ts');
const reference=new NativeNumberFormat('es-ES',{style:'currency',currency:'EUR'});
for(const value of [0,-0,.01,-.01,15.66,44.62,1234567.89])assert.equal(formatEuros(value),reference.format(value));
for(let i=0;i<1000;i++)formatEuros(i);
assert.equal(formatterCount,1);
Intl.NumberFormat=NativeNumberFormat;
const {parseAmount}=await load('../src/lib/amount.ts');
assert.equal(parseAmount('150,40'),150.4);
assert.equal(parseAmount('150.40'),150.4);
assert.equal(parseAmount(',50'),0.5);
assert.equal(parseAmount('-15,25'),-15.25);
for(const invalid of ['NaN','Infinity','1.234,56','1,234.56','1e3','1.234',''])assert.throws(()=>parseAmount(invalid));
assert.equal(totalAmounts([0.1,0.2]),0.3);
assert.equal(totalAmounts([0.3,-0.1,-0.2]),0);
assert.equal(cents(19.99),1999);
assert.deepEqual(remainingDebt(0.3,[0.1,0.2]),{paid:0.3,remaining:0,percent:100});
assert.equal(remainingDebt(15,[5]).remaining,10);
assert.equal(remainingDebt(15,[]).remaining,15); // deleting a payment reopens the debt
assert.equal(remainingDebt(0,[]).percent,0);
const entries=[
  {type:'ingreso',amount:100,account_id:'a'},
  {type:'gasto',amount:0.1,account_id:'a'},
  {type:'gasto',amount:0.2,account_id:'a'},
  {type:'traspaso',amount:25,account_id:'a',destination_account_id:'b'},
  {type:'ingreso',amount:15,account_id:'b'}, // debt receipt
  {type:'gasto',amount:5,account_id:'a'}, // debt payment
];
assert.equal(accountChange(entries,'a'),69.7);
assert.equal(accountChange(entries,'b'),40);
assert.equal(accountChange(entries,'other'),0);
assert.equal(totalAmounts(['1000',accountChange(entries,'a'),accountChange(entries,'b')]),1109.7);
assert.equal(totalAmounts(entries.filter(e=>e.type==='traspaso').flatMap(e=>[-e.amount,e.amount])),0);
console.log('PASS: decimal input, cents, debt completion/reopening, transfers, balances and debt cash flows.');
