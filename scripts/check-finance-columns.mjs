import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

const stub='data:text/javascript,'+encodeURIComponent(`export const authorized=async()=>true; export const requireProfile=async()=> 'luden'; export const fail=(error,status=400)=>Response.json({error},{status}); export const noStore={}; export const profileTable=table=>table;`);
const source=fs.readFileSync('src/app/api/finance/[table]/route.ts','utf8');
const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText.replace(/(['"])@\/lib\/(?:day-server|profiles)\1/g,JSON.stringify(stub));
const {POST,GET}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
process.env.SUPABASE_URL='https://example.test';
process.env.SUPABASE_SERVICE_ROLE_KEY='test-only';
let forwarded=0;
globalThis.fetch=async()=>{forwarded++;return Response.json([]);};
const params={params:Promise.resolve({table:'luden_budgets'})};
const url='https://app.test/api/finance/luden_budgets?on_conflict=category&columns=%22category%22%2C%22amount%22&select=*';
const result=await POST(new Request(url,{method:'POST',body:JSON.stringify([{category:'test',amount:200}])}),params);
assert.equal(result.status,200,'Monthly bulk upsert must reach the database');
assert.equal(forwarded,1);
for(const columns of ['%22category%22%2C%22secret%22','*','']){
 const denied=await POST(new Request(url.replace('%22category%22%2C%22amount%22',columns),{method:'POST',body:'[]'}),params);
 assert.equal(denied.status,400);
}
assert.equal((await GET(new Request(url),params)).status,400);
assert.equal(forwarded,1,'Rejected parameters must never reach the database');
console.log('PASS: monthly budget columns accepted only for POST; unknown columns and GET rejected. No real database used.');
