"use client";
import { useState } from 'react';
import { BookOpen, Check, Coffee, Dumbbell, Package, Truck } from 'lucide-react';
import { makeT, type Lang } from '@/lib/i18n';

type Tab = 'hoy' | 'agenda' | 'dinero' | 'gestiones';

/** Product tour: one tab per space, each with a real-looking card and a short explanation. */
export default function Showcase({ lang }: { lang: Lang }) {
  const t = makeT(lang);
  const [tab, setTab] = useState<Tab>('hoy');
  const money = (value: number) => new Intl.NumberFormat(lang === 'en' ? 'en-GB' : 'es-ES', { style: 'currency', currency: 'EUR' }).format(value);
  const tabs: { id: Tab; label: string; title: string; text: string }[] = [
    { id: 'hoy', label: t('Hoy'), title: t('Sabes qué toca y cuánto queda'), text: t('La actividad en curso con su cuenta atrás, lo siguiente y tus tareas del día. Empiezas o terminas con un toque.') },
    { id: 'agenda', label: t('Agenda'), title: t('Tu semana, sin rehacerla cada lunes'), text: t('Define tu rutina una vez. Si un día cambia, ajustas solo ese día y la semana sigue igual.') },
    { id: 'dinero', label: t('Dinero'), title: t('Cuánto tienes de verdad'), text: t('Cuentas, movimientos y límites por categoría. El ahorro y el dinero de pedidos no se mezclan con lo que puedes gastar.') },
    { id: 'gestiones', label: t('Gestiones'), title: t('Cada pedido, de la compra al cobro'), text: t('Coste, venta, envío y cobro de cada artículo, con su propia caja para no confundirlo con tu dinero personal.') },
  ];
  const current = tabs.find(item => item.id === tab)!;
  return <div className="showcase">
    <div className="showcase-tabs" role="tablist" aria-label={t('Espacios de luden')}>
      {tabs.map(item => <button key={item.id} type="button" role="tab" id={`tab-${item.id}`} aria-selected={tab === item.id} aria-controls="showcase-panel" onClick={() => setTab(item.id)}>{item.label}</button>)}
    </div>
    <div className="showcase-stage" id="showcase-panel" role="tabpanel" aria-labelledby={`tab-${tab}`}>
      <div className="showcase-card" key={tab} aria-hidden="true">
        {tab === 'hoy' && <>
          <div className="sc-head"><span className="sc-dot live"/>{t('Ahora')} · 15:00 – 17:00</div>
          <div className="sc-now"><span className="sc-icon violet"><BookOpen size={20}/></span><div><b>{t('Estudio · curso de diseño')}</b><small>{t('Quedan')} 1 h 12 min</small></div></div>
          <div className="sc-bar"><i style={{ width: '42%' }}/></div>
          <ul className="sc-list">
            <li><span className="sc-icon orange"><Dumbbell size={16}/></span><span>18:30 · {t('Entreno')}</span></li>
            <li><span className="sc-icon amber"><Coffee size={16}/></span><span>20:30 · {t('Cena')}</span></li>
          </ul>
        </>}
        {tab === 'agenda' && <>
          <div className="sc-head">{t('Horario semanal')}</div>
          <div className="sc-days">{['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((day, index) => <span key={day + index} className={index === 2 ? 'on' : ''}>{lang === 'en' ? ['M', 'T', 'W', 'T', 'F', 'S', 'S'][index] : day}</span>)}</div>
          <ul className="sc-rows">
            <li><time>07:30</time><b>{t('Despertar y desayuno')}</b></li>
            <li><time>09:00</time><b>{t('Trabajo enfocado')}</b></li>
            <li className="changed"><time>17:15</time><b>{t('Recoger paquete')}</b><em>{t('Solo hoy')}</em></li>
            <li><time>18:30</time><b>{t('Entreno')}</b></li>
          </ul>
        </>}
        {tab === 'dinero' && <>
          <div className="sc-head">{t('Saldo disponible')}</div>
          <div className="sc-amount">{money(2384.2)}</div>
          <div className="sc-split"><div><small>{t('Ingresos')}</small><b className="pos">{money(1725)}</b></div><div><small>{t('Gastos')}</small><b className="neg">{money(803.43)}</b></div></div>
          <div className="sc-limit"><div><span>{t('Restaurantes')}</span><span>{money(84.5)} / {money(120)}</span></div><div className="sc-bar"><i style={{ width: '70%' }}/></div></div>
        </>}
        {tab === 'gestiones' && <>
          <div className="sc-head">{t('Pedido')} · New Balance 550</div>
          <ul className="sc-steps">
            <li className="done"><Check size={14}/>{t('Pagado')} · {money(70)}</li>
            <li className="done"><Truck size={14}/>{t('Enviado al comprador')}</li>
            <li><Package size={14}/>{t('Cobro pendiente')} · {money(110)}</li>
          </ul>
          <div className="sc-split"><div><small>{t('Beneficio previsto')}</small><b className="pos">{money(40)}</b></div><div><small>{t('Caja')}</small><b>{money(360)}</b></div></div>
        </>}
      </div>
    </div>
    <div className="showcase-copy" key={'copy-' + tab}>
      <h3>{current.title}</h3>
      <p>{current.text}</p>
    </div>
  </div>;
}
