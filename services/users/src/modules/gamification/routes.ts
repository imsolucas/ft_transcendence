import type { FastifyInstance } from "fastify";
import { Prisma } from "@prisma/client";
import type { Achievement, Leaderboard, LeaderboardRow, Progress } from "../../../../shared/types/api.types.ts";
import { prisma } from "../../db/client.ts";
import { notify } from "../../realtime/notify.ts";
import { requireUser } from "../../auth/guards.ts";
import { PUBLIC_USER_SELECT, parsePage, toPublicUser } from "../shared/presenters.ts";
import { DELETED_PREFIX } from "../privacy/routes.ts";

/** Streaks are computed over the most recent matches only (bounded work per profile view). */
const STREAK_WINDOW = 2000;
const SHUTOUT_MIN_POINTS = 3;

export async function computeAchievements(userId: number, wins: number, played: number): Promise<Achievement[]> {
  const involves = { OR: [{ player1Id: userId }, { player2Id: userId }] };
  const [recent, shutouts, titles, friends] = await Promise.all([
    // newest first, reversed below so the streak scan runs oldest → newest
    prisma.match.findMany({ where: involves, orderBy: [{ played_at: "desc" }, { id: "desc" }], take: STREAK_WINDOW, select: { winnerId: true } }),
    // a shutout needs real points scored (a 1-0 forfeit isn't one)
    prisma.match.count({
      where: {
        OR: [
          { player1Id: userId, winnerId: userId, player2Score: 0, player1Score: { gte: SHUTOUT_MIN_POINTS } },
          { player2Id: userId, winnerId: userId, player1Score: 0, player2Score: { gte: SHUTOUT_MIN_POINTS } },
        ],
      },
    }),
    prisma.tournament.count({ where: { winnerId: userId } }),
    prisma.friendship.count({ where: { status: "ACCEPTED", OR: [{ requesterId: userId }, { addresseeId: userId }] } }),
  ]);
  let best = 0;
  let run = 0;
  for (const m of recent.reverse()) {
    run = m.winnerId === userId ? run + 1 : 0;
    best = Math.max(best, run);
  }
  const a = (id: Achievement["id"], progress: number, target: number): Achievement => ({
    id,
    progress: Math.min(progress, target),
    target,
    unlocked: progress >= target,
    unlockedAt: null,
  });
  return [
    a("first_win", wins, 1),
    a("ten_wins", wins, 10),
    a("fifty_wins", wins, 50),
    a("regular", played, 25),
    a("streak_5", best, 5),
    a("shutout", shutouts, 1),
    a("champion", titles, 1),
    a("social", friends, 5),
  ];
}

/**
 * XP rules (shown on the profile): 10 per match, +20 per win, +100 per title, +25 per achievement.
 * Party games (3–4 players) count as matches and a party won as a win, for XP only: 1v1 stats,
 * win rate and achievements still read the 1v1 Match table.
 */
export const XP = { match: 10, win: 20, title: 100, achievement: 25 } as const;

/** Level n starts at 50·n·(n−1) XP: 0, 100, 300, 600, 1000… */
export function levelFor(xp: number) {
  const level = Math.max(1, Math.floor((1 + Math.sqrt(1 + (8 * xp) / 100)) / 2));
  const start = (n: number) => 50 * n * (n - 1);
  return { xp, level, levelXp: start(level), nextLevelXp: start(level + 1) };
}

type SyncMode = "read" | "store" | "announce";

/**
 * Computes achievements and XP/level from play data and merges what is stored.
 * - read (profile views): nothing is written.
 * - store (startup backfill): new unlocks and XP/level are saved silently.
 * - announce (after a match, tournament or friendship): saved, and each achievement this
 *   call inserted plus any level-up is pushed to the player. Rows are inserted one at a time
 *   so exactly the rows this call created are announced.
 */
export async function syncAchievements(userId: number, mode: SyncMode = "read"): Promise<{ achievements: Achievement[]; progress: Progress }> {
  const involves = { OR: [{ player1Id: userId }, { player2Id: userId }] };
  const [wins, played, titles, stored, user, partyPlayed, partyWins] = await Promise.all([
    prisma.match.count({ where: { winnerId: userId } }),
    prisma.match.count({ where: involves }),
    prisma.tournament.count({ where: { winnerId: userId } }),
    prisma.userAchievement.findMany({ where: { userId }, select: { achievement: true, unlockedAt: true } }),
    prisma.user.findUnique({ where: { id: userId }, select: { level: true, xp: true } }),
    prisma.partyMatchPlayer.count({ where: { userId } }),
    prisma.partyMatch.count({ where: { winnerId: userId } }),
  ]);
  const computed = await computeAchievements(userId, wins, played);
  const known = new Map(stored.map((s) => [s.achievement, s.unlockedAt]));
  if (mode !== "read") {
    for (const c of computed.filter((c) => c.unlocked && !known.has(c.id))) {
      try {
        const row = await prisma.userAchievement.create({ data: { userId, achievement: c.id }, select: { unlockedAt: true } });
        known.set(c.id, row.unlockedAt);
        if (mode === "announce") notify([userId], { type: "achievement", id: c.id });
      } catch (err: any) {
        if (err?.code !== "P2002") throw err; // already stored by a concurrent call: it announces
      }
    }
  }
  const achievements = computed.map((c) => {
    const at = known.get(c.id);
    return at ? { ...c, unlocked: true, progress: c.target, unlockedAt: at.toISOString() } : c;
  });
  const xp = (played + partyPlayed) * XP.match + (wins + partyWins) * XP.win + titles * XP.title + known.size * XP.achievement;
  const progress = levelFor(xp);
  if (mode !== "read" && user && (user.xp !== xp || user.level !== progress.level)) {
    // conditional update: only the call that raises the stored level announces it
    const raised = await prisma.user.updateMany({ where: { id: userId, level: { lt: progress.level } }, data: { xp, level: progress.level } });
    if (raised.count === 0) await prisma.user.update({ where: { id: userId }, data: { xp } });
    if (raised.count > 0 && mode === "announce") notify([userId], { type: "levelUp", level: progress.level });
  }
  return { achievements, progress };
}

/** One-time catch-up at startup for players whose XP was never computed. */
export async function backfillProgress(log: { info: (o: object, m: string) => void; error: (o: object, m: string) => void }) {
  const users = await prisma.user.findMany({
    where: { xp: 0, username: { not: { startsWith: DELETED_PREFIX } }, OR: [{ matchesAsPlayer1: { some: {} } }, { matchesAsPlayer2: { some: {} } }] },
    select: { id: true },
    take: 1000,
  });
  for (const u of users) await syncAchievements(u.id, "store").catch((err) => log.error({ err, userId: u.id }, "progress backfill failed"));
  if (users.length) log.info({ users: users.length }, "progress backfilled");
}

/** Fire-and-forget after a result is recorded; failures are logged, never block the caller. */
export function syncAchievementsLater(userIds: number[], log: { error: (o: object, m: string) => void }) {
  for (const id of new Set(userIds)) syncAchievements(id, "announce").catch((err) => log.error({ err, userId: id }, "achievement sync failed"));
}

interface RankRow {
  id: number;
  wins: bigint;
  games: bigint;
  rank: bigint;
}

/** Everyone with at least one finished match, ranked by wins, then win rate, then fewer games. */
const RANKED = Prisma.sql`
  WITH played AS (
    SELECT "player1Id" AS id, "winnerId" FROM "Matches"
    UNION ALL
    SELECT "player2Id" AS id, "winnerId" FROM "Matches"
  ), totals AS (
    SELECT p.id, COUNT(*) FILTER (WHERE p."winnerId" = p.id) AS wins, COUNT(*) AS games
    FROM played p JOIN "Users" u ON u.id = p.id
    WHERE u.username NOT LIKE ${DELETED_PREFIX + "%"}
    GROUP BY p.id
  )
  SELECT id, wins, games,
         RANK() OVER (ORDER BY wins DESC, wins::float / games DESC, games ASC) AS rank
  FROM totals`;

export default async function gamificationRoutes(app: FastifyInstance) {
  app.get("/leaderboard", { preHandler: requireUser }, async (req): Promise<Leaderboard> => {
    const { page, pageSize, skip } = parsePage(req.query, 20, 50);
    const [rows, count, mine] = await Promise.all([
      prisma.$queryRaw<RankRow[]>`SELECT * FROM (${RANKED}) r ORDER BY rank, id LIMIT ${pageSize} OFFSET ${skip}`,
      prisma.$queryRaw<{ n: bigint }[]>`SELECT COUNT(*) AS n FROM (${RANKED}) r`,
      prisma.$queryRaw<RankRow[]>`SELECT * FROM (${RANKED}) r WHERE id = ${req.user!.id}`,
    ]);
    const ids = [...new Set([...rows, ...mine].map((r) => r.id))];
    const users = await prisma.user.findMany({ where: { id: { in: ids } }, select: { ...PUBLIC_USER_SELECT, level: true } });
    const byId = new Map(users.map((u) => [u.id, { user: toPublicUser(u), level: u.level }]));
    const toRow = (r: RankRow): LeaderboardRow | null => {
      const found = byId.get(r.id);
      if (!found) return null;
      const wins = Number(r.wins);
      const games = Number(r.games);
      return { rank: Number(r.rank), user: found.user, level: found.level, wins, losses: games - wins, winRate: games ? wins / games : 0 };
    };
    return {
      items: rows.map(toRow).filter((r): r is LeaderboardRow => r !== null),
      page,
      pageSize,
      total: Number(count[0]?.n ?? 0),
      you: mine[0] ? toRow(mine[0]) : null,
    };
  });
}
