"use client";
// Installs the demo fetch layer as soon as this module loads, before any screen requests data.
import { useEffect, useState } from 'react';
import { FlaskConical, X } from 'lucide-react';
import { demoActive, installDemo, leaveDemo } from '@/lib/demo';
import { t } from '@/lib/i18n';

installDemo();

export default function DemoBoot() {
  const [active, setActive] = useState(false), [open, setOpen] = useState(true);
  useEffect(() => {
    const appPath = /^\/(hoy|rutinas|dinero|gestiones)/.test(window.location.pathname);
    // Activation depends on this tab's sessionStorage, which only exists in the browser.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setActive(demoActive() && appPath);
    const timer = window.setTimeout(() => setOpen(false), 5000);
    return () => window.clearTimeout(timer);
  }, []);
  if (!active) return null;
  // Plain links on purpose: leaving the demo needs a full page load to drop the fetch layer.
  /* eslint-disable @next/next/no-html-link-for-pages */
  return <div className={`demo-pill${open ? ' is-open' : ''}`} role="status">
    <button type="button" className="demo-pill-main" onClick={() => setOpen(value => !value)} aria-expanded={open}>
      <FlaskConical size={15} aria-hidden="true"/><span>{t('Demo')}</span>
    </button>
    {open && <span className="demo-pill-copy">{t('Datos ficticios. Nada se guarda en el servidor.')}</span>}
    {open && <a className="demo-pill-cta" href="/register" onClick={() => leaveDemo()}>{t('Crear cuenta')}</a>}
    <a className="demo-pill-exit" href="/" aria-label={t('Salir de la demo')} onClick={() => leaveDemo()}><X size={15}/></a>
  </div>;
  /* eslint-enable @next/next/no-html-link-for-pages */
}
