import postgres from 'postgres';
import assert from 'node:assert/strict';
const sql=postgres(process.env.POSTGRES_URL_NON_POOLING,{max:1,prepare:false});
async function fingerprint(){
 const result={};
 for(const table of ['luden_accounts','luden_transactions','luden_debts','luden_debt_payments','luden_budgets','luden_settings','luden_day_blocks','luden_day_changes','luden_day_done']){
  const [row]=await sql`select md5(coalesce(string_agg(to_jsonb(t)::text,',' order by to_jsonb(t)::text),'')) hash from ${sql('public.'+table)} t`;
  result[table]=row.hash;
 }
 const [push]=await sql`select md5(coalesce(string_agg((to_jsonb(t)-'routine_enabled'-'finance_enabled'-'finance_hour'-'finance_details')::text,',' order by id),'')) hash from public.luden_push_subscriptions t`;
 result.subscriptions=push.hash;return result;
}
try{
 const before=await fingerprint();
 await sql.file('supabase/finance-notifications.sql').simple();
 assert.deepEqual(await fingerprint(),before);
 const [security]=await sql`select relrowsecurity enabled,has_table_privilege('anon','public.luden_finance_push_deliveries','SELECT') anon,has_table_privilege('authenticated','public.luden_finance_push_deliveries','SELECT') authenticated from pg_class where oid='public.luden_finance_push_deliveries'::regclass`;
 assert.equal(security.enabled,true);assert.equal(security.anon,false);assert.equal(security.authenticated,false);
 const cron=await sql`select active,schedule from cron.job where jobname='aurum-routine-notifications'`;
 assert.equal(cron.length,1);assert.equal(cron[0].active,true);assert.equal(cron[0].schedule,'* * * * *');
 console.log('PASS: private finance reminders ready; routine consent and all financial/routine data preserved; existing scheduler active.');
}finally{await sql.end();}
