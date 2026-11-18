"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/i18n/I18nProvider";
import { api } from "@/lib/api";

/** 0–4: length, character variety; shown as a 4-step meter plus words, never colour alone. */
export function passwordStrength(pw: string): 0 | 1 | 2 | 3 | 4 {
  if (pw.length < 8) return 0;
  let score = 1;
  if (pw.length >= 12) score++;
  if (/[0-9]/.test(pw) && /[A-Za-z]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw) || /[A-Z]/.test(pw)) score++;
  return Math.min(4, score) as 0 | 1 | 2 | 3 | 4;
}

/**
 * Was this password in a known data breach? Asked while typing (debounced). The browser sends
 * only the SHA-1 of the password to our server, which checks Have I Been Pwned with the first
 * 5 characters of it. null = not known (short, still checking, or the check is unavailable).
 */
function useBreached(password: string): boolean | null {
  const [result, setResult] = useState<{ pw: string; breached: boolean } | null>(null);
  useEffect(() => {
    if (password.length < 8 || !globalThis.crypto?.subtle) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const digest = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(password));
        const sha1 = Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
        const res = await api.post<{ breached: boolean; checked: boolean }>("/api/password-check", { sha1 });
        if (!cancelled && res.checked) setResult({ pw: password, breached: res.breached });
      } catch {
        // no answer (offline, rate limited): the meter just doesn't say; the server checks on submit
      }
    }, 500);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [password]);
  // an answer only counts for the password it was asked about
  return result && result.pw === password ? result.breached : null;
}

export function StrengthMeter({ password }: { password: string }) {
  const { t } = useI18n();
  const breached = useBreached(password);
  // a leaked password is never "good", whatever it looks like
  const s = breached ? 0 : passwordStrength(password);
  const colour = s <= 1 ? "bg-neon-red" : s === 2 ? "bg-neon-amber" : "bg-neon-green";
  return (
    <div className="stack" aria-live="polite">
      <div className="flex gap-1" role="meter" aria-label={t("auth.strength.label")} aria-valuemin={0} aria-valuemax={4} aria-valuenow={s}>
        {[1, 2, 3, 4].map((i) => (
          <span key={i} className={"h-1.5 flex-1 rounded-sm " + (breached ? "bg-neon-red" : i <= s ? colour : "bg-surface-3")} />
        ))}
      </div>
      <p className={breached ? "field-hint c-red" : "field-hint"}>{breached ? t("auth.strength.breached") : t(`auth.strength.${s}`)}</p>
    </div>
  );
}
