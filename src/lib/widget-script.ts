export function widgetScript(origin:string,token:string) {
  return '// luden · Mi día. Token de solo lectura; revocable desde la web.\n' +
    'const APP = '+JSON.stringify(origin)+';\nconst TOKEN = '+JSON.stringify(token)+';\n' + String.raw`
const fm=FileManager.local();
const cache=fm.joinPath(fm.documentsDirectory(),"aurum-day-"+TOKEN.slice(0,12)+".json");
let data=null,unavailable=false,offline=false;
try {
  const req=new Request(APP+"/api/widget?t="+Date.now());
  req.headers={Authorization:"Bearer "+TOKEN,"Cache-Control":"no-cache, no-store"};
  req.timeoutInterval=15;
  data=await req.loadJSON();
  if(req.response.statusCode!==200){
    if(req.response.statusCode===401){unavailable=true;if(fm.fileExists(cache))fm.remove(cache);}
    throw new Error("No disponible");
  }
  fm.writeString(cache,JSON.stringify(data));
}catch(e){
  data=null;offline=true;
  try{if(!unavailable&&fm.fileExists(cache))data=JSON.parse(fm.readString(cache));}catch(_){}
}
const family=config.widgetFamily||"medium",small=family==="small",large=family==="large"||family==="extraLarge";
const w=new ListWidget();
w.url=URLScheme.forRunningScript();
w.backgroundColor=new Color("000000");
w.setPadding(6,6,6,6);
const ink=new Color("FFFFFF"),muted=new Color("BDBDC7"),green=new Color("30D158");
const colors={rutina:["17283A","A5D5FF"],comida:["382713","FFD18B"],trabajo:["142B45","A5D5FF"],estudio:["221842","BFA6FF"],descanso:["142E25","91E3B7"],entreno:["392213","FFC396"],noche:["24213D","C9C0FF"],compra:["223015","C6E894"],casa:["1A2940","B3D0FF"]};
function label(parent,value,size,color,bold,lines){
  const t=parent.addText(String(value));
  t.font=bold?Font.boldSystemFont(size):Font.systemFont(size);
  t.textColor=color;t.lineLimit=lines||1;t.minimumScaleFactor=.75;
  return t;
}
function emoji(block){
  if(!block)return "☀️";
  if(block.plan_date)return {rutina:"☀️",comida:"🍽️",trabajo:"💼",estudio:"📚",descanso:"🌿",entreno:"🏋️",noche:"🌙",compra:"🛒",casa:"🏠"}[block.kind]||"📋";
  const title=block.title.toLowerCase();
  const matches=[[/prepararse|cambiarse/,"👕"],[/salir de casa/,"🎒"],[/volver a casa/,"🏠"],[/instituto|fp/,"🏫"],[/merienda/,"🥪"],[/pendientes/,"📋"],[/recoger/,"🧺"],[/dientes/,"🪥"],[/cena/,"🍳"],[/desayun/,"🥣"],[/ducha/,"🚿"],[/series|tele/,"📺"],[/desconect/,"📵"],[/dormir|cama/,"😴"],[/levant|despert/,"☀️"],[/comer|comida|almuer/,"🍽️"]];
  const match=matches.find(item=>item[0].test(title));
  return match?match[1]:({rutina:"☀️",comida:"🍽️",trabajo:"💻",estudio:"📚",descanso:"🌿",entreno:"🏋️",noche:"🌙",compra:"🛒",casa:"🏠"}[block.kind]||"📋");
}
const now=Date.now();
const updated=data?Date.parse(data.updatedAt):NaN;
const recent=Number.isFinite(updated)&&now-updated>=-60000&&now-updated<=15*60000;
const fresh=data&&recent&&data.day===new Date(now).toLocaleDateString("en-CA",{timeZone:"Europe/Madrid"})&&(!data.endsAt||Date.parse(data.endsAt)>now)&&(!data.next||Date.parse(data.next.start)>now);
const current=fresh?data.current:null,next=fresh?data.next:null;
const end=fresh&&data.endsAt?Date.parse(data.endsAt):null;
const start=current?Date.parse(current.start):now;
const progress=current&&end>start?Math.max(0,Math.min(1,(now-start)/(end-start))):0;
const theme=colors[current?current.kind:"estudio"]||colors.estudio;
const tint=new Color(theme[1]);
function ring(size){
  const c=new DrawContext();c.size=new Size(size,size);c.respectScreenScale=true;c.opaque=false;
  const line=size*.065,radius=(size-line)/2,center=size/2;
  for(let i=0;i<240;i++){
    const angle=-Math.PI/2+i/240*Math.PI*2;
    c.setFillColor(i/240<progress?green:new Color(theme[1],.24));
    c.fillEllipse(new Rect(center+Math.cos(angle)*radius-line/2,center+Math.sin(angle)*radius-line/2,line,line));
  }
  c.setFont(Font.systemFont(size*.43));c.setTextAlignedCenter();
  c.drawTextInRect(emoji(current),new Rect(size*.16,size*.22,size*.68,size*.6));
  return c.getImage();
}
function countdown(parent,size,color,width){
  const t=parent.addDate(new Date(end));
  const hours=Math.floor(Math.max(0,end-now)/3600000);
  const digits=hours>0?String(hours).length+6:5;
  const fitted=width?Math.min(size,Math.floor(width/(digits*.7))):size;
  t.applyTimerStyle();t.font=Font.boldSystemFont(fitted);t.textColor=color;
  t.lineLimit=1;t.minimumScaleFactor=.5;t.leftAlignText();
}
if(family==="accessoryRectangular"){
  w.addAccessoryWidgetBackground=true;
  w.setPadding(3,5,3,5);
  const lock=w.addStack();lock.layoutHorizontally();lock.centerAlignContent();
  const lockImage=lock.addImage(ring(34));lockImage.imageSize=new Size(34,34);
  lock.addSpacer(6);
  const lockInfo=lock.addStack();lockInfo.layoutVertically();
  const lockTitle=lockInfo.addStack();lockTitle.centerAlignContent();
  label(lockTitle,current?"AHORA":"MI DÍA",10,muted,true);
  lockTitle.addSpacer(5);
  label(lockTitle,current?current.title:unavailable?"Vuelve a vincular":"Sin actividad",13,ink,true,1);
  lockInfo.addSpacer(1);
  if(end)countdown(lockInfo,22,ink);else label(lockInfo,current&&current.plan_date?"Sin hora de fin":current?"Descansa":"Día libre",18,ink,true);
  lockInfo.addSpacer(2);
  const lockNext=lockInfo.addStack();lockNext.centerAlignContent();
  label(lockNext,"→",11,muted,true);
  lockNext.addSpacer(4);
  label(lockNext,next?next.time+" · "+next.title:"Sin más planes",11,muted,false,1);
}else if(family.startsWith("accessory")){
  w.addAccessoryWidgetBackground=true;
  label(w,current?current.title:"Mi día",13,ink,true,1);
  if(end)countdown(w,17,ink);
}else if(!small&&!large){
  w.setPadding(4,4,4,4);
  const screenWidth=Device.screenSize().width;
  const mediumWidth=screenWidth<=320?296:screenWidth<=375?329:screenWidth<=390?338:screenWidth<=393?342:screenWidth<=414?360:screenWidth<=430?364:379;
  const contentWidth=mediumWidth-8;
  const primaryWidth=Math.round((contentWidth-8)*.6);
  const secondaryWidth=contentWidth-8-primaryWidth;
  const layout=w.addStack();layout.layoutHorizontally();layout.size=new Size(contentWidth,0);
  const card=layout.addStack();card.layoutVertically();card.backgroundColor=new Color(theme[0]);card.cornerRadius=20;
  card.size=new Size(primaryWidth,0);card.setPadding(10,11,10,11);
  const top=card.addStack();top.centerAlignContent();
  const image=top.addImage(ring(26));image.imageSize=new Size(26,26);
  top.addSpacer(5);
  label(top,current?"AHORA":"MI DÍA",11,tint,true);
  top.addSpacer(6);
  if(current)label(top,current.time+(current.end_time?" – "+current.end_time:!current.plan_date&&next?" – "+next.time:""),12,tint,true);
  top.addSpacer();
  card.addSpacer();
  const row=card.addStack();row.centerAlignContent();
  const time=row.addStack();time.layoutVertically();time.size=new Size(primaryWidth-22,0);
  label(time,end?"QUEDAN":current&&current.plan_date?"EN CURSO":current?"POR HOY":"TU DÍA",12,tint,true);
  time.addSpacer(1);
  if(end)countdown(time,36,ink,primaryWidth-22);else label(time,current&&current.plan_date?"Sin fin":current?"Descansa":"Libre",24,ink,true);
  row.addSpacer();
  card.addSpacer();
  label(card,current?current.title:unavailable?"Vuelve a vincular":fresh?"Tu día está libre":"Abre Mi día",20,ink,true,2);
  layout.addSpacer(8);
  const after=layout.addStack();after.layoutVertically();after.backgroundColor=new Color("1F1F1F");after.cornerRadius=18;
  after.size=new Size(secondaryWidth,0);after.setPadding(10,11,10,11);
  label(after,"DESPUÉS",12,muted,true);
  after.addSpacer();
  label(after,next?emoji(next):"✓",40,ink,false);
  after.addSpacer();
  if(next){
    label(after,next.time+(next.day!==data.day?" · "+new Date(next.day+"T12:00:00Z").toLocaleDateString("es-ES",{timeZone:"Europe/Madrid",weekday:"short",day:"numeric"}):""),17,muted,false,2);
    after.addSpacer(2);
    label(after,next.title,17,ink,true,3);
  }else{
    label(after,"Sin más planes",16,ink,true,3);
  }
}else{
  const card=w.addStack();card.layoutVertically();card.backgroundColor=new Color(theme[0]);
  card.cornerRadius=large?26:20;card.setPadding(large?18:10,small?10:12,large?18:10,small?10:12);
  const top=card.addStack();top.centerAlignContent();
  label(top,current?"AHORA":"MI DÍA",small?9:10,tint,true);
  top.addSpacer(8);
  if(current)label(top,current.time+(current.end_time?" – "+current.end_time:!current.plan_date&&next?" – "+next.time:""),small?9:10,tint,true);
  top.addSpacer();
  card.addSpacer(large?12:4);
  const row=card.addStack();row.centerAlignContent();
  const size=large?86:small?42:50;
  const image=row.addImage(ring(size));image.imageSize=new Size(size,size);
  row.addSpacer(small?8:12);
  const time=row.addStack();time.layoutVertically();
  label(time,end?"QUEDAN":current&&current.plan_date?"EN CURSO":current?"POR HOY":"TU DÍA",small?8:large?12:9,tint,true);
  time.addSpacer(2);
  if(end)countdown(time,large?46:small?23:34,ink,small?76:large?180:140);
  else label(time,current&&current.plan_date?"Sin fin":current?"Descansa":"Libre",small?18:26,ink,true);
  time.addSpacer();
  card.addSpacer(large?12:3);
  label(card,current?current.title:unavailable?"Vuelve a vincular":fresh?"Tu día está libre":"Abre Mi día para actualizar",small?16:large?27:18,ink,true,small||large?2:1);
  if(large&&current&&current.description){card.addSpacer(8);label(card,current.description,14,muted,false,3);}
  card.addSpacer();
  if(!small&&next){
    w.addSpacer(large?10:6);
    const pill=w.addStack();pill.centerAlignContent();pill.backgroundColor=new Color("1F1F1F");pill.cornerRadius=large?20:14;
    pill.setPadding(large?12:6,12,large?12:6,12);
    label(pill,emoji(next),large?30:22,ink,false);
    pill.addSpacer(8);
    const copy=pill.addStack();copy.layoutVertically();
    label(copy,"Después, a las "+next.time+(next.day!==data.day?" · "+new Date(next.day+"T12:00:00Z").toLocaleDateString("es-ES",{timeZone:"Europe/Madrid",weekday:"short",day:"numeric"}):""),large?11:9,muted,false);
    label(copy,next.title,large?16:12,ink,true);
    pill.addSpacer();
  }
  w.addSpacer();
}
// Earliest requested refresh; iOS controls actual background execution.
const boundary=Math.min(end||Infinity,next?Date.parse(next.start):Infinity);
w.refreshAfterDate=new Date(Math.min(now+60000,Math.max(now+1000,Number.isFinite(boundary)?boundary+1000:now+60000)));
Script.setWidget(w);
if(!config.runsInWidget&&small)await w.presentSmall();
else if(!config.runsInWidget&&large)await w.presentLarge();
else if(!config.runsInWidget)await w.presentMedium();
Script.complete();
`;
}
