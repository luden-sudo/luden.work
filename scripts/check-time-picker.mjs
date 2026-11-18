import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

const source=fs.readFileSync('src/components/time-picker.tsx','utf8');
const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
let states=[],refs=[],cursor=0,refCursor=0,effects=[];
const react={useId:()=>':test:',useState:initial=>{const i=cursor++;if(!(i in states))states[i]=initial;return [states[i],value=>{states[i]=value;}];},useRef:initial=>refs[refCursor++]|| (refs[refCursor-1]={current:initial}),useLayoutEffect:fn=>effects.push(fn)};
const output={};
new Function('require','exports',code+'\nexports.WheelForTest=TimeWheel;')(name=>name==='react'?react:name==='react/jsx-runtime'?{jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props})}:{Clock3:'clock',ChevronDown:'chevron'},output);
const find=(node,predicate)=>{if(!node||typeof node!=='object')return null;if(predicate(node))return node;for(const child of [node.props?.children].flat(Infinity)){const found=find(child,predicate);if(found)return found;}return null;};
const render=(component,props)=>{cursor=0;refCursor=0;effects=[];return component(props);};
const reset=()=>{states=[];refs=[];};
const commits=[];
const props={label:'A qué hora',value:'16:30',required:true,onChange:value=>commits.push(value)};
let tree=render(output.default,props);
let trigger=find(tree,node=>node.type==='button');assert.equal(trigger.props['aria-expanded'],false);
const native=find(tree,node=>node.type==='input');assert.equal(native.props.value,'16:30');assert.equal(native.props.required,true);
trigger.props.onClick();tree=render(output.default,props);
assert.equal(find(tree,node=>node.type==='button').props['aria-expanded'],true);
let wheels=[];const collect=node=>{if(!node||typeof node!=='object')return;if(node.type===output.WheelForTest)wheels.push(node);for(const child of [node.props?.children].flat(Infinity))collect(child);};collect(tree);
assert.equal(wheels.length,2);assert.deepEqual(wheels.map(w=>[w.props.label,w.props.count,w.props.value]),[['Horas',24,16],['Minutos',60,30]]);
wheels[0].props.onChange(23);tree=render(output.default,props);wheels=[];collect(tree);wheels[1].props.onChange(59);tree=render(output.default,props);
find(tree,node=>node.type==='button'&&node.props.children==='Listo').props.onClick();assert.deepEqual(commits,['23:59']);
tree=render(output.default,{...props,value:'23:59'});find(tree,node=>node.type==='button').props.onClick();tree=render(output.default,props);
const escape={key:'Escape',preventDefault(){this.prevented=true;},stopPropagation(){this.stopped=true;}};
find(tree,node=>node.props?.onKeyDown).props.onKeyDown(escape);assert.ok(escape.prevented&&escape.stopped);assert.equal(commits.length,1);
tree=render(output.default,{...props,value:'09:05'});assert.equal(find(tree,node=>node.type==='input').props.value,'09:05','External Ahora update stays synchronized');
for(const action of ['Enter','blur','clear']){
 reset();tree=render(output.default,{...props,required:false});find(tree,node=>node.type==='button').props.onClick();tree=render(output.default,{...props,required:false});
 const count=commits.length;
 if(action==='Enter')tree.props.onKeyDown({key:'Enter',preventDefault(){},stopPropagation(){}});
 if(action==='blur'){
  tree.props.onBlur({currentTarget:{contains:()=>true},relatedTarget:{}});assert.equal(commits.length,count,'Moving between columns must keep the picker open');
  tree.props.onBlur({currentTarget:{contains:()=>false},relatedTarget:{}});
 }
 if(action==='clear')find(tree,node=>node.type==='button'&&node.props.children==='Quitar hora').props.onClick();
 assert.equal(commits.length,count+1);assert.equal(commits.at(-1),action==='clear'?'':'16:30');
 tree=render(output.default,props);assert.equal(find(tree,node=>node.type==='button').props['aria-expanded'],false);
}
reset();tree=render(output.default,{...props,value:''});const invalid={preventDefault(){this.prevented=true;}};find(tree,node=>node.type==='input').props.onInvalid(invalid);assert.ok(invalid.prevented);tree=render(output.default,{...props,value:''});assert.equal(find(tree,node=>node.type==='button').props['aria-expanded'],true);

for(const count of [24,60]){
 reset();let selected=count-1;
 const wheelProps={label:count===24?'Horas':'Minutos',count,value:selected,onChange:value=>{selected=value;}};
 let wheel=render(output.WheelForTest,wheelProps);
 const element={scrollTop:0,firstElementChild:{getBoundingClientRect:()=>({height:44})},scrollTo({top}){this.scrollTop=top;}};
 refs[0].current=element;effects.forEach(fn=>fn());assert.equal(element.scrollTop,(count-1)*44);
 const key=key=>{wheel=render(output.WheelForTest,{...wheelProps,value:selected});wheel.props.onKeyDown({key,timeStamp:1000,preventDefault(){}});};
 key('ArrowDown');assert.equal(selected,count-1);key('Home');assert.equal(selected,0);key('ArrowUp');assert.equal(selected,0);key('End');assert.equal(selected,count-1);key('PageUp');assert.equal(selected,count-6);key('PageDown');assert.equal(selected,count-1);
 key('1');key('2');assert.equal(selected,12,'Numeric keyboard entry');
 element.scrollTop=5*44+5;wheel.props.onScroll({currentTarget:element});assert.equal(selected,5);
 element.scrollTop=-30;wheel.props.onScroll({currentTarget:element});assert.equal(selected,0,'Safari rubber-band is clamped');
 element.scrollTop=10000;wheel.props.onScroll({currentTarget:element});assert.equal(selected,count-1);
 const option=find(wheel,node=>node.props?.role==='option'&&node.props.children==='07');option.props.onClick();assert.equal(selected,7);assert.equal(element.scrollTop,7*44);
 assert.equal(wheel.props.role,'listbox');assert.equal(wheel.props['aria-label'],wheelProps.label);
}
console.log('PASS: HH:mm, all minutes, confirm/cancel, required empty fields, Ahora synchronization, wheel scroll/tap, keyboard entry and limits. Mocked interaction; not Safari/VoiceOver.');
