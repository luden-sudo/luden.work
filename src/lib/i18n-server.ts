import { cookies, headers } from 'next/headers';
import { LANG_COOKIE, normalizeLang, preferredLang, type Lang } from './i18n';

/** Language for this request: saved choice first, then the browser's Accept-Language. */
export async function requestLang(): Promise<Lang> {
  const saved = normalizeLang((await cookies()).get(LANG_COOKIE)?.value);
  if (saved) return saved;
  const accept = (await headers()).get('accept-language') || '';
  return accept ? preferredLang(accept.split(',')) : 'es';
}
