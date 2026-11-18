import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const source=ts.transpileModule(fs.readFileSync('src/lib/mobile-viewport.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext}}).outputText;
const {keyboardIsOpen,fieldScrollDelta}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
assert.equal(keyboardIsOpen(844,844,844,true),false);
assert.equal(keyboardIsOpen(664,664,664,true),false);
assert.equal(keyboardIsOpen(844,480,844,true),true);
assert.equal(keyboardIsOpen(480,480,844,true),true);
assert.equal(keyboardIsOpen(480,480,844,false),false);
assert.equal(fieldScrollDelta({top:140,bottom:188},100,420),0);
assert.equal(fieldScrollDelta({top:390,bottom:438},100,420),18);
assert.equal(fieldScrollDelta({top:80,bottom:128},100,420),-20);
assert.equal(fieldScrollDelta({top:120,bottom:620},100,420),20);
assert.equal(fieldScrollDelta({top:100,bottom:600},100,420),0);
console.log('PASS: iPhone 12 keyboard resize variants, browser chrome, hidden keyboard and focused-field scrolling. Pure geometry checks, not a Safari device test.');

// Exercise the actual root effect with mocked DOM/viewport events; no production data.
let cleanup,observer,modalOpen=false;const frames=new Map();let sequence=0;
class Element{closest(){return dialog;}getBoundingClientRect(){return {top:500,bottom:548};}}
class Input extends Element{type='text';readOnly=false;}
class Textarea extends Element{}
class Select extends Element{}
const properties=new Map(),root={style:{setProperty:(k,v)=>properties.set(k,v),removeProperty:k=>properties.delete(k)},dataset:{}};
const style={position:'',top:'',width:'',overflow:''},scrolls=[];
const dialog={querySelector:selector=>({getBoundingClientRect:()=>selector.includes('header')?{bottom:80}:{top:400}}),scrollBy:options=>scrolls.push(options.top)};
const listeners={},viewport={height:844,width:390,offsetTop:0,scale:1,addEventListener:(k,v)=>listeners[k]=v,removeEventListener:k=>delete listeners[k]};
const windowMock={visualViewport:viewport,innerHeight:844,scrollY:240,scrollTo:options=>scrolls.push(options.top)};
const documentMock={documentElement:root,body:{style},activeElement:null,querySelector:()=>modalOpen?dialog:null,addEventListener:(k,v)=>listeners[k]=v,removeEventListener:k=>delete listeners[k]};
const observerMock=class{constructor(callback){observer=callback;}observe(){}disconnect(){}};
const output={};
const component=ts.transpileModule(fs.readFileSync('src/components/viewport-sizing.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
new Function('require','exports','window','document','HTMLElement','HTMLInputElement','HTMLTextAreaElement','HTMLSelectElement','MutationObserver','requestAnimationFrame','cancelAnimationFrame',component)(name=>name==='react'?{useEffect:effect=>cleanup=effect()}:{fieldScrollDelta,keyboardIsOpen},output,windowMock,documentMock,Element,Input,Textarea,Select,observerMock,callback=>{frames.set(++sequence,callback);return sequence;},id=>frames.delete(id));
output.default();
const flush=()=>{const pending=[...frames.values()];frames.clear();pending.forEach(callback=>callback());};flush();
modalOpen=true;observer();assert.equal(style.position,'fixed');assert.equal(style.top,'-240px');
documentMock.activeElement=new Input();viewport.height=480;windowMock.innerHeight=480;listeners.resize();flush();
assert.equal(root.dataset.keyboard,'open');assert.equal(scrolls.at(-1),160);
assert.equal(properties.get('--app-viewport-height'),'480px');
modalOpen=false;observer();assert.equal(style.position,'');assert.equal(scrolls.at(-1),240);
cleanup();assert.equal(root.dataset.keyboard,undefined);assert.equal(properties.size,0);assert.equal(Object.keys(listeners).length,0);
console.log('PASS: modal background lock/restoration, actual viewport effect on resized layout, field reveal and listener cleanup with mocked DOM.');
