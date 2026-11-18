'use client';
import { t, tv } from "@/lib/i18n";
import {useEffect,useState} from 'react';
import {Bell,BellOff,ShieldCheck} from 'lucide-react';
import {disablePush,enablePush,pushPreferences} from '@/lib/push-client';

export default function FinanceNotifications({onBusy}:{onBusy:(busy:boolean)=>void}) {
  const [enabled,setEnabled]=useState(false),[hour,setHour]=useState(9),[details,setDetails]=useState(false);
  const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[notice,setNotice]=useState(''),[error,setError]=useState('');
  useEffect(()=>{
    let alive=true;
    pushPreferences().then(prefs=>{if(alive){setEnabled(prefs.finance_enabled);setHour(prefs.finance_hour);setDetails(prefs.finance_details);}})
      .catch(e=>{if(alive)setError((e as Error).message);}).finally(()=>{if(alive)setLoading(false);});
    return()=>{alive=false;};
  },[]);
  async function change(action:'save'|'test'|'disable') {
    setBusy(true);onBusy(true);setNotice('');setError('');
    try{
      if(action==='disable'){await disablePush('finance');setEnabled(false);setNotice(t("Avisos de dinero desactivados."));}
      else{await enablePush('finance',{hour,details,test:action==='test'||!enabled});setEnabled(true);setNotice(action==='test'||!enabled?'Prueba enviada. Revisa las notificaciones de este dispositivo.':'Cambios guardados.');}
    }catch(e){setError((e as Error).message);try{const prefs=await pushPreferences();setEnabled(prefs.finance_enabled);}catch{/* Keep settings editable for retry. */}}
    finally{setBusy(false);onBusy(false);}
  }
  return <div className="finance-notifications">
    <div className="finance-notification-intro"><span className="finance-bell"><Bell size={25}/></span><div><h3>{t("Deudas pendientes")}</h3><p>{t("Un recordatorio al día, solo si queda dinero por cobrar o pagar.")}</p></div></div>
    <span className="finance-notification-state">{tv(loading?t("Comprobando avisos…"):enabled?t("Activados en este dispositivo"):t("Desactivados en este dispositivo"))}</span>
    <label className="finance-hour">{t("Hora del aviso")}<select value={hour} onChange={e=>setHour(Number(e.target.value))} disabled={busy||loading}>{Array.from({length:24},(_,i)=><option value={i} key={i}>{String(i).padStart(2,'0')}:00</option>)}</select><small>{t("Horario de Madrid")}</small></label>
    <label className="finance-details"><input type="checkbox" checked={details} onChange={e=>setDetails(e.target.checked)} disabled={busy||loading}/><span><strong>{t("Mostrar nombres e importes")}</strong><small>{t("También se verán en la pantalla bloqueada.")}</small></span></label>
    <div className="finance-notification-preview"><small>{t("Así aparecerá")}</small><strong>{tv(details?t("Iván te debe 20,00 €"):t("Deudas pendientes"))}</strong><p>{tv(details?t("Ejemplo · se usa el importe real pendiente."):t("Tienes deudas pendientes. Abre Dinero para revisarlas."))}</p></div>
    <p className="finance-privacy"><ShieldCheck size={17}/>{t("Las deudas saldadas no generan avisos.")}</p>
    <button className="primary" disabled={busy||loading} onClick={()=>void change('save')}><Bell size={18}/>{tv(busy?t("Guardando…"):enabled?t("Guardar cambios"):t("Activar y enviar prueba"))}</button>
    {enabled&&<div className="finance-notification-actions"><button className="secondary" disabled={busy||loading} onClick={()=>void change('test')}>{t("Enviar prueba")}</button><button className="text-button" disabled={busy||loading} onClick={()=>void change('disable')}><BellOff size={17}/>{t("Desactivar")}</button></div>}

    {notice&&<p role="status" className="finance-notification-message">{tv(notice)}</p>}{error&&<p role="alert" className="form-error">{tv(error)}</p>}
  </div>;
}
