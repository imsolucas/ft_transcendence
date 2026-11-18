"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { MailCheck } from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Callout, FormField, Input } from "@/components/ui/form";
import { AuthCard } from "../auth-card";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Asks for a reset link. The answer is the same whether or not the address has an account. */
export function ForgotForm() {
  const { t, href } = useI18n();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!EMAIL.test(email.trim())) return setError(t("auth.errors.invalidEmail"));
    setBusy(true);
    setError(undefined);
    const { error: err } = await authClient.requestPasswordReset({ email: email.trim(), redirectTo: href("/reset-password") });
    setBusy(false);
    // 429 is the only answer worth showing; anything else would reveal whether the account exists
    if (err?.status === 429) return setError(t("auth.errors.tooManyAttempts"));
    setSent(true);
  }

  return (
    <AuthCard
      title={t("auth.forgotTitle")}
      subtitle={t("auth.forgotSubtitle")}
      footer={
        <p className="muted">
          <Link href={href("/login")}>{t("auth.backToLogin")}</Link>
        </p>
      }
    >
      {sent ? (
        <Callout tone="info" icon={<MailCheck className="ico" aria-hidden />}>
          {t("auth.resetSent", { email: email.trim() })}
        </Callout>
      ) : (
        <form onSubmit={submit} className="stack stack-4" noValidate>
          <FormField label={t("auth.email")} error={error}>
            {({ id, describedBy, invalid }) => (
              <Input
                id={id}
                aria-describedby={describedBy}
                invalid={invalid}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                disabled={busy}
                autoFocus
              />
            )}
          </FormField>
          <Button type="submit" variant="primary" glow="sm" block loading={busy}>
            {t("auth.sendResetLink")}
          </Button>
        </form>
      )}
    </AuthCard>
  );
}
