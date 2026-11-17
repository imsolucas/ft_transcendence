"use client";

import useSWR from "swr";
import { AlertTriangle, CheckCircle2, CircleSlash, Database, Gamepad2, Server } from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";
import type { ServiceState, StatusReport } from "@/lib/types";
import { Badge, Panel, Skeleton } from "@/components/ui/primitives";
import { Footer, Wordmark } from "@/components/layout/shell";
import { useTimeAgo } from "@/components/game/cards";

const TONE: Record<ServiceState, "green" | "amber" | "red"> = { up: "green", degraded: "amber", down: "red" };
const ICON = { up: CheckCircle2, degraded: AlertTriangle, down: CircleSlash };
const SERVICE_ICON = { api: Server, database: Database, game: Gamepad2 };

/** Public status page: state is always icon + word, never colour alone. */
export function StatusView() {
  const { t, href } = useI18n();
  const ago = useTimeAgo();
  const { data, error } = useSWR<StatusReport>("/api/status", { refreshInterval: 10_000, shouldRetryOnError: true });

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto flex w-full max-w-[1440px] items-center px-4 py-4 md:px-8">
        <Wordmark href={href("/")} />
      </header>
      <main id="main" className="mx-auto w-full max-w-[720px] flex-1 px-4 py-8">
        <h1 className="pix pix-md mb-1">{t("status.title")}</h1>
        <p className="muted mb-6">{t("status.subtitle")}</p>
        <Panel className="mb-4" aria-live="polite">
          {error && !data ? (
            <p className="row c-red" role="alert">
              <CircleSlash className="ico" aria-hidden />
              {t("status.unreachable")}
            </p>
          ) : !data ? (
            <Skeleton style={{ width: "60%", height: 24 }} />
          ) : (
            <p className="row t-heading">
              {(() => {
                const Icon = ICON[data.overall];
                return <Icon className={`ico c-${TONE[data.overall]}`} aria-hidden />;
              })()}
              {t(`status.overall.${data.overall}`)}
            </p>
          )}
        </Panel>
        <Panel>
          <ul className="stack stack-3">
            {(data?.services ?? [null, null, null]).map((s, i) => (
              <li key={s?.name ?? i} className="row between">
                {s ? (
                  <>
                    <span className="row">
                      {(() => {
                        const Icon = SERVICE_ICON[s.name];
                        return <Icon className="ico subtle" aria-hidden />;
                      })()}
                      <span className="t-strong">{t(`status.service.${s.name}`)}</span>
                    </span>
                    <span className="row">
                      {s.latencyMs !== null && <span className="num num-sm muted">{s.latencyMs} ms</span>}
                      <Badge tone={TONE[s.state]}>{t(`status.state.${s.state}`)}</Badge>
                    </span>
                  </>
                ) : (
                  <Skeleton style={{ width: "100%" }} />
                )}
              </li>
            ))}
          </ul>
        </Panel>
        {data && (
          <p className="t-caption subtle mt-4">
            {t("status.checked", { when: ago(data.checkedAt) })} · {t("status.uptime", { h: Math.floor(data.uptimeSeconds / 3600), m: Math.floor((data.uptimeSeconds % 3600) / 60) })} · {t("status.refresh")}
          </p>
        )}
      </main>
      <Footer />
    </div>
  );
}
