"use client";

import Link from "next/link";
import { Bit } from "@/components/arcade/bit";
import { useEffect } from "react";
import { Gamepad2, RotateCcw, WifiOff } from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";
import { Button } from "@/components/ui/button";

/** 404: one line on what happened, one on what is safe, then the way out. */
export function NotFoundView() {
  const { t, href } = useI18n();
  return (
    <main id="main" className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4 text-center">
      <Bit mood="sad" size={80} />
      <p className="pix pix-lg c-cyan">{t("system.notFoundTitle")}</p>
      <h1 className="pix pix-sm">{t("system.notFoundLine")}</h1>
      <p className="muted max-w-[420px]">{t("system.notFoundBody")}</p>
      <Button asChild variant="primary" glow="sm">
        <Link href={href("/lobby")} className="no-underline">
          {t("common.backToLobby")}
        </Link>
      </Button>
    </main>
  );
}

export function ErrorView({ digest, onRetry }: { digest?: string; onRetry: () => void }) {
  const { t, href } = useI18n();
  return (
    <main id="main" className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="t-title">{t("system.errorTitle")}</h1>
      <p className="muted max-w-[420px]">{t("system.errorBody")}</p>
      {digest && (
        <p className="t-caption subtle">
          {t("system.errorId")}: <span className="num num-sm">{digest}</span>
        </p>
      )}
      <div className="row wrap justify-center">
        <Button variant="primary" glow="sm" onClick={onRetry}>
          {t("common.retry")}
        </Button>
        <Button asChild>
          <Link href={href("/lobby")} className="no-underline">
            {t("common.backToLobby")}
          </Link>
        </Button>
      </div>
    </main>
  );
}

/**
 * Offline: served by the service worker (sw.js) for any navigation that fails without a
 * network. Plain <a> links on purpose: a client-side <Link> would fetch (and prefetch) RSC
 * payloads that fail offline; a document navigation goes through the worker instead.
 */
export function OfflineView() {
  const { t, href } = useI18n();

  // Back online: reload, which retries the page the user actually asked for. Debounced and
  // re-checked, so a flapping connection doesn't cancel a navigation the user just started.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const onOnline = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (navigator.onLine) window.location.reload();
      }, 1500);
    };
    const onOffline = () => clearTimeout(timer);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  return (
    <div data-offline-page className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-8 text-center">
      <WifiOff className="c-amber" size={32} strokeWidth={1.75} aria-hidden />
      <p className="pix pix-lg c-amber">{t("offline.title")}</p>
      <h1 className="pix pix-sm">{t("offline.line")}</h1>
      <p className="muted max-w-[460px]">{t("offline.body")}</p>
      <div className="row wrap justify-center">
        <Button asChild variant="primary" glow="sm">
          <a href={href("/local")} className="no-underline">
            <Gamepad2 className="ico" aria-hidden />
            {t("offline.playLocal")}
          </a>
        </Button>
        <Button onClick={() => window.location.reload()}>
          <RotateCcw className="ico" aria-hidden />
          {t("common.retry")}
        </Button>
      </div>
      <p className="t-caption subtle">{t("offline.hint")}</p>
    </div>
  );
}
