import { createClient } from '@supabase/supabase-js';
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { validProfile, profileTable, type ProfileId } from './profiles';
import { cookies } from 'next/headers';

export const sessionSeconds=30*24*60*60;
export const hash=(value:string)=>createHash('sha256').update(value).digest('hex');
export function admin() {
  const url=process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key=process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  if(!url||!key) throw new Error('Servicio de sincronización no configurado.');
  return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
}
function signature(value:string) {
  const secret=process.env.SUPABASE_JWT_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  if(!secret) throw new Error('Sesión no configurada.');
  return createHmac('sha256',secret).update('aurum:'+value).digest('hex');
}
export function equal(a:string,b:string) {
  const x=Buffer.from(a),y=Buffer.from(b); return x.length===y.length&&timingSafeEqual(x,y);
}
export async function issueSession(profile:ProfileId='luden') {
  const expiry=String(Date.now()+sessionSeconds*1000);
  (await cookies()).set('aurum-access',expiry+'.'+profile+'.'+signature(expiry+'.'+profile),{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'strict',maxAge:sessionSeconds,path:'/'});
}
export async function currentProfile():Promise<ProfileId|null> {
  const value=(await cookies()).get('aurum-access')?.value||'';
  const parts=value.split('.');
  if(parts.length===2){const [expiry,sig]=parts;return Number(expiry)>Date.now()&&equal(sig,signature(expiry))?'luden':null;}
  const [expiry,profile,sig]=parts;
  return parts.length===3&&validProfile(profile)&&Number(expiry)>Date.now()&&equal(sig,signature(expiry+'.'+profile))?profile:null;
}
export async function hasSession(){return Boolean(await currentProfile());}
export async function requireProfile(){const profile=await currentProfile();if(!profile)throw new Error('Introduce tu PIN.');return profile;}
export function profileAdmin(profile:ProfileId){
  const db=admin();
  return {from:(table:string)=>db.from(profileTable(table,profile))};
}
export async function sessionAdmin(){return profileAdmin(await requireProfile());}
export async function authorized(request:Request) {
  if(request.method!=='GET'&&request.headers.get('origin')&&request.headers.get('origin')!==new URL(request.url).origin) return false;
  const profile=await currentProfile();
  const expected=request.headers.get('x-aurum-profile');
  return Boolean(profile&&(!expected||expected===profile));
}
export const noStore={'Cache-Control':'private, no-store'};
export function fail(message:string,status=400){return Response.json({error:message},{status,headers:noStore});}
export async function configValue(key:string) {
  const result=await admin().from('luden_app_config').select('value').eq('key',key).single();
  if(result.error) throw new Error('Configuration indisponible'); return result.data.value as string;
}
