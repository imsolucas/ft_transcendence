// Canonical form of a tournament result, hashed onto the chain (contracts/TournamentScores.sol).
// The SAME function feeds recording and verification, and it reads database rows only (never
// a request body). It uses numeric user ids, scores, winners and epoch-millisecond times:
// no names, emails or avatars. Display names are excluded on purpose: GDPR erasure rewrites
// them to "Deleted player", which must not turn a verified tournament into a mismatch.
import { keccak256, toUtf8Bytes } from "ethers";

const CANONICAL_VERSION = 1;

/** `select` for prisma.tournament that loads exactly what the canonical form needs. */
export const TOURNAMENT_HASH_SELECT = {
  id: true,
  externalId: true,
  winnerId: true,
  start_at: true,
  end_at: true,
  players: { select: { userId: true } },
  matches: {
    select: {
      id: true,
      player1Id: true,
      player2Id: true,
      player1Score: true,
      player2Score: true,
      winnerId: true,
      played_at: true,
      end_at: true,
    },
  },
} as const;

export type TournamentHashRow = {
  id: number;
  externalId: string | null;
  winnerId: number | null;
  start_at: Date;
  end_at: Date | null;
  players: { userId: number }[];
  matches: {
    id: number;
    player1Id: number;
    player2Id: number;
    player1Score: number;
    player2Score: number;
    winnerId: number | null;
    played_at: Date;
    end_at: Date;
  }[];
};

/**
 * The tournament's id on chain. Derived from the game's idempotency key (a UUID per run), not
 * the database id, so a reset or restored database can't collide with older on-chain records.
 * Rows without a key (seed data) fall back to the database id.
 */
export function chainKeyLabel(t: Pick<TournamentHashRow, "id" | "externalId">): string {
  return `ft_transcendence:tournament:${t.externalId ?? `db-${t.id}`}`;
}

export function chainKey(t: Pick<TournamentHashRow, "id" | "externalId">): bigint {
  return BigInt(keccak256(toUtf8Bytes(chainKeyLabel(t))));
}

export function canonicalResult(t: TournamentHashRow): string {
  const players = [...new Set(t.players.map((p) => p.userId))].sort((a, b) => a - b);
  const matches = [...t.matches]
    .sort((a, b) => a.played_at.getTime() - b.played_at.getTime() || a.id - b.id)
    .map((m) => [m.player1Id, m.player2Id, m.player1Score, m.player2Score, m.winnerId, m.played_at.getTime(), m.end_at.getTime()]);
  // fixed key order; JSON.stringify keeps insertion order
  return JSON.stringify({
    v: CANONICAL_VERSION,
    key: chainKeyLabel(t),
    winnerId: t.winnerId,
    startAt: t.start_at.getTime(),
    endAt: t.end_at ? t.end_at.getTime() : null,
    players,
    matches,
  });
}

/** 0x-prefixed keccak256 of the canonical result (lowercase hex). */
export function resultHash(t: TournamentHashRow): string {
  return keccak256(toUtf8Bytes(canonicalResult(t)));
}

/** Readable fields stored next to the hash. */
export function recordFields(t: TournamentHashRow) {
  return {
    winnerId: BigInt(t.winnerId ?? 0),
    playerCount: new Set(t.players.map((p) => p.userId)).size,
    matchCount: t.matches.length,
    endedAt: BigInt(Math.floor((t.end_at ?? t.start_at).getTime() / 1000)),
  };
}
