"use client";

import { useState } from "react";
import useSWR from "swr";
import { Check, Monitor, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/i18n/I18nProvider";
import { api, fetcher } from "@/lib/api";
import type { SessionInfo } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Badge, EmptyState, Modal, Panel, Skeleton } from "@/components/ui/primitives";
import { useTimeAgo } from "@/components/game/cards";
import { LoadError } from "./settings-ui";

const BROWSERS: [RegExp, string][] = [
  [/Edg\//, "Edge"],
  [/OPR\/|Opera/, "Opera"],
  [/Firefox\//, "Firefox"],
  [/Chrome\/|CriOS\//, "Chrome"],
  [/Safari\//, "Safari"],
  [/curl\//, "curl"],
];
const SYSTEMS: [RegExp, string][] = [
  [/Windows/, "Windows"],
  [/Android/, "Android"],
  [/iPhone|iPad|iPod/, "iOS"],
  [/Mac OS X|Macintosh/, "macOS"],
  [/CrOS/, "ChromeOS"],
  [/Linux/, "Linux"],
];

/** "Firefox on Linux" from a user agent; null when nothing is recognised. */
function describeDevice(ua: string | null): { browser?: string; os?: string; mobile: boolean } | null {
  if (!ua) return null;
  const browser = BROWSERS.find(([re]) => re.test(ua))?.[1];
  const os = SYSTEMS.find(([re]) => re.test(ua))?.[1];
  if (!browser && !os) return null;
  return { browser, os, mobile: /Mobi|Android|iPhone|iPad/.test(ua) };
}

export function SessionsPanel() {
  const { t } = useI18n();
  const ago = useTimeAgo();
  const { data, error, isLoading, mutate } = useSWR<SessionInfo[]>("/api/sessions", fetcher);
  const [target, setTarget] = useState<SessionInfo | "others" | null>(null);
  const [busy, setBusy] = useState(false);

  function deviceName(s: SessionInfo) {
    const d = describeDevice(s.userAgent);
    if (!d) return t("settings.unknownDevice");
    if (d.browser && d.os) return t("settings.deviceOn", { browser: d.browser, os: d.os });
    return d.browser ?? d.os ?? t("settings.unknownDevice");
  }

  const sessions = data ? [...data].sort((a, b) => Number(b.current) - Number(a.current) || b.createdAt.localeCompare(a.createdAt)) : [];
  const others = sessions.filter((s) => !s.current).length;

  async function revoke() {
    if (!target) return;
    setBusy(true);
    try {
      if (target === "others") {
        await api.del("/api/sessions");
        toast.success(t("settings.othersRevoked"));
      } else {
        await api.del(`/api/sessions/${target.id}`);
        toast.success(t("settings.sessionRevoked"));
      }
      setTarget(null);
    } catch {
      toast.error(t("common.error"));
    } finally {
      setBusy(false);
      await mutate();
    }
  }

  return (
    <Panel title={t("settings.sessions")}>
      <div className="stack stack-3">
        {error ? (
          <LoadError onRetry={() => mutate()} />
        ) : isLoading ? (
          <ul className="stack" aria-hidden>
            {[0, 1, 2].map((i) => (
              <li key={i} className="list-row border border-border">
                <Skeleton className="!h-9 !w-9" />
                <span className="stack grow">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-56 max-w-full" />
                </span>
              </li>
            ))}
          </ul>
        ) : sessions.length === 0 ? (
          <EmptyState title={t("settings.noSessions")} />
        ) : (
          <ul className="stack">
            {sessions.map((s) => {
              const mobile = describeDevice(s.userAgent)?.mobile;
              const Icon = mobile ? Smartphone : Monitor;
              const meta = [s.ipAddress || null, t("settings.lastActive", { when: ago(s.createdAt) })].filter(Boolean).join(" · ");
              return (
                <li key={s.id} className="list-row border border-border">
                  <span className="flex h-7 w-7 flex-none items-center justify-center rounded-sm border border-border-strong text-fg md:h-9 md:w-9">
                    <Icon className="ico" aria-hidden />
                  </span>
                  <span className="stack grow" style={{ gap: 0 }}>
                    <span className="t-strong truncate">{deviceName(s)}</span>
                    <span className="t-caption subtle truncate">{meta}</span>
                  </span>
                  {s.current ? (
                    <Badge tone="green" icon={<Check className="ico" aria-hidden />}>
                      {t("settings.thisDevice")}
                    </Badge>
                  ) : (
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => setTarget(s)}
                      aria-label={`${t("settings.revoke")}: ${deviceName(s)}`}
                    >
                      {t("settings.revoke")}
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        {!error && !isLoading && (
          <div className="row">
            <Button variant="ghost" onClick={() => setTarget("others")} disabled={others === 0}>
              {t("settings.revokeOthers")}
            </Button>
          </div>
        )}
      </div>

      <Modal
        open={target !== null}
        onOpenChange={(o) => !o && !busy && setTarget(null)}
        title={target === "others" ? t("settings.revokeOthersTitle") : t("settings.revokeSessionTitle")}
        description={
          target === "others"
            ? t("settings.revokeOthersBody")
            : target
              ? t("settings.revokeSessionBody", { device: deviceName(target) })
              : undefined
        }
        actions={
          <>
            <Button variant="ghost" onClick={() => setTarget(null)} disabled={busy}>
              {t("common.cancel")}
            </Button>
            <Button variant="danger" onClick={revoke} loading={busy}>
              {busy ? t("settings.revoking") : target === "others" ? t("settings.revokeOthers") : t("settings.revoke")}
            </Button>
          </>
        }
      />
    </Panel>
  );
}
