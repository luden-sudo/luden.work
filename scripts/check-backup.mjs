import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const compile=file=>ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext}}).outputText;
const url=code=>'data:text/javascript;base64,'+Buffer.from(code).toString('base64');
const profiles=url(compile('src/lib/profiles.ts'));
const {buildBackup,backupTables}=await import(url(compile('src/lib/backup.ts').replace(/(['"])\.\/profiles\1/g,JSON.stringify(profiles))));
for(const profile of ['luden','danil','miguel']){
 const calls=[];
 const result=await buildBackup(profile,async(table,order,offset,limit,owner)=>{
  calls.push({table,order,offset,owner});
  const count=table==='aurum_management_events'?1201:table.endsWith('_day_done')?1003:1;
  assert.ok(!/config|token|subscription|attempt|deliveries/.test(table));
  assert.equal(owner,table.startsWith('aurum_')?profile:undefined);
  if(!owner)assert.ok(table.startsWith(profile+'_'));
  return {rows:Array.from({length:Math.min(limit,Math.max(0,count-offset))},(_,i)=>({id:offset+i,profile:owner,currency:'USD',archived:true,data:{deleted_at:'2026-01-01'}})),count};
 });
 assert.equal(result.profile.id,profile);assert.equal(result.currency,'EUR');
 assert.equal(result.finance.prefs[0].currency,'EUR');
 assert.equal(result.management.events.length,1201);assert.equal(result.day.done.length,1003);
 assert.equal(result.management.items[0].archived,true);assert.ok(result.management.items[0].data.deleted_at);
 assert.equal(result.counts.events,1201);assert.equal(Object.keys(result.counts).length,backupTables.length);
 assert.deepEqual(calls.find(c=>c.table.endsWith('_day_done')).order,['day','block_id']);
}
await assert.rejects(()=>buildBackup('luden',async()=>{throw new Error('offline');}),/offline/);
await assert.rejects(()=>buildBackup('luden',async()=>({rows:[],count:1})),/completar la copia/);
await assert.rejects(()=>buildBackup('Unknown profile!',async()=>({rows:[],count:0})),/perfil/);
console.log('PASS: complete paginated backups, full old/deleted history, three isolated profiles, EUR, credential exclusion and no partial backups on failure.');
