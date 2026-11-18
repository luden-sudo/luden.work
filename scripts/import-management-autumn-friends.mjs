import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
import ts from 'typescript';
import postgres from 'postgres';
const compile=file=>ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ESNext}}).outputText;
const url=code=>'data:text/javascript;base64,'+Buffer.from(code).toString('base64');
const finance=url(compile('src/lib/finance.ts'));
const management=url(compile('src/lib/management.ts').replace(/(['"])\.\/finance\1/g,JSON.stringify(finance)));
const code=compile('src/lib/management-import.ts').replace(/(['"])\.\/management\1/g,JSON.stringify(management)).replace(/(['"])exceljs\1/g,JSON.stringify(pathToFileURL(path.resolve('node_modules/exceljs/excel.js')).href));
const {previewWorkbook}=await import(url(code));
const file=process.argv[2]||'C:/Users/Administrator/Downloads/ventas (1).xlsx';
const bytes=fs.readFileSync(file);
let rows;try{rows=(await previewWorkbook(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength))).filter(row=>['Septiembre Octubre','Amigos HACOO'].includes(row.data.source_sheet.replace(/\s+/g,' ').trim()));}catch(e){console.error(e.message);process.exit(1);}
assert.equal(rows.length,39);
const sql=postgres(process.env.POSTGRES_URL||process.env.DATABASE_URL,{ssl:'require',max:1});
try{
 await sql.begin(async db=>{
  const balances=await db`select id,name,opening_balance from luden_accounts order by id`;
  const before=await db`select (select count(*) from luden_transactions) movements,(select count(*) from luden_debt_payments) payments`;
  const existing=(await db`select source_key from aurum_management_items where profile='luden' and source_key=any(${rows.map(r=>r.source_key)}::text[])`).length;
  await db`select aurum_management_mutate('luden','import',${db.json({items:rows.map(({data,source_key})=>({data,source_key}))})})`;
  assert.deepEqual(await db`select id,name,opening_balance from luden_accounts order by id`,balances);
  assert.deepEqual(await db`select (select count(*) from luden_transactions) movements,(select count(*) from luden_debt_payments) payments`,before);
  console.log(JSON.stringify({selectedSheets:['Septiembre Octubre','Amigos HACOO'],rows:rows.length,newItems:rows.length-existing,previouslyImported:existing,financialMovementsCreated:0,accountBalancesPreserved:true}));
 });
}finally{await sql.end();}
