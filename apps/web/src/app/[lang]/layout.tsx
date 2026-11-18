import type { Metadata, Viewport } from "next";
import { BOOT_SCRIPT, BootScreen } from "@/components/arcade/boot-screen";
import { Press_Start_2P, Outfit, JetBrains_Mono, Pixelify_Sans, VT323 } from "next/font/google";
import { getDictionary } from "@/i18n/dictionaries";
import { LOCALES } from "@/i18n/config";
import { Providers } from "@/components/layout/providers";
import { CRTFrame } from "@/components/layout/crt";
import { APP_BACKGROUND, PWA_ICONS } from "@/lib/pwa";
import "../globals.css";

// Fonts are not preloaded: Firefox fetches a preloaded font a second time for @font-face and
// then warns that the preload went unused. They still load right away from the CSS, and the
// size-adjusted fallbacks keep layout stable meanwhile. "latin" covers every EN/ES/FR character.
const display = Press_Start_2P({ weight: "400", subsets: ["latin"], variable: "--font-press-start", display: "swap", preload: false });
const body = Outfit({ subsets: ["latin"], variable: "--font-outfit", display: "swap", preload: false });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains", display: "swap", preload: false });
// arcade display (default on): readable pixel fonts for body text and numbers
const pixelBody = Pixelify_Sans({ subsets: ["latin"], variable: "--font-pixelify", display: "swap", preload: false });
const pixelMono = VT323({ weight: "400", subsets: ["latin"], variable: "--font-vt323", display: "swap", preload: false });

export async function generateStaticParams() {
  return LOCALES.map((lang) => ({ lang }));
}

export async function generateMetadata(): Promise<Metadata> {
  const { dict } = await getDictionary();
  return {
    title: { default: dict.meta.title, template: `%s · ${dict.meta.title}` },
    description: dict.meta.description,
    icons: { apple: PWA_ICONS.apple },
    appleWebApp: { capable: true, title: dict.meta.title, statusBarStyle: "black-translucent" },
  };
}

export const viewport: Viewport = {
  themeColor: APP_BACKGROUND,
  colorScheme: "dark",
};

export default async function RootLayout({ children }: LayoutProps<"/[lang]">) {
  const { locale, dict } = await getDictionary();
  return (
    // suppressHydrationWarning: the boot script may add data-booted before React hydrates
    <html lang={locale} className={`arcade ${display.variable} ${body.variable} ${mono.variable} ${pixelBody.variable} ${pixelMono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: BOOT_SCRIPT }} />
      </head>
      <body>
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70] btn">
          {dict.nav.skip}
        </a>
        <Providers locale={locale} dict={dict}>
          {/* inside the providers: BIT reads the motion preference */}
          <BootScreen insertCoin={dict.landing.insertCoin} />
          {children}
        </Providers>
        <CRTFrame />
        {/* mosaic filter that turns photos into pixel art (arcade display, styles/arcade.css) */}
        <svg width="0" height="0" aria-hidden focusable="false" style={{ position: "absolute" }}>
          <filter id="vx-pixelate" x="0" y="0" width="1" height="1">
            <feFlood x="2" y="2" width="1" height="1" />
            <feComposite width="6" height="6" />
            <feTile result="grid" />
            <feComposite in="SourceGraphic" in2="grid" operator="in" />
            <feMorphology operator="dilate" radius="3" />
          </filter>
        </svg>
      </body>
    </html>
  );
}
