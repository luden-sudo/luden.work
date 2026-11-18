import assert from 'node:assert/strict';
import fs from 'node:fs';
import {randomUUID} from 'node:crypto';
import postgres from 'postgres';
import ts from 'typescript';

if(!process.env.TASK_DB_URL)throw new Error('Provide TASK_DB_URL; this check runs isolated fixtures inside a transaction that always rolls back.');
const compile=path=>ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext}}).outputText;
const url=code=>'data:text/javascript;base64,'+Buffer.from(code).toString('base64');
const {emptyManagement}=await import(url(compile('src/lib/management.ts').replace(/(['"])\.\/finance\1/g,JSON.stringify(url(compile('src/lib/finance.ts'))))));
const db=postgres(process.env.TASK_DB_URL,{ssl:'require',max:1,onnotice:()=>{}}),marker='collection-check-'+randomUUID();
class Rollback extends Error{}
try {
 try {await db.begin(async tx=>{
  if(process.argv.includes('--with-migration'))await tx.unsafe(fs.readFileSync('supabase/management-collection-accounts.sql','utf8').replace(/^begin;$/m,'').replace(/^commit;$/m,''));
  const call=async(action,payload)=>(await tx`select aurum_management_mutate('luden',${action},${tx.json(payload)}) result`)[0].result;
  const data={...emptyManagement('amigos'),model:marker,price:50,tracking:'Pedido',sale:'Vendido'};
  const [item]=await call('import',{items:[{source_key:marker,data}]});
  let personalBank;
  for(const kind of ['Banco','Efectivo','Cripto','Ahorro']){
   const [account]=await tx`insert into luden_accounts (name,kind,scope,opening_balance) values (${marker+kind},${kind},'personal',0) returning id`;
   if(kind==='Banco')personalBank=account.id;
   const request=randomUUID(),payload={item_id:item.id,kind:'cobro',amount:1,date:'2099-10-29',note:marker,account_id:account.id,request_id:request};
   const event=await call('event',payload);assert.equal(event.account_id,account.id);
   await call('event',payload);
   const [count]=await tx`select count(*)::int n from luden_transactions where id=${event.transaction_id} and account_id=${account.id} and type='ingreso' and amount=1`;assert.equal(count.n,1);
   const [events]=await tx`select count(*)::int n from aurum_management_events where request_id=${request}`;assert.equal(events.n,1);
  }
  const [debt]=await tx`insert into luden_debts (title,person,direction,total,payment_type,start_date) values (${marker},${marker},'me_deben',2,'Único','2099-10-29') returning id`;
  const payment=await call('event',{item_id:item.id,kind:'cobro',amount:2,date:'2099-10-29',note:marker,account_id:personalBank,debt_id:debt.id,request_id:randomUUID()});
  assert.ok(payment.debt_payment_id);assert.equal(payment.transaction_id,null);
  const [ledger]=await tx`select (select count(*)::int from luden_transactions where account_id=${personalBank}) movements,(select count(*)::int from luden_debt_payments where account_id=${personalBank}) payments`;
  assert.deepEqual(ledger,{movements:1,payments:1});
  for(const kind of ['compra','gasto','reembolso_proveedor','devolucion_cliente'])await assert.rejects(()=>tx.savepoint(()=>call('event',{item_id:item.id,kind,amount:1,date:'2099-10-29',note:marker,account_id:personalBank,request_id:randomUUID()})),/Elige Efectivo o Banco de Gestiones/);
  await assert.rejects(()=>tx.savepoint(()=>call('event',{item_id:item.id,kind:'cobro',amount:45,date:'2099-10-29',note:marker,account_id:personalBank,request_id:randomUUID()})),/supera el importe pendiente/);
  await assert.rejects(()=>tx.savepoint(()=>call('event',{item_id:item.id,kind:'cobro',amount:1,date:'2099-10-29',note:marker,account_id:randomUUID(),request_id:randomUUID()})));
  const [totals]=await tx`select sum(amount)::numeric total from aurum_management_events where item_id=${item.id} and kind='cobro' and not voided`;assert.equal(Number(totals.total),6);
  throw new Rollback();
 });}catch(error){if(!(error instanceof Rollback))throw error;}
 const [remaining]=await db`select count(*)::int n from aurum_management_items where source_key=${marker}`;assert.equal(remaining.n,0);
 console.log('PASS: collections in all personal account kinds, idempotent retry, debt receipt without duplicate income, payment restrictions, amount limits, invalid accounts and complete fixture rollback.');
}catch(error){console.error(error.message);process.exitCode=1;}finally{await db.end();}
