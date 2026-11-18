import assert from 'node:assert/strict';
const origin=process.env.AUDIT_ORIGIN||'http://127.0.0.1:3115';
let cookie='';
async function call(path,options={}){return fetch(origin+path,{...options,headers:{cookie,'Content-Type':'application/json',...options.headers}});}
assert.equal((await call('/api/notifications')).status,401);
const login=await call('/api/session',{method:'POST',body:JSON.stringify({pin:process.env.AUDIT_PIN})});
assert.equal(login.status,200);cookie=login.headers.get('set-cookie').split(';')[0];
const response=await call('/api/notifications?endpoint='+encodeURIComponent('https://fcm.googleapis.com/fcm/send/nonexistent-verification-endpoint'));
assert.equal(response.status,200);assert.match(response.headers.get('cache-control'),/no-store/);
const prefs=await response.json();assert.ok(prefs.publicKey.length>20);assert.equal(prefs.finance_enabled,false);assert.equal(prefs.finance_details,false);assert.equal(prefs.finance_hour,9);
assert.equal((await call('/api/notifications',{method:'POST',body:JSON.stringify({topic:'finance',hour:99,subscription:{}})})).status,400);
assert.equal((await call('/api/notifications',{method:'POST',body:JSON.stringify({topic:'finance',subscription:{endpoint:'https://attacker.invalid',keys:{auth:'test',p256dh:'test'}}})})).status,400);
assert.equal((await call('/api/notifications',{method:'POST',headers:{Origin:'https://attacker.invalid'},body:'{}'})).status,401);
assert.equal((await call('/api/notifications',{method:'DELETE',body:'{}'})).status,400);
assert.equal((await call('/api/notifications/dispatch',{method:'POST',headers:{Authorization:'Bearer invalid-verification-token'}})).status,401);
const sw=await call('/sw.js');assert.equal(sw.status,200);assert.match(await sw.text(),/dinero\?tab=deudas/);
console.log('PASS live notifications API: signed session, private defaults, VAPID availability, input/origin rejection, protected scheduler and correct service worker. No subscriptions changed or pushes sent.');
