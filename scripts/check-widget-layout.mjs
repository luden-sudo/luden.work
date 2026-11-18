import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const code=ts.transpileModule(fs.readFileSync('src/lib/widget-script.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ESNext}}).outputText;
const {widgetScript}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
const now=Date.now(),iso=value=>new Date(value).toISOString();
const data={updatedAt:iso(now),day:new Date(now).toLocaleDateString('en-CA',{timeZone:'Europe/Madrid'}),endsAt:iso(now+45*60000),current:{title:'Instituto · FP',kind:'estudio',time:'08:15',end_time:'14:45',start:iso(now-60*60000)},next:{title:'Volver a casa',kind:'casa',time:'14:45',start:iso(now+45*60000),day:new Date(now).toLocaleDateString('en-CA',{timeZone:'Europe/Madrid'})}};
class Node{constructor(kind='stack'){this.kind=kind;this.children=[];}addStack(){const child=new Node();this.children.push(child);return child;}addText(value){const child=new Node('text');child.value=value;this.children.push(child);return child;}addDate(value){const child=this.addText(value);child.applyTimerStyle=()=>{};child.leftAlignText=()=>{};return child;}addImage(){const child=new Node('image');this.children.push(child);return child;}addSpacer(value){this.children.push({kind:'spacer',value});}layoutVertically(){this.direction='vertical';}layoutHorizontally(){this.direction='horizontal';}centerAlignContent(){}setPadding(...value){this.padding=value;}async presentMedium(){}}
let rendered;
class Widget extends Node{setPadding(...value){this.padding=value;}}
class Request{constructor() {this.response={statusCode:200};}async loadJSON(){return data;}}
class DrawContext{setFillColor(){}fillEllipse(){}setFont(){}setTextAlignedCenter(){}drawTextInRect(){}getImage(){return {};}}
class Size{constructor(width,height){this.width=width;this.height=height;}}
class Rect{constructor(){}}
class Color{constructor(){}}
const Font={boldSystemFont:size=>({size,weight:'bold'}),systemFont:size=>({size,weight:'regular'})};
const fm={documentsDirectory:()=>'',joinPath:()=>'',fileExists:()=>false,writeString:()=>{},remove:()=>{},readString:()=>''};
const globals={URLScheme:{forRunningScript:()=> 'scriptable:///run/Aurum'},FileManager:{local:()=>fm},Request,ListWidget:Widget,Color,Font,Size,Rect,DrawContext,Device:{screenSize:()=>({width:390})},config:{widgetFamily:'medium',runsInWidget:true},Script:{setWidget(value){rendered=value;},complete(){}}};
const names=Object.keys(globals),values=Object.values(globals),script=widgetScript('https://aurum.example','a'.repeat(64));
await new Function(...names,'return (async()=>{'+script+'})()')(...values);
assert.match(script,/primaryWidth=Math\.round\(\(contentWidth-8\)\*\.6\)/);
assert.match(script,/secondaryWidth=contentWidth-8-primaryWidth/);
assert.match(script,/label\(after,"DESPUÉS"/);
assert.match(script,/card\.size=new Size\(primaryWidth,0\)/);
const layout=rendered.children[0];
assert.equal(layout.direction,'horizontal');
assert.equal(layout.size.width,330);
assert.equal(layout.children[0].size.width,193);
assert.deepEqual(layout.children[1],{kind:'spacer',value:8});
assert.equal(layout.children[2].direction,'vertical');
assert.equal(layout.children[2].size.width,129);
assert.deepEqual(layout.children[0].children[1],{kind:'spacer',value:undefined});
assert.deepEqual(layout.children[2].children[1],{kind:'spacer',value:undefined});
const texts=node=>node?.kind==='text'?[node.value]:(node?.children||[]).flatMap(texts);
assert.ok(texts(layout.children[0]).includes('AHORA'));
assert.ok(texts(layout.children[0]).includes('Instituto · FP'));
assert.ok(texts(layout.children[2]).includes('DESPUÉS'));
assert.ok(texts(layout.children[2]).includes('Volver a casa'));
const find=node=>node?.kind==='image'?node:(node?.children||[]).map(find).find(Boolean);
const currentEmoji=find(layout.children[0]);
const nextEmoji=layout.children[2].children.find(child=>child.kind==='text'&&child.value==='🏠');
const nextTime=layout.children[2].children.find(child=>child.kind==='text'&&child.value==='14:45');
const countdown=texts=>texts?.kind==='text'&&texts.value instanceof Date?texts:(texts?.children||[]).map(countdown).find(Boolean);
assert.equal(currentEmoji.imageSize.width,26);
assert.equal(currentEmoji.imageSize.height,26);
assert.equal(countdown(layout.children[0]).font.size,36);
assert.equal(nextEmoji.font.size,40);
assert.equal(countdown(layout.children[0]).minimumScaleFactor,.5);
assert.equal(nextTime.font.size,17);
globals.config.widgetFamily='accessoryRectangular';
await new Function(...names,'return (async()=>{'+script+'})()')(...values);
const lock=rendered.children[0];
assert.equal(lock.direction,'horizontal');
assert.equal(find(lock).imageSize.width,34);
assert.ok(texts(lock).includes('AHORA'));
assert.ok(texts(lock).includes('Instituto · FP'));
assert.ok(texts(lock).includes('→'));
assert.ok(texts(lock).includes('14:45 · Volver a casa'));
assert.equal(countdown(lock).font.size,22);
console.log('PASS: Scriptable medium widget fills its width and uses large, responsive type.');
// Reserve full card width for seconds, including multi-hour countdowns.
globals.config.widgetFamily='medium';
for(const width of [375,390,414,430])for(const hours of [0,2,25]){
 globals.Device.screenSize=()=>({width});
 data.endsAt=iso(now+(hours*60+45)*60000);
 await new Function(...names,'return (async()=>{'+script+'})()')(...values);
 const primary=rendered.children[0].children[0];
 const timer=countdown(primary),digits=hours?String(hours).length+6:5;
 assert.ok(timer.font.size*digits*.7<=primary.size.width-22);
 assert.equal(timer.lineLimit,1);
}
console.log('PASS: timer width reserved at 375–430pt, with minutes, hours and seconds. Native iOS rendering still requires device confirmation.');
