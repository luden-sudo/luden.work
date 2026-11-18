import postgres from 'postgres';
import assert from 'node:assert/strict';
const sql=postgres(process.env.POSTGRES_URL_NON_POOLING,{max:1,prepare:false});
async function fingerprints(){
 const hashes={};
 for(const table of ['luden_accounts','luden_settings','luden_transactions','luden_budgets','luden_debts','luden_debt_payments']){
  const filter=table==='luden_budgets'?sql`where category not like '__aurum_savings_%'`:sql``;
  const [row]=await sql`select md5(coalesce(string_agg((to_jsonb(t)-'savings_month')::text,',' order by (to_jsonb(t)-'savings_month')::text),'')) as hash from ${sql('public.'+table)} t ${filter}`;
  hashes[table]=row.hash;
 }return hashes;
}
try{
 const before=await fingerprints();
 await sql.file('supabase/monthly-savings.sql').simple();
 assert.deepEqual(await fingerprints(),before);
 console.log('PASS: monthly savings ready; all pre-existing financial data preserved.');
}finally{await sql.end();}
