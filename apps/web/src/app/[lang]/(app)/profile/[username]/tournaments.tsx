"use client";

import { useState } from "react";
import useSWR from "swr";
import { Trophy } from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";
import { ApiError, fetcher } from "@/lib/api";
import type { Page, TournamentSummary } from "@/lib/types";
import { Badge, EmptyState, Panel, Skeleton } from "@/components/ui/primitives";
import { Pager, PlayerChip, useTimeAgo } from "@/components/game/cards";
import { LoadError } from "./profile-view";

const PAGE_SIZE = 10;

/** Tournaments the player took part in, newest first. */
export function Tournaments({ username }: { username: string }) {
  const { t } = useI18n();
  const [page, setPage] = useState(1);
  const key = `/api/users/${encodeURIComponent(username)}/tournaments?page=${page}&pageSize=${PAGE_SIZE}`;
  const { data, error, isLoading, mutate } = useSWR<Page<TournamentSummary>>(key, fetcher, {
    keepPreviousData: true,
    shouldRetryOnError: (err: unknown) => !(err instanceof ApiError && [401, 404].includes(err.status)),
  });

  if (error && !data) {
    return (
      <Panel>
        <LoadError title={t("tournamentHistory.loadError")} error={error} onRetry={() => mutate()} />
      </Panel>
    );
  }
  if (isLoading && !data) {
    return (
      <div className="stack" aria-busy="true" aria-label={t("common.loading")}>
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="!h-[76px] w-full" />
        ))}
      </div>
    );
  }
  if (!data || data.total === 0) {
    return (
      <Panel>
        <EmptyState icon={<Trophy className="ico" aria-hidden />} title={t("tournamentHistory.none")} body={t("tournamentHistory.noneBody")} />
      </Panel>
    );
  }
  return (
    <div aria-busy={isLoading || undefined}>
      <ul className="stack">
        {data.items.map((tournament) => (
          <li key={tournament.id}>
            <TournamentRow tournament={tournament} />
          </li>
        ))}
      </ul>
      <Pager page={page} pageSize={data.pageSize} total={data.total} onPage={setPage} />
    </div>
  );
}

function TournamentRow({ tournament: tr }: { tournament: TournamentSummary }) {
  const { t } = useI18n();
  const ago = useTimeAgo();
  const when = tr.endedAt ?? tr.startedAt;
  return (
    <Panel>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="stack min-w-0 !gap-1">
          <span className="row wrap !gap-2">
            <h2 className="t-strong break-words">{tr.name}</h2>
            {tr.won && (
              <Badge tone="amber" icon={<Trophy className="ico" aria-hidden />}>
                {t("tournamentHistory.champion")}
              </Badge>
            )}
          </span>
          <span className="t-caption muted">
            {t("tournamentHistory.meta", { players: tr.playerCount, matches: tr.matchCount })} ·{" "}
            <time dateTime={when}>{ago(when)}</time>
          </span>
          {tr.winner && !tr.won && (
            <span className="row !gap-2">
              <span className="t-caption subtle">{t("tournamentHistory.winner")}</span>
              <PlayerChip user={tr.winner} showPresence={false} />
            </span>
          )}
        </div>
      </div>
    </Panel>
  );
}
