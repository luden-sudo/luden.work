import assert from 'node:assert/strict';
const origin=process.env.AUDIT_ORIGIN||'http://127.0.0.1:3104';
let cookie='';
async function call(path,options={}){return fetch(origin+path,{...options,headers:{cookie,'Content-Type':'application/json',...options.headers}});}
assert.equal((await call('/api/finance/luden_accounts?select=*')).status,401);
assert.equal((await call('/api/finance/luden_accounts?id=eq.missing',{method:'DELETE'})).status,401);
const login=await call('/api/session',{method:'POST',body:JSON.stringify({pin:process.env.AUDIT_PIN})});
assert.equal(login.status,200);cookie=login.headers.get('set-cookie').split(';')[0];
for(const table of ['luden_accounts','luden_transactions','luden_settings','luden_budgets','luden_debts','luden_debt_payments']){
 const response=await call('/api/finance/'+table+'?select=*&limit=1');assert.equal(response.status,200,table);assert.ok(Array.isArray(await response.json()));
}
assert.equal((await call('/api/finance/luden_app_config?select=*')).status,404);
assert.equal((await call('/api/finance/luden_accounts?select=*,profiles(*)')).status,400);
assert.equal((await call('/api/finance/luden_accounts',{method:'DELETE'})).status,400);
assert.equal((await call('/api/finance/luden_accounts?id=eq.missing',{method:'DELETE',headers:{Origin:'https://unrelated.invalid'}})).status,401);
// An impossible identifier exercises the authenticated update path without changing any row.
const patch=await call('/api/finance/luden_accounts?id=eq.00000000-0000-0000-0000-000000000000&select=*',{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify({name:'Unmatched verification'})});
assert.equal(patch.status,200);assert.deepEqual(await patch.json(),[]);
console.log('PASS: protected finance reads, session, all six tables, scoped proxy, write transport, cross-origin and bulk-delete rejection. No financial rows changed.');
