import Link from 'next/link';
import { ArrowRight, BellRing, BookOpen, Download, HandCoins, Languages, LockKeyhole, MoonStar, PiggyBank, ShieldCheck, Smartphone, Target } from 'lucide-react';
import SiteNav from '@/components/public/site-nav';
import Reveal from '@/components/public/reveal';
import LangSwitch from '@/components/public/lang-switch';
import Showcase from '@/components/public/showcase';
import { LogoMark } from '@/components/logo';
import { makeT } from '@/lib/i18n';
import { requestLang } from '@/lib/i18n-server';
import { hasSession } from '@/lib/day-server';

const REPO = 'https://github.com/ludenelenterrador/luden.work';

export default async function Landing() {
  const lang = await requestLang(), t = makeT(lang);
  const signedIn = await hasSession().catch(() => false);
  const money = (value: number) => new Intl.NumberFormat(lang === 'en' ? 'en-GB' : 'es-ES', { style: 'currency', currency: 'EUR' }).format(value);
  const startHref = signedIn ? '/hoy' : '/register';
  const features = [
    { icon: Target, title: t('Límites por categoría'), text: t('Pon un tope a restaurantes u ocio y mira cuánto te queda este mes.') },
    { icon: PiggyBank, title: t('Ahorro por meses'), text: t('Reparte lo que ahorras entre meses sin mover dinero de cuenta.') },
    { icon: HandCoins, title: t('Deudas con historial'), text: t('Quién te debe, a quién debes y cada pago parcial, enlazado a tus movimientos.') },
    { icon: BellRing, title: t('Avisos a tiempo'), text: t('Cinco minutos antes de cada actividad y un recordatorio diario de lo pendiente.') },
    { icon: Smartphone, title: t('Como una app'), text: t('Añádela a la pantalla de inicio del iPhone o Android y ábrela a pantalla completa.') },
    { icon: Download, title: t('Tus datos, exportables'), text: t('Descarga una copia completa en JSON cuando quieras.') },
    { icon: MoonStar, title: t('Claro y oscuro'), text: t('Sigue el tema del sistema o elige el tuyo.') },
    { icon: Languages, title: t('Español e inglés'), text: t('Cambia de idioma en cualquier momento; fechas e importes se adaptan.') },
  ];
  const faqs = [
    { q: t('¿Cuánto cuesta?'), a: t('Nada. luden es gratuita, sin anuncios y sin planes de pago.') },
    { q: t('¿Se conecta a mi banco?'), a: t('No. Tú registras los movimientos, así que nadie más accede a tu banca. En iPhone puedes automatizar los gastos de Apple Pay con Atajos.') },
    { q: t('¿Quién puede ver mis datos?'), a: t('Solo tu cuenta. Cada perfil tiene sus propias tablas y el servidor valida la sesión en cada petición.') },
    { q: t('¿Puedo probarla sin registrarme?'), a: t('Sí. La demo funciona en tu navegador con datos de ejemplo y no guarda nada en el servidor.') },
    { q: t('¿Funciona en ordenador?'), a: t('Sí. En escritorio tienes barra lateral y vistas amplias; en el móvil, navegación inferior y formularios pensados para el teclado.') },
  ];
  return <div className="site">
    <a className="skip-link" href="#contenido">{t('Saltar al contenido')}</a>
    <SiteNav lang={lang} signedIn={signedIn}/>
    <Reveal/>
    <main id="contenido">
      <section className="hero">
        <div className="hero-copy">
          <p className="kicker">{t('Agenda, dinero y pedidos')}</p>
          <h1>{t('¿En qué se te van el día y el dinero?')}</h1>
          <p className="hero-lead">{t('luden es una app para organizar tu agenda, llevar tus cuentas y controlar tus pedidos. Funciona en el móvil y en el ordenador, y no necesita conectarse a tu banco.')}</p>
          <div className="hero-ctas">
            <Link className="btn btn-primary btn-lg" href={startHref}>{signedIn ? t('Abrir luden') : t('Empezar gratis')}<ArrowRight size={18} aria-hidden="true"/></Link>
            <Link className="btn btn-outline btn-lg" href="/demo">{t('Ver la demo')}</Link>
          </div>
          <p className="hero-note">{t('Gratis · Sin tarjeta · Listo en un minuto')}</p>
        </div>
        <div className="hero-visual" aria-hidden="true">
          <div className="hero-card hero-card-main">
            <div className="hc-head"><LogoMark size={20}/><span>{t('Este mes')}</span></div>
            <small className="hc-label"><span className="hc-dot"/>{t('Disponible para gastar')}</small>
            <strong className="hc-amount">{money(2384.2)}</strong>
            <div className="hc-bar"><i/></div>
            <dl className="hc-rows">
              <div><dt>{t('Ingresos')}</dt><dd className="pos">+{money(1725)}</dd></div>
              <div><dt>{t('Gastos')}</dt><dd>−{money(803.43)}</dd></div>
              <div><dt>{t('En ahorro')}</dt><dd>{money(2900)}</dd></div>
            </dl>
            <p className="hc-foot">{t('Restaurantes: quedan {0} este mes', { 0: money(35.5) })}</p>
          </div>
          <div className="hero-card hero-card-mini">
            <span className="sc-icon violet"><BookOpen size={18}/></span>
            <div><small>{t('Ahora')}</small><b>{t('Estudio')}</b></div>
            <span className="hc-time">42 min</span>
          </div>
        </div>
      </section>

      <section className="site-section what" data-reveal>
        <div className="narrow">
          <h2>{t('¿Qué es luden?')}</h2>
          <p>{t('luden es una app web para llevar el día a día: qué tienes que hacer, cuánto dinero tienes y en qué punto está cada pedido. Se usa desde el navegador del móvil o del ordenador, sin instalar nada, y cada cuenta guarda sus datos por separado.')}</p>
        </div>
      </section>

      <section className="site-section alt" id="funciones">
        <div className="section-head" data-reveal><h2>{t('Cómo funciona luden')}</h2><p>{t('Cuatro espacios que se usan por separado y comparten tu información.')}</p></div>
        <div data-reveal><Showcase lang={lang}/></div>
      </section>

      <section className="site-section" id="detalles">
        <div className="section-head" data-reveal><h2>{t('Lo que viene incluido')}</h2></div>
        <div className="feature-grid">{features.map(({ icon: Icon, title, text }, index) => <article className="feature" key={title} data-reveal style={{ transitionDelay: (index % 4) * 50 + 'ms' }}><span className="feature-icon"><Icon size={20} aria-hidden="true"/></span><h3>{title}</h3><p>{text}</p></article>)}</div>
      </section>

      <section className="site-section alt" id="privacidad">
        <div className="privacy" data-reveal>
          <div className="privacy-copy"><h2>{t('Tus datos son tuyos.')}</h2><p>{t('Sin anuncios, sin rastreadores y sin vender información. El código es público para que cualquiera pueda revisarlo.')}</p><a className="text-link" href={REPO} target="_blank" rel="noreferrer">{t('Ver el código en GitHub')}<ArrowRight size={16} aria-hidden="true"/></a></div>
          <ul className="privacy-list">
            <li><LockKeyhole size={18} aria-hidden="true"/><div><b>{t('Contraseñas cifradas')}</b><span>{t('Se guardan con scrypt y sal única; nunca en texto plano.')}</span></div></li>
            <li><ShieldCheck size={18} aria-hidden="true"/><div><b>{t('Sesión segura')}</b><span>{t('Cookie HttpOnly firmada y comprobada en el servidor en cada petición.')}</span></div></li>
            <li><Smartphone size={18} aria-hidden="true"/><div><b>{t('Datos separados')}</b><span>{t('Cada cuenta tiene sus propias tablas. Nadie más ve tus movimientos.')}</span></div></li>
          </ul>
        </div>
      </section>

      <section className="site-section" id="preguntas">
        <div className="section-head" data-reveal><h2>{t('Preguntas frecuentes')}</h2></div>
        <div className="faq">{faqs.map(item => <details key={item.q} data-reveal><summary>{item.q}</summary><p>{item.a}</p></details>)}</div>
      </section>

      <section className="cta-band" data-reveal>
        <h2>{t('Empieza hoy, en un minuto.')}</h2>
        <p>{t('Crea tu cuenta gratis o prueba la demo con datos de ejemplo.')}</p>
        <div className="hero-ctas center"><Link className="btn btn-light btn-lg" href={startHref}>{signedIn ? t('Abrir luden') : t('Empezar gratis')}<ArrowRight size={18} aria-hidden="true"/></Link><Link className="btn btn-ghost-light btn-lg" href="/demo">{t('Ver la demo')}</Link></div>
      </section>
    </main>
    <footer className="site-footer">
      <div className="site-footer-inner">
        <Link href="/" className="site-brand"><LogoMark size={26}/><strong>luden</strong></Link>
        <nav aria-label={t('Enlaces del pie')}><a href="#funciones">{t('Funciones')}</a><a href="#privacidad">{t('Privacidad')}</a><Link href="/demo">{t('Demo')}</Link><Link href="/login">{t('Iniciar sesión')}</Link><a href={REPO} target="_blank" rel="noreferrer">GitHub</a></nav>
        <LangSwitch lang={lang} label={t('Idioma')} compact/>
      </div>
      <p className="site-copy">© {new Date().getFullYear()} luden</p>
    </footer>
  </div>;
}
