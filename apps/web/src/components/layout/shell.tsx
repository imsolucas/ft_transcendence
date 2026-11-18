"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Gamepad2, Home, Joystick, LogOut, MessageSquare, Settings, User, Users, Trophy, Bot } from "lucide-react";
import type { ReactNode } from "react";
import { useI18n } from "@/i18n/I18nProvider";
import { useMe } from "@/lib/session";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/cn";
import { BRAND } from "@/lib/brand";
import { Avatar, Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger, Skeleton } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "./language-switcher";
import useSWR from "swr";
import { RealtimeProvider } from "@/lib/realtime";
import { CountBadge } from "@/components/ui/primitives";

/** "VOLLEY" + a magenta ".EXE": the product's logo (also used, bigger, in the landing hero). */
export function BrandMark({ className }: { className?: string }) {
  return (
    <span className={cn("pix whitespace-nowrap", className)}>
      <span className="sr-only">{BRAND}</span>
      <span aria-hidden>VOLLEY</span>
      <span aria-hidden className="c-magenta">
        .EXE
      </span>
    </span>
  );
}

export function Wordmark({ href, className }: { href: string; className?: string }) {
  return (
    <Link href={href} className={cn("pix-sm min-w-0 truncate no-underline text-fg hover:text-fg max-[400px]:text-[11px]", className)}>
      <BrandMark />
    </Link>
  );
}

const NAV = [
  { path: "/lobby", key: "nav.lobby", icon: Home },
  { path: "/arcade", key: "nav.arcade", icon: Joystick },
  { path: "/friends", key: "nav.friends", icon: Users },
  { path: "/chat", key: "nav.chat", icon: MessageSquare },
  { path: "/leaderboard", key: "nav.leaderboard", icon: Trophy },
  { path: "/coach", key: "nav.coach", icon: Bot },
] as const;

/**
 * Logged-in shell: 64px top bar (logo, main nav, Play, settings, avatar) and, on mobile,
 * logo + Play on top and a five-item tab bar at the bottom.
 * `playPrimary`: the top-bar Play button is primary only when the page has no primary of its own.
 */
export function AppShell(props: { children: ReactNode; playPrimary?: boolean }) {
  return (
    <RealtimeProvider>
      <Shell {...props} />
    </RealtimeProvider>
  );
}

function Shell({ children, playPrimary = false }: { children: ReactNode; playPrimary?: boolean }) {
  const { t, href } = useI18n();
  const pathname = usePathname();
  const router = useRouter();
  const { me, isLoading } = useMe();

  const { data: unread } = useSWR<{ count: number }>(me ? "/api/chat/unread" : null, { refreshInterval: 30000 });
  const badge = (path: string) => (path === "/chat" && unread?.count ? <CountBadge count={unread.count} label={t("chat.unread", { n: unread.count })} /> : null);

  const isActive = (path: string) => pathname === href(path) || pathname.startsWith(`${href(path)}/`);

  async function logout() {
    await authClient.signOut();
    // full load: leaves no signed-in data in client caches
    window.location.assign(href("/"));
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-20 h-16 border-b border-border bg-surface-2">
        <div className="mx-auto flex h-full max-w-[1440px] min-w-0 items-center gap-2 px-4 md:gap-4 md:px-8">
          <Wordmark href={href("/lobby")} />
          <nav aria-label={t("nav.mainNav")} className="ml-4 hidden items-center gap-1 md:flex">
            {NAV.map(({ path, key, icon: Icon }) => (
              <Link
                key={path}
                href={href(path)}
                aria-current={isActive(path) ? "page" : undefined}
                className={cn(
                  "btn btn-ghost btn-sm no-underline",
                  isActive(path) && "!bg-surface-3 !text-fg"
                )}
              >
                <Icon className="ico" aria-hidden />
                {t(key)}
                {badge(path)}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex shrink-0 items-center gap-2">
            <Button asChild variant={playPrimary ? "primary" : "secondary"} glow={playPrimary ? "sm" : "none"} size="sm">
              <Link href={href("/lobby#play")} className="no-underline">
                <Gamepad2 className="ico" aria-hidden />
                {t("common.play")}
              </Link>
            </Button>
            <Link href={href("/settings")} className="icon-btn hidden md:inline-flex" aria-label={t("nav.settings")} title={t("nav.settings")}>
              <Settings className="ico" aria-hidden />
            </Link>
            {isLoading || !me ? (
              <Skeleton circle className="!h-8 !w-8" />
            ) : (
              <Menu>
                <MenuTrigger asChild>
                  <button type="button" className="rounded-full" aria-label={t("nav.menu")}>
                    <Avatar name={me.displayName} src={me.avatar} look={me.look} size="sm" />
                  </button>
                </MenuTrigger>
                <MenuContent>
                  <div className="px-3 py-2">
                    <p className="t-strong truncate">{me.displayName}</p>
                    <p className="t-caption subtle truncate">@{me.username}</p>
                  </div>
                  <MenuSeparator />
                  <MenuItem onSelect={() => router.push(href(`/profile/${me.username}`))}>
                    <User className="ico" aria-hidden /> {t("nav.profile")}
                  </MenuItem>
                  <MenuItem onSelect={() => router.push(href("/settings"))}>
                    <Settings className="ico" aria-hidden /> {t("nav.settings")}
                  </MenuItem>
                  <MenuSeparator />
                  <MenuItem onSelect={logout}>
                    <LogOut className="ico" aria-hidden /> {t("nav.logout")}
                  </MenuItem>
                </MenuContent>
              </Menu>
            )}
          </div>
        </div>
      </header>

      <main id="main" className="mx-auto w-full max-w-[1440px] flex-1 px-4 pb-24 pt-6 md:px-8 md:pb-10">
        {children}
      </main>

      <Footer className="hidden md:block" />

      {/* Mobile tab bar */}
      <nav
        aria-label={t("nav.mainNav")}
        className="fixed inset-x-0 bottom-0 z-20 grid h-16 grid-cols-5 border-t border-border bg-surface-2 md:hidden"
      >
        {/* five slots on phones: the leaderboard and the arcade hall are reached from the lobby */}
        {[...NAV.filter((n) => n.path !== "/leaderboard" && n.path !== "/coach" && n.path !== "/arcade"), { path: me ? `/profile/${me.username}` : "/lobby", key: "nav.profile", icon: User }, { path: "/settings", key: "nav.settings", icon: Settings }].map(
          ({ path, key, icon: Icon }) => (
            <Link
              key={key}
              href={href(path)}
              aria-current={isActive(path) ? "page" : undefined}
              className={cn(
                "flex flex-col items-center justify-center gap-1 text-[11px] font-semibold text-fg-muted no-underline",
                isActive(path) && "text-fg"
              )}
            >
              <Icon className="ico" aria-hidden />
              {t(key)}
            </Link>
          )
        )}
      </nav>
    </div>
  );
}

export function Footer({ className }: { className?: string }) {
  const { t, href } = useI18n();
  return (
    <footer className={cn("border-t border-border", className)}>
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-4 px-4 py-6 md:px-8">
        <p className="t-caption subtle">{t("footer.rights")}</p>
        <div className="flex flex-wrap items-center gap-4">
          <Link href={href("/privacy")} className="t-label">
            {t("footer.privacy")}
          </Link>
          <Link href={href("/terms")} className="t-label">
            {t("footer.terms")}
          </Link>
          <Link href={href("/status")} className="t-label">
            {t("footer.status")}
          </Link>
          <LanguageSwitcher />
        </div>
      </div>
    </footer>
  );
}
