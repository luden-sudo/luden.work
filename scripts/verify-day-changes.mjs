import assert from 'node:assert/strict';
import postgres from 'postgres';
import {adjustments} from './day-modules.mjs';
const origin=process.env.AUDIT_ORIGIN||'http://127.0.0.1:3106';
assert.match(origin,/^http:\/\/(localhost|127\.0\.0\.1):\d+$/);
const sql=postgres(process.env.POSTGRES_URL_NON_POOLING,{max:1,prepare:false});
const day='2099-01-06';let created=false;
const login=async()=>{const response=await fetch(origin+'/api/session',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({pin:process.env.AUDIT_PIN})});assert.equal(response.status,200);return response.headers.get('set-cookie').split(';')[0];};
const call=(cookie,body)=>fetch(origin+'/api/day',{method:body?'POST':'GET',headers:{cookie,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});
try {
  assert.equal((await call('',{action:'save-day',day,overrides:[],revision:null})).status,401);
  const a=await login(),b=await login();
  const before=await(await call(a)).json();
  assert.ok(!before.changes.some(change=>change.day===day),'Do not overwrite an existing day.');
  const overrides=adjustments.changedRows(before.blocks,day,adjustments.schoolChanges(before.blocks,day,adjustments.dayRows(before.blocks,day),'late','11:45',true));
  assert.ok(overrides.length);
  assert.equal((await call(a,{action:'save-day',day,overrides,revision:null})).status,200);created=true;
  const saved=await(await call(b)).json(),change=saved.changes.find(change=>change.day===day);
  assert.deepEqual(change.overrides,overrides);assert.deepEqual(saved.blocks,before.blocks);
  const conflict=await call(a,{action:'save-day',day,overrides:[],revision:null});
  assert.equal(conflict.status,409,JSON.stringify(await conflict.json()));
  assert.equal((await call(a,{action:'save-day',day,overrides:[{...overrides[0],time:'99:00'}],revision:change.updated_at})).status,400);
  const edited=overrides.map(row=>({...row,title:row.title+' · test'}));
  assert.equal((await call(b,{action:'save-day',day,overrides:edited,revision:change.updated_at})).status,200);
  assert.equal((await call(a,{action:'save-day',day,overrides:[],revision:change.updated_at})).status,409);
  const latest=(await(await call(a)).json()).changes.find(change=>change.day===day);
  assert.equal((await call(a,{action:'save-day',day,overrides:[],revision:latest.updated_at})).status,200);
  assert.deepEqual((await(await call(b)).json()).changes.find(change=>change.day===day).overrides,[]);
  console.log('PASS: two sessions, saved day, edit/restore, stale-write prevention, invalid hours, authentication and weekly data unchanged.');
} finally {
  if(created)await sql`delete from public.luden_day_changes where day=${day}`;
  await sql.end();
}
