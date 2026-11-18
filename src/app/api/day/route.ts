import { sessionAdmin, authorized, fail, noStore } from '@/lib/day-server';
import { dayKey, shiftDay, kinds, validDay, type DayBlock } from '@/lib/day-plan';
import { adjustmentError } from '@/lib/day-adjustments';

export async function GET(request:Request) {
  if(!await authorized(request)) return fail('Introduce tu PIN.',401);
  const db=await sessionAdmin();
  const [blocks,done,changes]=await Promise.all([db.from('luden_day_blocks').select('*').order('time'),db.from('luden_day_done').select('block_id,day').gte('day',shiftDay(dayKey(),-35)),db.from('luden_day_changes').select('*').gte('day',shiftDay(dayKey(),-35))]);
  if(blocks.error||done.error||changes.error)return fail('No se pudo cargar el horario.',503);
  return Response.json({blocks:blocks.data,done:done.data,changes:changes.data},{headers:noStore});
}
export async function POST(request:Request) {
  if(!await authorized(request))return fail('Introduce tu PIN.',401);
  try {
    const body=await request.json(); const db=await sessionAdmin();
    if(body.action==='save-day') {
      if(!validDay(body.day)||body.day<dayKey()||!Array.isArray(body.overrides)||(body.revision!==null&&typeof body.revision!=='string'))return fail('Elige una fecha desde hoy.');
      const blocks=await db.from('luden_day_blocks').select('*');
      if(blocks.error)return fail('No se pudo cargar la rutina.',503);
      const error=adjustmentError(blocks.data,body.day,body.overrides);
      if(error)return fail(error);
      const row={day:body.day,overrides:body.overrides.map((value:Record<string,unknown>)=>({block_id:value.block_id,skip:value.skip,time:value.time,end_time:value.end_time,title:(value.title as string).trim()})),updated_at:new Date().toISOString()};
      const result=body.revision===null?await db.from('luden_day_changes').insert(row).select('day'):await db.from('luden_day_changes').update(row).eq('day',body.day).eq('updated_at',body.revision).select('day');
      if(result.error?.code==='23505'||(!result.error&&!result.data?.length))return fail('Este día cambió en otro dispositivo. Actualiza el horario y vuelve a abrirlo.',409);
      if(result.error)return fail('No se pudieron guardar los cambios del día.',503);
      return Response.json({ok:true},{headers:noStore});
    }else if(body.action==='save-plan') {
      const value=body.block as DayBlock;
      if(!value||typeof value.title!=='string'||!value.title.trim()||value.title.length>100||typeof value.description!=='string'||value.description.length>1000||!validDay(value.plan_date)||value.plan_date<dayKey()||!/^([01]\d|2[0-3]):[0-5]\d$/.test(value.time)||(value.end_time!=null&&(typeof value.end_time!=='string'||!/^([01]\d|2[0-3]):[0-5]\d$/.test(value.end_time)||value.time>=value.end_time))||!kinds.includes(value.kind))return fail('Revisa la fecha y las horas. La hora de fin es opcional; si la indicas, debe ser posterior al inicio.');
      const row={title:value.title.trim(),description:value.description.trim(),time:value.time,end_time:value.end_time||null,plan_date:value.plan_date,weekdays:[new Date(value.plan_date+'T12:00:00Z').getUTCDay()],kind:value.kind,remind:Boolean(value.remind)};
      const result=value.id?await db.from('luden_day_blocks').update(row).eq('id',value.id).not('plan_date','is',null).select('id'):await db.from('luden_day_blocks').insert(row).select('id');
      if(result.error?.code==='23P01')return fail('Ya tienes otro plan a esa hora. Cambia las horas o edita ese plan.',409);
      if(result.error)return fail('No se pudo guardar el plan.',503);
      if(!result.data?.length)return fail('Este plan ya no existe. Actualiza el horario.',404);
      return Response.json({ok:true,id:result.data[0].id},{headers:noStore});
    }else if(body.action==='complete') {
      if(typeof body.block_id!=='string'||typeof body.day!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(body.day)||body.day>dayKey()||body.day<shiftDay(dayKey(),-35))return fail('Fecha no válida.');
      const result=body.done?await db.from('luden_day_done').upsert({block_id:body.block_id,day:body.day},{onConflict:'block_id,day'}):await db.from('luden_day_done').delete().eq('block_id',body.block_id).eq('day',body.day);
      if(result.error)return fail('No se pudo guardar el progreso.',503);
    }else if(body.action==='delete') {
      const result=await db.from('luden_day_blocks').delete().eq('id',body.id);if(result.error)return fail('No se pudo eliminar.',503);
    }else {
      const value=body.block as DayBlock;
      if(!value||typeof value.title!=='string'||!value.title.trim()||value.title.length>100||typeof value.description!=='string'||value.description.length>1000||!/^([01]\d|2[0-3]):[0-5]\d$/.test(value.time)||!kinds.includes(value.kind)||!Array.isArray(value.weekdays)||!value.weekdays.length||value.weekdays.some(d=>!Number.isInteger(d)||d<0||d>6))return fail('Revisa el nombre, la hora y los días.');
      const existing=await db.from('luden_day_blocks').select('id,title,time,weekdays').is('plan_date',null);
      if(existing.error)return fail('No se pudo comprobar el horario.',503);
      const collision=existing.data.find(b=>b.id!==value.id&&b.time===value.time&&b.weekdays.some((day:number)=>value.weekdays.includes(day)));
      if(collision)return fail(`«${collision.title}» ya empieza a esa hora en uno de esos días. Elige otra hora o edita esa actividad.`,409);
      const row={title:value.title.trim(),description:value.description.trim(),time:value.time,weekdays:[...new Set(value.weekdays)],kind:value.kind,remind:Boolean(value.remind)};
      const result=value.id?await db.from('luden_day_blocks').update(row).eq('id',value.id).is('plan_date',null):await db.from('luden_day_blocks').insert(row);
      if(result.error)return fail('No se pudo guardar la rutina.',503);
    }
    return Response.json({ok:true},{headers:noStore});
  }catch{return fail('Petición no válida.');}
}
