import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import ts from 'typescript';

// Compare the visual migration with its immutable pre-redesign revision.
const base=process.argv[2]||'c452b31';
const git=(...args)=>execFileSync('git',args,{encoding:'utf8'});
const files=git('ls-tree','-r','--name-only',base,'src/components').trim().split('\n').filter(p=>p.endsWith('.tsx'));
const protectedAttribute=/^(?:on[A-Z]|name$|id$|ref$|type$|value$|defaultValue$|checked$|defaultChecked$|disabled$|required$|pattern$|min$|max$|step$|minLength$|maxLength$|href$|key$|role$|aria-|data-)/;
let controls=0;
// Approved replacement of the six time inputs; restore their original contracts.
function timeInputs(text){
 return text.replace(/<TimePicker label="[^"]*" /g,'<TimePicker type="time" ')
  .replace('onChange={time=>setPlan({...plan,time})}','onChange={e=>setPlan({...plan,time:e.target.value})}')
  .replace('onChange={time=>setPlan({...plan,end_time:time})}','onChange={e=>setPlan({...plan,end_time:e.target.value})}')
  .replace('onChange={time=>setEditor({...editor,time})}','onChange={e=>setEditor({...editor,time:e.target.value})}')
  .replace("onChange={time=>{setStart(time);setRows(schoolChanges(blocks,day,presetBase,'late',time,adaptMorning));}}","onChange={e=>{setStart(e.target.value);setRows(schoolChanges(blocks,day,presetBase,'late',e.target.value,adaptMorning));}}")
  .replace('onChange={time=>patch(row.block_id,{time})}','onChange={e=>patch(row.block_id,{time:e.target.value})}')
  .replace('onChange={time=>patch(row.block_id,{end_time:time||null})}','onChange={e=>patch(row.block_id,{end_time:e.target.value||null})}');
}
function contract(text,path){
 text=timeInputs(text).replace('<span className={`category-symbol category-symbol--${categoryTones[item]||"slate"}`} aria-hidden="true"><Icon size={18}/></span>','<Icon size={18}/>');
 const source=ts.createSourceFile(path,text,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX),result=[];
 function visit(node){
  if(ts.isJsxAttribute(node)&&protectedAttribute.test(node.name.getText(source))){
   const tag=node.parent.parent.tagName?.getText(source);
   if(tag!=='AnimatedAmount')result.push(node.getText(source).replace(/\s+/g,' '));
  }
  ts.forEachChild(node,visit);
 }
 visit(source);return result.sort();
}
for(const path of files){
 const before=contract(git('show',`${base}:${path}`),path),after=contract(fs.readFileSync(path,'utf8'),path);
 assert.deepEqual(after,before,`A control, validation, link or handler changed in ${path}`);controls+=before.length;
}
assert.equal(git('diff',base,'--','src/lib','src/app/api','package.json','package-lock.json').trim(),'','Business logic, endpoints, storage or dependencies changed');
// The only authorized post-redesign SQL change permits collections in personal accounts.
const oldGuard="if d is null or (created and d->>'scope'<>'business') then";
const collectionGuard="if d is null or (created and event_kind<>'cobro' and d->>'scope'<>'business') then";
const allowedSQL=['supabase/management.sql','supabase/management-phone-outside-cash.sql','supabase/management-collection-accounts.sql'];
for(const path of git('diff','--name-only',base,'--','supabase').trim().split('\n').filter(Boolean))assert.ok(allowedSQL.includes(path),`Unreviewed SQL change: ${path}`);
for(const path of allowedSQL.slice(0,2))assert.equal(fs.readFileSync(path,'utf8').replace(collectionGuard,oldGuard).replace(/\r/g,''),git('show',`${base}:${path}`).replace(/\r/g,''),'SQL changed beyond the authorized collection account guard');
const before=git('show',`${base}:src/components/aurum-app.tsx`);
const normalize=text=>text.replace(/\r/g,'').replace(/^import .*presentation-motion.*\n/gm,'').replace(/^const categoryTones:.*\n/gm,'')
 .replace('<span className={`movement-icon category-symbol category-symbol--${entry.type==="traspaso"?"teal":categoryTones[entry.category]||"slate"}`} aria-hidden="true">','<span className="movement-icon" aria-hidden="true">')
 .replace('<span className={`category-symbol category-symbol--${categoryTones[item]||"slate"}`} aria-hidden="true"><Icon size={18}/></span>','<Icon size={18}/>')
 .replace(/<AnimatedAmount value=\{[^}]+\}>([\s\S]*?)<\/AnimatedAmount>/g,'$1').replace(/<MotionRow /g,'<div ').replace(/<\/MotionRow>/g,'</div>');
assert.ok(normalize(fs.readFileSync('src/components/aurum-app.tsx','utf8'))===normalize(before),'Finance component changed beyond its presentation wrappers');
console.log(`PASS: ${files.length} components, ${controls} protected attributes/handlers; finance behavior, APIs, storage and dependencies unchanged; SQL limited to the authorized collection-account guard.`);
const css=fs.readFileSync('src/app/apple-interface.css','utf8');
const components=files.map(path=>fs.readFileSync(path,'utf8')).join('\n');
const managementClasses=new Set([...css.matchAll(/\.(mg-[a-z][\w-]*)/g)].map(match=>match[1]));
const statusSource=fs.readFileSync('src/components/management-order-status.tsx','utf8');
const statusKeys=new Set([...statusSource.matchAll(/key:'([^']+)'/g)].map(match=>match[1]));
for(const name of managementClasses){
 const generatedStatus=name.startsWith('mg-status-row--')&&statusSource.includes("mg-status-row--'+key")&&statusKeys.has(name.slice('mg-status-row--'.length));
 assert.ok(components.includes(name)||generatedStatus,`Apple order styles target a missing class: ${name}`);
}
console.log(`PASS: ${managementClasses.size} order selectors match the current component markup.`);
