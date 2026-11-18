import assert from 'node:assert/strict';
import fs from 'node:fs';
import postcss from 'postcss';

// Resolve order grid/card sizing against both legacy and current styles.
const sheets=['globals.css','day.css','app-chrome.css','responsive.css','form-sheets.css','apple-interface.css','gestiones/management.css'].map(name=>postcss.parse(fs.readFileSync('src/app/'+name,'utf8')));
function value(target,property,viewport,content){
 const path=[[],['mg-app'],['mg-workspace'],['mg-compact-list'],...(target==='mg-compact-list'?[]:[['mg-card']]),...(target==='mg-card-body'?[['mg-card-body']]:[])];
 let best={weight:-1,order:-1,value:undefined};let order=0;
 const fits=(text,width)=>[...text.matchAll(/(min|max)-width\s*:\s*(\d+)px/g)].every(([,kind,size])=>kind==='min'?width>=Number(size):width<=Number(size));
 for(const sheet of sheets)sheet.walkRules(rule=>{
  order++;
  for(let p=rule.parent;p;p=p.parent){if(p.type==='atrule'&&p.name==='media'&&!fits(p.params,viewport))return;if(p.type==='atrule'&&p.name==='container'&&!fits(p.params,content))return;}
  for(const selector of rule.selectors){
   if(!selector.trim().endsWith('.'+target)||selector.includes(':has')||selector.includes(':is'))continue;
   let cursor=path.length-1,matched=true;
   for(const token of selector.trim().split(/\s+|>/).filter(Boolean).reverse()){
    const classes=[...token.matchAll(/\.([\w-]+)/g)].map(m=>m[1]);
    if(token.includes(':')&&token!==':root'){matched=false;break;}
    while(cursor>=0&&!(token===':root'?cursor===0:classes.length&&classes.every(c=>path[cursor].includes(c))))cursor--;
    if(cursor<0){matched=false;break;}cursor--;
   }
   if(!matched)continue;
   const weight=(selector.match(/\.[\w-]+|:root/g)||[]).length;
   rule.walkDecls(property,decl=>{if(weight>best.weight||weight===best.weight&&order>=best.order)best={weight,order,value:decl.value};});
  }
 });return best.value;
}
for(const [viewport,content,columns] of [[390,350,1],[320,288,1],[428,388,1],[1024,720,2],[1440,1100,3],[1920,1570,3]]){
 const grid=value('mg-compact-list','grid-template-columns',viewport,content);
 assert.equal(Number(grid.match(/repeat\((\d+)/)?.[1]||1),columns,`Wrong column count: ${viewport}/${content}`);
 assert.equal(value('mg-card','display',viewport,content),'flex');
 assert.equal(value('mg-card','align-items',viewport,content),'stretch','Legacy start alignment leaves a blank half-card');
 assert.equal(value('mg-card-body','width',viewport,content),'100%');
 assert.equal(value('mg-card-body','min-width',viewport,content),'0');
 assert.ok((content-(columns-1)*16)/columns>0);
}
console.log('PASS: full-width order bodies, no legacy shrink alignment, one column on iPhone 12/13-sized viewports and two/three columns on larger content regions. CSS model; not Safari rendering.');
