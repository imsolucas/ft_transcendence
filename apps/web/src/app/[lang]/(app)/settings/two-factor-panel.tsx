"use client";

import { useState, type FormEvent } from "react";
import { Check, Copy } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { mutate } from "swr";
import { useI18n } from "@/i18n/I18nProvider";
import { authClient } from "@/lib/auth-client";
import { useMe } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { Callout, FormField, Input } from "@/components/ui/form";
import { OtpInput } from "@/components/ui/otp-input";
import { Badge, Modal, Panel, Skeleton } from "@/components/ui/primitives";
import { CodeBox, LoadError, useCopy } from "./settings-ui";

type Setup = { totpURI: string; backupCodes: string[] };
type Mode = "enable" | "disable";

function secretFrom(totpURI: string) {
  try {
    return new URL(totpURI).searchParams.get("secret") ?? "";
  } catch {
    return "";
  }
}

export function TwoFactorPanel() {
  const { t } = useI18n();
  const copy = useCopy();
  const { me, isLoading, error, mutate: reload } = useMe();
  const [mode, setMode] = useState<Mode | null>(null);
  const [password, setPassword] = useState("");
  const [pwError, setPwError] = useState<string>();
  const [confirming, setConfirming] = useState(false);
  const [setup, setSetup] = useState<Setup | null>(null);
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState<string>();
  const [verifying, setVerifying] = useState(false);
  const [shownCodes, setShownCodes] = useState<string[] | null>(null);

  function openModal(m: Mode) {
    setMode(m);
    setPassword("");
    setPwError(undefined);
  }

  async function confirm(e: FormEvent) {
    e.preventDefault();
    if (!password) return setPwError(t("common.required"));
    setConfirming(true);
    const res = mode === "enable" ? await authClient.twoFactor.enable({ password }) : await authClient.twoFactor.disable({ password });
    setConfirming(false);
    if (res.error) {
      if (res.error.code === "INVALID_PASSWORD") setPwError(t("settings.wrongPassword"));
      else setPwError(res.error.status === 429 ? t("auth.errors.tooManyAttempts") : t("common.error"));
      return;
    }
    setMode(null);
    setPassword("");
    if (mode === "enable" && res.data && "totpURI" in res.data) {
      setShownCodes(null);
      setCode("");
      setCodeError(undefined);
      setSetup({ totpURI: res.data.totpURI, backupCodes: res.data.backupCodes });
    } else {
      toast.success(t("settings.twoFactorDisabled"));
      await mutate("/api/me");
    }
  }

  async function verify(e: FormEvent) {
    e.preventDefault();
    if (!setup) return;
    if (code.length !== 6) return setCodeError(t("auth.twoFactorWrong"));
    setVerifying(true);
    const { error: err } = await authClient.twoFactor.verifyTotp({ code });
    setVerifying(false);
    if (err) {
      setCodeError(err.status === 429 ? t("auth.errors.tooManyAttempts") : t("auth.twoFactorWrong"));
      setCode("");
      return;
    }
    setShownCodes(setup.backupCodes);
    setSetup(null);
    toast.success(t("settings.twoFactorEnabled"));
    await mutate("/api/me");
  }

  if (error) {
    return (
      <Panel title={t("settings.twoFactor")}>
        <LoadError onRetry={() => reload()} />
      </Panel>
    );
  }

  const on = !!me?.twoFactorEnabled;
  const secret = setup ? secretFrom(setup.totpURI) : "";

  return (
    <Panel
      aria-labelledby="settings-2fa"
      title={
        <h2 className="t-heading" id="settings-2fa">
          {t("settings.twoFactor")}
        </h2>
      }
      actions={
        isLoading || !me ? (
          <Skeleton className="h-6 w-12" />
        ) : on ? (
          <Badge tone="green" icon={<Check className="ico" aria-hidden />}>
            {t("settings.twoFactorOn")}
          </Badge>
        ) : (
          <Badge>{t("settings.twoFactorOff")}</Badge>
        )
      }
    >
      <div className="stack stack-4">
        <p className="muted">{t("settings.twoFactorBody")}</p>

        {shownCodes && (
          <Callout tone="warn">
            <div className="stack stack-3">
              <span className="t-strong">{t("settings.backupCodes")}</span>
              <span className="muted">{t("settings.backupCodesBody")}</span>
              <ul className="grid grid-cols-2 gap-2 font-mono text-[14px] sm:grid-cols-5" aria-label={t("settings.backupCodes")}>
                {shownCodes.map((c) => (
                  <li key={c} className="rounded-sm border border-border bg-bg px-2 py-1 text-center select-all">
                    {c}
                  </li>
                ))}
              </ul>
              <div className="row wrap">
                <Button size="sm" onClick={() => copy(shownCodes.join("\n"))}>
                  <Copy className="ico" aria-hidden />
                  {t("common.copy")}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setShownCodes(null)}>
                  {t("settings.done")}
                </Button>
              </div>
            </div>
          </Callout>
        )}

        {setup ? (
          <form className="row row-4 wrap items-start" onSubmit={verify} noValidate>
            <div className="rounded-md bg-fg p-3 text-bg" role="img" aria-label={t("settings.qrLabel")}>
              <QRCodeSVG value={setup.totpURI} size={160} bgColor="transparent" fgColor="currentColor" marginSize={0} aria-hidden />
            </div>
            <div className="stack stack-3 grow min-w-[240px]">
              <p className="muted">{t("settings.step1")}</p>
              {secret && (
                <div className="stack" style={{ gap: 4 }}>
                  <span className="t-caption subtle">{t("settings.secretKey")}</span>
                  <CodeBox value={secret} display={secret.replace(/(.{4})(?=.)/g, "$1 ")} copyLabel={t("settings.copyKey")} />
                </div>
              )}
              <p className="muted">{t("settings.step2")}</p>
              <OtpInput
                value={code}
                onChange={(v) => {
                  setCode(v);
                  setCodeError(undefined);
                }}
                invalid={!!codeError}
                label={t("settings.step2")}
                digitLabel={(n) => t("auth.twoFactorDigit", { n })}
              />
              <div aria-live="polite">
                {codeError && (
                  <p className="field-error" role="alert">
                    {codeError}
                  </p>
                )}
              </div>
              <div className="row wrap">
                <Button type="submit" variant="primary" loading={verifying} disabled={code.length !== 6}>
                  {verifying ? t("auth.verifying") : t("settings.verifyEnable")}
                </Button>
                <Button type="button" variant="ghost" onClick={() => setSetup(null)} disabled={verifying}>
                  {t("common.cancel")}
                </Button>
              </div>
            </div>
          </form>
        ) : (
          me && (
            <div className="row">
              {on ? (
                <Button variant="danger" onClick={() => openModal("disable")}>
                  {t("settings.disable2fa")}
                </Button>
              ) : (
                <Button onClick={() => openModal("enable")}>{t("settings.enable2fa")}</Button>
              )}
            </div>
          )
        )}
      </div>

      <Modal
        open={mode !== null}
        onOpenChange={(o) => !o && !confirming && setMode(null)}
        title={mode === "disable" ? t("settings.disable2faTitle") : t("settings.enable2faTitle")}
        description={t("settings.confirmPassword")}
      >
        <form className="stack stack-4" onSubmit={confirm} noValidate>
          <FormField label={t("auth.password")} error={pwError}>
            {({ id, describedBy, invalid }) => (
              <Input
                id={id}
                aria-describedby={describedBy}
                invalid={invalid}
                type="password"
                autoComplete="current-password"
                autoFocus
                value={password}
                disabled={confirming}
                onChange={(e) => setPassword(e.target.value)}
              />
            )}
          </FormField>
          <div className="modal-actions">
            <Button type="button" variant="ghost" onClick={() => setMode(null)} disabled={confirming}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" variant={mode === "disable" ? "danger" : "primary"} loading={confirming}>
              {confirming ? t("settings.checking") : mode === "disable" ? t("settings.disable2fa") : t("common.confirm")}
            </Button>
          </div>
        </form>
      </Modal>
    </Panel>
  );
}
