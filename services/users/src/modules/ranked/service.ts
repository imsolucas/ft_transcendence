import { Prisma } from "@prisma/client";
import { prisma } from "../../db/client.ts";
import { divisionFor, glicko2, seasonBounds, softReset, type Division } from "../../../../shared/ranked/ranked.ts";

type Tx = Prisma.TransactionClient;

/** The season for `at` (a calendar month, UTC), created on first use. */
export async function currentSeason(tx: Tx | typeof prisma = prisma, at = new Date()) {
  const found = await tx.season.findFirst({ where: { startsAt: { lte: at }, endsAt: { gt: at } } });
  if (found) return found;
  const { startsAt, endsAt } = seasonBounds(at);
  const last = await tx.season.findFirst({ orderBy: { number: "desc" }, select: { number: true } });
  try {
    return await tx.season.create({ data: { number: (last?.number ?? 0) + 1, startsAt, endsAt } });
  } catch (err) {
    // created concurrently by another request: use that one
    if ((err as { code?: string }).code === "P2002") {
      const again = await tx.season.findFirst({ where: { startsAt: { lte: at }, endsAt: { gt: at } } });
      if (again) return again;
    }
    throw err;
  }
}

/** This season's rating row, created from last season's (soft reset) when missing. */
async function ratingRow(tx: Tx, userId: number, seasonId: number) {
  const row = await tx.rating.findUnique({ where: { userId_seasonId: { userId, seasonId } } });
  if (row) return row;
  const prev = await tx.rating.findFirst({ where: { userId, seasonId: { lt: seasonId } }, orderBy: { seasonId: "desc" } });
  const start = softReset(prev ? { rating: prev.rating, rd: prev.rd, vol: prev.vol } : null);
  return tx.rating.create({ data: { userId, seasonId, ...start, peak: start.rating } });
}

export interface RatingChange {
  rating: number;
  delta: number;
  games: number;
  division: Division | null;
}

/**
 * Applies one ranked result to both players (Glicko-2, one game = one rating period) inside
 * the caller's transaction. Returns each player's new rounded rating and change.
 */
export async function applyRankedResult(
  tx: Tx,
  seasonId: number,
  p1: number,
  p2: number,
  winnerId: number,
): Promise<Record<number, RatingChange>> {
  // lock order by user id, so two matches finishing together can't deadlock
  const [a, b] = p1 < p2 ? [p1, p2] : [p2, p1];
  const ra = await ratingRow(tx, a, seasonId);
  const rb = await ratingRow(tx, b, seasonId);
  const na = glicko2(ra, rb, winnerId === a ? 1 : 0);
  const nb = glicko2(rb, ra, winnerId === b ? 1 : 0);
  const save = (row: typeof ra, next: typeof na, won: boolean) =>
    tx.rating.update({
      where: { id: row.id },
      data: { rating: next.rating, rd: next.rd, vol: next.vol, games: { increment: 1 }, wins: { increment: won ? 1 : 0 }, peak: Math.max(row.peak, next.rating) },
    });
  const [ua, ub] = await Promise.all([save(ra, na, winnerId === a), save(rb, nb, winnerId === b)]);
  const change = (before: typeof ra, after: typeof ua): RatingChange => ({
    rating: Math.round(after.rating),
    delta: Math.round(after.rating) - Math.round(before.rating),
    games: after.games,
    division: divisionFor(after.rating, after.games),
  });
  return { [a]: change(ra, ua), [b]: change(rb, ub) };
}

/** Runs `fn` in a serializable transaction, retrying a few times on a write conflict. */
export async function serializable<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await prisma.$transaction(fn, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (err) {
      const code = (err as { code?: string }).code;
      // P2034: serialization conflict. P2002 on a rating row: two first matches of the same
      // player created it at once (a duplicate match id also lands here and fails again, then
      // the caller's idempotency check answers it)
      if ((code === "P2034" || code === "P2002") && attempt < 4) continue;
      throw err;
    }
  }
}

/** A player's current-season rating (no row yet = the starting rating, not saved). */
export async function ratingOf(userId: number) {
  const season = await currentSeason();
  const row = await prisma.rating.findUnique({ where: { userId_seasonId: { userId, seasonId: season.id } } });
  if (row) return { season, row };
  const prev = await prisma.rating.findFirst({ where: { userId, seasonId: { lt: season.id } }, orderBy: { seasonId: "desc" } });
  const start = softReset(prev ? { rating: prev.rating, rd: prev.rd, vol: prev.vol } : null);
  return { season, row: { rating: start.rating, rd: start.rd, games: 0, wins: 0, peak: start.rating } };
}
