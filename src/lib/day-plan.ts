export const PLAN_ZONE = 'Europe/Madrid';
export const kinds = ['rutina','comida','trabajo','estudio','descanso','entreno','noche','compra','casa'] as const;
export type BlockKind = typeof kinds[number];
export type DayBlock = { id: string; title: string; description: string; time: string; weekdays: number[]; kind: BlockKind; remind: boolean; plan_date?:string|null; end_time?:string|null; resumed?:boolean; adjusted?:boolean; day?:string };
export type DayOverride = { block_id:string; skip:boolean; time:string; end_time:string|null; title:string };
export type DayChange = { day:string; overrides:DayOverride[]; updated_at:string };
export type Completion = { block_id: string; day: string };
export function dayKey(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: PLAN_ZONE, year:'numeric', month:'2-digit', day:'2-digit' }).format(date);
}
export function localMinute(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', {timeZone:PLAN_ZONE,hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(date);
  return Number(parts.find(p=>p.type==='hour')?.value)*60+Number(parts.find(p=>p.type==='minute')?.value);
}
export const minute = (time: string) => Number(time.slice(0,2))*60+Number(time.slice(3,5));
export function shiftDay(day:string,offset:number) {
  const date=new Date(day+'T12:00:00Z'); date.setUTCDate(date.getUTCDate()+offset); return date.toISOString().slice(0,10);
}
export function routineFor(blocks:DayBlock[],day:string,changes:DayChange[]=[]):DayBlock[] {
  const weekday=new Date(day+'T12:00:00Z').getUTCDay();
  const base=blocks.filter(b=>!b.plan_date&&b.weekdays.includes(weekday)).sort((a,b)=>a.time.localeCompare(b.time)||a.id.localeCompare(b.id));
  const overrides=changes.find(change=>change.day===day)?.overrides||[];
  if(!overrides.length)return base;
  return base.flatMap((block,index)=>{
    const override=overrides.find(item=>item.block_id===block.id);
    if(override?.skip)return [];
    return [{...block,end_time:base[index+1]?.time||null,...(override?{time:override.time,end_time:override.end_time,title:override.title,adjusted:true}:{})}];
  }).sort((a,b)=>a.time.localeCompare(b.time)||a.id.localeCompare(b.id));
}
const clockTime=(minutes:number)=>`${String(Math.floor(minutes/60)).padStart(2,'0')}:${String(minutes%60).padStart(2,'0')}`;
export function blocksFor(blocks:DayBlock[],day:string,changes:DayChange[]=[]):DayBlock[] {
  const base=routineFor(blocks,day,changes);
  const plans=blocks.filter(b=>b.plan_date===day&&b.end_time).sort((a,b)=>a.time.localeCompare(b.time));
  const points=blocks.filter(b=>b.plan_date===day&&!b.end_time);
  if(!plans.length)return [...base,...points].sort((a,b)=>a.time.localeCompare(b.time)||a.id.localeCompare(b.id));
  const adjusted=base.flatMap((block,index)=>{
    const end=block.end_time?minute(block.end_time):base[index+1]?minute(base[index+1].time):1440;
    let intervals=[[minute(block.time),end]];
    for(const plan of plans){
      const from=minute(plan.time),to=minute(plan.end_time!);
      intervals=intervals.flatMap(([start,finish])=>{
        if(to<=start||from>=finish)return [[start,finish]];
        return [...(start<from?[[start,from]]:[]),...(to<finish?[[to,finish]]:[])];
      });
    }
    return intervals.filter(([start,finish])=>start<finish).map(([start,finish])=>({...block,time:clockTime(start),end_time:finish<1440?clockTime(finish):null,resumed:start>minute(block.time)}));
  });
  return [...adjusted,...plans,...points].sort((a,b)=>a.time.localeCompare(b.time)||a.id.localeCompare(b.id));
}
export function planImpact(blocks:DayBlock[],plan:DayBlock,changes:DayChange[]=[]) {
  if(!plan.plan_date||!plan.end_time||plan.time>=plan.end_time)return [];
  const base=blocksFor(blocks.filter(b=>b.id!==plan.id),plan.plan_date,changes);
  return base.filter((block,index)=>!block.plan_date&&minute(block.time)<minute(plan.end_time!)&&minute(block.end_time||base[index+1]?.time||'24:00')>minute(plan.time));
}
export function validDay(value:unknown):value is string {
  if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
  const parsed=new Date(value+'T12:00:00Z');
  return Number.isFinite(parsed.getTime())&&parsed.toISOString().slice(0,10)===value;
}
export function zonedInstant(day:string,time:string) {
  const desired=new Date(day+'T'+time+':00Z').getTime(); let guess=desired;
  for(let i=0;i<3;i++) {
    const displayedDay=dayKey(new Date(guess));
    const displayed=new Date(displayedDay+'T00:00:00Z').getTime()+localMinute(new Date(guess))*60000;
    guess+=desired-displayed;
  }
  return new Date(guess).toISOString();
}
export function planState(blocks:DayBlock[],now=new Date(),changes:DayChange[]=[],done:Completion[]=[]) {
  const day=dayKey(now);
  // Empty days may still show the next task; yesterday's tasks never carry over.
  const timeline=[-1,0,1,2,3,4,5,6,7].flatMap(offset=>{
    const key=shiftDay(day,offset);
    return blocksFor(blocks,key,changes).map(block=>({...block,day:key,start:zonedInstant(key,block.time),end:block.end_time?zonedInstant(key,block.end_time):null}));
  }).sort((a,b)=>a.start.localeCompare(b.start));
  const previous=timeline.findLast(b=>Date.parse(b.start)<=now.getTime());
  let current=previous&&(!previous.end||Date.parse(previous.end)>now.getTime())&&(previous.day===day||(!previous.plan_date&&routineFor(blocks,day,changes).length>0))?previous:null;
  // An early one-off plan pauses the activity carried from the previous night.
  // Once it ends, resume that activity until today's first recurring block.
  const firstRoutine=routineFor(blocks,day,changes)[0];
  if(!current&&previous?.plan_date===day&&previous.end&&firstRoutine&&now.getTime()<Date.parse(zonedInstant(day,firstRoutine.time))) {
    const carried=timeline.findLast(b=>b.day===shiftDay(day,-1)&&!b.plan_date&&!b.end);
    if(carried)current={...carried,time:previous.end_time!,start:previous.end,end:zonedInstant(day,firstRoutine.time),end_time:firstRoutine.time,resumed:true};
  }
  const next=timeline.find(b=>Date.parse(b.start)>now.getTime()&&(!b.plan_date||!done.some(row=>row.day===b.day&&row.block_id===b.id)))||null;
  if(current?.plan_date&&done.some(row=>row.block_id===current!.id&&row.day===current!.day))current=null;
  const endsAt=current?.plan_date&&!current.end?null:current?.end||next?.start||null;
  return {day,current,next,endsAt,remaining:endsAt?Math.max(0,Math.ceil((Date.parse(endsAt)-now.getTime())/60000)):0};
}
