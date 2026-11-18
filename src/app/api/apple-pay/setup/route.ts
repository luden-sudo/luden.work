import {randomBytes} from 'node:crypto';
import {admin,authorized,requireProfile,hash,fail,noStore} from '@/lib/day-server';
async function allowed(request:Request){return await authorized(request)&&await requireProfile()==='luden';}
export async function GET(request:Request){
 if(!await allowed(request))return fail('Introduce tu código de luden.',401);
 const db=admin();
 const [configuration,account,settings]=await Promise.all([db.from('luden_app_config').select('value').eq('key','apple_pay_import').maybeSingle(),db.from('luden_accounts').select('id,name').ilike('name','BBVA').eq('kind','Banco').maybeSingle(),db.from('luden_settings').select('currency').eq('id','luden').single()]);
 if(configuration.error||account.error||settings.error)return fail('No se pudo cargar la conexión.',503);
 const value=configuration.data?JSON.parse(configuration.data.value):null;
 return Response.json({configured:!!value&&Date.parse(value.expires_at)>Date.now(),account:account.data?.name||null,currency:settings.data.currency},{headers:noStore});
}
export async function POST(request:Request){
 if(!await allowed(request))return fail('Introduce tu código de luden.',401);
 const db=admin(),account=await db.from('luden_accounts').select('id,name').ilike('name','BBVA').eq('kind','Banco').maybeSingle();
 if(account.error||!account.data)return fail('Necesitas una cuenta bancaria llamada BBVA.',400);
 const token=randomBytes(32).toString('hex'),expires_at=new Date(Date.now()+365*86400000).toISOString();
 const saved=await db.from('luden_app_config').upsert({key:'apple_pay_import',value:JSON.stringify({token_hash:hash(token),account_id:account.data.id,expires_at})});
 if(saved.error)return fail('No se pudo preparar la conexión.',503);
 return Response.json({token,url:new URL('/api/apple-pay/import',request.url).href,account:account.data.name,expires_at},{headers:noStore});
}
export async function DELETE(request:Request){
 if(!await allowed(request))return fail('Introduce tu código de luden.',401);
 const result=await admin().from('luden_app_config').delete().eq('key','apple_pay_import');
 return result.error?fail('No se pudo desconectar.',503):Response.json({ok:true},{headers:noStore});
}

