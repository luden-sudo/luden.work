export type SessionProfile={id:string;name:string;username?:string;hasAccount?:boolean};
export function acceptProfile(profile:SessionProfile){
  const previous=profileHeader();
  sessionStorage.setItem('aurum-profile',JSON.stringify(profile));
  localStorage.removeItem('aurum-day-cache');
  if(previous!==profile.id)localStorage.removeItem('aurum-last-account');
}
export function profileHeader(){
  try{return (JSON.parse(sessionStorage.getItem('aurum-profile')||'null') as SessionProfile|null)?.id||'';}catch{return '';}
}
export async function loginProfile(pin:string){
  let endpoint='';
  try{if('serviceWorker' in navigator){const registration=await navigator.serviceWorker.getRegistration();endpoint=(await registration?.pushManager.getSubscription())?.endpoint||'';}}catch{}
  const response=await fetch('/api/session',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({pin,endpoint}),cache:'no-store'});
  const data=await response.json();
  if(!response.ok)throw new Error(data.error||'No se pudo iniciar sesión.');
  acceptProfile(data.profile);
  return data.profile as SessionProfile;
}
export function profileDisplayName(){
  try{return (JSON.parse(sessionStorage.getItem('aurum-profile')||'null') as SessionProfile|null)?.name||'';}catch{return '';}
}
