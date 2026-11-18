"use client";
import { t, tv } from "@/lib/i18n";
import {useEffect,useState} from 'react';
import {Copy,Link2,Unlink} from 'lucide-react';
import {profileHeader} from '@/lib/profile-client';
async function request(method='GET'){
 const response=await fetch('/api/apple-pay/setup',{method,cache:'no-store',headers:{'x-aurum-profile':profileHeader()}});
 const body=await response.json();if(!response.ok)throw new Error(body.error||'No se pudo configurar Apple Pay.');
 return body;
}
export default function ApplePaySetup(){
 const [status,setStatus]=useState<{configured:boolean;account:string|null;currency:string}|null>(null);
 const [connection,setConnection]=useState<{token:string;url:string}|null>(null),[busy,setBusy]=useState(false),[notice,setNotice]=useState('');
 useEffect(()=>{let alive=true;request().then(value=>{if(alive)setStatus(value);}).catch(error=>{if(alive)setNotice(error.message);});return()=>{alive=false;};},[]);
 async function prepare(){setBusy(true);setNotice('');try{const value=await request('POST');setConnection(value);setStatus(current=>current?{...current,configured:true}:null);}catch(error){setNotice((error as Error).message);}finally{setBusy(false);}}
 async function copy(value:string){try{await navigator.clipboard.writeText(value);setNotice(t("Copiado."));}catch{setNotice(t("Mantén pulsado el texto para copiarlo."));}}
 return <section className="panel apple-pay-setup"><div className="panel-heading"><h2>{t("Apple Pay · BBVA")}</h2><Link2 size={20}/></div><div className="panel-body"><p>{t("Registra en BBVA los pagos que envíe una automatización de Atajos del iPhone.")}</p><p className="help">{t("Requiere configurar Atajos una vez. Preparar una clave aquí no activa la automatización del iPhone.")}</p>
 <button className="secondary" disabled={busy||!status?.account} onClick={()=>void prepare()}>{tv(busy?t("Preparando…"):status?.configured?t("Crear una clave nueva"):t("Preparar conexión con Atajos"))}</button>
 {status?.configured&&!connection&&<p className="help">{t("Ya existe una clave. Si no la conservas, crea otra y actualiza Atajos; la anterior dejará de funcionar.")}</p>}
 {status&&!status.account&&<p className="form-error">{t("Necesitas una cuenta bancaria llamada BBVA.")}</p>}
 {connection&&<div className="apple-pay-connection"><label>{t("Dirección para Atajos")}<input readOnly value={connection.url} onFocus={e=>e.target.select()}/></label><button className="text-button" onClick={()=>void copy(connection.url)}><Copy size={16}/>{t("Copiar dirección")}</button><label>{t("Clave privada de importación")}<input type="password" readOnly value={connection.token} onFocus={e=>e.target.select()}/></label><button className="text-button" onClick={()=>void copy('Bearer '+connection.token)}><Copy size={16}/>{t("Copiar autorización")}</button><p className="help">{t("Guarda esta clave solo en tu atajo. Permite añadir gastos en BBVA; no permite consultar tus datos ni realizar pagos.")}</p></div>}
 <details className="apple-pay-instructions"><summary>{t("Cómo configurarlo en el iPhone")}</summary><ol><li>{t("Abre Atajos, entra en Automatización y crea una de Cartera o Transacción. Selecciona la tarjeta de BBVA y “Ejecutar inmediatamente”.")}</li><li>{t("Crea una automatización vacía. Añade “Fecha actual” y “Aplicar formato a fecha”, con el formato personalizado")} <code>{"yyyy-MM-dd'T'HH:mm:ss.SSSZZZZZ"}</code>{t(". Conserva el resultado para identificar ese envío.")}</li><li>{t("Añade “Obtener contenido de URL”. Pega la dirección de arriba, elige")} <strong>{t("POST")}</strong> {t("y cuerpo")} <strong>{t("JSON")}</strong>.</li><li>{t("En Cabeceras, añade")} <code>{t("Authorization")}</code> {t("y pega el valor de “Copiar autorización”.")}</li><li>{t("Añade estos campos al cuerpo. Las variables de la transacción se eligen tocando “Entrada del atajo” y después la propiedad correspondiente:")}</li></ol><dl className="apple-pay-fields"><dt>{t("amount · Número")}</dt><dd>{t("Importe de la transacción, sin símbolo de moneda.")}</dd><dt>{t("merchant · Texto")}</dt><dd>{t("Comercio de la transacción.")}</dd><dt>{t("currency · Texto")}</dt><dd>{t("Código de moneda del importe, como EUR. Debe coincidir con tu divisa de luden.")}</dd><dt>{t("event_id · Texto")}</dt><dd>{t("Resultado de la fecha formateada. Reutiliza ese mismo valor si reintentas el envío.")}</dd></dl><p className="help">{t("Si tu versión de Atajos no ofrece importe o moneda, pide ese dato con “Solicitar entrada”. No se guardan pagos con datos incompletos ni se convierten divisas automáticamente.")}</p><p className="help">{t("Los gastos aparecen como “Apple Pay · comercio”, en Compras, con fecha de recepción en Madrid. Puedes editarlos en Movimientos. Revisa que el pago se haya completado; la automatización no consulta el extracto de BBVA.")}</p></details>
 {status?.configured&&<button className="text-button danger" disabled={busy} onClick={async()=>{setBusy(true);try{await request('DELETE');setConnection(null);setStatus(current=>current?{...current,configured:false}:null);setNotice(t("Conexión desactivada. Los gastos guardados se conservan."));}catch(error){setNotice((error as Error).message);}finally{setBusy(false);}}}><Unlink size={16}/>{t("Desconectar importación")}</button>}
 {notice&&<p className="help" role="status">{tv(notice)}</p>}
 </div></section>;
}

