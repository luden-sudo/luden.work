import assert from 'node:assert/strict';
const origin=process.env.AUDIT_ORIGIN||'http://127.0.0.1:3100';
let cookie='';
const get=(query='',headers={})=>fetch(origin+'/api/management'+query,{headers:{cookie,...headers}});
for(const query of ['','?revision=1','?links=1','?history=00000000-0000-4000-8000-000000000001'])assert.equal((await get(query)).status,401);
const login=await fetch(origin+'/api/session',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({pin:process.env.AUDIT_PIN})});
assert.equal(login.status,200);cookie=login.headers.get('set-cookie').split(';')[0];
const response=await get();assert.equal(response.status,200);assert.match(response.headers.get('cache-control'),/private, no-store/);
const snapshot=await response.json();assert.equal(typeof snapshot.revision,'string');
const revision=await get('?revision=1');assert.equal(revision.status,200);assert.equal(typeof (await revision.json()).revision,'string');
assert.equal((await get('?history=invalid')).status,400);
assert.equal((await get('?history=00000000-0000-4000-8000-000000000001')).status,404);
assert.equal((await get('?revision=1',{'x-aurum-profile':'danil'})).status,401);
const links=await get('?links=1');assert.equal(links.status,200);assert.ok(Array.isArray((await links.json()).links));
if(snapshot.items.length){
 const selected=snapshot.items[0];
 const history=await get('?history='+selected.id);assert.equal(history.status,200);
 const {events}=await history.json();assert.ok(events.every(e=>e.item_id===selected.id&&e.profile===selected.profile));
 const sorted=[...events].sort((a,b)=>b.created_at.localeCompare(a.created_at)||b.id.localeCompare(a.id));
 assert.deepEqual(events.map(e=>e.id),sorted.map(e=>e.id));
}
console.log('PASS: private snapshot, lightweight revision, per-order history, newest-first order, invalid/missing IDs and profile mismatch rejection. No financial writes.');
