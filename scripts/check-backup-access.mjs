import assert from 'node:assert/strict';
const origin=process.env.AUDIT_ORIGIN||'http://127.0.0.1:3100';
assert.equal((await fetch(origin+'/api/backup')).status,401);
const login=await fetch(origin+'/api/session',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({pin:process.env.AUDIT_PIN})});
assert.equal(login.status,200);const cookie=login.headers.get('set-cookie').split(';')[0];
assert.equal((await fetch(origin+'/api/backup',{headers:{cookie,'x-aurum-profile':'danil'}})).status,401);
const response=await fetch(origin+'/api/backup',{headers:{cookie}});assert.equal(response.status,200);
assert.match(response.headers.get('cache-control'),/private, no-store/);
assert.match(response.headers.get('content-disposition'),/attachment; filename="luden-copia-completa-/);
const backup=await response.json();assert.equal(backup.profile.id,'luden');assert.equal(backup.schema_version,1);
for(const key of ['accounts','entries','prefs','budgets','debts','debtPayments'])assert.ok(Array.isArray(backup.finance[key]),key);
for(const key of ['blocks','done','changes'])assert.ok(Array.isArray(backup.day[key]),key);
for(const key of ['items','events']){assert.ok(Array.isArray(backup.management[key]),key);assert.ok(backup.management[key].every(row=>row.profile==='luden'));}
assert.equal(backup.finance.prefs[0].currency,'EUR');
const currency=await fetch(origin+'/api/finance/luden_settings?id=eq.luden',{method:'PATCH',headers:{cookie,'Content-Type':'application/json'},body:JSON.stringify({currency:'USD'})});
assert.equal(currency.status,400);
console.log(JSON.stringify({backupAccess:'PASS',counts:backup.counts,currencyLocked:'EUR',financialWrites:0}));
