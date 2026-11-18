"use client";

import Link from "next/link";
import { ArrowRight, Gamepad2, Keyboard, Trophy, Users } from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";
import { Button } from "@/components/ui/button";
import { Horizon } from "@/components/layout/crt";
import { BrandMark, Footer, Wordmark } from "@/components/layout/shell";
import { Avatar } from "@/components/ui/primitives";
import useSWR from "swr";
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/primitives";
import { fetcher } from "@/lib/api";

// the court runs the game engine in the browser: loaded after the page, client only
const AttractCourt = dynamic(() => import("@/components/game/attract").then((m) => m.AttractCourt), {
  ssr: false,
  loading: () => <Skeleton className="aspect-[16/10] !h-auto w-full" />,
});

const FEATURES = [
  { key: "online", icon: Gamepad2 },
  { key: "tournaments", icon: Trophy },
  { key: "friends", icon: Users },
  { key: "local", icon: Keyboard },
] as const;

export function Landing() {
  const { t, href } = useI18n();
  // Better Auth's session endpoint answers 200 + null for guests (no 401 in the console,
  // unlike /api/me), so the public landing page can ask it safely
  const { data: session, isLoading } = useSWR<{ user: { username?: string; displayUsername?: string; name: string; image?: string | null } } | null>(
    "/api/auth/get-session",
    fetcher,
    { revalidateOnFocus: false },
  );
  const u = session?.user;
  const me = u?.username ? { username: u.username, displayName: u.displayUsername || u.name, avatar: u.image ?? null } : null;
  // signed in: the way in is the lobby, not sign-up
  const playHref = me ? href("/lobby") : href("/signup");
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto flex w-full max-w-[1440px] items-center justify-between gap-3 px-4 py-4 md:px-8">
        <Wordmark href={href("/")} />
        <nav className="flex min-h-9 flex-wrap items-center justify-end gap-2" aria-label={t("nav.mainNav")}>
          {isLoading ? null : me ? (
            <>
              <Button asChild size="sm">
                <Link href={href("/lobby")} className="no-underline">
                  {t("landing.goToLobby")}
                  <ArrowRight className="ico" aria-hidden />
                </Link>
              </Button>
              <Link href={href(`/profile/${me.username}`)} aria-label={t("nav.profile")} className="no-underline">
                <Avatar name={me.displayName} src={me.avatar} size="sm" />
              </Link>
            </>
          ) : (
            <>
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
            </>
          )}
        </nav>
      </header>

      <main id="main" className="flex-1">
        <section className="power-on relative overflow-hidden px-4 pb-24 pt-10 md:px-8 md:pt-16">
          <Horizon />
          <div className="relative z-10 mx-auto grid max-w-[1200px] items-center gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
            <div className="flex flex-col items-center gap-5 text-center lg:items-start lg:text-left">
              <p className="pix pix-sm c-amber">{t("landing.insertCoin")}</p>
              <h1 className="text-[26px] leading-[38px] sm:text-[36px] sm:leading-[48px]">
                <BrandMark />
              </h1>
              <p className="max-w-[460px] text-[17px] leading-[26px] text-fg-muted">
                {me ? t("landing.welcomeBack", { name: me.displayName }) : t("landing.tagline")}
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3 lg:justify-start">
                <Button asChild variant="primary" size="xl" glow="md">
                  <Link href={playHref} className="no-underline">
                    {t("landing.play")}
                  </Link>
                </Button>
                <Link href={href("/local")} className="t-label">
                  {t("landing.localLink")}
                </Link>
              </div>
            </div>
            <div className="w-full">
              <AttractCourt signedIn={!!me} playHref={playHref} />
            </div>
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
