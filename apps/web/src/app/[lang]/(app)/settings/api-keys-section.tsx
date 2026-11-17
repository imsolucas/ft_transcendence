"use client";

import { useState, type FormEvent } from "react";
import useSWR from "swr";
import { AlertTriangle, Copy, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/i18n/I18nProvider";
import { api, ApiError, fetcher } from "@/lib/api";
import type { ApiKeySummary, CreatedApiKey } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Callout, FormField, Input } from "@/components/ui/form";
import { EmptyState, Modal, Panel, Skeleton } from "@/components/ui/primitives";
import { useTimeAgo } from "@/components/game/cards";
import { CodeBox, LoadError, useCopy } from "./settings-ui";

export function ApiKeysSection() {
  const { t, locale } = useI18n();
  const ago = useTimeAgo();
  const copy = useCopy();
  const { data: keys, error, isLoading, mutate } = useSWR<ApiKeySummary[]>("/api/api-keys", fetcher);
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState<string>();
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState<CreatedApiKey | null>(null);
  const [target, setTarget] = useState<ApiKeySummary | null>(null);
  const [revoking, setRevoking] = useState(false);

  const date = (iso: string) => new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(iso));

  async function create(e: FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return setNameError(t("common.required"));
    setCreating(true);
    setNameError(undefined);
    try {
      const key = await api.post<CreatedApiKey>("/api/api-keys", { name: trimmed });
      setCreated(key);
      setName("");
      await mutate();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) setNameError(t("settings.tooManyKeys"));
      else toast.error(err instanceof ApiError && err.status === 0 ? t("common.networkError") : t("common.error"));
    } finally {
      setCreating(false);
    }
  }

  async function revoke() {
    if (!target) return;
    setRevoking(true);
    try {
      await api.del(`/api/api-keys/${target.id}`);
      if (created?.id === target.id) setCreated(null);
      toast.success(t("settings.keyRevoked"));
      setTarget(null);
    } catch {
      toast.error(t("common.error"));
    } finally {
      setRevoking(false);
      await mutate();
    }
  }

  return (
    <div className="stack stack-5">
      <Panel title={t("settings.createKeyTitle")}>
        <div className="stack stack-4">
          <p className="muted">
            {t("settings.apiKeysBody")}{" "}
            <a href="/api/public/docs/" target="_blank" rel="noopener">
              {t("settings.apiDocs")}
            </a>
          </p>
          <form className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-2" onSubmit={create} noValidate>
            <FormField className="grow" label={t("settings.keyName")} error={nameError}>
              {({ id, describedBy, invalid }) => (
                <Input
                  id={id}
                  aria-describedby={describedBy}
                  invalid={invalid}
                  value={name}
                  maxLength={50}
                  placeholder={t("settings.keyNamePlaceholder")}
                  autoComplete="off"
                  disabled={creating}
                  onChange={(e) => {
                    setName(e.target.value);
                    setNameError(undefined);
                  }}
                />
              )}
            </FormField>
            {/* On wide screens, line up with the input under its label */}
            <Button type="submit" variant="primary" loading={creating} className="self-start sm:mt-6">
              {creating ? t("settings.creating") : t("settings.createKey")}
            </Button>
          </form>
          {created && (
            <Callout tone="warn" icon={<AlertTriangle className="ico" aria-hidden />}>
              <div className="stack">
                <span className="t-strong">{t("settings.newKeyWarning")}</span>
                <span className="row wrap">
                  <CodeBox value={created.key} className="min-w-0" />
                  <Button size="sm" onClick={() => copy(created.key)}>
                    <Copy className="ico" aria-hidden />
                    {t("common.copy")}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setCreated(null)}>
                    {t("settings.done")}
                  </Button>
                </span>
              </div>
            </Callout>
          )}
        </div>
      </Panel>

      <Panel title={t("settings.yourKeys")}>
        {error ? (
          <LoadError onRetry={() => mutate()} />
        ) : isLoading || !keys ? (
          <div className="stack stack-3" aria-hidden>
            {[0, 1].map((i) => (
              <Skeleton key={i} className="h-10" />
            ))}
          </div>
        ) : keys.length === 0 ? (
          <EmptyState icon={<KeyRound className="ico" aria-hidden />} title={t("settings.noKeys")} body={t("settings.noKeysBody")} />
        ) : (
          <table className="w-full border-collapse text-[14px]">
            <thead>
              <tr className="font-mono text-[12px] uppercase tracking-[.06em] text-fg-subtle">
                <th className="py-2 pr-3 text-left font-medium">{t("settings.keyName")}</th>
                <th className="py-2 pr-3 text-left font-medium">{t("settings.colKey")}</th>
                <th className="hidden py-2 pr-3 text-left font-medium md:table-cell">{t("settings.colCreated")}</th>
                <th className="hidden py-2 pr-3 text-left font-medium md:table-cell">{t("settings.colLastUsed")}</th>
                <th className="py-2">
                  <span className="sr-only">{t("settings.revoke")}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {keys.map((k) => (
                <tr key={k.id} className="border-t border-border">
                  <td className="t-strong max-w-[160px] truncate py-3 pr-3">{k.name}</td>
                  <td className="num num-md muted py-3 pr-3">{k.prefix}…</td>
                  <td className="muted hidden py-3 pr-3 md:table-cell">{date(k.createdAt)}</td>
                  <td className="muted hidden py-3 pr-3 md:table-cell">{k.lastUsedAt ? ago(k.lastUsedAt) : t("settings.neverUsed")}</td>
                  <td className="py-3 text-right">
                    <Button size="sm" variant="danger" onClick={() => setTarget(k)} aria-label={`${t("settings.revoke")}: ${k.name}`}>
                      {t("settings.revoke")}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>

      <Modal
        open={target !== null}
        onOpenChange={(o) => !o && !revoking && setTarget(null)}
        title={t("settings.revokeKeyTitle")}
        description={target ? t("settings.revokeKeyConfirm", { name: target.name }) : undefined}
        actions={
          <>
            <Button variant="ghost" onClick={() => setTarget(null)} disabled={revoking}>
              {t("common.cancel")}
            </Button>
            <Button variant="danger" onClick={revoke} loading={revoking}>
              {revoking ? t("settings.revoking") : t("settings.revoke")}
            </Button>
          </>
        }
      />
    </div>
  );
}
