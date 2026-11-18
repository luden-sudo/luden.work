"use client";
import { Languages } from 'lucide-react';
import { setLang, type Lang } from '@/lib/i18n';

/** Two-option language control. Saves the choice and reloads the page in that language. */
export default function LangSwitch({ lang, label, compact = false }: { lang: Lang; label: string; compact?: boolean }) {
  return <div className={`lang-switch${compact ? ' is-compact' : ''}`} role="group" aria-label={label}>
    {!compact && <Languages size={16} aria-hidden="true"/>}
    {(['es', 'en'] as const).map(code => <button key={code} type="button" lang={code} aria-pressed={lang === code} onClick={() => { if (code !== lang) setLang(code); }}>{code.toUpperCase()}</button>)}
  </div>;
}
