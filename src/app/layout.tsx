import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Schibsted_Grotesk } from "next/font/google";
import "./globals.css";
import "./day.css";
import "./app-chrome.css";
import "./responsive.css";
import "./form-sheets.css";
import "./apple-interface.css";
import "./public.css";
import "./app-editorial.css";
import ViewportSizing from "@/components/viewport-sizing";
import DemoBoot from "@/components/demo-boot";
import { makeT } from "@/lib/i18n";
import { requestLang } from "@/lib/i18n-server";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const display = Schibsted_Grotesk({ variable: "--font-schibsted", subsets: ["latin"], display: "swap" });
const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://luden.work";

export async function generateMetadata(): Promise<Metadata> {
  const lang = await requestLang(), t = makeT(lang);
  const title = t("luden · Tu día, tu dinero y tus gestiones");
  const description = t("Agenda, finanzas personales y pedidos en una sola app privada para móvil y escritorio. Gratis, bilingüe y sin anuncios.");
  return {
    metadataBase: new URL(SITE),
    title: { default: title, template: "%s · luden" },
    description,
    applicationName: "luden",
    alternates: { canonical: "/" },
    openGraph: { type: "website", siteName: "luden", title, description, locale: lang === "en" ? "en_GB" : "es_ES", alternateLocale: lang === "en" ? "es_ES" : "en_GB" },
    twitter: { card: "summary", title, description },
    appleWebApp: { capable: true, title: "luden", statusBarStyle: "default" },
    manifest: "/manifest.webmanifest",
    icons: { icon: "/favicon.svg", apple: "/icons/icon-180.png" },
    formatDetection: { telephone: false },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [{ media: "(prefers-color-scheme: light)", color: "#f5f5f7" }, { media: "(prefers-color-scheme: dark)", color: "#000000" }],
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const lang = await requestLang();
  return <html lang={lang} className={`${geistSans.variable} ${geistMono.variable} ${display.variable}`}><body><ViewportSizing/><DemoBoot/>{children}</body></html>;
}
