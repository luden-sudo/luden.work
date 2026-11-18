import { t, tv } from "@/lib/i18n";
import { LogoMark } from './logo';
import Link from 'next/link';
import { Sun, CalendarDays, WalletCards, Package } from 'lucide-react';
export default function AreaNav({active}:{active:'hoy'|'rutinas'|'dinero'|'gestiones'}) {
  return <nav className="area-nav" aria-label={t("Secciones de la app")}>{[{id:'hoy',href:'/hoy',label:t("Hoy"),Icon:Sun},{id:'rutinas',href:'/rutinas',label:t("Agenda"),Icon:CalendarDays},{id:'dinero',href:'/dinero',label:t("Dinero"),Icon:WalletCards},{id:'gestiones',href:'/gestiones',label:t("Gestiones"),Icon:Package}].map(item=><Link key={item.id} href={item.href} aria-current={active===item.id?'page':undefined}><item.Icon size={19} aria-hidden="true"/>{tv(item.label)}</Link>)}</nav>;
}

export function AppSidebar({active,profileName}:{active:'hoy'|'rutinas'|'dinero'|'gestiones';profileName?:string}) {
  return <aside className="app-sidebar"><Link className="app-brand" href="/hoy" aria-label="luden"><LogoMark size={34}/><strong>luden</strong></Link><AreaNav active={active}/><div className="app-sidebar-profile"><span>{(profileName||'luden').slice(0,1).toUpperCase()}</span><div><strong>{tv(profileName||'luden')}</strong><small>{t("Tu espacio personal")}</small></div></div></aside>;
}
