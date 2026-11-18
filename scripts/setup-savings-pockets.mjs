// One-off, user-authorized October 2026 setup. Not part of build or automatic deploys.
import postgres from 'postgres';
import assert from 'node:assert/strict';
import {savings,finance} from './savings-module.mjs';
const sql=postgres(process.env.POSTGRES_URL_NON_POOLING,{max:1,prepare:false});
const marker='__aurum_savings_setup_oct2026__',month='2026-10',amount=120.6;
try{
 await sql.begin(async tx=>{
  await tx`lock table public.luden_accounts,public.luden_transactions,public.luden_budgets,public.luden_debts,public.luden_debt_payments in share row exclusive mode`;
  if((await tx`select category from public.luden_budgets where category=${marker}`).length){console.log('Already configured; no balances changed.');return;}
  const accounts=await tx`select * from public.luden_accounts`,entries=(await tx`select to_jsonb(t) as row from public.luden_transactions t`).map(result=>result.row);
  const debts=await tx`select * from public.luden_debts`,payments=await tx`select * from public.luden_debt_payments`;
  const debtEntries=payments.filter(p=>p.account_id).map(p=>({...p,date:p.date instanceof Date?p.date.toISOString().slice(0,10):String(p.date),type:debts.find(d=>d.id===p.debt_id)?.direction==='me_deben'?'ingreso':'gasto'}));
  const ledger=[...entries,...debtEntries];
  const cash=accounts.filter(a=>a.kind==='Efectivo'&&a.name==='Efectivo'),saving=accounts.filter(a=>a.kind==='Ahorro'&&a.name==='Ahorro Efectivo');
  assert.equal(cash.length,1,'Review cash account before setup');assert.equal(saving.length,1,'Review legacy savings before setup');
  const savingId=saving[0].id;
  assert.equal(Number(saving[0].opening_balance),amount,'Existing savings opening balance changed; review first');
  const balance=a=>finance.totalAmounts([a.opening_balance,finance.accountChange(ledger,a.id)]);
  assert.equal(balance(saving[0]),0,'Savings changed; review the confirmed cash before setup');
  const adjustment=finance.totalAmounts([amount,-balance(cash[0])]);
  assert.equal(adjustment,20,'Cash changed since the user confirmed 120.60; review first');
  const before=finance.totalAmounts(accounts.map(balance));
  await tx`update public.luden_accounts set opening_balance=opening_balance+${adjustment} where id=${cash[0].id}`;
  await tx`update public.luden_accounts set name='Ahorro · Efectivo' where id=${savingId}`;
  async function ensure(name,kind){
   const matches=await tx`select * from public.luden_accounts where name=${name}`;
   assert.ok(matches.length<=1,'Ambiguous account name');
   if(matches.length){assert.equal(matches[0].kind,kind);return matches[0];}
   return (await tx`insert into public.luden_accounts (name,kind,opening_balance) values (${name},${kind},0) returning *`)[0];
  }
  await ensure('Cripto','Cripto');
  const bank=await ensure('Ahorro · Revolut','Ahorro'),crypto=await ensure('Ahorro · Cripto','Ahorro');
  const rows=[{category:savings.SAVINGS_LOCATION+savingId,amount:1},{category:savings.SAVINGS_LOCATION+bank.id,amount:2},{category:savings.SAVINGS_LOCATION+crypto.id,amount:3},{category:savings.SAVINGS_OPENING+savingId+':'+month,amount},{category:'__aurum_savings_cash_reconcile_oct2026__',amount:adjustment},{category:marker,amount:1}];
  await tx`insert into public.luden_budgets ${tx(rows,'category','amount')} on conflict (category) do nothing`;
  await tx`insert into public.luden_transactions (title,category,type,amount,account_id,destination_account_id,date,savings_month,micro) values ('Ahorro de octubre · Efectivo','Traspaso','traspaso',${amount},${cash[0].id},${savingId},'2026-10-09',${month},false)`;
  const afterAccounts=await tx`select * from public.luden_accounts`,afterEntries=(await tx`select to_jsonb(t) as row from public.luden_transactions t`).map(result=>result.row),budgets=await tx`select * from public.luden_budgets`;
  const afterLedger=[...afterEntries,...debtEntries];
  const afterBalances=afterAccounts.map(a=>({...a,balance:finance.totalAmounts([a.opening_balance,finance.accountChange(afterLedger,a.id)])}));
  assert.equal(finance.totalAmounts(afterBalances.map(a=>a.balance)),finance.totalAmounts([before,adjustment]),'Only user-confirmed physical cash may adjust the total');
  for(const entry of entries)assert.deepEqual(afterEntries.find(row=>row.id===entry.id),entry,'Existing movements must be unchanged');
  for(const account of accounts)assert.equal(Number(afterAccounts.find(row=>row.id===account.id).opening_balance),finance.totalAmounts([account.opening_balance,account.id===cash[0].id?adjustment:0]));
  assert.equal(savings.monthlySavings(afterLedger,afterAccounts,month,budgets),amount);
  assert.equal(afterBalances.find(a=>a.id===savingId).balance,amount);
  assert.equal(afterBalances.find(a=>a.id===cash[0].id).balance,0);
  assert.equal(afterEntries.length,entries.length+1,'Only the authorized cash transfer is added');
  console.log('PASS: three savings pockets, normal crypto, confirmed physical cash 120.60 saved in October; BBVA and old movements unchanged.');
 });
}catch(error){console.error(error.message);process.exitCode=1;}finally{await sql.end();}
