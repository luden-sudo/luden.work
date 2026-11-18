import assert from 'node:assert/strict';
import fs from 'node:fs';
import postcss from 'postcss';

// Resolve the simple class selectors used by movement controls across the real CSS cascade.
const files=['globals.css','day.css','app-chrome.css','responsive.css','form-sheets.css','apple-interface.css'];
const sheets=files.map(name=>postcss.parse(fs.readFileSync('src/app/'+name,'utf8')));
function property(target,property,viewport,container,overview=true){
 const path=[[],['app'],['workspace'],['page'],...(overview?[['overview-grid'],['history-panel']]:[]),['movement-month'],['movement-row'],...(target==='movement-row'?[]:[[target]])];
 let winner={important:false,weight:-1,order:-1,value:undefined},order=0;
 const widthMatches=(condition,width)=>[...condition.matchAll(/(min|max)-width\s*:\s*(\d+)px/g)].every(([,kind,size])=>kind==='min'?width>=Number(size):width<=Number(size));
 for(const sheet of sheets)sheet.walkRules(rule=>{
  order++;
  for(let parent=rule.parent;parent;parent=parent.parent){
   if(parent.type==='atrule'&&parent.name==='media'&&!widthMatches(parent.params,viewport))return;
   if(parent.type==='atrule'&&parent.name==='container'&&!widthMatches(parent.params,container))return;
  }
  for(const selector of rule.selectors){
   if(!selector.trim().endsWith('.'+target))continue;
   const tokens=selector.trim().split(/\s+|>/).filter(Boolean);
   let cursor=path.length-1,matched=true;
   for(let i=tokens.length-1;i>=0;i--){
    const token=tokens[i],classes=[...token.matchAll(/\.([\w-]+)/g)].map(m=>m[1]);
    if(token.includes(':')&&token!==':root'){matched=false;break;}
    while(cursor>=0&&!(token===':root'?cursor===0:classes.length&&classes.every(c=>path[cursor].includes(c))))cursor--;
    if(cursor<0){matched=false;break;}cursor--;
   }
   if(!matched)continue;
   const weight=(selector.match(/\.[\w-]+|:root/g)||[]).length;
   rule.walkDecls(property,decl=>{
    const important=Boolean(decl.important);
    if(Number(important)>Number(winner.important)||important===winner.important&&(weight>winner.weight||weight===winner.weight&&order>=winner.order))winner={important,weight,order,value:decl.value};
   });
  }
 });
 return winner.value;
}
for(const [viewport,container,overview] of [[1440,500,true],[1024,360,true],[390,348,true],[320,278,true],[1440,900,false]]){
 const direct=property('row-actions','display',viewport,container,overview);
 const menu=property('mobile-row-actions','display',viewport,container,overview);
 assert.notEqual(direct!=='none'&&menu!=='none',true,`Duplicate controls at viewport ${viewport}, row ${container}`);
 assert.ok(direct!=='none'||menu!=='none','No accessible movement actions');
 assert.equal(direct,container>=700?'flex':'none',`Wrong action layout for row ${container}`);
 assert.equal(menu,container>=700?'none':'inline-grid');
}
console.log('PASS: no duplicate/missing actions at 320/390/1024/1440 px, narrow desktop overview and wide movement list. CSS cascade model, not browser rendering.');
