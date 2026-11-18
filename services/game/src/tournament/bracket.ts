import type { BracketMatch } from "shared/index.ts";

/**
 * Single-elimination bracket, pure (no I/O, no timers, no randomness): the service seeds the
 * players and drives it, and a script can check it headless.
 *
 * Round r match i is fed by round r-1 matches 2i (→ p1) and 2i+1 (→ p2). A match is decided
 * by a game (`recordResult`), by a bye in round 1, or by a walkover when one side is gone
 * (withdrawn, or an empty slot from a match nobody won). `settle` applies byes and walkovers
 * until nothing changes, so a bracket can never wait on a player who is not there.
 */
export interface Bracket {
  rounds: BracketMatch[][];
  /** players who left: every later match of theirs is a walkover */
  withdrawn: Set<string>;
}

export const MAX_BRACKET_PLAYERS = 8;

export function bracketSize(players: number): number {
  let size = 2;
  while (size < players) size *= 2;
  return size;
}

/** Bit-reversal order (4 → [0, 2, 1, 3]): byes are spread over both halves of the bracket. */
function spreadOrder(count: number): number[] {
  const bits = Math.log2(count);
  return Array.from({ length: count }, (_, i) => {
    let r = 0;
    for (let b = 0; b < bits; b++) if (i & (1 << b)) r |= 1 << (bits - 1 - b);
    return r;
  });
}

function emptyMatch(round: number, index: number): BracketMatch {
  return { id: `r${round}m${index}`, round, index, p1: null, p2: null, winnerId: null, scores: null, status: "pending", result: null };
}

/**
 * Builds the bracket from players already in seed order (the caller shuffles them).
 * 2 to 8 players; the bracket is the next power of two, and each bye faces a player, never
 * another bye.
 */
export function createBracket(seeded: string[]): Bracket {
  if (seeded.length < 2 || seeded.length > MAX_BRACKET_PLAYERS) throw new Error("bracket needs 2 to 8 players");
  if (new Set(seeded).size !== seeded.length) throw new Error("duplicate player in bracket");
  const size = bracketSize(seeded.length);
  const firstRound = size / 2;
  const byes = new Set(spreadOrder(firstRound).slice(0, size - seeded.length));

  const rounds: BracketMatch[][] = [];
  let k = 0;
  rounds.push(
    Array.from({ length: firstRound }, (_, i) => {
      const m = emptyMatch(0, i);
      m.p1 = seeded[k++] ?? null;
      m.p2 = byes.has(i) ? null : (seeded[k++] ?? null);
      return m;
    }),
  );
  for (let count = firstRound / 2, r = 1; count >= 1; count /= 2, r++) {
    rounds.push(Array.from({ length: count }, (_, i) => emptyMatch(r, i)));
  }
  const bracket: Bracket = { rounds, withdrawn: new Set() };
  settle(bracket);
  return bracket;
}

/** Every match in play order: round 1 match 1, match 2, … then round 2 … */
export function allMatches(b: Bracket): BracketMatch[] {
  return b.rounds.flat();
}

export function findMatch(b: Bracket, matchId: string): BracketMatch | undefined {
  return allMatches(b).find((m) => m.id === matchId);
}

/** Applies byes, walkovers and empty slots until the bracket is stable. */
export function settle(b: Bracket): void {
  const active = (id: string | null) => (id !== null && !b.withdrawn.has(id) ? id : null);
  let changed = true;
  while (changed) {
    changed = false;
    for (const round of b.rounds) {
      for (const m of round) {
        if (m.status === "done") continue;
        if (m.round > 0) {
          const prev = b.rounds[m.round - 1]!;
          const f1 = prev[2 * m.index]!;
          const f2 = prev[2 * m.index + 1]!;
          // show each side as soon as it is known
          m.p1 = f1.status === "done" ? f1.winnerId : null;
          m.p2 = f2.status === "done" ? f2.winnerId : null;
          if (f1.status !== "done" || f2.status !== "done") continue;
        }
        const a = active(m.p1);
        const c = active(m.p2);
        if (a && c) {
          if (m.status === "pending") {
            m.status = "scheduled";
            changed = true;
          }
          continue;
        }
        // one side (or both) is missing: decided without a game
        m.status = "done";
        m.winnerId = a ?? c ?? null;
        m.result = m.round === 0 && (m.p1 === null || m.p2 === null) ? "bye" : "walkover";
        changed = true;
      }
    }
  }
}

/**
 * Records a game (played to the end, or forfeited mid-match). Only a match that is waiting
 * for a game and only one of its two players can win; anything else is refused (false), so
 * a late duplicate (timer + leave) can't decide a match twice.
 */
export function recordResult(
  b: Bracket,
  matchId: string,
  winnerId: string | null,
  scores: [number, number] | null,
  result: "played" | "forfeit",
): boolean {
  const m = findMatch(b, matchId);
  if (!m || (m.status !== "scheduled" && m.status !== "live")) return false;
  if (winnerId !== null && winnerId !== m.p1 && winnerId !== m.p2) return false;
  m.status = "done";
  m.winnerId = winnerId;
  m.scores = scores;
  m.result = result;
  settle(b);
  return true;
}

/** A player left: their scheduled and future matches become walkovers. Idempotent. */
export function withdraw(b: Bracket, playerId: string): boolean {
  if (b.withdrawn.has(playerId)) return false;
  b.withdrawn.add(playerId);
  settle(b);
  return true;
}

/** The next match to play, in bracket order. */
export function nextMatch(b: Bracket): BracketMatch | undefined {
  return allMatches(b).find((m) => m.status === "scheduled" || m.status === "live");
}

export function finalMatch(b: Bracket): BracketMatch {
  return b.rounds[b.rounds.length - 1]![0]!;
}

/** `done` once the final is decided; `championId` is null only if nobody was left to win it. */
export function outcome(b: Bracket): { done: boolean; championId: string | null } {
  const f = finalMatch(b);
  return { done: f.status === "done", championId: f.status === "done" ? f.winnerId : null };
}

/** Lost a match (played, forfeited or no-show) or left. */
export function isEliminated(b: Bracket, playerId: string): boolean {
  if (b.withdrawn.has(playerId)) return true;
  return allMatches(b).some((m) => m.status === "done" && (m.p1 === playerId || m.p2 === playerId) && m.winnerId !== playerId);
}
