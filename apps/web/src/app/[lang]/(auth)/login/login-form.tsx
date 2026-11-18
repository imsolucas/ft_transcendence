"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { safeNext } from "@/lib/invite";
import { useCaptcha } from "@/components/auth/captcha";
import { useState, type FormEvent } from "react";
import { Eye, EyeOff, KeyRound } from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";
import { authClient } from "@/lib/auth-client";
import { Button, IconButton } from "@/components/ui/button";
import { Callout, FormField, Input } from "@/components/ui/form";
import { OtpInput } from "@/components/ui/otp-input";
import { AuthCard, OrRule } from "../auth-card";

type BAError = { status?: number; code?: string; message?: string } | null | undefined;

export function LoginForm() {
  const { t, href } = useI18n();
  const router = useRouter();
  const params = useSearchParams();
  const destination = safeNext(params.get("next"), href("/lobby"));

  const [step, setStep] = useState<"password" | "totp" | "backup">("password");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [code, setCode] = useState("");
  const [trustDevice, setTrustDevice] = useState(false);
  const [errors, setErrors] = useState<{ identifier?: string; password?: string; form?: string; code?: string }>({});
  const [busy, setBusy] = useState(false);
  const [passkeyBusy, setPasskeyBusy] = useState(false);
  const captcha = useCaptcha();

  function messageFor(error: BAError, fallback = t("common.error")) {
    if (!error) return fallback;
    if (error.status === 429) return t("auth.errors.tooManyAttempts");
    if (error.code === "EMAIL_NOT_VERIFIED") return t("auth.errors.verifyFirst");
    if (error.code?.includes("CAPTCHA")) return t("auth.errors.captcha");
    if (error.code?.includes("INVALID")) return t("auth.errors.invalidCredentials");
    if (error.status === 0) return t("common.networkError");
    return fallback;
  }

  async function submitPassword(e: FormEvent) {
    e.preventDefault();
    const next: typeof errors = {};
    if (!identifier.trim()) next.identifier = t("common.required");
    if (!password) next.password = t("common.required");
    setErrors(next);
    if (Object.keys(next).length || captcha.pending) return;

    setBusy(true);
    const id = identifier.trim();
    // an unverified account is sent a fresh link; it lands back on `destination`
    const { data, error } = id.includes("@")
      ? await authClient.signIn.email({ email: id, password, callbackURL: destination, fetchOptions: captcha.fetchOptions })
      : await authClient.signIn.username({ username: id, password, callbackURL: destination, fetchOptions: captcha.fetchOptions });
    setBusy(false);
    captcha.reset();

    if (error) {
      setErrors({ form: messageFor(error) });
      return;
    }
    if ((data as { twoFactorRedirect?: boolean })?.twoFactorRedirect) {
      setStep("totp");
      return;
    }
    router.replace(destination);
  }

  async function submitCode(e: FormEvent) {
    e.preventDefault();
    if (step === "totp" && code.length !== 6) return;
    if (step === "backup" && !code.trim()) return;
    setBusy(true);
    const { error } =
      step === "totp"
        ? await authClient.twoFactor.verifyTotp({ code, trustDevice })
        : await authClient.twoFactor.verifyBackupCode({ code: code.trim(), trustDevice });
    setBusy(false);
    if (error) {
      setCode("");
      setErrors({ code: error.status === 429 ? t("auth.twoFactorLocked") : t("auth.twoFactorWrong") });
      return;
    }
    router.replace(destination);
  }

  async function signInWithPasskey() {
    setPasskeyBusy(true);
    setErrors({});
    const result = await authClient.signIn.passkey();
    setPasskeyBusy(false);
    if (result?.error) {
      // the browser dialog was dismissed: not an error worth showing
      const err = result.error as { code?: string; message?: string };
      const cancelled = /cancel|abort|not ?allowed/i.test(`${err.code ?? ""} ${err.message ?? ""}`);
      if (!cancelled) setErrors({ form: t("auth.errors.passkeyFailed") });
      return;
    }
    router.replace(destination);
  }

  if (step !== "password") {
    return (
      <AuthCard title={t("auth.twoFactorTitle")} subtitle={step === "totp" ? t("auth.twoFactorSubtitle") : undefined}>
        <form onSubmit={submitCode} className="stack stack-4" noValidate>
          {step === "totp" ? (
            <div className="stack">
              <OtpInput
                value={code}
                onChange={(v) => {
                  setCode(v);
                  setErrors({});
                }}
                invalid={!!errors.code}
                label={t("auth.twoFactorTitle")}
                digitLabel={(n) => t("auth.twoFactorDigit", { n })}
                autoFocus
              />
            </div>
          ) : (
            <FormField label={t("auth.backupCode")} error={errors.code}>
              {({ id, describedBy, invalid }) => (
                <Input id={id} aria-describedby={describedBy} invalid={invalid} mono value={code} onChange={(e) => setCode(e.target.value)} autoComplete="one-time-code" autoFocus />
              )}
            </FormField>
          )}
          {errors.code && step === "totp" && (
            <p className="field-error" role="alert">
              {errors.code}
            </p>
          )}
          <label className="row cursor-pointer">
            <input type="checkbox" checked={trustDevice} onChange={(e) => setTrustDevice(e.target.checked)} className="h-5 w-5 accent-[var(--neon-magenta)]" />
            <span>{t("auth.trustDevice")}</span>
          </label>
          <Button type="submit" variant="primary" glow="sm" block loading={busy} disabled={step === "totp" && code.length !== 6}>
            {busy ? t("auth.verifying") : t("auth.verify")}
          </Button>
          <button
            type="button"
            className="t-label self-center text-neon-cyan underline underline-offset-4"
            onClick={() => {
              setStep(step === "totp" ? "backup" : "totp");
              setCode("");
              setErrors({});
            }}
          >
            {step === "totp" ? t("auth.useBackupCode") : t("auth.useAuthenticator")}
          </button>
        </form>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title={t("auth.loginTitle")}
      subtitle={t("auth.loginSubtitle")}
      footer={
        <p className="muted">
          {t("auth.noAccount")} <Link href={params.get("next") ? `${href("/signup")}?next=${encodeURIComponent(destination)}` : href("/signup")}>{t("auth.createOne")}</Link>
        </p>
      }
    >
      <form onSubmit={submitPassword} className="stack stack-4" noValidate>
        {params.get("created") && !errors.form && <Callout tone="info">{t("auth.accountCreated")}</Callout>}
        {errors.form && <Callout tone="error">{errors.form}</Callout>}
        <FormField label={t("auth.identifier")} error={errors.identifier}>
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              aria-describedby={describedBy}
              invalid={invalid}
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              disabled={busy}
              autoFocus
            />
          )}
        </FormField>
        <FormField label={t("auth.password")} error={errors.password}>
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              aria-describedby={describedBy}
              invalid={invalid}
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              disabled={busy}
              trailing={
                <IconButton size="sm" label={showPassword ? t("auth.hidePassword") : t("auth.showPassword")} onClick={() => setShowPassword((v) => !v)}>
                  {showPassword ? <EyeOff className="ico" aria-hidden /> : <Eye className="ico" aria-hidden />}
                </IconButton>
              }
            />
          )}
        </FormField>
        <p className="-mt-2 text-right t-caption">
          <Link href={href("/forgot-password")}>{t("auth.forgotLink")}</Link>
        </p>
        {captcha.widget}
        <Button type="submit" variant="primary" glow="sm" block loading={busy} disabled={captcha.pending}>
          {busy ? t("auth.loggingIn") : t("auth.login")}
        </Button>
      </form>
      <OrRule label={t("common.or")} />
      <Button type="button" variant="secondary" block onClick={signInWithPasskey} loading={passkeyBusy}>
        <KeyRound className="ico" aria-hidden />
        {t("auth.passkeySignIn")}
      </Button>
    </AuthCard>
  );
}
