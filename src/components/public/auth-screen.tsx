"use client";
import Link from 'next/link';
import { LogoMark } from '../logo';
import { useMemo, useRef, useState, type FormEvent } from 'react';
import { ArrowLeft, ArrowRight, AtSign, CalendarDays, Check, CircleAlert, Eye, EyeOff, KeyRound, LoaderCircle, LockKeyhole, Package, Play, UserRound, WalletCards } from 'lucide-react';
import LangSwitch from './lang-switch';
import { makeT, type Lang } from '@/lib/i18n';
import { acceptProfile } from '@/lib/profile-client';
import { leaveDemo } from '@/lib/demo';

type Mode = 'login' | 'register';
const USERNAME = /^[a-z0-9](?:[a-z0-9._-]{1,30})[a-z0-9]$/;

async function pushEndpoint() {
  try {
    if (!('serviceWorker' in navigator)) return '';
    const registration = await navigator.serviceWorker.getRegistration();
    return (await registration?.pushManager.getSubscription())?.endpoint || '';
  } catch { return ''; }
}

function safeNext(value: string | null) {
  return value && /^\/(hoy|rutinas|dinero|gestiones)(?:[/?#]|$)/.test(value) ? value : '/hoy';
}

export default function AuthScreen({ mode, lang, next }: { mode: Mode; lang: Lang; next: string | null }) {
  const t = makeT(lang);
  const [usePin, setUsePin] = useState(false);
  const [name, setName] = useState(''), [username, setUsername] = useState(''), [password, setPassword] = useState(''), [confirm, setConfirm] = useState(''), [pin, setPin] = useState('');
  const [show, setShow] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState(''), [done, setDone] = useState(false), [shake, setShake] = useState(0);
  const errorRef = useRef<HTMLParagraphElement>(null);
  const register = mode === 'register';
  const destination = safeNext(next);

  const checks = useMemo(() => [
    { ok: password.length >= 8, label: t('8 caracteres o más') },
    { ok: /[a-zA-Z]/.test(password) && /\d/.test(password), label: t('Letras y números') },
    { ok: /[^a-zA-Z0-9]/.test(password) || password.length >= 14, label: t('Un símbolo o 14+ caracteres') },
  ], [password, t]);
  const strength = password ? checks.filter(check => check.ok).length + (password.length >= 12 ? 1 : 0) : 0;
  const strengthLabel = [t('Muy débil'), t('Débil'), t('Aceptable'), t('Buena'), t('Excelente')][strength];
  const cleanUser = username.trim().toLowerCase();
  const userHint = register && cleanUser && !USERNAME.test(cleanUser);

  function fail(message: string) { setError(message); setShake(value => value + 1); requestAnimationFrame(() => errorRef.current?.focus()); }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setError('');
    if (register) {
      if (!name.trim()) return fail(t('Escribe tu nombre.'));
      if (!USERNAME.test(cleanUser)) return fail(t('El usuario debe tener entre 3 y 32 caracteres: letras, números, punto, guion o guion bajo.'));
      if (!checks[0].ok || !checks[1].ok) return fail(t('La contraseña debe tener al menos 8 caracteres y combinar letras y números.'));
      if (password !== confirm) return fail(t('Las contraseñas no coinciden.'));
    } else if (usePin ? !/^\d{6}$/.test(pin) : !cleanUser || !password) return fail(usePin ? t('El PIN tiene 6 cifras.') : t('Escribe tu usuario y tu contraseña.'));
    setBusy(true);
    try {
      leaveDemo();
      const endpoint = await pushEndpoint();
      const url = register ? '/api/auth/register' : usePin ? '/api/session' : '/api/auth/login';
      const body = register ? { name, username: cleanUser, password } : usePin ? { pin, endpoint } : { username: cleanUser, password, endpoint };
      const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), cache: 'no-store' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(t(data.error || 'No se pudo iniciar sesión.'));
      acceptProfile(data.profile);
      try { localStorage.setItem('aurum-session-until', String(Date.now() + 30 * 86400000)); } catch { /* ignore */ }
      setDone(true);
      window.setTimeout(() => window.location.assign(destination), 650);
    } catch (reason) {
      fail(reason instanceof Error ? reason.message : t('No se pudo conectar. Vuelve a intentarlo.'));
      setBusy(false);
    }
  }

  const title = register ? t('Crea tu cuenta') : usePin ? t('Entrar con PIN') : t('Bienvenido de nuevo');
  const subtitle = register ? t('Gratis y en un minuto. Solo necesitas un usuario y una contraseña.') : usePin ? t('Para perfiles creados antes de las cuentas con usuario.') : t('Inicia sesión para ver tu día, tu dinero y tus gestiones.');

  return <div className="auth">
    <aside className="auth-showcase" aria-hidden="true">
      <div className="auth-orb orb-a"/><div className="auth-orb orb-b"/>
      <Link href="/" className="site-brand on-dark" tabIndex={-1}><LogoMark size={32}/><strong>luden</strong></Link>
      <div className="auth-showcase-copy">
        <h2>{t('Tu día, tu dinero y tus gestiones.')}</h2>
        <p>{t('Una sola app, privada y rápida, para organizarte sin esfuerzo.')}</p>
      </div>
      <div className="auth-cards">
        <div className="auth-card c1"><span className="space-icon tone-blue small"><WalletCards size={18}/></span><div><small>{t('Saldo disponible')}</small><b>{new Intl.NumberFormat(lang === 'en' ? 'en-GB' : 'es-ES', { style: 'currency', currency: 'EUR' }).format(2384.2)}</b></div></div>
        <div className="auth-card c2"><span className="space-icon tone-indigo small"><CalendarDays size={18}/></span><div><small>18:30</small><b>{t('Entreno')}</b></div></div>
        <div className="auth-card c3"><span className="space-icon tone-teal small"><Package size={18}/></span><div><small>{t('Gestiones')}</small><b>{t('Pedido enviado')}</b></div><Check size={18} className="ok"/></div>
      </div>
    </aside>

    <main className="auth-main">
      <div className="auth-top">
        <Link href="/" className="auth-back"><ArrowLeft size={17} aria-hidden="true"/>{t('Inicio')}</Link>
        <LangSwitch lang={lang} label={t('Idioma')} compact/>
      </div>
      <div className={`auth-panel${done ? ' is-done' : ''}`}>
        <Link href="/" className="site-brand auth-mobile-brand"><LogoMark size={32}/><strong>luden</strong></Link>
        <h1>{title}</h1>
        <p className="auth-subtitle">{subtitle}</p>

        <form className="auth-form" onSubmit={submit} noValidate key={shake} data-shake={shake > 0 ? 'true' : undefined}>
          {register && <label className="auth-field"><span>{t('Nombre')}</span><div className="auth-input"><UserRound size={18} aria-hidden="true"/><input name="name" autoComplete="name" value={name} onChange={event => setName(event.target.value)} maxLength={60} placeholder={t('Cómo quieres que te llamemos')} required autoFocus/></div></label>}
          {!usePin && <label className="auth-field"><span>{t('Usuario')}</span><div className={`auth-input${userHint ? ' is-invalid' : ''}`}><AtSign size={18} aria-hidden="true"/><input name="username" autoComplete="username" autoCapitalize="none" autoCorrect="off" spellCheck={false} inputMode="email" value={username} onChange={event => setUsername(event.target.value.replace(/\s/g, ''))} maxLength={32} placeholder={register ? t('p. ej. laura.gomez') : t('Tu usuario')} aria-describedby={register ? 'username-help' : undefined} required autoFocus={!register}/></div>{register && <small id="username-help" className={userHint ? 'is-invalid' : ''}>{t('3–32 caracteres: letras, números, punto, guion o guion bajo.')}</small>}</label>}
          {!usePin && <label className="auth-field"><span>{t('Contraseña')}</span><div className="auth-input"><LockKeyhole size={18} aria-hidden="true"/><input name="password" type={show ? 'text' : 'password'} autoComplete={register ? 'new-password' : 'current-password'} value={password} onChange={event => setPassword(event.target.value)} maxLength={128} placeholder={register ? t('Mínimo 8 caracteres') : t('Tu contraseña')} required aria-describedby={register ? 'password-strength' : undefined}/><button type="button" className="auth-eye" onClick={() => setShow(value => !value)} aria-label={show ? t('Ocultar contraseña') : t('Mostrar contraseña')} aria-pressed={show}>{show ? <EyeOff size={18}/> : <Eye size={18}/>}</button></div></label>}
          {register && <div className="auth-strength" id="password-strength" aria-live="polite">
            <div className="auth-meter" data-level={strength}>{[0, 1, 2, 3].map(index => <i key={index} className={index < strength ? 'on' : ''}/>)}</div>
            <div className="auth-strength-row"><span>{password ? strengthLabel : t('Seguridad de la contraseña')}</span></div>
            <ul>{checks.map(check => <li key={check.label} className={check.ok ? 'ok' : ''}><Check size={14} aria-hidden="true"/>{check.label}</li>)}</ul>
          </div>}
          {register && <label className="auth-field"><span>{t('Repite la contraseña')}</span><div className={`auth-input${confirm && confirm !== password ? ' is-invalid' : ''}`}><LockKeyhole size={18} aria-hidden="true"/><input name="confirm" type={show ? 'text' : 'password'} autoComplete="new-password" value={confirm} onChange={event => setConfirm(event.target.value)} maxLength={128} required/>{confirm && confirm === password && <Check size={18} className="auth-match" aria-label={t('Coinciden')}/>}</div></label>}
          {usePin && <label className="auth-field"><span>{t('PIN de 6 cifras')}</span><div className="auth-input"><KeyRound size={18} aria-hidden="true"/><input name="pin" type="password" inputMode="numeric" autoComplete="current-password" pattern="[0-9]{6}" maxLength={6} value={pin} onChange={event => setPin(event.target.value.replace(/\D/g, ''))} required autoFocus/></div></label>}

          {error && <p className="auth-error" role="alert" tabIndex={-1} ref={errorRef}><CircleAlert size={18} aria-hidden="true"/>{error}</p>}

          <button className="auth-submit" disabled={busy}>
            {done ? <><Check size={19} aria-hidden="true"/>{t('Listo')}</> : busy ? <><LoaderCircle size={19} className="spin" aria-hidden="true"/>{register ? t('Creando tu cuenta…') : t('Entrando…')}</> : <>{register ? t('Crear cuenta') : t('Iniciar sesión')}<ArrowRight size={18} aria-hidden="true"/></>}
          </button>
        </form>

        <div className="auth-divider"><span>{t('o')}</span></div>
        <Link className="auth-demo" href="/demo"><Play size={16} aria-hidden="true"/>{t('Probar la demo sin registrarte')}</Link>

        <p className="auth-switch">{register
          ? <>{t('¿Ya tienes cuenta?')} <Link href={'/login' + (next ? '?next=' + encodeURIComponent(next) : '')}>{t('Inicia sesión')}</Link></>
          : <>{t('¿Aún no tienes cuenta?')} <Link href={'/register' + (next ? '?next=' + encodeURIComponent(next) : '')}>{t('Crear cuenta')}</Link></>}</p>
        {!register && <button type="button" className="auth-pin-toggle" onClick={() => { setUsePin(value => !value); setError(''); }}>{usePin ? t('Entrar con usuario y contraseña') : t('¿Tu perfil usa PIN? Entrar con PIN')}</button>}
      </div>
    </main>
  </div>;
}
