import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

const origin=process.env.AUDIT_ORIGIN||'http://127.0.0.1:3104';
assert.match(origin,/^http:\/\/(localhost|127\.0\.0\.1):\d+$/);
async function client(){
  const response=await fetch(origin+'/api/session',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({pin:process.env.AUDIT_PIN})});
  assert.equal(response.status,200);const cookie=response.headers.get('set-cookie').split(';')[0];
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:(input,init)=>{
    const url=new URL(input);const headers=new Headers(init?.headers);headers.set('cookie',cookie);headers.delete('apikey');headers.delete('authorization');
    return fetch(origin+'/api/finance/'+url.pathname.split('/').at(-1)+url.search,{...init,headers});
  }}});
}
const a = await client(), b = await client();
const prefix = "verification-" + crypto.randomUUID();
let accountId, entryId;
async function result(request) { const {data,error} = await request; if(error) throw error; return data; }
try {
  const prefs = await result(a.from("luden_settings").select("*").single());
  assert.equal(prefs.id,"luden");
  const account = await result(a.from("luden_accounts").insert({name:prefix,kind:"Banco",opening_balance:100}).select().single());
  accountId = account.id;
  assert.equal((await result(b.from("luden_accounts").select("*").eq("id",accountId).single())).name,prefix);
  const entry = await result(a.from("luden_transactions").insert({account_id:accountId,title:prefix,category:"Otros",amount:12.5,type:"gasto",date:"2026-09-27"}).select().single());
  entryId = entry.id;
  assert.equal(Number((await result(b.from("luden_transactions").select("*").eq("id",entryId).single())).amount),12.5);
  await result(b.from("luden_transactions").update({amount:15,title:prefix+"-edited"}).eq("id",entryId).select().single());
  assert.equal(Number((await result(a.from("luden_transactions").select("*").eq("id",entryId).single())).amount),15);
  const blocked = await a.from("luden_accounts").delete().eq("id",accountId);
  assert.equal(blocked.error?.code,"23503");
  await result(a.from("luden_budgets").insert({category:prefix,amount:50}).select().single());
  assert.equal(Number((await result(b.from("luden_budgets").select("*").eq("category",prefix).single())).amount),50);
  await result(b.from("luden_budgets").update({amount:60}).eq("category",prefix).select().single());
  await result(a.from("luden_transactions").delete().eq("id",entryId));
  assert.equal((await result(b.from("luden_transactions").select("*").eq("id",entryId))).length,0);
  entryId = null;
  console.log("PASS: two authenticated sessions, persistence, entry create/read/update/delete, account protection, budgets.");
} finally {
  if(entryId) await a.from("luden_transactions").delete().eq("id",entryId);
  if(accountId) await a.from("luden_accounts").delete().eq("id",accountId);
  await a.from("luden_budgets").delete().eq("category",prefix);
}
