import { scryptSync } from 'node:crypto';
import { legacyProfiles, type ProfileId } from '@/lib/profiles';
import { cookies } from 'next/headers';
import { admin, currentProfile, equal, fail, issueSession, noStore } from '@/lib/day-server';
import { allowAttempt, profileDisplayName, profileHasAccount } from '@/lib/accounts-server';
import { detachPushEndpoint } from '@/lib/session-server';

export async function GET(){
  const profile=await currentProfile();
  if(!profile)return Response.json({authenticated:false,profile:null},{headers:noStore});
  const [name,hasAccount]=await Promise.all([profileDisplayName(profile),profileHasAccount(profile).catch(()=>false)]);
  return Response.json({authenticated:true,profile:{id:profile,name,hasAccount}},{headers:noStore});
}

// Legacy access for profiles created before accounts existed. The owner PIN comes
// from APP_PIN; other profiles store a scrypt hash in luden_app_config (profile_pin:<id>).
export async function POST(request:Request) {
  if(request.headers.get('origin')&&request.headers.get('origin')!==new URL(request.url).origin) return fail('Origen no válido.',403);
  try {
    const {pin,endpoint}=await request.json();
    if(!await allowAttempt(request,'pin')) return fail('Demasiados intentos. Espera 15 minutos.',429);
    if(typeof pin!=='string'||!/^\d{6}$/.test(pin))return fail('PIN incorrecto',401);
    const ownerPin=process.env.APP_PIN;
    let profile:ProfileId|null=ownerPin&&/^\d{6}$/.test(ownerPin)&&equal(pin,ownerPin)?'luden':null;
    const others=legacyProfiles().filter(item=>item.id!=='luden').map(item=>'profile_pin:'+item.id);
    if(others.length){
      const stored=await admin().from('luden_app_config').select('key,value').in('key',others);
      if(stored.error)return fail('No se pudo comprobar el acceso.',503);
      for(const item of stored.data){
        const [salt,digest]=String(item.value).split(':');
        if(salt&&digest&&equal(scryptSync(pin,salt,32).toString('hex'),digest))profile=String(item.key).slice('profile_pin:'.length);
      }
    }
    if(!profile)return fail('PIN incorrecto',401);
    await detachPushEndpoint(profile,endpoint);
    await issueSession(profile);
    return Response.json({authenticated:true,profile:{id:profile,name:await profileDisplayName(profile)}},{headers:noStore});
  }catch{return fail('No se pudo iniciar sesión.',503);}
}
export async function DELETE(){(await cookies()).delete('aurum-access');return Response.json({authenticated:false},{headers:noStore});}
