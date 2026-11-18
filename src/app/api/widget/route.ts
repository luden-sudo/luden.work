import { profileAdmin, fail, hash, noStore } from '@/lib/day-server';
import { allProfiles } from '@/lib/accounts-server';
import { dayKey, planState, type DayBlock } from '@/lib/day-plan';
export async function GET(request:Request) {
  const token=request.headers.get('authorization')?.replace(/^Bearer /,'')||'';
  if(!/^[a-f0-9]{64}$/.test(token))return fail('Vincula el widget desde Ajustes.',401);
  let selected=null;
  for(const profile of await allProfiles()){
    const db=profileAdmin(profile);
    const pair=await db.from('luden_widget_tokens').select('created_at').eq('token_hash',hash(token)).maybeSingle();
    if(pair.error)return fail('No se pudo comprobar el widget.',503);
    if(pair.data&&Date.now()-Date.parse(pair.data.created_at)<=365*86400000){selected=db;break;}
  }
  if(!selected)return fail('Vuelve a vincular el widget.',401);
  const db=selected;
  const [blocks,changes,done]=await Promise.all([db.from('luden_day_blocks').select('*'),db.from('luden_day_changes').select('*'),db.from('luden_day_done').select('block_id,day').eq('day',dayKey())]);
  if(blocks.error||changes.error||done.error)return fail('No se pudo cargar el horario.',503);
  return Response.json({...planState(blocks.data as DayBlock[],new Date(),changes.data,done.data),updatedAt:new Date().toISOString()},{headers:noStore});
}
