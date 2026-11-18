import postgres from 'postgres';
import assert from 'node:assert/strict';
const sql=postgres(process.env.POSTGRES_URL_NON_POOLING,{max:1,prepare:false});
const tables=['luden_settings','luden_accounts','luden_transactions','luden_budgets','luden_debts','luden_debt_payments'];
async function fingerprints(){
 const result={};
 for(const table of tables){
  const rows=await sql`select md5(coalesce(string_agg(row_to_json(t)::text,',' order by row_to_json(t)::text),'')) as digest from ${sql('public.'+table)} t`;
  result[table]=rows[0].digest;
 }return result;
}
try{
 const before=await fingerprints();
 await sql.file('supabase/private-finance.sql').simple();
 assert.deepEqual(await fingerprints(),before,'Financial rows changed during permission migration.');
 for(const table of tables){
  const [access]=await sql`select has_table_privilege('anon',${'public.'+table},'select,insert,update,delete') as anon,has_table_privilege('authenticated',${'public.'+table},'select,insert,update,delete') as authenticated,has_table_privilege('service_role',${'public.'+table},'select') as server`;
  assert.equal(access.anon,false,table);assert.equal(access.authenticated,false,table);assert.equal(access.server,true,table);
 }
 console.log('PASS: all six financial tables private; server access retained; financial rows unchanged.');
}finally{await sql.end();}
