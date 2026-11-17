"use client";

import Link from "next/link";
import { Gamepad2, Keyboard, Trophy, Users } from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";
import { Button } from "@/components/ui/button";
import { Horizon } from "@/components/layout/crt";
import { Footer, Wordmark } from "@/components/layout/shell";

const FEATURES = [
  { key: "online", icon: Gamepad2 },
  { key: "tournaments", icon: Trophy },
  { key: "friends", icon: Users },
  { key: "local", icon: Keyboard },
] as const;

export function Landing() {
  const { t, href } = useI18n();
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto flex w-full max-w-[1440px] items-center justify-between gap-3 px-4 py-4 md:px-8">
        <Wordmark href={href("/")} />
        <nav className="flex flex-wrap items-center justify-end gap-2" aria-label={t("nav.mainNav")}>
          <Button asChild variant="ghost" size="sm">
            <Link href={href("/login")} className="no-underline">
              {t("nav.login")}
            </Link>
          </Button>
          <Button asChild size="sm">
            <Link href={href("/signup")} className="no-underline">
              {t("nav.signup")}
            </Link>
          </Button>
        </nav>
      </header>

      <main id="main" className="flex-1">
        <section className="power-on relative flex min-h-[620px] flex-col items-center justify-start gap-6 overflow-hidden px-4 pb-64 pt-16 text-center">
          <Horizon />
          <div className="relative z-10 flex flex-col items-center gap-6">
            <p className="pix pix-sm c-amber">{t("landing.insertCoin")}</p>
            <h1 className="pix text-[22px] leading-[34px] sm:text-[32px] sm:leading-[44px]">
              <span className="normal-case">ft_transcendence</span>
            </h1>
            <p className="max-w-[520px] text-[17px] leading-[26px] text-fg-muted">{t("landing.tagline")}</p>
            <Button asChild variant="primary" size="xl" glow="md">
              <Link href={href("/signup")} className="no-underline">
                {t("landing.play")}
              </Link>
            </Button>
            <Link href={href("/local")} className="t-label">
              {t("landing.localLink")}
            </Link>
          </div>
        </section>

        <section className="mx-auto grid max-w-[1120px] gap-4 px-4 pb-16 sm:grid-cols-2 lg:grid-cols-4 md:px-8">
          {FEATURES.map(({ key, icon: Icon }) => (
            <article key={key} className="panel">
              <Icon className="ico mb-3 c-cyan" aria-hidden />
              <h2 className="t-heading mb-1">{t(`landing.features.${key}.title`)}</h2>
              <p className="muted">{t(`landing.features.${key}.body`)}</p>
            </article>
          ))}
        </section>
      </main>

      <Footer />
    </div>
  );
}
