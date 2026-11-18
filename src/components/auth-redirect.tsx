"use client";
import { useEffect } from 'react';
import { LoadingSkeleton } from './loading-skeleton';
import { t } from '@/lib/i18n';

/** Sends a signed-out visitor to the login page and brings them back afterwards. */
export default function AuthRedirect() {
  useEffect(() => {
    const next = window.location.pathname + window.location.search;
    window.location.replace('/login?next=' + encodeURIComponent(next));
  }, []);
  return <main className="skeleton-screen"><LoadingSkeleton label={t('Cargando…')}/></main>;
}
