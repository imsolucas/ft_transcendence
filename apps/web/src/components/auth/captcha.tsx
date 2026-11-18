"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/api";
import { useI18n } from "@/i18n/I18nProvider";
import { Button } from "@/components/ui/button";
import type { PublicConfig } from "@/lib/types";

/**
 * Cloudflare Turnstile bot check for sign-up, sign-in and password reset. Off (renders nothing,
 * loads nothing from Cloudflare) unless the server has TURNSTILE_* keys; then the token goes in
 * the x-captcha-response header that Better Auth's captcha plugin checks. Tokens are single
 * use, so reset() after every attempt.
 */
type TurnstileApi = {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string;
  reset: (id: string) => void;
  remove: (id: string) => void;
};
declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const SCRIPT = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
let loading: Promise<void> | null = null;
function loadScript(): Promise<void> {
  loading ??= new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = SCRIPT;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => {
      loading = null;
      reject(new Error("turnstile"));
    };
    document.head.appendChild(s);
  });
  return loading;
}

export function useCaptcha() {
  const { data } = useSWR<PublicConfig>("/api/config", fetcher, { revalidateOnFocus: false });
  const siteKey = data?.turnstileSiteKey ?? null;
  const { t } = useI18n();
  const [token, setToken] = useState<string | null>(null);
  // the script was blocked (ad blocker, offline) or the widget failed: say so, offer a retry
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);
  const idRef = useRef<string | null>(null);

  useEffect(() => {
    if (!siteKey || !boxRef.current) return;
    let cancelled = false;
    const el = boxRef.current;
    loadScript()
      .then(() => {
        if (cancelled || !window.turnstile) return;
        idRef.current = window.turnstile.render(el, {
          sitekey: siteKey,
          theme: "dark",
          callback: (t: string) => setToken(t),
          "expired-callback": () => setToken(null),
          "error-callback": () => {
            setToken(null);
            setFailed(true);
          },
        });
      })
      .catch(() => {
        setToken(null);
        setFailed(true);
      });
    return () => {
      cancelled = true;
      if (idRef.current && window.turnstile) window.turnstile.remove(idRef.current);
      idRef.current = null;
    };
  }, [siteKey, attempt]);

  const reset = useCallback(() => {
    setToken(null);
    if (idRef.current && window.turnstile) window.turnstile.reset(idRef.current);
  }, []);

  return {
    /** true while a captcha is required but not solved yet */
    pending: !!siteKey && !token,
    widget: siteKey ? (
      <div className="stack !gap-2">
        <div ref={boxRef} className="min-h-[65px]" />
        {failed && (
          <p className="row wrap !gap-2 t-caption c-amber" role="alert">
            {t("auth.errors.captchaLoad")}
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                setFailed(false);
                setAttempt((n) => n + 1);
              }}
            >
              {t("common.retry")}
            </Button>
          </p>
        )}
      </div>
    ) : null,
    /** pass as `fetchOptions` to the auth client call */
    fetchOptions: token ? { headers: { "x-captcha-response": token } } : undefined,
    reset,
  };
}
