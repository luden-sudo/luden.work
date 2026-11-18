import { randomBytes } from 'node:crypto';
import { sessionAdmin, authorized, fail, hash, noStore } from '@/lib/day-server';
import { widgetScript } from '@/lib/widget-script';
export async function POST(request:Request) {
  if(!await authorized(request))return fail('Introduce tu PIN.',401);
  const token=randomBytes(32).toString('hex');
  const result=await (await sessionAdmin()).from('luden_widget_tokens').insert({token_hash:hash(token)});
  if(result.error)return fail('No se pudo vincular Scriptable.',503);
  return Response.json({script:widgetScript(new URL(request.url).origin,token)},{headers:noStore});
}
export async function DELETE(request:Request) {
  if(!await authorized(request))return fail('Introduce tu PIN.',401);
  const result=await (await sessionAdmin()).from('luden_widget_tokens').delete().neq('token_hash','');
  if(result.error)return fail('No se pudo desvincular.',503);
  return Response.json({ok:true},{headers:noStore});
}
