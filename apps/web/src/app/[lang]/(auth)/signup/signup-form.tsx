"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import useSWR from "swr";
import { fetcher } from "@/lib/api";
import type { PublicConfig } from "@/lib/types";
import { useState, type FormEvent } from "react";
import { Eye, EyeOff, MailCheck } from "lucide-react";
import { safeNext } from "@/lib/invite";
import { useCaptcha } from "@/components/auth/captcha";
import { useI18n } from "@/i18n/I18nProvider";
import { authClient } from "@/lib/auth-client";
import { Button, IconButton } from "@/components/ui/button";
import { Callout, FormField, Input } from "@/components/ui/form";
import { AuthCard } from "../auth-card";
import { StrengthMeter } from "@/components/auth/strength-meter";

const USERNAME = /^[A-Za-z0-9_.]{3,30}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function SignupForm() {
  const { t, href } = useI18n();
  const params = useSearchParams();
  const destination = safeNext(params.get("next"), href("/lobby"));
  const [form, setForm] = useState({ username: "", email: "", password: "" });
  const [show, setShow] = useState(false);
  const captcha = useCaptcha();
  const router = useRouter();
  const { data: config } = useSWR<PublicConfig>("/api/config", fetcher, { revalidateOnFocus: false });
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [resent, setResent] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errors, setErrors] = useState<Partial<Record<"username" | "email" | "password" | "form", string>>>({});
  const [busy, setBusy] = useState(false);

  function validate(field?: keyof typeof form) {
    const next: typeof errors = { ...errors };
    const check = (f: keyof typeof form) => {
      if (f === "username") next.username = USERNAME.test(form.username) ? undefined : t("auth.errors.invalidUsername");
      if (f === "email") next.email = EMAIL.test(form.email.trim()) ? undefined : t("auth.errors.invalidEmail");
      if (f === "password") next.password = form.password.length >= 8 ? undefined : t("auth.errors.passwordTooShort");
    };
    if (field) check(field);
    else (["username", "email", "password"] as const).forEach(check);
    delete next.form;
    setErrors(next);
    return !next.username && !next.email && !next.password;
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!validate() || captcha.pending) return;
    setBusy(true);
    const { error } = await authClient.signUp.email({
      email: form.email.trim().toLowerCase(),
      password: form.password,
      name: form.username,
      username: form.username,
      displayUsername: form.username,
      // the verification link signs them in and brings them back here (e.g. an invite link)
      callbackURL: destination,
      fetchOptions: captcha.fetchOptions,
    });
    setBusy(false);
    captcha.reset();
    if (error) {
      const code = error.code ?? "";
      if (code === "PASSWORD_COMPROMISED") setErrors({ password: t("auth.errors.passwordBreached") });
      else if (code.includes("CAPTCHA")) setErrors({ form: t("auth.errors.captcha") });
      else if (code.includes("USERNAME")) setErrors({ username: code.includes("TAKEN") ? t("auth.errors.usernameTaken") : t("auth.errors.invalidUsername") });
      else if (code.includes("EXIST") || code.includes("EMAIL")) setErrors({ email: t("auth.errors.emailTaken") });
      else if (error.status === 429) setErrors({ form: t("auth.errors.tooManyAttempts") });
      else setErrors({ form: t("common.error") });
      return;
    }
    if (config && !config.emailVerification) {
      // no email on this server: log in now (same next step whether or not the email was new)
      router.replace(`${href("/login")}?created=1${params.get("next") ? `&next=${encodeURIComponent(destination)}` : ""}`);
      return;
    }
    // sign-in waits for a verified address: same screen whether or not the email was new
    setSentTo(form.email.trim().toLowerCase());
  }

  async function resend() {
    if (!sentTo) return;
    if (captcha.pending) return;
    setResent("sending");
    const { error } = await authClient.sendVerificationEmail({ email: sentTo, callbackURL: destination, fetchOptions: captcha.fetchOptions });
    captcha.reset();
    setResent(error ? "error" : "sent");
  }

  const field = (key: keyof typeof form) => ({
    value: form[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [key]: e.target.value })),
    onBlur: () => form[key] && validate(key),
    disabled: busy,
  });

  if (sentTo) {
    return (
      <AuthCard title={t("auth.checkInboxTitle")}>
        <div className="stack stack-4 items-center text-center" role="status">
          <MailCheck className="ico !h-10 !w-10 c-cyan" aria-hidden />
          <p>{t("auth.checkInboxBody", { email: sentTo })}</p>
          <p className="t-caption subtle">{t("auth.checkInboxHint")}</p>
          {resent !== "sent" && captcha.widget}
          <Button type="button" variant="secondary" onClick={resend} loading={resent === "sending"} disabled={resent === "sent" || captcha.pending}>
            {resent === "sent" ? t("auth.verificationResent") : t("auth.resendVerification")}
          </Button>
          {resent === "error" && <Callout tone="error">{t("common.error")}</Callout>}
          <Link href={`${href("/login")}${params.get("next") ? `?next=${encodeURIComponent(destination)}` : ""}`}>{t("auth.backToLogin")}</Link>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title={t("auth.signupTitle")}
      subtitle={t("auth.signupSubtitle")}
      footer={
        <p className="muted">
          {t("auth.haveAccount")} <Link href={params.get("next") ? `${href("/login")}?next=${encodeURIComponent(destination)}` : href("/login")}>{t("auth.loginInstead")}</Link>
        </p>
      }
    >
      <form onSubmit={submit} className="stack stack-4" noValidate>
        {errors.form && <Callout tone="error">{errors.form}</Callout>}
        <FormField label={t("auth.username")} hint={t("auth.usernameHint")} error={errors.username}>
          {({ id, describedBy, invalid }) => (
            <Input id={id} aria-describedby={describedBy} invalid={invalid} autoComplete="username" autoCapitalize="none" spellCheck={false} maxLength={30} autoFocus {...field("username")} />
          )}
        </FormField>
        <FormField label={t("auth.email")} error={errors.email}>
          {({ id, describedBy, invalid }) => (
            <Input id={id} aria-describedby={describedBy} invalid={invalid} type="email" autoComplete="email" {...field("email")} />
          )}
        </FormField>
        <FormField label={t("auth.password")} error={errors.password}>
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              aria-describedby={describedBy}
              invalid={invalid}
              type={show ? "text" : "password"}
              autoComplete="new-password"
              maxLength={128}
              {...field("password")}
              trailing={
                <IconButton size="sm" label={show ? t("auth.hidePassword") : t("auth.showPassword")} onClick={() => setShow((v) => !v)}>
                  {show ? <EyeOff className="ico" aria-hidden /> : <Eye className="ico" aria-hidden />}
                </IconButton>
              }
            />
          )}
        </FormField>
        {form.password && <StrengthMeter password={form.password} />}
        <p className="t-caption subtle">
          {t("auth.acceptTerms", { terms: "§T", privacy: "§P" })
            .split(/(§T|§P)/)
            .map((part, i) =>
              part === "§T" ? (
                <Link key={i} href={href("/terms")}>
                  {t("footer.terms")}
                </Link>
              ) : part === "§P" ? (
                <Link key={i} href={href("/privacy")}>
                  {t("footer.privacy")}
                </Link>
              ) : (
                part
              )
            )}
        </p>
        {captcha.widget}
        <Button type="submit" variant="primary" glow="sm" block loading={busy} disabled={captcha.pending}>
          {busy ? t("auth.signingUp") : t("auth.signup")}
        </Button>
      </form>
    </AuthCard>
  );
}
