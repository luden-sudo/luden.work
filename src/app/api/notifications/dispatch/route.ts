import { configValue, equal, fail, noStore } from '@/lib/day-server';
import { dispatchNotifications } from '@/lib/push-server';
export const maxDuration=60;
export async function POST(request:Request) {
  const token=request.headers.get('authorization')?.replace(/^Bearer /,'')||'';
  if(!token||!equal(token,await configValue('cron_secret')))return fail('No autorizado.',401);
  try{return Response.json(await dispatchNotifications(),{headers:noStore});}catch{return fail('No se pudieron enviar los avisos.',503);}
}
