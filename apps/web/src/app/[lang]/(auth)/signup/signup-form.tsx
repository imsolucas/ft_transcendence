"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";
import { authClient } from "@/lib/auth-client";
import { Button, IconButton } from "@/components/ui/button";
import { Callout, FormField, Input } from "@/components/ui/form";
import { AuthCard, GoogleButton, OrRule } from "../auth-card";

const USERNAME = /^[A-Za-z0-9_.]{3,30}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

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

export function SignupForm() {
  const { t, href } = useI18n();
  const router = useRouter();
  const [form, setForm] = useState({ username: "", email: "", password: "" });
  const [show, setShow] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<"username" | "email" | "password" | "form", string>>>({});
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);

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
    if (!validate()) return;
    setBusy(true);
    const { error } = await authClient.signUp.email({
      email: form.email.trim().toLowerCase(),
      password: form.password,
      name: form.username,
      username: form.username,
      displayUsername: form.username,
    });
    setBusy(false);
    if (error) {
      const code = error.code ?? "";
      if (code.includes("USERNAME")) setErrors({ username: code.includes("TAKEN") ? t("auth.errors.usernameTaken") : t("auth.errors.invalidUsername") });
      else if (code.includes("EXIST") || code.includes("EMAIL")) setErrors({ email: t("auth.errors.emailTaken") });
      else if (error.status === 429) setErrors({ form: t("auth.errors.tooManyAttempts") });
      else setErrors({ form: t("common.error") });
      return;
    }
    router.replace(href("/lobby"));
    router.refresh();
  }

  async function google() {
    setGoogleBusy(true);
    const { error } = await authClient.signIn.social({ provider: "google", callbackURL: href("/lobby"), errorCallbackURL: href("/signup") });
    if (error) {
      setGoogleBusy(false);
      setErrors({ form: t("auth.errors.googleUnavailable") });
    }
  }

  const field = (key: keyof typeof form) => ({
    value: form[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [key]: e.target.value })),
    onBlur: () => form[key] && validate(key),
    disabled: busy,
  });

  return (
    <AuthCard
      title={t("auth.signupTitle")}
      subtitle={t("auth.signupSubtitle")}
      footer={
        <p className="muted">
          {t("auth.haveAccount")} <Link href={href("/login")}>{t("auth.loginInstead")}</Link>
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
        <Button type="submit" variant="primary" glow="sm" block loading={busy}>
          {busy ? t("auth.signingUp") : t("auth.signup")}
        </Button>
      </form>
      <OrRule label={t("common.or")} />
      <GoogleButton onClick={google} loading={googleBusy} label={t("auth.google")} />
    </AuthCard>
  );
}
