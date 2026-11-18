import {profileHeader} from './profile-client';
export type PushTopic='day'|'finance';
export type PushPreferences={routine_enabled:boolean;finance_enabled:boolean;finance_details:boolean;finance_hour:number};
const empty:PushPreferences={routine_enabled:false,finance_enabled:false,finance_details:false,finance_hour:9};
async function request(body?:Record<string,unknown>,method='GET',endpoint='') {
  const response=await fetch('/api/notifications'+(endpoint?'?endpoint='+encodeURIComponent(endpoint):''),{method,cache:'no-store',headers:{'Content-Type':'application/json','x-aurum-profile':profileHeader()},body:body?JSON.stringify(body):undefined});
  const data=await response.json();
  if(!response.ok)throw new Error(data.error||'No se pudieron guardar tus avisos.');
  return data;
}
export function pushSupported(){return 'Notification' in window&&'serviceWorker' in navigator&&'PushManager' in window;}
export async function pushPreferences():Promise<PushPreferences> {
  if(!pushSupported())return {...empty};
  await navigator.serviceWorker.register('/sw.js');
  const reg=await navigator.serviceWorker.ready;
  const sub=await reg.pushManager.getSubscription();
  return sub?request(undefined,'GET',sub.endpoint):{...empty};
}
export async function enablePush(topic:PushTopic,options:{hour?:number;details?:boolean;test?:boolean}={}) {
  if(!pushSupported())throw new Error('En iPhone, instala luden en la pantalla de inicio y ábrela desde su icono. Necesitas iOS 16.4 o posterior.');
  // Permission stays within the button's user gesture, before registration/network awaits.
  if(Notification.permission!=='granted'&&await Notification.requestPermission()!=='granted')throw new Error('Permite las notificaciones en los ajustes de este dispositivo.');
  await navigator.serviceWorker.register('/sw.js');
  const reg=await navigator.serviceWorker.ready;
  let sub=await reg.pushManager.getSubscription();
  if(!sub){
    const {publicKey}=await request();
    const raw=atob(publicKey.replace(/-/g,'+').replace(/_/g,'/'));
    sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:Uint8Array.from(raw,c=>c.charCodeAt(0))});
  }
  await request({subscription:sub.toJSON(),topic,...options},'POST');
}
export async function disablePush(topic:PushTopic) {
  if(!pushSupported())return;
  const reg=await navigator.serviceWorker.register('/sw.js'),sub=await reg.pushManager.getSubscription();
  if(!sub)return;
  const result=await request({endpoint:sub.endpoint,topic},'DELETE');
  if(result.release)await sub.unsubscribe();
}
