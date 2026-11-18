import {admin,authorized,requireProfile,fail,noStore} from '@/lib/day-server';
import {buildBackup} from '@/lib/backup';
import {dayKey} from '@/lib/day-plan';
import {profileDisplayName} from '@/lib/accounts-server';

export async function GET(request:Request){
  if(!await authorized(request))return fail('Introduce tu PIN.',401);
  try{
    const profile=await requireProfile(),db=admin();
    const backup=await buildBackup(profile,async(table,order,offset,limit,owner)=>{
      let query=db.from(table).select('*',{count:'exact'});
      if(owner)query=query.eq('profile',owner);
      for(const column of order)query=query.order(column);
      const result=await query.range(offset,offset+limit-1);
      if(result.error||result.count===null)throw new Error('No se pudo completar la copia. Vuelve a intentarlo.');
      return {rows:result.data,count:result.count};
    },await profileDisplayName(profile));
    return new Response(JSON.stringify(backup,null,2),{headers:{...noStore,'Content-Type':'application/json; charset=utf-8','Content-Disposition':`attachment; filename="${profile}-copia-completa-${dayKey()}.json"`,'X-Content-Type-Options':'nosniff'}});
  }catch{return fail('No se pudo completar la copia. Vuelve a intentarlo.',503);}
}
