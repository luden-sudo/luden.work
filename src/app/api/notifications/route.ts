import { sessionAdmin, requireProfile, authorized, configValue, fail, noStore } from '@/lib/day-server';
import { sendPush } from '@/lib/push-server';
import { readFinanceReminder } from '@/lib/finance-push-server';
const columns='routine_enabled,finance_enabled,finance_details,finance_hour';
const defaults={routine_enabled:false,finance_enabled:false,finance_details:false,finance_hour:9};
export async function GET(request:Request) {
  if(!await authorized(request))return fail('Introduce tu PIN.',401);
  try{
    const endpoint=new URL(request.url).searchParams.get('endpoint');
    const result=endpoint?await (await sessionAdmin()).from('luden_push_subscriptions').select(columns).eq('endpoint',endpoint).maybeSingle():null;
    if(result?.error)return fail('No se pudieron leer tus avisos.',503);
    return Response.json({publicKey:await configValue('vapid_public'),...(result?.data||defaults)},{headers:noStore});
  }catch{return fail('No se pudieron leer tus avisos.',503);}
}
export async function POST(request:Request) {
  if(!await authorized(request))return fail('Introduce tu PIN.',401);
  try {
    const {subscription,test,topic='day',hour=9,details=false}=await request.json();
    if(!['day','finance'].includes(topic)||typeof details!=='boolean'||!Number.isInteger(hour)||hour<0||hour>23)return fail('Elige una hora válida.');
    const endpoint=new URL(subscription.endpoint),host=endpoint.hostname;
    if(endpoint.protocol!=='https:'||endpoint.port||endpoint.username||endpoint.password||!(host==='fcm.googleapis.com'||host.endsWith('.push.apple.com')||host.endsWith('.push.services.mozilla.com')||host.endsWith('.notify.windows.com'))||!subscription.keys||typeof subscription.keys.auth!=='string'||typeof subscription.keys.p256dh!=='string')return fail('Suscripción no válida.');
    const preferences=topic==='finance'?{finance_enabled:true,finance_details:details,finance_hour:hour}:{routine_enabled:true};
    const db=await sessionAdmin(),values={subscription,...preferences};
    const updated=await db.from('luden_push_subscriptions').update(values).eq('endpoint',subscription.endpoint).select('id');
    if(updated.error)return fail('No se pudieron guardar tus avisos.',503);
    if(!updated.data.length){
      const inserted=await db.from('luden_push_subscriptions').insert({endpoint:subscription.endpoint,routine_enabled:false,...values});
      if(inserted.error?.code==='23505'){
        // Another topic may have enabled this endpoint concurrently. Preserve its consent.
        const retry=await db.from('luden_push_subscriptions').update(values).eq('endpoint',subscription.endpoint);
        if(retry.error)return fail('No se pudieron guardar tus avisos.',503);
      }else if(inserted.error)return fail('No se pudieron guardar tus avisos.',503);
    }
    if(test){
      const reminder=topic==='finance'?await readFinanceReminder(details,await requireProfile()):null;
      await sendPush(subscription,reminder?{...reminder,tag:'aurum-finance-test'}:{title:topic==='finance'?'Avisos de dinero':'Mi día',body:'Los avisos están activados en este dispositivo.',url:topic==='finance'?'/dinero?tab=deudas':'/hoy',tag:'aurum-test'},300,topic==='finance'?'normal':'high');
    }
    return Response.json({ok:true},{headers:noStore});
  }catch{return fail('No se pudo completar la prueba. Revisa los permisos y reintenta.',503);}
}
export async function DELETE(request:Request) {
  if(!await authorized(request))return fail('Introduce tu PIN.',401);
  try{
    const {endpoint,topic='day'}=await request.json();
    if(typeof endpoint!=='string'||!['day','finance'].includes(topic))return fail('Aviso no válido.');
    const db=await sessionAdmin();
    const update=await db.from('luden_push_subscriptions').update(topic==='finance'?{finance_enabled:false}:{routine_enabled:false}).eq('endpoint',endpoint).select(columns).maybeSingle();
    if(update.error)return fail('No se pudo desactivar.',503);
    let release=!update.data;
    if(update.data&&!update.data.routine_enabled&&!update.data.finance_enabled){
      const removed=await db.from('luden_push_subscriptions').delete().eq('endpoint',endpoint).eq('routine_enabled',false).eq('finance_enabled',false).select('id');
      if(removed.error)return fail('No se pudo desactivar.',503);
      release=Boolean(removed.data.length);
    }
    return Response.json({ok:true,release},{headers:noStore});
  }catch{return fail('No se pudo desactivar.',503);}
}
