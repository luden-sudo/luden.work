import assert from 'node:assert/strict';
import postgres from 'postgres';
import {savings} from './savings-module.mjs';

const url=process.env.POSTGRES_URL_NON_POOLING||process.env.POSTGRES_URL;
if(!url)throw new Error('Falta la conexión de base de datos.');
const sql=postgres(url,{ssl:'require',max:1});
const legacy='__aurum_savings_move__:2026-10:2026-09:b6a48688-9203-4418-bf77-21abc0d23175';
const goal=savings.SAVINGS_GOAL+'2026-09';
const read=async tx=>{
 const accounts=await tx`select id,name,kind,opening_balance from public.luden_accounts order by created_at`;
 const entries=(await tx`select id,title,type,amount,account_id,destination_account_id,date,savings_month from public.luden_transactions order by date,created_at`).map(row=>({...row,date:row.date.toISOString().slice(0,10)}));
 const budgets=await tx`select category,amount from public.luden_budgets order by category`;
 return {accounts,entries,budgets,totals:['2026-09','2026-10','2026-11'].map(month=>[month,savings.monthlySavings(entries,accounts,month,budgets)])};
};
try{
 const outcome=await sql.begin(async tx=>{
  await tx`lock table public.luden_accounts,public.luden_transactions,public.luden_budgets in share row exclusive mode`;
  const before=await read(tx);
  const cash=before.accounts.find(row=>row.name==='Ahorro · Efectivo'&&row.kind==='Ahorro');
  const bank=before.accounts.find(row=>row.name==='Ahorro · Revolut'&&row.kind==='Ahorro');
  assert.ok(cash&&bank,'No se encontraron las cuentas de ahorro esperadas.');
  const cashLegacy=savings.savingsMoveCategory('2026-10','2026-09','legacy-180-cash',cash.id);
  const bankLegacy=savings.savingsMoveCategory('2026-10','2026-09','legacy-180-revolut',bank.id);
  const november=savings.savingsMoveCategory('2026-11','2026-10','user-7-october',cash.id);
  const applied=before.budgets.some(row=>row.category===november);
  if(!applied){
   assert.deepEqual(before.totals,[['2026-09',180],['2026-10',10],['2026-11',7]],'El reparto mensual cambió; se cancela para no sobrescribir datos nuevos.');
   const old=before.budgets.find(row=>row.category===legacy);
   assert.equal(Number(old?.amount),180,'No se encontró el traspaso anterior de 180 €.');
   await tx`delete from public.luden_budgets where category=${legacy}`;
   await tx`insert into public.luden_budgets(category,amount) values (${cashLegacy},170.60),(${bankLegacy},9.40),(${november},7.00)`;
  }
  await tx`insert into public.luden_budgets(category,amount) values (${goal},200) on conflict(category) do update set amount=excluded.amount`;
  const after=await read(tx);
  assert.deepEqual(after.totals,[['2026-09',180],['2026-10',17],['2026-11',0]]);
  assert.equal(savings.savingsTarget(after.budgets,'2026-09'),200);
  const monthly=Object.fromEntries(after.accounts.filter(row=>row.kind==='Ahorro').map(account=>[account.name,['2026-09','2026-10','2026-11'].map(month=>savings.monthlySavingsForAccount(after.entries,account,month,after.budgets))]));
  assert.deepEqual(monthly['Ahorro · Efectivo'],[170.6,7,0]);
  assert.deepEqual(monthly['Ahorro · Revolut'],[9.4,10,0]);
  return {applied:!applied,totals:after.totals,target:200};
 });
 console.log(JSON.stringify(outcome));
}finally{await sql.end();}
