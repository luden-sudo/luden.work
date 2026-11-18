"use client";
// The private app screens render only in the browser: they read the saved language,
// theme and session there, so the server sends a neutral skeleton instead.
import dynamic from 'next/dynamic';

function AppLoading() {
  return <main className="skeleton-screen" aria-busy="true"><div className="skeleton-page"><span className="skeleton skeleton-title"/><span className="skeleton skeleton-hero"/><div className="skeleton-cards"><span className="skeleton skeleton-card"/><span className="skeleton skeleton-card"/></div></div></main>;
}

export const DayScreen = dynamic(() => import('./day-app'), { ssr: false, loading: AppLoading });
export const MoneyScreen = dynamic(() => import('./aurum-app'), { ssr: false, loading: AppLoading });
export const OrdersScreen = dynamic(() => import('./management-app'), { ssr: false, loading: AppLoading });
