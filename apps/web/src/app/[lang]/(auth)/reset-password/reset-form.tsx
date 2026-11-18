"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { CheckCircle2 } from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Callout, FormField, Input } from "@/components/ui/form";
import { StrengthMeter } from "@/components/auth/strength-meter";
import { AuthCard } from "../auth-card";

/** Sets a new password from the emailed link (?token=…). Every session is logged out after. */
export function ResetForm() {
  const { t, href } = useI18n();
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  // Better Auth redirects here with ?error=INVALID_TOKEN when the link is expired or used
  const linkError = params.get("error") || !token ? t("auth.resetLinkInvalid") : undefined;
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<{ password?: string; confirm?: string; form?: string }>({});
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const next: typeof errors = {};
    if (password.length < 8) next.password = t("auth.errors.passwordTooShort");
    else if (password.length > 128) next.password = t("auth.errors.passwordTooLong");
    if (confirm !== password) next.confirm = t("auth.errors.passwordsDontMatch");
    setErrors(next);
    if (Object.keys(next).length) return;
    setBusy(true);
    const { error } = await authClient.resetPassword({ newPassword: password, token });
    setBusy(false);
    if (error) return setErrors({ form: error.status === 429 ? t("auth.errors.tooManyAttempts") : t("auth.resetLinkInvalid") });
    setDone(true);
  }

  return (
    <AuthCard
      title={t("auth.resetTitle")}
      subtitle={t("auth.resetSubtitle")}
      footer={
        <p className="muted">
          <Link href={href("/login")}>{t("auth.backToLogin")}</Link>
        </p>
      }
    >
      {done ? (
        <Callout tone="info" icon={<CheckCircle2 className="ico c-green" aria-hidden />}>
          {t("auth.resetDone")}
        </Callout>
      ) : linkError ? (
        <div className="stack stack-4">
          <Callout tone="error">{linkError}</Callout>
          <Button asChild variant="primary" block>
            <Link href={href("/forgot-password")} className="no-underline">
              {t("auth.requestNewLink")}
            </Link>
          </Button>
        </div>
      ) : (
        <form onSubmit={submit} className="stack stack-4" noValidate>
          {errors.form && <Callout tone="error">{errors.form}</Callout>}
          <FormField label={t("settings.newPassword")} error={errors.password}>
            {({ id, describedBy, invalid }) => (
              <Input id={id} aria-describedby={describedBy} invalid={invalid} type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" disabled={busy} autoFocus />
            )}
          </FormField>
          {password && <StrengthMeter password={password} />}
          <FormField label={t("auth.confirmPassword")} error={errors.confirm}>
            {({ id, describedBy, invalid }) => (
              <Input id={id} aria-describedby={describedBy} invalid={invalid} type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" disabled={busy} />
            )}
          </FormField>
          <Button type="submit" variant="primary" glow="sm" block loading={busy}>
            {t("auth.setPassword")}
          </Button>
        </form>
      )}
    </AuthCard>
  );
}
