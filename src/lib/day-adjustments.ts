import { minute, routineFor, validDay, type DayBlock, type DayChange, type DayOverride } from './day-plan';

export type ChangeMode='manual'|'late'|'no-class';
export function dayRows(blocks:DayBlock[],day:string,changes:DayChange[]=[]):DayOverride[] {
  const base=routineFor(blocks,day);
  const saved=changes.find(change=>change.day===day)?.overrides||[];
  return base.map((block,index)=>saved.find(row=>row.block_id===block.id)||{block_id:block.id,skip:false,time:block.time,end_time:base[index+1]?.time||null,title:block.title});
}
export function schoolBlock(blocks:DayBlock[],day:string) {
  return routineFor(blocks,day).find(block=>block.kind==='estudio'&&/fp|instituto|clase|colegio/i.test(block.title));
}
const clock=(value:number)=>`${String(Math.floor(value/60)).padStart(2,'0')}:${String(value%60).padStart(2,'0')}`;
export function schoolChanges(blocks:DayBlock[],day:string,rows:DayOverride[],mode:ChangeMode,start:string,adaptMorning:boolean) {
  const base=routineFor(blocks,day),school=schoolBlock(blocks,day);
  if(!school)return rows;
  const index=base.findIndex(block=>block.id===school.id);
  if(mode==='no-class')return rows.map(row=>{
    const block=base.find(b=>b.id===row.block_id)!;
    if(!block)return row;
    return row.block_id===school.id||/salir de casa|volver a casa/i.test(block.title)?{...row,skip:true}:row;
  });
  if(mode!=='late'||!/^([01]\d|2[0-3]):[0-5]\d$/.test(start))return rows;
  const delta=minute(start)-minute(school.time);
  return rows.map(row=>{
    const position=base.findIndex(block=>block.id===row.block_id);
    if(position<0)return row;
    if(position===index)return {...row,skip:false,time:start};
    if(adaptMorning&&position<index){
      const from=minute(base[position].time)+delta,to=minute(base[position+1].time)+delta;
      return {...row,skip:false,time:clock(Math.max(0,from)),end_time:clock(Math.max(0,to))};
    }
    return row;
  });
}
export function changedRows(blocks:DayBlock[],day:string,rows:DayOverride[]) {
  const normal=dayRows(blocks,day);
  return rows.filter(row=>{
    const original=normal.find(item=>item.block_id===row.block_id);
    return !original||row.skip||row.time!==original.time||row.end_time!==original.end_time||row.title!==original.title;
  });
}
export function adjustmentError(blocks:DayBlock[],day:string,overrides:DayOverride[]) {
  if(!validDay(day)||!Array.isArray(overrides)||overrides.length>100)return 'Revisa la fecha y las actividades.';
  const base=routineFor(blocks,day),seen=new Set<string>();
  const validTime=(value:unknown)=>typeof value==='string'&&/^([01]\d|2[0-3]):[0-5]\d$/.test(value);
  for(const row of overrides){
    if(!row||!base.some(block=>block.id===row.block_id)||seen.has(row.block_id)||typeof row.skip!=='boolean'||!validTime(row.time)||(row.end_time!==null&&!validTime(row.end_time))||typeof row.title!=='string'||!row.title.trim()||row.title.length>100)return 'Revisa los nombres y las horas de las actividades.';
    seen.add(row.block_id);
    if(!row.skip&&row.end_time&&row.time>=row.end_time)return `«${row.title}» debe terminar después de empezar.`;
    if(!row.skip&&row.end_time===null&&row.block_id!==base.at(-1)?.id)return `Indica hasta qué hora dura «${row.title}».`;
  }
  const adjusted=routineFor(blocks,day,[{day,overrides,updated_at:''}]);
  for(let i=0;i<adjusted.length-1;i++){
    const current=adjusted[i],next=adjusted[i+1];
    const end=current.end_time||next.time;
    if(!end||end>next.time)return `«${current.title}» coincide con «${next.title}». Ajusta su hora de fin o quita una de ellas.`;
  }
  return '';
}
