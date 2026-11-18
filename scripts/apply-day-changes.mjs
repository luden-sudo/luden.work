import postgres from 'postgres';
import assert from 'node:assert/strict';
const sql=postgres(process.env.POSTGRES_URL_NON_POOLING,{max:1,prepare:false});
const fingerprint=async()=> (await sql`select md5(coalesce(string_agg(row_to_json(t)::text,',' order by row_to_json(t)::text),'')) as digest from public.luden_day_blocks t`)[0].digest;
try {
  const before=await fingerprint();
  await sql.file('supabase/day-changes.sql').simple();
  assert.equal(await fingerprint(),before);
  const [access]=await sql`select relrowsecurity as rls,has_table_privilege('anon','public.luden_day_changes','select,insert,update,delete') as anon,has_table_privilege('authenticated','public.luden_day_changes','select,insert,update,delete') as authenticated from pg_class where oid='public.luden_day_changes'::regclass`;
  assert.equal(access.rls,true);assert.equal(access.anon,false);assert.equal(access.authenticated,false);
  console.log('PASS: private day changes table ready; existing routines preserved.');
}finally{await sql.end();}
