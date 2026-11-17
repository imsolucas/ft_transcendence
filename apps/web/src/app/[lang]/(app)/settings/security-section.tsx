"use client";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { useI18n } from "@/i18n/I18nProvider";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { FormField, Input } from "@/components/ui/form";
import { Panel } from "@/components/ui/primitives";
import { StrengthMeter } from "@/components/auth/strength-meter";
import { TwoFactorPanel } from "./two-factor-panel";
import { SessionsPanel } from "./sessions-panel";

export function SecuritySection() {
  return (
    <div className="stack stack-5">
      <PasswordPanel />
      <TwoFactorPanel />
      <SessionsPanel />
    </div>
  );
}

function PasswordPanel() {
  const { t } = useI18n();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [errors, setErrors] = useState<{ current?: string; next?: string }>({});
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const errs = {
      current: current ? undefined : t("common.required"),
      next: next.length >= 8 ? undefined : t("auth.errors.passwordTooShort"),
    };
    setErrors(errs);
    if (errs.current || errs.next) return;
    setBusy(true);
    const { error } = await authClient.changePassword({ currentPassword: current, newPassword: next, revokeOtherSessions: false });
    setBusy(false);
    if (error) {
      if (error.code === "INVALID_PASSWORD") setErrors({ current: t("settings.wrongPassword") });
      else if (error.code === "PASSWORD_TOO_SHORT") setErrors({ next: t("auth.errors.passwordTooShort") });
      else toast.error(error.status === 429 ? t("auth.errors.tooManyAttempts") : t("common.error"));
      return;
    }
    setCurrent("");
    setNext("");
    setErrors({});
    toast.success(t("settings.passwordUpdated"));
  }

  return (
    <Panel className="stack stack-4" aria-labelledby="settings-password">
      <h2 className="t-heading" id="settings-password">
        {t("settings.changePassword")}
      </h2>
      <form className="stack stack-4" onSubmit={submit} noValidate>
        <div className="grid gap-3 md:grid-cols-2 md:gap-6">
          <FormField label={t("settings.currentPassword")} error={errors.current}>
            {({ id, describedBy, invalid }) => (
              <Input
                id={id}
                aria-describedby={describedBy}
                invalid={invalid}
                type="password"
                autoComplete="current-password"
                maxLength={128}
                value={current}
                disabled={busy}
                onChange={(e) => setCurrent(e.target.value)}
              />
            )}
          </FormField>
          <div className="stack">
            <FormField label={t("settings.newPassword")} error={errors.next}>
              {({ id, describedBy, invalid }) => (
                <Input
                  id={id}
                  aria-describedby={describedBy}
                  invalid={invalid}
                  type="password"
                  autoComplete="new-password"
                  maxLength={128}
                  value={next}
                  disabled={busy}
                  onChange={(e) => setNext(e.target.value)}
                />
              )}
            </FormField>
            {next && <StrengthMeter password={next} />}
          </div>
        </div>
        <div className="row">
          <Button type="submit" variant="primary" loading={busy}>
            {busy ? t("common.saving") : t("settings.updatePassword")}
          </Button>
        </div>
      </form>
    </Panel>
  );
}
