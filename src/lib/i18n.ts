// Lightweight bilingual layer. Spanish is the source language: every UI string is
// written in Spanish and wrapped in t(); English comes from the dictionary.
// Missing entries fall back to the Spanish text, so nothing ever renders empty.
import { en as appEn } from './i18n-en';
import { enPublic } from './i18n-en-public';

const en: Record<string, string> = { ...appEn, ...enPublic };

export type Lang = 'es' | 'en';
export const LANGS: readonly Lang[] = ['es', 'en'];
export const LANG_COOKIE = 'luden-lang';
const STORAGE_KEY = 'luden-lang';

export function normalizeLang(value: unknown): Lang | null {
  if (typeof value !== 'string') return null;
  const code = value.trim().toLowerCase().slice(0, 2);
  return code === 'en' ? 'en' : code === 'es' ? 'es' : null;
}

/** Picks a language from an Accept-Language header (server) or navigator.languages (client). */
export function preferredLang(candidates: readonly string[]): Lang {
  for (const item of candidates) {
    const lang = normalizeLang(item.split(';')[0]);
    if (lang) return lang;
  }
  return 'en';
}

function readCookie(name: string) {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.split('; ').find(part => part.startsWith(name + '='));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
}

// Same order as the server (cookie, then the language the server rendered), so
// server-rendered pages and client screens always agree.
function detectClientLang(): Lang {
  if (typeof window === 'undefined') return 'es';
  const cookie = normalizeLang(readCookie(LANG_COOKIE));
  if (cookie) return cookie;
  const html = normalizeLang(document.documentElement.lang);
  if (html) return html;
  try {
    const stored = normalizeLang(window.localStorage.getItem(STORAGE_KEY));
    if (stored) return stored;
  } catch { /* storage can be blocked */ }
  return preferredLang(navigator.languages?.length ? navigator.languages : [navigator.language || 'es']);
}

let current: Lang = detectClientLang();

export function getLang(): Lang { return current; }
export function locale(lang: Lang = current) { return lang === 'en' ? 'en-GB' : 'es-ES'; }

/** Persists the language and reloads so every screen, date and number re-renders in it. */
export function setLang(lang: Lang) {
  current = lang;
  try { window.localStorage.setItem(STORAGE_KEY, lang); } catch { /* ignore */ }
  document.cookie = `${LANG_COOKIE}=${lang};path=/;max-age=${60 * 60 * 24 * 365};samesite=lax`;
  document.documentElement.lang = lang;
  window.location.reload();
}

type Vars = Record<string, string | number>;
const fill = (text: string, vars?: Vars) => vars ? text.replace(/\{(\w+)\}/g, (all, key) => key in vars ? String(vars[key]) : all) : text;

// Server messages that embed a value: translated by shape instead of exact text.
const patterns: [RegExp, (...parts: string[]) => string][] = [
  [/^«(.+)» ya empieza a esa hora en uno de esos días\. Elige otra hora o edita esa actividad\.$/, title => `“${title}” already starts at that time on one of those days. Choose another time or edit that activity.`],
  [/^«(.+)» debe terminar después de empezar\.$/, title => `“${title}” must end after it starts.`],
  [/^Indica hasta qué hora dura «(.+)»\.$/, title => `Set when “${title}” ends.`],
  [/^«(.+)» coincide con «(.+)»\. Ajusta su hora de fin o quita una de ellas\.$/, (a, b) => `“${a}” overlaps with “${b}”. Adjust its end time or remove one of them.`],
];

function translate(lang: Lang, text: string, vars?: Vars): string {
  if (lang === 'es' || !text) return fill(text, vars);
  const direct = en[text];
  if (direct !== undefined) return fill(direct, vars);
  const trimmed = text.trim();
  if (trimmed && trimmed !== text && en[trimmed] !== undefined) return text.replace(trimmed, fill(en[trimmed], vars));
  for (const [pattern, replace] of patterns) {
    const match = trimmed.match(pattern);
    if (match) return replace(...match.slice(1));
  }
  return fill(text, vars);
}

/**
 * Translates a Spanish UI string. Accepts dynamic server messages too: when the
 * exact text is unknown it is returned unchanged. Placeholders use {name}.
 */
export function t(text: string, vars?: Vars): string { return translate(current, text, vars); }

/** Translator bound to a language: used by server-rendered pages (landing, login). */
export function makeT(lang: Lang) { return (text: string, vars?: Vars) => translate(lang, text, vars); }

/** Translates a value rendered in JSX when it is a known UI string; any other value passes through untouched. */
export function tv<T>(value: T): T {
  return (typeof value === 'string' && current !== 'es' ? t(value) : value) as T;
}

/** Locale-aware date formatting. */
export function formatDate(value: Date | number, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat(locale(), options).format(value);
}
