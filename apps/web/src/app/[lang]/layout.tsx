import type { Metadata, Viewport } from "next";
import { Press_Start_2P, Outfit, JetBrains_Mono } from "next/font/google";
import { getDictionary } from "@/i18n/dictionaries";
import { LOCALES } from "@/i18n/config";
import { Providers } from "@/components/layout/providers";
import { CRTFrame } from "@/components/layout/crt";
import "../globals.css";

const display = Press_Start_2P({ weight: "400", subsets: ["latin", "latin-ext"], variable: "--font-press-start", display: "swap" });
const body = Outfit({ subsets: ["latin", "latin-ext"], variable: "--font-outfit", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin", "latin-ext"], variable: "--font-jetbrains", display: "swap" });

export async function generateStaticParams() {
  return LOCALES.map((lang) => ({ lang }));
}

export async function generateMetadata(): Promise<Metadata> {
  const { dict } = await getDictionary();
  return {
    title: { default: dict.meta.title, template: `%s · ${dict.meta.title}` },
    description: dict.meta.description,
  };
}

export const viewport: Viewport = {
  themeColor: "#0b0614",
  colorScheme: "dark",
};

export default async function RootLayout({ children }: LayoutProps<"/[lang]">) {
  const { locale, dict } = await getDictionary();
  return (
    <html lang={locale} className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body>
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70] btn">
          {dict.nav.skip}
        </a>
        <Providers locale={locale} dict={dict}>
          {children}
        </Providers>
        <CRTFrame />
      </body>
    </html>
  );
}
