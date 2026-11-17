"use client";

import { useI18n } from "@/i18n/I18nProvider";

/** 0–4: length, character variety; shown as a 4-step meter plus words, never colour alone. */
export function passwordStrength(pw: string): 0 | 1 | 2 | 3 | 4 {
  if (pw.length < 8) return 0;
  let score = 1;
  if (pw.length >= 12) score++;
  if (/[0-9]/.test(pw) && /[A-Za-z]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw) || /[A-Z]/.test(pw)) score++;
  return Math.min(4, score) as 0 | 1 | 2 | 3 | 4;
}

export function StrengthMeter({ password }: { password: string }) {
  const { t } = useI18n();
  const s = passwordStrength(password);
  const colour = s <= 1 ? "bg-neon-red" : s === 2 ? "bg-neon-amber" : "bg-neon-green";
  return (
    <div className="stack" aria-live="polite">
      <div className="flex gap-1" role="meter" aria-label={t("auth.strength.label")} aria-valuemin={0} aria-valuemax={4} aria-valuenow={s}>
        {[1, 2, 3, 4].map((i) => (
          <span key={i} className={"h-1.5 flex-1 rounded-sm " + (i <= s ? colour : "bg-surface-3")} />
        ))}
      </div>
      <p className="field-hint">{t(`auth.strength.${s}`)}</p>
    </div>
  );
}

