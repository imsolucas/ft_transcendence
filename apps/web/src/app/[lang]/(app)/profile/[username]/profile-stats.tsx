"use client";

import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";
import type { UserStats } from "@/lib/types";
import { Badge, Panel } from "@/components/ui/primitives";
import { ResultBadge } from "@/components/game/cards";

function StatTile({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1 rounded-md border border-border bg-surface-2 p-4">
      <span className="t-caption subtle">{label}</span>
      <span className="row">{children}</span>
    </div>
  );
}

/** Stats tab: four tiles, wins per week (8 bars, value on each), win/loss split (labelled, not colour alone). */
export function ProfileStats({ stats }: { stats: UserStats }) {
  const { t, locale } = useI18n();
  const played = stats.wins + stats.losses;
  const streak = Math.abs(stats.currentStreak);
  const max = Math.max(0, ...stats.winsPerWeek.map((w) => w.wins));
  // weekStart is a date-only ISO string: format in UTC so it never shifts a day
  const weekFmt = new Intl.DateTimeFormat(locale, { day: "numeric", month: "numeric", timeZone: "UTC" });
  const winShare = played ? (stats.wins / played) * 100 : 0;

  return (
    <div className="flex flex-col gap-6 max-sm:gap-4">
      <div className="grid grid-cols-4 gap-3 max-sm:grid-cols-2">
        <StatTile label={t("lobby.wins")}>
          <span className="num num-lg">{stats.wins}</span>
        </StatTile>
        <StatTile label={t("lobby.losses")}>
          <span className="num num-lg">{stats.losses}</span>
        </StatTile>
        <StatTile label={t("lobby.winRate")}>
          <span className="num num-lg">{played ? `${Math.round(stats.winRate * 100)}%` : "–"}</span>
        </StatTile>
        <StatTile label={t("lobby.streak")}>
          <span className="num num-lg">{streak}</span>
          {stats.currentStreak !== 0 && <ResultBadge result={stats.currentStreak > 0 ? "win" : "loss"} />}
        </StatTile>
      </div>

      <div className="grid grid-cols-2 gap-6 max-md:grid-cols-1 max-sm:gap-4">
        <Panel title={t("profile.winsPerWeek")} actions={<span className="t-caption subtle">{t("profile.lastWeeks")}</span>}>
          <div
            className="grid h-40 grid-cols-8 items-end gap-2 border-b border-border-strong px-1"
            role="img"
            aria-label={t("profile.winsPerWeekAria", { values: stats.winsPerWeek.map((w) => w.wins).join(", ") })}
          >
            {stats.winsPerWeek.map((w) => {
              // Scale to 80% of the plot so the value label above the tallest bar stays inside
              const h = max ? (w.wins / max) * 80 : 0;
              return (
                <div key={w.weekStart} className="flex h-full flex-col items-center justify-end gap-1" aria-hidden>
                  <span className="num num-sm muted">{w.wins}</span>
                  <i className="block w-full max-w-6 rounded-t-md bg-neon-magenta" style={{ height: `${h}%` }} />
                </div>
              );
            })}
          </div>
          <div className="grid grid-cols-8 gap-2 px-1 pt-1.5 text-center" aria-hidden>
            {stats.winsPerWeek.map((w, i) => (
              // At phone width every other date is shown so the labels never truncate
              <span key={w.weekStart} className={i % 2 === 0 ?"num num-sm subtle whitespace-nowrap max-sm:invisible" : "num num-sm subtle whitespace-nowrap"}>
                {weekFmt.format(new Date(w.weekStart))}
              </span>
            ))}
          </div>
        </Panel>

        <Panel
          title={t("profile.winLoss")}
          actions={<span className="t-caption subtle">{t("profile.played", { n: played })}</span>}
          className="stack stack-4"
        >
          {played === 0 ? (
            <p className="muted">{t("profile.noHistory")}</p>
          ) : (
            <>
              <div className="flex h-3 gap-0.5" role="img" aria-label={`${t("lobby.wins")}: ${stats.wins}, ${t("lobby.losses")}: ${stats.losses}`}>
                {stats.wins > 0 && (
                  <i
                    className={stats.losses > 0 ? "block h-full rounded-l-sm bg-neon-green" : "block h-full rounded-sm bg-neon-green"}
                    style={{ width: `${winShare}%` }}
                  />
                )}
                {stats.losses > 0 && (
                  <i className={stats.wins > 0 ? "block h-full flex-1 rounded-r-sm border-2 border-neon-red" : "block h-full flex-1 rounded-sm border-2 border-neon-red"} />
                )}
              </div>
              <div className="row between t-label">
                <Badge tone="green" icon={<ArrowUpRight className="ico" aria-hidden />}>
                  {t("lobby.wins")} <span className="num">{stats.wins}</span>
                </Badge>
                <Badge tone="red" icon={<ArrowDownRight className="ico" aria-hidden />}>
                  {t("lobby.losses")} <span className="num">{stats.losses}</span>
                </Badge>
              </div>
            </>
          )}
        </Panel>
      </div>
    </div>
  );
}
