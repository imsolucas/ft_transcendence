"use client";

import { Check, Trophy } from "lucide-react";
import type { BracketMatch, TournamentPlayer, TournamentState } from "shared";
import { useI18n } from "@/i18n/I18nProvider";
import { cn } from "@/lib/cn";
import { Badge } from "@/components/ui/primitives";

type T = ReturnType<typeof useI18n>["t"];

/** "Final", "Semifinal", "Round 1"… from the round index and the number of rounds. */
export function roundName(t: T, round: number, rounds: number) {
  if (round === rounds - 1) return t("tournament.final");
  if (round === rounds - 2 && rounds > 2) return t("tournament.semifinal");
  return t("tournament.round", { n: round + 1 });
}

/** The current bracket match, if any. */
export function currentMatch(state: TournamentState): BracketMatch | undefined {
  return state.rounds.flat().find((m) => m.id === state.currentMatchId);
}

/** Lost a match (played, forfeited or no-show) or left the room. */
export function isOut(state: TournamentState, playerId: string) {
  if (state.players.find((p) => p.id === playerId)?.withdrawn) return true;
  return state.rounds.flat().some((m) => m.status === "done" && (m.p1 === playerId || m.p2 === playerId) && m.winnerId !== playerId);
}

/** The player's next undecided match (the current one included). */
export function nextMatchOf(state: TournamentState, playerId: string): BracketMatch | undefined {
  return state.rounds.flat().find((m) => m.status !== "done" && (m.p1 === playerId || m.p2 === playerId));
}

/** Empty bracket for `players` seats (registration preview: seeding happens at start). */
function previewRounds(players: number): BracketMatch[][] {
  let size = 2;
  while (size < Math.max(2, players)) size *= 2;
  const rounds: BracketMatch[][] = [];
  for (let count = size / 2, r = 0; count >= 1; count /= 2, r++) {
    rounds.push(Array.from({ length: count }, (_, i) => ({ id: `r${r}m${i}`, round: r, index: i, p1: null, p2: null, winnerId: null, scores: null, status: "pending", result: null })));
  }
  return rounds;
}

/**
 * BracketView: rounds as columns on desktop, stacked on phones. Ordered lists (round →
 * matches), the live match is marked with a word badge and aria-current, winners with an
 * icon + "Won", and losers struck through with the reason as a word (never colour alone).
 */
export function BracketView({ state, myId, preview }: { state: TournamentState; myId: string | null; preview?: boolean }) {
  const { t } = useI18n();
  const rounds = preview || state.rounds.length === 0 ? previewRounds(state.players.length || state.size) : state.rounds;
  const byId = new Map(state.players.map((p) => [p.id, p]));
  const mine = myId ? nextMatchOf(state, myId) : undefined;

  return (
    <ol className="bracket w-full" aria-label={t("tournament.bracket")}>
      {rounds.map((round, r) => (
        <li key={r} className="bk-round">
          <h3 className="bk-title" id={`bk-round-${r}`}>
            {roundName(t, r, rounds.length)}
          </h3>
          <ol className="bk-slots" aria-labelledby={`bk-round-${r}`}>
            {round.map((m) => {
              const live = m.id === state.currentMatchId;
              const next = !live && mine?.id === m.id;
              return (
                <li key={m.id} className="bk-slot">
                  <div className={cn("bk-match", live && "is-live", next && "is-next")} aria-current={live ? "true" : undefined}>
                    {(live || next) && (
                      <span className="bk-tag">
                        {live ? <Badge tone="amber">{t("tournament.live")}</Badge> : <Badge tone="magenta">{t("tournament.yourMatch")}</Badge>}
                      </span>
                    )}
                    <Side match={m} side={0} player={m.p1 ? byId.get(m.p1) : undefined} myId={myId} t={t} />
                    <Side match={m} side={1} player={m.p2 ? byId.get(m.p2) : undefined} myId={myId} t={t} />
                  </div>
                </li>
              );
            })}
          </ol>
        </li>
      ))}
    </ol>
  );
}

function Side({ match, side, player, myId, t }: { match: BracketMatch; side: 0 | 1; player?: TournamentPlayer; myId: string | null; t: T }) {
  const id = side === 0 ? match.p1 : match.p2;
  const done = match.status === "done";
  // no player in this slot: a bye (round 1), an empty slot nobody won, or not decided yet
  if (!id || !player) {
    const label = done && match.result === "bye" ? t("tournament.bye") : t("tournament.tbd");
    return (
      <div className="bk-p tbd">
        <span>{label}</span>
      </div>
    );
  }
  const won = done && match.winnerId === id;
  const lost = done && !won;
  const score = match.scores ? match.scores[side] : null;
  return (
    <div className={cn("bk-p", won && "won", lost && "out")}>
      <span className="min-w-0 truncate">
        {player.name}
        {id === myId && <span className="subtle"> ({t("common.you")})</span>}
        {player.withdrawn && !won && <span className="subtle"> · {t("tournament.left")}</span>}
      </span>
      <span className="row shrink-0 !gap-1">
        {lost && match.result === "forfeit" && <span className="t-caption">{t("tournament.forfeit")}</span>}
        {won && (match.result === "walkover" || match.result === "bye") && <span className="t-caption">{t("tournament.walkover")}</span>}
        {score !== null && <span className="num">{score}</span>}
        {won && (
          <span className="row !gap-1 c-green t-caption">
            <Check className="ico !h-4 !w-4" aria-hidden />
            {t("tournament.won")}
          </span>
        )}
      </span>
    </div>
  );
}

/** Champion line for the finished bracket: trophy icon + word. */
export function ChampionBanner({ state, myId }: { state: TournamentState; myId: string | null }) {
  const { t } = useI18n();
  const champ = state.players.find((p) => p.id === state.championId);
  return (
    <div className="stack items-center text-center" role="status">
      <Trophy className="ico !h-10 !w-10 c-amber" aria-hidden />
      <p className="pix pix-md c-amber glow-text-amber">{t("tournament.champion")}</p>
      <h1 className="t-title">{!champ ? t("tournament.noChampion") : champ.id === myId ? t("tournament.championYou") : t("tournament.championName", { name: champ.name })}</h1>
    </div>
  );
}
