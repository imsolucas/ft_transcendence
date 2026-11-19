"use client";

import { Suspense, useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { SWRConfig } from "swr";
import { Toaster } from "sonner";
import { WifiOff } from "lucide-react";
import { fetcher, SESSION_EXPIRED_EVENT } from "@/lib/api";
import { PrefsProvider } from "@/lib/prefs";
import { I18nProvider, useI18n } from "@/i18n/I18nProvider";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { Modal } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { ServiceWorkerRegistrar } from "@/components/layout/service-worker";

/** Routes where a 401 is expected and must not open the session-expired modal */
const PUBLIC_PATHS = ["", "/login", "/signup", "/privacy", "/terms", "/local"];

function isPublic(pathname: string, locale: string) {
  const rest = pathname.replace(new RegExp(`^/${locale}`), "") || "";
  return PUBLIC_PATHS.includes(rest) || rest.startsWith("/local");
}

function SessionExpiredModal() {
  const { t, locale, href } = useI18n();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onExpired = () => {
      if (!isPublic(window.location.pathname, locale)) setOpen(true);
    };
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
  }, [locale]);

  return (
    <Modal
      open={open}
      forced
      title={t("auth.sessionExpiredTitle")}
      description={t("auth.sessionExpiredBody")}
      actions={
        <Button
          variant="primary"
          glow="sm"
          onClick={async () => {
            // Drop the dead cookie first, or proxy.ts sends /login straight back here
            await fetch("/api/session/clear", { method: "POST", credentials: "same-origin" }).catch(() => {});
            setOpen(false);
            router.push(`${href("/login")}?next=${encodeURIComponent(pathname + window.location.search)}`);
          }}
        >
          {t("auth.loginAgain")}
        </Button>
      }
    />
  );
}

function subscribeOnline(fn: () => void) {
  window.addEventListener("online", fn);
  window.addEventListener("offline", fn);
  return () => {
    window.removeEventListener("online", fn);
    window.removeEventListener("offline", fn);
  };
}

function OfflineBanner() {
  const { t } = useI18n();
  const online = useSyncExternalStore(subscribeOnline, () => navigator.onLine, () => true);
  if (online) return null;
  return (
    <div className="banner offline-banner sticky top-0 z-30" role="status">
      <WifiOff className="ico" aria-hidden />
      <span className="grow">{t("system.offline")}</span>
      <Button size="sm" variant="ghost" onClick={() => window.location.reload()}>
        {t("system.retryNow")}
      </Button>
    </div>
  );
}

export function Providers({ locale, dict, children }: { locale: Locale; dict: Dictionary; children: ReactNode }) {
  return (
    <I18nProvider locale={locale} dict={dict}>
      <PrefsProvider>
        <SWRConfig value={{ fetcher }}>
          <ServiceWorkerRegistrar />
          <OfflineBanner />
          {children}
          <Suspense>
            <SessionExpiredModal />
          </Suspense>
          <Toaster
            position="bottom-right"
            // Inline on purpose: sonner injects an unlayered `system-ui` font rule at runtime, and
            // unlayered CSS beats everything in our @layer components, whatever its specificity.
            // On phones with a decorative system font (scaled by the arcade font-size-adjust)
            // that made toast text huge and overlapping.
            style={{ fontFamily: "var(--font-body)" }}
            toastOptions={{
              unstyled: true,
              classNames: {
                toast: "toast",
                success: "toast-success",
                error: "toast-error",
                info: "toast-info",
                warning: "toast-warn",
                title: "t-strong",
                description: "t-caption muted",
              },
            }}
          />
        </SWRConfig>
      </PrefsProvider>
    </I18nProvider>
  );
}
