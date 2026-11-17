"use client";

import { useI18n } from "@/i18n/I18nProvider";
import { usePrefs, type Prefs } from "@/lib/prefs";
import { Panel, Switch } from "@/components/ui/primitives";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { SettingRow } from "./settings-ui";

const TOGGLES: { key: keyof Pick<Prefs, "crt" | "reducedMotion" | "sound">; label: string; body: string }[] = [
  { key: "crt", label: "settings.crt", body: "settings.crtBody" },
  { key: "reducedMotion", label: "settings.reducedMotion", body: "settings.reducedMotionBody" },
  { key: "sound", label: "settings.sound", body: "settings.soundBody" },
];

/** Applies at once and saves automatically: no Save button. */
export function PreferencesSection() {
  const { t } = useI18n();
  const { prefs, setPref } = usePrefs();
  return (
    <Panel
      title={t("settings.sections.preferences")}
      actions={
        <span className="t-caption subtle" aria-live="polite">
          {t("settings.prefsSaved")}
        </span>
      }
    >
      <SettingRow label={t("settings.language")} body={t("settings.languageBody")}>
        <LanguageSwitcher />
      </SettingRow>
      {TOGGLES.map(({ key, label, body }) => (
        <div key={key} className="border-t border-border pt-2">
          <Switch id={`pref-${key}`} checked={prefs[key]} onCheckedChange={(v) => setPref(key, v)} label={t(label)} description={t(body)} />
        </div>
      ))}
    </Panel>
  );
}
