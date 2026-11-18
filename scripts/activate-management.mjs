import fs from 'node:fs';
import assert from 'node:assert/strict';
import postgres from 'postgres';
const sql=postgres(process.env.POSTGRES_URL||process.env.DATABASE_URL,{ssl:'require',max:1});
try{
 const before=await sql`select id,name,kind,opening_balance from luden_accounts order by id`;
 const counts=await sql`select (select count(*) from luden_transactions) movements,(select count(*) from luden_debt_payments) payments`;
 await sql.unsafe(fs.readFileSync('supabase/management.sql','utf8'));
 await sql`select aurum_management_mutate('luden','setup','{}'::jsonb)`;
 const after=await sql`select id,name,kind,opening_balance from luden_accounts where id=any(${before.map(a=>a.id)}::uuid[]) order by id`;
 assert.deepEqual(after,before);
 assert.deepEqual(await sql`select (select count(*) from luden_transactions) movements,(select count(*) from luden_debt_payments) payments`,counts);
 console.log(JSON.stringify({activated:true,existingBalancesPreserved:true,historicalMovementsPreserved:true,accounts:await sql`select name,kind,opening_balance from luden_accounts where scope='business' order by name`}));
}finally{await sql.end();}
