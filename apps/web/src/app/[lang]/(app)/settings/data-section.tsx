"use client";

import { useState, type FormEvent } from "react";
import { usePathname } from "next/navigation";
import useSWR from "swr";
import { Download, Trash2 } from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";
import { api, ApiError, fetcher } from "@/lib/api";
import { authClient } from "@/lib/auth-client";
import type { Me } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Callout, FormField, Input } from "@/components/ui/form";
import { Modal, Panel } from "@/components/ui/primitives";

/** GDPR: download everything we store, or delete the account (anonymises match history). */
export function DataSection() {
  const { t, href } = useI18n();
  const pathname = usePathname();
  const { data: me } = useSWR<Me>("/api/me", fetcher);
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string>();
  const [needsReauth, setNeedsReauth] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const matches = !!me && confirm.trim().toLowerCase() === me.username;

  function close() {
    if (deleting) return;
    setOpen(false);
    setConfirm("");
    setError(undefined);
    setNeedsReauth(false);
  }

  async function remove(e: FormEvent) {
    e.preventDefault();
    if (!matches) return setError(t("data.typeToConfirm", { name: me?.username ?? "" }));
    setDeleting(true);
    setError(undefined);
    try {
      await api.post("/api/me/delete", { confirm: confirm.trim() });
      // full load: nothing of the old account stays in client caches
      window.location.href = new URL(href("/"), window.location.origin).href;
    } catch (err) {
      if (err instanceof ApiError && err.code === "REAUTH") setNeedsReauth(true);
      else setError(err instanceof ApiError && err.status === 0 ? t("common.networkError") : t("common.error"));
      setDeleting(false);
    }
  }

  async function reauth() {
    await authClient.signOut().catch(() => {});
    window.location.href = new URL(`${href("/login")}?next=${encodeURIComponent(`${pathname}#data`)}`, window.location.origin).href;
  }

  return (
    <div className="stack stack-6">
      <Panel>
        <h2 className="t-heading" id="settings-export">
          {t("data.exportTitle")}
        </h2>
        <p className="muted mb-4 mt-1">{t("data.exportBody")}</p>
        <Button asChild>
          <a href="/api/me/export" download className="no-underline">
            <Download className="ico" aria-hidden />
            {t("data.download")}
          </a>
        </Button>
      </Panel>

      <Panel className="border-[color:var(--neon-red)]/40">
        <h2 className="t-heading" id="settings-delete">
          {t("data.deleteTitle")}
        </h2>
        <p className="muted mb-4 mt-1">{t("data.deleteBody")}</p>
        <Button variant="danger" onClick={() => setOpen(true)}>
          <Trash2 className="ico" aria-hidden />
          {t("data.delete")}
        </Button>
      </Panel>

      <Modal
        open={open}
        onOpenChange={(o) => !o && close()}
        title={t("data.deleteTitle")}
        description={t("data.deleteConfirm")}
      >
        {needsReauth ? (
          <div className="stack stack-4">
            <Callout tone="warn">{t("data.reauth")}</Callout>
            <div className="row justify-end">
              <Button variant="ghost" onClick={close}>
                {t("common.cancel")}
              </Button>
              <Button onClick={reauth}>{t("auth.loginAgain")}</Button>
            </div>
          </div>
        ) : (
          <form onSubmit={remove} className="stack stack-4 mt-3" noValidate>
            <FormField label={t("data.typeLabel", { name: me?.username ?? "" })} error={error}>
              {({ id, describedBy, invalid }) => <Input id={id} aria-describedby={describedBy} invalid={invalid} value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="off" spellCheck={false} />}
            </FormField>
            <div className="row justify-end">
              <Button type="button" variant="ghost" onClick={close} disabled={deleting}>
                {t("common.cancel")}
              </Button>
              <Button type="submit" variant="danger" loading={deleting} disabled={!matches}>
                {t("data.deleteForever")}
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
