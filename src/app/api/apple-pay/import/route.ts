import {admin,fail,hash,noStore} from '@/lib/day-server';
import {parseAmount} from '@/lib/amount';
export async function POST(request:Request){
 const token=request.headers.get('authorization')?.replace(/^Bearer /,'')||'';
 if(!/^[a-f0-9]{64}$/.test(token))return fail('Clave de importación no válida.',401);
 try{
  const raw=await request.text();if(raw.length>4000)return fail('Demasiados datos.',413);
  const body=JSON.parse(raw);
  if(typeof body.merchant!=='string'||!body.merchant.trim()||body.merchant.trim().length>140||typeof body.event_id!=='string'||body.event_id.length<8||body.event_id.length>200||typeof body.currency!=='string'||!/^[A-Z]{3}$/.test(body.currency))return fail('Faltan comercio, identificador o moneda.',400);
  if(typeof body.amount!=='number'&&typeof body.amount!=='string')return fail('Falta el importe.',400);
  const amount=parseAmount(String(body.amount));if(amount<=0)return fail('El importe debe ser positivo.',400);
  const merchant=body.merchant.trim();
  const result=await admin().rpc('luden_import_apple_pay',{token_digest:hash(token),event_key:body.event_id,payload_digest:hash(JSON.stringify([merchant,amount,body.currency])),merchant_name:merchant,paid_amount:amount,currency_code:body.currency});
  if(result.error)return fail(result.error.code==='42501'?'La conexión ha caducado o está desactivada.':result.error.code==='23505'?'Este identificador ya corresponde a otro pago.':result.error.code==='22023'?'Revisa los datos y la moneda. No se hacen conversiones automáticas.':'No se pudo importar el pago.',result.error.code==='42501'?401:result.error.code==='23505'?409:result.error.code==='22023'?400:503);
  return Response.json(result.data,{headers:noStore});
 }catch{return fail('Formato de pago no válido.',400);}
}

