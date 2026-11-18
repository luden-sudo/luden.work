// Read-only verification by default. --apply installs only the additive sync schema.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import postgres from 'postgres';
const connection=process.env.POSTGRES_URL||process.env.DATABASE_URL;
const options={ssl:'require',max:1,onnotice:()=>{}};
const sql=postgres(connection,options),peer=postgres(connection,options);
const profiles=['luden','danil','miguel'];
const tables=[...profiles.flatMap(profile=>['accounts','transactions','debts','debt_payments'].map(suffix=>profile+'_'+suffix)),'aurum_management_items','aurum_management_events'];
async function fingerprints(db){
 const result={};
 for(const table of tables)result[table]=(await db.unsafe(`select count(*)::int count,md5(coalesce(string_agg(to_jsonb(t)::text,'' order by id),'')) hash from public.${table} t`))[0];
 return result;
}
class Rollback extends Error{}
try{
 if(process.argv.includes('--apply')){
  await sql.begin(async db=>{
   await db`set local lock_timeout='5s'`;
   await db`set local statement_timeout='15s'`;
   for(const profile of profiles)await db`select pg_advisory_xact_lock(hashtextextended(${'management:'+profile},0))`;
   await db.unsafe('lock table '+tables.map(table=>'public.'+table).join(',')+' in share row exclusive mode');
   const before=await fingerprints(db);
   await db.unsafe(fs.readFileSync('supabase/management-sync.sql','utf8').replace(/^begin;$/m,'').replace(/^commit;$/m,''));
   assert.deepEqual(await fingerprints(db),before,'Migration must not change financial or order rows');
  });
  console.log('Sync schema applied; every existing financial and order row preserved.');
 }
 const before=await fingerprints(sql);
 // Two connections: a Dinero write cannot bypass the management profile lock.
 try{
  await sql.begin(async db=>{
   await db`select pg_advisory_xact_lock(hashtextextended('management:luden',0))`;
   await assert.rejects(()=>peer.begin(async other=>{
    await other`set local lock_timeout='200ms'`;
    await other`update luden_transactions set title=title where id='00000000-0000-0000-0000-000000000000'`;
   }),error=>error.code==='55P03');
   // A different profile is not blocked. Both transactions always roll back.
   await assert.rejects(()=>peer.begin(async other=>{
    await other`set local lock_timeout='1s'`;
    await other`update danil_transactions set title=title where id='00000000-0000-0000-0000-000000000000'`;
    throw new Rollback();
   }),Rollback);
   throw new Rollback();
  });
 }catch(error){if(!(error instanceof Rollback))throw error;}
 assert.deepEqual(await fingerprints(sql),before,'Verification must preserve all rows');
 for(const profile of profiles){
  const snapshot=(await sql`select aurum_management_snapshot(${profile}) data`)[0].data;
  assert.ok(snapshot.items.every(i=>i.profile===profile&&!i.data.deleted_at));
  assert.ok(snapshot.events.every(e=>e.profile===profile));
  const source=(await sql`select coalesce(jsonb_agg(to_jsonb(e)),'[]'::jsonb) events from aurum_management_events e where profile=${profile}`)[0].events;
  console.log(JSON.stringify({profile,items:snapshot.items.length,summaryEvents:snapshot.events.length,allEvents:source.length,summaryEventBytes:Buffer.byteLength(JSON.stringify(snapshot.events)),allEventBytes:Buffer.byteLength(JSON.stringify(source)),snapshotBytes:Buffer.byteLength(JSON.stringify(snapshot))}));
 }
 console.log('PASS: concurrent same-profile writes serialized, other profiles independent, snapshots isolated, all rows unchanged.');
}finally{await Promise.all([sql.end(),peer.end()]);}
