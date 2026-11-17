"use client";

import { useI18n } from "@/i18n/I18nProvider";
import { COURT_THEMES, usePrefs } from "@/lib/prefs";
import { Segmented } from "@/components/ui/primitives";

/** Court colour theme (a game customization option); saved per browser with the other prefs. */
export function CourtThemePicker() {
  const { t } = useI18n();
  const { prefs, setPref } = usePrefs();
  return (
    <Segmented
      className="max-w-full flex-wrap"
      label={t("game.courtTheme")}
      value={prefs.courtTheme}
      onChange={(v) => setPref("courtTheme", v)}
      options={COURT_THEMES.map((v) => ({
        value: v,
        label: (
          <span className="inline-flex items-center gap-1.5" data-court-theme={v}>
            <span aria-hidden className="inline-block h-3 w-3 rounded-sm border border-[color:var(--court-line)] bg-[color:var(--court-bg)] shadow-[inset_-4px_0_0_var(--court-you)]" />
            {t(`game.theme.${v}`)}
          </span>
        ),
      }))}
    />
  );
}
