"use client";

import { useState } from "react";
import useSWR from "swr";
import { AlertTriangle, Clock, Copy, ExternalLink, Link2Off, ShieldAlert, ShieldCheck, Trophy } from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";
import { ApiError, fetcher } from "@/lib/api";
import type { ChainVerification, Page, TournamentSummary } from "@/lib/types";
import { Badge, EmptyState, Panel, Skeleton } from "@/components/ui/primitives";
import { IconButton } from "@/components/ui/button";
import { Pager, PlayerChip, useTimeAgo } from "@/components/game/cards";
import { useCopy } from "../../settings/settings-ui";
import { LoadError } from "./profile-view";

const PAGE_SIZE = 10;

const shortHash = (h: string) => `${h.slice(0, 8)}…${h.slice(-6)}`;

/** Tournaments the player took part in, each with its on-chain status. */
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
        <LoadError title={t("chain.loadError")} error={error} onRetry={() => mutate()} />
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
        <EmptyState icon={<Trophy className="ico" aria-hidden />} title={t("chain.none")} body={t("chain.noneBody")} />
      </Panel>
    );
  }
  return (
    <div aria-busy={isLoading || undefined}>
      <p className="t-caption subtle mb-3">{t("chain.explainer")}</p>
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
                {t("chain.champion")}
              </Badge>
            )}
          </span>
          <span className="t-caption muted">
            {t("chain.meta", { players: tr.playerCount, matches: tr.matchCount })} ·{" "}
            <time dateTime={when}>{ago(when)}</time>
          </span>
          {tr.winner && !tr.won && (
            <span className="row !gap-2">
              <span className="t-caption subtle">{t("chain.winner")}</span>
              <PlayerChip user={tr.winner} showPresence={false} />
            </span>
          )}
        </div>
        <ChainStatus tournament={tr} />
      </div>
    </Panel>
  );
}

/** On-chain badge (icon + word, never colour alone), tx hash with copy and explorer link. */
function ChainStatus({ tournament: tr }: { tournament: TournamentSummary }) {
  const { t } = useI18n();
  const copy = useCopy();
  // Only ask the chain when something should be there; otherwise the stored state is enough.
  const ask = tr.chain.enabled && tr.endedAt !== null;
  const { data, error, isLoading } = useSWR<ChainVerification>(ask ? `/api/tournaments/${tr.id}/chain` : null, fetcher, {
    revalidateOnFocus: false,
    shouldRetryOnError: false,
  });

  let badge;
  if (!tr.chain.enabled) {
    badge = <Badge icon={<Link2Off className="ico" aria-hidden />}>{t("chain.disabled")}</Badge>;
  } else if (isLoading && !data) {
    badge = <Skeleton style={{ width: 132, height: 22 }} />;
  } else if (error || !data || data.status === "unavailable") {
    badge = <Badge icon={<AlertTriangle className="ico" aria-hidden />}>{t("chain.unavailable")}</Badge>;
  } else if (data.status === "verified") {
    badge = (
      <Badge tone="green" icon={<ShieldCheck className="ico" aria-hidden />}>
        {t("chain.verified")}
      </Badge>
    );
  } else if (data.status === "mismatch") {
    badge = (
      <Badge tone="red" icon={<ShieldAlert className="ico" aria-hidden />}>
        {t("chain.mismatch")}
      </Badge>
    );
  } else if (data.status === "disabled") {
    badge = <Badge icon={<Link2Off className="ico" aria-hidden />}>{t("chain.disabled")}</Badge>;
  } else {
    badge = (
      <Badge tone="amber" icon={<Clock className="ico" aria-hidden />}>
        {t("chain.pending")}
      </Badge>
    );
  }

  const txHash = data?.txHash ?? tr.chain.txHash;
  const explorerUrl = data?.explorerUrl ?? tr.chain.explorerUrl;
  return (
    <div className="stack items-end !gap-1 max-sm:items-start" aria-live="polite">
      {badge}
      {tr.chain.enabled && txHash && (
        <span className="row !gap-1">
          <span className="sr-only">{t("chain.tx")}</span>
          <code className="num num-sm muted" title={txHash}>
            {shortHash(txHash)}
          </code>
          <IconButton size="sm" label={t("chain.copyTx")} onClick={() => copy(txHash)}>
            <Copy className="ico" aria-hidden />
          </IconButton>
          {explorerUrl && (
            <a className="icon-btn icon-btn-sm" href={explorerUrl} target="_blank" rel="noopener noreferrer" aria-label={t("chain.explorer")} title={t("chain.explorer")}>
              <ExternalLink className="ico" aria-hidden />
            </a>
          )}
        </span>
      )}
      {data?.status === "mismatch" && <span className="t-caption c-red">{t("chain.mismatchBody")}</span>}
    </div>
  );
}
