"use client";
import Link from 'next/link';
import { LogoMark } from '../logo';
import { useEffect, useState } from 'react';
import { ArrowRight, Menu, X } from 'lucide-react';
import LangSwitch from './lang-switch';
import { makeT, type Lang } from '@/lib/i18n';

export default function SiteNav({ lang, signedIn }: { lang: Lang; signedIn: boolean }) {
  const t = makeT(lang);
  const [open, setOpen] = useState(false), [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll(); window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  useEffect(() => { document.documentElement.classList.toggle('site-menu-open', open); return () => document.documentElement.classList.remove('site-menu-open'); }, [open]);
  const links = [['/#funciones', t('Funciones')], ['/#detalles', t('Qué incluye')], ['/#privacidad', t('Privacidad')], ['/#preguntas', t('Preguntas')], ['/demo', t('Demo')]];
  return <header className={`site-nav${scrolled ? ' is-scrolled' : ''}${open ? ' is-open' : ''}`}>
    <div className="site-nav-inner">
      <Link href="/" className="site-brand" aria-label="luden"><LogoMark size={32}/><strong>luden</strong></Link>
      <nav className="site-links" aria-label={t('Navegación principal')}>{links.map(([href, label]) => <a key={href} href={href} onClick={() => setOpen(false)}>{label}</a>)}</nav>
      <div className="site-actions">
        <LangSwitch lang={lang} label={t('Idioma')} compact/>
        {signedIn
          ? <Link className="btn btn-outline" href="/hoy">{t('Abrir luden')}<ArrowRight size={16} aria-hidden="true"/></Link>
          : <><Link className="site-signin" href="/login">{t('Entrar')}</Link><Link className="btn btn-outline" href="/register">{t('Empezar gratis')}</Link></>}
        <button type="button" className="site-menu-toggle" aria-expanded={open} aria-controls="site-mobile-menu" aria-label={open ? t('Cerrar menú') : t('Abrir menú')} onClick={() => setOpen(value => !value)}>{open ? <X size={20}/> : <Menu size={20}/>}</button>
      </div>
    </div>
    <div id="site-mobile-menu" className="site-mobile-menu" hidden={!open}>
      {links.map(([href, label]) => <a key={href} href={href} onClick={() => setOpen(false)}>{label}</a>)}
      <div className="site-mobile-actions">
        {signedIn ? <Link className="btn btn-primary btn-lg" href="/hoy">{t('Abrir luden')}</Link> : <><Link className="btn btn-primary btn-lg" href="/register">{t('Empezar gratis')}</Link><Link className="btn btn-outline btn-lg" href="/login">{t('Entrar')}</Link></>}
        <LangSwitch lang={lang} label={t('Idioma')}/>
      </div>
    </div>
  </header>;
}
