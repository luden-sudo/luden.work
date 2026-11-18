import assert from 'node:assert/strict';
import postgres from 'postgres';
import {savings} from './savings-module.mjs';

const url=process.env.POSTGRES_URL_NON_POOLING||process.env.POSTGRES_URL;
if(!url)throw new Error('Falta la conexión de base de datos.');
const sql=postgres(url,{ssl:'require',max:1});
const marker='__aurum_savings_allocation_migration_2026_10_17__';
const months=['2026-09','2026-10','2026-11'];

const read=async tx=>{
  const accounts=await tx`select id,name,kind,opening_balance from public.luden_accounts order by created_at`;
  const entries=(await tx`select id,title,type,amount,account_id,destination_account_id,date,savings_month from public.luden_transactions order by date,created_at`).map(row=>({...row,date:new Date(row.date).toISOString().slice(0,10)}));
  const budgets=await tx`select category,amount from public.luden_budgets order by category`;
  const monthly=Object.fromEntries(accounts.filter(row=>row.kind==='Ahorro').map(account=>[account.name,Object.fromEntries(months.map(month=>[month,savings.monthlySavingsForAccount(entries,account,month,budgets)]))]));
  return {accounts,entries,budgets,monthly};
};

try{
  const outcome=await sql.begin(async tx=>{
    await tx`lock table public.luden_accounts,public.luden_transactions,public.luden_budgets in share row exclusive mode`;
    const before=await read(tx);
    const cash=before.accounts.find(row=>row.name==='Ahorro · Efectivo'&&row.kind==='Ahorro');
    const crypto=before.accounts.find(row=>row.name==='Ahorro · Cripto'&&row.kind==='Ahorro');
    const revolut=before.accounts.find(row=>row.name==='Ahorro · Revolut'&&row.kind==='Ahorro');
    assert.ok(cash&&crypto&&revolut,'No se encontraron las tres cuentas de ahorro esperadas.');
    const applied=before.budgets.some(row=>row.category===marker);
    if(!applied){
      assert.deepEqual(before.monthly['Ahorro · Efectivo'],{'2026-09':188.6,'2026-10':-140.6,'2026-11':0},'El reparto base cambió; se cancela.');
      assert.deepEqual(before.monthly['Ahorro · Revolut'],{'2026-09':0,'2026-10':55,'2026-11':0});
      assert.deepEqual(before.monthly['Ahorro · Cripto'],{'2026-09':0,'2026-10':20,'2026-11':0});
      await tx`insert into public.luden_budgets(category,amount) values
        (${savings.SAVINGS_ALLOCATION+cash.id+':2026-10:credit'},140.60),
        (${savings.SAVINGS_ALLOCATION+revolut.id+':2026-10:credit'},20.00),
        (${marker},1)
        on conflict(category) do update set amount=excluded.amount`;
    }
    const after=await read(tx);
    assert.deepEqual(after.monthly['Ahorro · Efectivo'],{'2026-09':188.6,'2026-10':0,'2026-11':0});
    assert.deepEqual(after.monthly['Ahorro · Revolut'],{'2026-09':0,'2026-10':75,'2026-11':0});
    assert.deepEqual(after.monthly['Ahorro · Cripto'],{'2026-09':0,'2026-10':20,'2026-11':0});
    return {applied:!applied,monthly:after.monthly};
  });
  console.log(JSON.stringify(outcome));
}finally{
  await sql.end();
}
