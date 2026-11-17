"use client";

import { useState } from "react";
import useSWR from "swr";
import { Trophy } from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";
import { fetcher } from "@/lib/api";
import { cn } from "@/lib/cn";
import type { Leaderboard, LeaderboardRow } from "@/lib/types";
import { EmptyState, Panel, Skeleton } from "@/components/ui/primitives";
import { Pager, PlayerChip } from "@/components/game/cards";
import { LoadError } from "../profile/[username]/profile-view";

const PODIUM = ["c-amber", "c-cyan", "c-magenta"];

export function LeaderboardView() {
  const { t, locale } = useI18n();
  const [page, setPage] = useState(1);
  const { data, error, isLoading, mutate } = useSWR<Leaderboard>(`/api/leaderboard?page=${page}`, fetcher, { keepPreviousData: true });
  const pct = (r: number) => new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 0 }).format(r);

  const row = (r: LeaderboardRow, you = false) => (
    <tr key={`${you ? "you-" : ""}${r.user.id}`} className={cn("border-t border-border", you && "bg-surface-2")} aria-current={you ? "true" : undefined}>
      <td className={cn("num w-10 text-center", r.rank <= 3 && PODIUM[r.rank - 1])}>
        {r.rank <= 3 ? (
          <span className="inline-flex items-center gap-1">
            <Trophy className="ico" aria-hidden />
            {r.rank}
          </span>
        ) : (
          r.rank
        )}
      </td>
      <td className="min-w-0 max-w-[48vw]">
        <PlayerChip user={r.user} meta={you ? t("leaderboard.you") : undefined} ring={you ? "you" : undefined} />
      </td>
      <td className="num text-right">{r.wins}</td>
      <td className="num text-right max-sm:hidden">{r.losses}</td>
      <td className="num text-right">{pct(r.winRate)}</td>
    </tr>
  );

  return (
    <div className="mx-auto flex w-full max-w-[880px] flex-col gap-4 md:gap-6">
      <div>
        <h1 className="pix pix-md uppercase">{t("leaderboard.title")}</h1>
        <p className="muted mt-1">{t("leaderboard.subtitle")}</p>
      </div>
      <Panel className="overflow-x-auto !p-0">
        {error && !data ? (
          <div className="p-6">
            <LoadError title={t("leaderboard.loadError")} error={error} onRetry={() => mutate()} />
          </div>
        ) : isLoading && !data ? (
          <div className="stack stack-3 p-6">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} style={{ height: 40 }} />
            ))}
          </div>
        ) : !data?.items.length ? (
          <EmptyState icon={<Trophy className="ico" aria-hidden />} title={t("leaderboard.empty")} body={t("leaderboard.emptyBody")} />
        ) : (
          <table className="w-full border-collapse text-[14px] [&_td]:px-2 [&_td]:py-3 [&_th]:px-2 [&_th]:py-3 md:[&_td]:px-4 md:[&_th]:px-4">
            <caption className="sr-only">{t("leaderboard.title")}</caption>
            <thead>
              <tr className="font-mono text-[12px] uppercase tracking-[.06em] text-fg-subtle [&_th]:font-medium">
                <th scope="col" className="text-center">#</th>
                <th scope="col" className="text-left">{t("leaderboard.player")}</th>
                <th scope="col" className="text-right">
                  <span className="max-sm:hidden">{t("leaderboard.wins")}</span>
                  <abbr className="no-underline sm:hidden" title={t("leaderboard.wins")}>
                    {t("leaderboard.winsShort")}
                  </abbr>
                </th>
                <th scope="col" className="text-right max-sm:hidden">{t("leaderboard.losses")}</th>
                <th scope="col" className="text-right">
                  <span className="max-sm:hidden">{t("leaderboard.winRate")}</span>
                  <abbr className="no-underline sm:hidden" title={t("leaderboard.winRate")}>
                    %
                  </abbr>
                </th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((r) => row(r, r.user.id === data.you?.user.id))}
              {data.you && !data.items.some((r) => r.user.id === data.you!.user.id) && row(data.you, true)}
            </tbody>
          </table>
        )}
      </Panel>
      {data && data.total > data.pageSize && <Pager page={page} pageSize={data.pageSize} total={data.total} onPage={setPage} />}
      {data && !data.you && <p className="t-caption subtle">{t("leaderboard.unranked")}</p>}
    </div>
  );
}
