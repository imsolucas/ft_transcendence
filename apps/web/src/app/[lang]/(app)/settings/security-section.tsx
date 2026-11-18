"use client";

import { useState, type FormEvent } from "react";
import useSWR from "swr";
import { usePathname } from "next/navigation";
import { KeyRound, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/i18n/I18nProvider";
import { authClient } from "@/lib/auth-client";
import { Button, IconButton } from "@/components/ui/button";
import { FormField, Input } from "@/components/ui/form";
import { EmptyState, Panel, Skeleton } from "@/components/ui/primitives";
import { StrengthMeter } from "@/components/auth/strength-meter";
import { TwoFactorPanel } from "./two-factor-panel";
import { SessionsPanel } from "./sessions-panel";

export function SecuritySection() {
  return (
    <div className="stack stack-5">
      <PasswordPanel />
      <PasskeysPanel />
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
    // the server signs every other device out on a password change (whoever had the old one)
    const { error } = await authClient.changePassword({ currentPassword: current, newPassword: next, revokeOtherSessions: true });
    setBusy(false);
    if (error) {
      if (error.code === "INVALID_PASSWORD") setErrors({ current: t("settings.wrongPassword") });
      else if (error.code === "PASSWORD_TOO_SHORT") setErrors({ next: t("auth.errors.passwordTooShort") });
      else if (error.code === "PASSWORD_COMPROMISED") setErrors({ next: t("auth.errors.passwordBreached") });
      else toast.error(error.status === 429 ? t("auth.errors.tooManyAttempts") : t("common.error"));
      return;
    }
    setCurrent("");
    setNext("");
    setErrors({});
    toast.success(t("settings.passwordUpdated"), { description: t("settings.otherDevicesSignedOut") });
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

type PasskeyRow = { id: string | number; name?: string | null; createdAt?: string | Date | null; deviceType?: string };

/** Passkeys: sign in with Face ID, a fingerprint or a security key (phishing-resistant). */
function PasskeysPanel() {
  const { t, href } = useI18n();
  const pathname = usePathname();
  const { data, error, isLoading, mutate } = useSWR("passkeys", async () => {
    const res = await authClient.passkey.listUserPasskeys();
    if (res.error) throw res.error;
    return (res.data ?? []) as PasskeyRow[];
  });
  const [busy, setBusy] = useState(false);
  const [reauth, setReauth] = useState(false);

  const failed = (err: { code?: string; message?: string } | null | undefined) => {
    if (err?.code === "REAUTH") setReauth(true);
    else if (!/cancel|abort|not ?allowed/i.test(`${err?.code ?? ""} ${err?.message ?? ""}`)) toast.error(t("common.error"));
  };

  async function add() {
    setBusy(true);
    const res = await authClient.passkey.addPasskey({ name: deviceName() });
    setBusy(false);
    if (res?.error) return failed(res.error as { code?: string; message?: string });
    toast.success(t("settings.passkeyAdded"));
    void mutate();
  }

  async function remove(id: string | number) {
    const res = await authClient.passkey.deletePasskey({ id: String(id) });
    if (res.error) return failed(res.error as { code?: string; message?: string });
    toast.success(t("settings.passkeyRemoved"));
    void mutate();
  }

  async function signInAgain() {
    await authClient.signOut().catch(() => {});
    window.location.href = new URL(`${href("/login")}?next=${encodeURIComponent(`${pathname}#security`)}`, window.location.origin).href;
  }

  return (
    <Panel className="stack stack-4" aria-labelledby="settings-passkeys">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="t-heading" id="settings-passkeys">
            {t("settings.passkeys")}
          </h2>
          <p className="muted mt-1">{t("settings.passkeysBody")}</p>
        </div>
        <Button type="button" variant="secondary" onClick={add} loading={busy}>
          <KeyRound className="ico" aria-hidden />
          {t("settings.addPasskey")}
        </Button>
      </div>
      {reauth && (
        <div className="row wrap !gap-3" role="alert">
          <p className="t-caption c-amber">{t("settings.passkeyReauth")}</p>
          <Button type="button" size="sm" onClick={signInAgain}>
            {t("settings.signInAgain")}
          </Button>
        </div>
      )}
      {isLoading ? (
        <Skeleton className="!h-12 w-full" />
      ) : error ? (
        <p className="t-caption c-red">{t("common.error")}</p>
      ) : !data?.length ? (
        <EmptyState icon={<KeyRound className="ico" aria-hidden />} title={t("settings.noPasskeys")} />
      ) : (
        <ul className="stack !gap-2">
          {data.map((p) => (
            <li key={String(p.id)} className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2">
              <span className="min-w-0">
                <span className="t-strong block truncate">{p.name || t("settings.passkey")}</span>
                {p.createdAt && <span className="t-caption subtle">{t("settings.passkeyAddedOn", { date: new Date(p.createdAt).toLocaleDateString() })}</span>}
              </span>
              <IconButton size="sm" label={t("settings.removePasskey")} onClick={() => remove(p.id)}>
                <Trash2 className="ico" aria-hidden />
              </IconButton>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

/** "Chrome on macOS": a default name for a new passkey */
function deviceName() {
  const ua = navigator.userAgent;
  const browser = /Edg\//.test(ua) ? "Edge" : /Firefox\//.test(ua) ? "Firefox" : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : "Browser";
  const os = /Windows/.test(ua) ? "Windows" : /Android/.test(ua) ? "Android" : /iPhone|iPad/.test(ua) ? "iOS" : /Mac OS X/.test(ua) ? "macOS" : /Linux/.test(ua) ? "Linux" : "";
  return os ? `${browser} on ${os}` : browser;
}
