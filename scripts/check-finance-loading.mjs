import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const calls=[];
let failAt=-1;
const mockClient={from(table){
 const order=[];
 const query={select(columns){assert.equal(columns,'*');return query;},order(column,options){order.push([column,options]);return query;},async range(from,to){
  assert.deepEqual(order,[['date',{ascending:false}],['id',undefined]]);
  assert.equal(to-from,999);calls.push({table,from});
  if(from===failAt)return {data:null,error:{message:'offline'}};
  const total=table==='luden_transactions'?2001:1000;
  return {data:Array.from({length:Math.max(0,Math.min(1000,total-from))},(_,i)=>({id:from+i})),error:null};
 }};return query;
}};
globalThis.financeLoadingMock=mockClient;
const stub='data:text/javascript,'+encodeURIComponent('export const createClient=()=>globalThis.financeLoadingMock;');
const profile='data:text/javascript,'+encodeURIComponent('export const profileHeader=()=>"luden";');
let code=ts.transpileModule(fs.readFileSync('src/lib/supabase.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext}}).outputText;
code=code.replace(/(['"])@supabase\/supabase-js\1/g,JSON.stringify(stub)).replace(/(['"])\.\/profile-client\1/g,JSON.stringify(profile));
const {financeRows}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
const [entries,payments]=await Promise.all([financeRows('luden_transactions'),financeRows('luden_debt_payments')]);
assert.equal(entries.length,2001);assert.equal(new Set(entries.map(row=>row.id)).size,2001);assert.equal(payments.length,1000);
assert.deepEqual(calls.slice(0,2).map(call=>call.table),['luden_transactions','luden_debt_payments']);
failAt=1000;
await assert.rejects(()=>financeRows('luden_transactions'),/cargar los movimientos/);
await assert.rejects(()=>financeRows('luden_debt_payments'),/pagos de deudas/);
delete globalThis.financeLoadingMock;
console.log('PASS: parallel ledger reads, stable pagination past 2000 rows, exact page boundary and errors never return partial balances.');
