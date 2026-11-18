import { blocksFor, dayKey, shiftDay, zonedInstant, type DayBlock, type DayChange, type Completion } from './day-plan';

export type NotificationEvent={block:DayBlock;day:string;kind:'before'|'start';key:string;startsAt:number;dueAt:number;ttl:number};
// Server time in Madrid; short catch-up window for the once-per-minute dispatcher.
export function notificationEvents(blocks:DayBlock[],now:Date,done:Completion[],changes:DayChange[]):NotificationEvent[] {
  const timestamp=now.getTime(),today=dayKey(now);
  return [shiftDay(today,-1),today,shiftDay(today,1)].flatMap(day=>blocksFor(blocks,day,changes).flatMap((block,index,rows)=>{
    if(!block.remind||done.some(row=>row.day===day&&row.block_id===block.id))return [];
    const startsAt=Date.parse(zonedInstant(day,block.time));
    const end=block.end_time||rows[index+1]?.time;
    const endsAt=end?Date.parse(zonedInstant(day,end)):Infinity;
    return (['before','start'] as const).flatMap(kind=>{
      const dueAt=startsAt-(kind==='before'?5*60000:0);
      if(timestamp<dueAt||timestamp>=dueAt+2*60000||timestamp>=endsAt||(kind==='before'&&timestamp>=startsAt))return [];
      const expiry=kind==='before'?startsAt:Math.min(endsAt,timestamp+5*60000);
      return [{block,day,kind,key:kind+':'+block.time,startsAt,dueAt,ttl:Math.max(1,Math.ceil((expiry-timestamp)/1000))}];
    });
  }));
}
