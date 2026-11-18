"use client";
import { useState, type FormEvent } from 'react';
import { AtSign, Check, LockKeyhole, LogOut } from 'lucide-react';
import LangSwitch from './public/lang-switch';
import { getLang, t, tv } from '@/lib/i18n';
import { demoActive, leaveDemo } from '@/lib/demo';

function storedProfile(): { hasAccount?: boolean } {
  try { return JSON.parse(sessionStorage.getItem('aurum-profile') || '{}'); } catch { return {}; }
}

export async function signOut() {
  try { await fetch('/api/session', { method: 'DELETE' }); } catch { /* offline: the cookie expires on its own */ }
  leaveDemo();
  try { sessionStorage.removeItem('aurum-profile'); localStorage.removeItem('aurum-session-until'); } catch { /* ignore */ }
  // A full load drops any demo fetch layer and cached screen state.
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination
  window.location.assign('/');
}

/** Language, sign-in method and sign-out, shared by the Money and My day settings. */
export default function AccountSettings() {
  const [hasAccount, setHasAccount] = useState(() => storedProfile().hasAccount !== false);
  const [username, setUsername] = useState(''), [password, setPassword] = useState(''), [busy, setBusy] = useState(false), [message, setMessage] = useState(''), [error, setError] = useState('');
  const demo = demoActive();
  async function link(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(''); setMessage('');
    try {
      const response = await fetch('/api/auth/link', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: username.trim().toLowerCase(), password }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(t(data.error || 'No se pudo crear el usuario. Vuelve a intentarlo.'));
      setHasAccount(true); setMessage(t('Usuario creado. Ya puedes entrar con tu usuario y contraseña.'));
      try { sessionStorage.setItem('aurum-profile', JSON.stringify({ ...storedProfile(), hasAccount: true })); } catch { /* ignore */ }
    } catch (reason) { setError((reason as Error).message); } finally { setBusy(false); }
  }
  return <section className="panel account-settings">
    <div className="panel-heading"><h2>{t('Cuenta y acceso')}</h2></div>
    <div className="panel-body">
      <div className="account-row"><span>{t('Idioma')}</span><LangSwitch lang={getLang()} label={t('Idioma')}/></div>
      {demo ? <p className="help">{t('Estás en la demo. Crea una cuenta para guardar tus datos.')}</p>
        : hasAccount ? <p className="help account-ok"><Check size={16} aria-hidden="true"/>{tv(message || t('Entras con usuario y contraseña.'))}</p>
        : <form className="account-link" onSubmit={link}>
            <p className="help">{t('Tu perfil todavía entra con PIN. Crea un usuario y una contraseña para entrar desde cualquier dispositivo.')}</p>
            <label><span>{t('Usuario')}</span><div className="auth-input"><AtSign size={18} aria-hidden="true"/><input value={username} onChange={event => setUsername(event.target.value.replace(/\s/g, ''))} autoComplete="username" autoCapitalize="none" spellCheck={false} maxLength={32} required/></div></label>
            <label><span>{t('Contraseña')}</span><div className="auth-input"><LockKeyhole size={18} aria-hidden="true"/><input type="password" value={password} onChange={event => setPassword(event.target.value)} autoComplete="new-password" minLength={8} maxLength={128} placeholder={t('Mínimo 8 caracteres')} required/></div></label>
            {error && <p className="mg-error" role="alert">{error}</p>}
            <button className="secondary" disabled={busy}>{t('Crear usuario')}</button>
          </form>}
      <button className="secondary account-signout" type="button" onClick={() => void signOut()}><LogOut size={18} aria-hidden="true"/>{demo ? t('Salir de la demo') : t('Cerrar sesión')}</button>
    </div>
  </section>;
}
