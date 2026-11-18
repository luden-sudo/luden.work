import assert from 'node:assert/strict';
import postgres from 'postgres';
import {savings,finance} from './savings-module.mjs';

const url=process.env.POSTGRES_URL_NON_POOLING||process.env.POSTGRES_URL;
if(!url)throw new Error('Falta la conexión de base de datos.');
const sql=postgres(url,{ssl:'require',max:1});
const marker='__aurum_savings_restate_2026_10_17__';
const months=['2026-09','2026-10','2026-11'];

const read=async tx=>{
  const accounts=await tx`select id,name,kind,opening_balance from public.luden_accounts order by created_at`;
  const entries=(await tx`select id,title,type,amount,account_id,destination_account_id,date,savings_month from public.luden_transactions order by date,created_at`).map(row=>({...row,date:new Date(row.date).toISOString().slice(0,10)}));
  const budgets=await tx`select category,amount from public.luden_budgets order by category`;
  const saved=accounts.filter(row=>row.kind==='Ahorro');
  return {
    accounts,entries,budgets,
    holdings:Object.fromEntries(savings.savingsBreakdown(entries,accounts,budgets).map(row=>[row.name,row.balance])),
    monthly:Object.fromEntries(saved.map(account=>[account.name,Object.fromEntries(months.map(month=>[month,savings.monthlySavingsForAccount(entries,account,month,budgets)]))])),
  };
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
      assert.deepEqual(before.holdings,{'Ahorro · Efectivo':178,'Ahorro · Cripto':28,'Ahorro · Revolut':55},'Los saldos cambiaron; se cancela para no sobrescribir datos nuevos.');
      assert.deepEqual(before.monthly['Ahorro · Efectivo'],{'2026-09':180.6,'2026-10':-12,'2026-11':0});
      assert.deepEqual(before.monthly['Ahorro · Cripto'],{'2026-09':0,'2026-10':28,'2026-11':0});
      assert.deepEqual(before.monthly['Ahorro · Revolut'],{'2026-09':19.4,'2026-10':35.6,'2026-11':0});

      const cryptoEntry=before.entries.filter(row=>row.account_id===crypto.id&&row.title==='gamba'&&row.type==='ingreso'&&row.savings_month==='2026-10');
      assert.equal(cryptoEntry.length,1,'No se encontró el apunte de cripto que se debe corregir.');
      assert.equal(finance.cents(cryptoEntry[0].amount),2800,'El importe de cripto cambió; se cancela.');
      const oldMoves=before.budgets.filter(row=>row.category.startsWith(savings.SAVINGS_MOVE));
      assert.equal(oldMoves.length,4,'El reparto entre meses cambió; se cancela.');

      await tx`update public.luden_accounts set opening_balance=140.60 where id=${cash.id}`;
      await tx`update public.luden_accounts set opening_balance=20.00 where id=${revolut.id}`;
      await tx`update public.luden_transactions set amount=20.00 where id=${cryptoEntry[0].id}`;
      await tx`delete from public.luden_budgets where category like ${savings.SAVINGS_MOVE+'%'}`;
      await tx`insert into public.luden_budgets(category,amount) values
        (${savings.SAVINGS_OPENING+cash.id+':2026-10'},140.60),
        (${savings.SAVINGS_OPENING+revolut.id+':2026-10'},20.00),
        (${savings.savingsMoveCategory('2026-10','2026-09','cash-18860',cash.id)},178.60),
        (${savings.savingsMoveCategory('2026-11','2026-10','clear-november',cash.id)},7.00),
        (${marker},1)
        on conflict(category) do update set amount=excluded.amount`;
    }

    const after=await read(tx);
    assert.deepEqual(after.holdings,{'Ahorro · Efectivo':188.6,'Ahorro · Cripto':20,'Ahorro · Revolut':75});
    assert.deepEqual(after.monthly['Ahorro · Efectivo'],{'2026-09':188.6,'2026-10':0,'2026-11':0});
    assert.deepEqual(after.monthly['Ahorro · Cripto'],{'2026-09':0,'2026-10':20,'2026-11':0});
    assert.deepEqual(after.monthly['Ahorro · Revolut'],{'2026-09':0,'2026-10':75,'2026-11':0});
    return {applied:!applied,holdings:after.holdings,monthly:after.monthly};
  });
  console.log(JSON.stringify(outcome));
}finally{
  await sql.end();
}
