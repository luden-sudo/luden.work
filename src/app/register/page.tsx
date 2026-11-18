import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import AuthScreen from '@/components/public/auth-screen';
import { makeT } from '@/lib/i18n';
import { requestLang } from '@/lib/i18n-server';
import { hasSession } from '@/lib/day-server';

export async function generateMetadata(): Promise<Metadata> {
  const t = makeT(await requestLang());
  return { title: t('Crear cuenta'), robots: { index: true } };
}

export default async function Page({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  if (await hasSession().catch(() => false)) redirect(next && /^\/(hoy|rutinas|dinero|gestiones)/.test(next) ? next : '/hoy');
  return <AuthScreen mode="register" lang={await requestLang()} next={typeof next === 'string' ? next : null}/>;
}
