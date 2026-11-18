import { prisma } from "../../db/client.ts";
import { DELETED_PREFIX } from "../privacy/routes.ts";
import { DAILY_MIN_TICKS } from "../../../../shared/daily/daily.ts";

/** a try counts (streak, XP, board) once it was really played: finished, at least DAILY_MIN_TICKS long */
const PLAYED = { score: { not: null }, ticks: { gte: DAILY_MIN_TICKS } } as const;

/** XP for a day's best run: 10 for playing, +2 per point (up to 25 points) */
export const dailyXpFor = (best: number | null): number => (best === null ? 0 : 10 + 2 * Math.min(Math.max(best, 0), 25));

/** Streaks look at the last ~13 months of play (bounded work). */
const STREAK_WINDOW = 400;

const dayMs = 86_400_000;
const dayNumber = (day: string) => Math.round(Date.parse(`${day}T00:00:00Z`) / dayMs);

/** Days with a counted try (newest first), one per day. */
async function daysPlayed(userId: number): Promise<number[]> {
  const rows = await prisma.dailyRun.findMany({ where: { userId, ...PLAYED }, distinct: ["day"], select: { day: true }, orderBy: { day: "desc" }, take: STREAK_WINDOW });
  return rows.map((r) => dayNumber(r.day));
}

/** current streak (up to today, or yesterday when today isn't played yet) and the best one */
export async function dailyStreaks(userId: number, today: string): Promise<{ current: number; best: number }> {
  const days = await daysPlayed(userId);
  const t = dayNumber(today);
  let current = 0;
  if (days[0] === t || days[0] === t - 1) {
    current = 1;
    while (current < days.length && days[current] === days[current - 1]! - 1) current++;
  }
  let best = 0;
  let run = 0;
  for (let i = 0; i < days.length; i++) {
    run = i > 0 && days[i] === days[i - 1]! - 1 ? run + 1 : 1;
    best = Math.max(best, run);
  }
  return { current, best };
}

/** sum of dailyXpFor(best) over every day played (for the derived XP total) */
export async function dailyXpTotal(userId: number): Promise<number> {
  const rows = await prisma.$queryRaw<{ total: bigint | null }[]>`
    SELECT SUM(10 + 2 * LEAST(GREATEST(b, 0), 25)) AS total
    FROM (SELECT MAX(score) AS b FROM "DailyRuns" WHERE "userId" = ${userId} AND score IS NOT NULL AND ticks >= ${DAILY_MIN_TICKS} GROUP BY day) t`;
  return Number(rows[0]?.total ?? 0);
}

export async function bestToday(userId: number, day: string): Promise<number | null> {
  const r = await prisma.dailyRun.aggregate({ where: { userId, day, ...PLAYED }, _max: { score: true } });
  return r._max.score ?? null;
}

export interface BoardEntry {
  userId: number;
  score: number;
  rank: number;
}

/**
 * The day's board: each player's best (ties: who got there first), top `limit`, plus the
 * given player's row when they're further down. Deleted accounts are left out.
 */
export async function dailyBoard(day: string, limit: number, meId: number | null): Promise<BoardEntry[]> {
  const rows = await prisma.$queryRaw<{ userId: number; score: number; rank: bigint }[]>`
    WITH best AS (
      SELECT DISTINCT ON (r."userId") r."userId", r.score, r."finishedAt"
      FROM "DailyRuns" r JOIN "Users" u ON u.id = r."userId"
      WHERE r.day = ${day} AND r.score IS NOT NULL AND r.ticks >= ${DAILY_MIN_TICKS} AND u.username NOT LIKE ${DELETED_PREFIX + "%"}
      ORDER BY r."userId", r.score DESC, r."finishedAt" ASC
    ), ranked AS (
      SELECT "userId", score, ROW_NUMBER() OVER (ORDER BY score DESC, "finishedAt" ASC, "userId" ASC) AS rank FROM best
    )
    SELECT "userId", score, rank FROM ranked WHERE rank <= ${limit} OR "userId" = ${meId ?? -1} ORDER BY rank`;
  return rows.map((r) => ({ userId: r.userId, score: r.score, rank: Number(r.rank) }));
}

/** initials shown until the player picks some: the first letters of the username */
export function defaultInitials(username: string): string {
  const letters = username.toUpperCase().replace(/[^A-Z]/g, "");
  return (letters + "XXX").slice(0, 3);
}
