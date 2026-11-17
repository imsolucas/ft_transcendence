import type { FastifyInstance } from "fastify";
import { Prisma } from "@prisma/client";
import type { Achievement, Leaderboard, LeaderboardRow } from "../../../../shared/types/api.types.ts";
import { prisma } from "../../db/client.ts";
import { requireUser } from "../../auth/guards.ts";
import { PUBLIC_USER_SELECT, parsePage, toPublicUser } from "../shared/presenters.ts";
import { DELETED_PREFIX } from "../privacy/routes.ts";

/** Streaks are computed over the most recent matches only (bounded work per profile view). */
const STREAK_WINDOW = 2000;

export async function computeAchievements(userId: number, wins: number, played: number): Promise<Achievement[]> {
  const involves = { OR: [{ player1Id: userId }, { player2Id: userId }] };
  const [recent, shutouts, titles, friends] = await Promise.all([
    prisma.match.findMany({ where: involves, orderBy: [{ played_at: "asc" }, { id: "asc" }], take: STREAK_WINDOW, select: { winnerId: true } }),
    prisma.match.count({
      where: { OR: [{ player1Id: userId, winnerId: userId, player2Score: 0 }, { player2Id: userId, winnerId: userId, player1Score: 0 }] },
    }),
    prisma.tournament.count({ where: { winnerId: userId } }),
    prisma.friendship.count({ where: { status: "ACCEPTED", OR: [{ requesterId: userId }, { addresseeId: userId }] } }),
  ]);
  let best = 0;
  let run = 0;
  for (const m of recent) {
    run = m.winnerId === userId ? run + 1 : 0;
    best = Math.max(best, run);
  }
  const a = (id: Achievement["id"], progress: number, target: number): Achievement => ({
    id,
    progress: Math.min(progress, target),
    target,
    unlocked: progress >= target,
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
    const users = await prisma.user.findMany({ where: { id: { in: ids } }, select: PUBLIC_USER_SELECT });
    const byId = new Map(users.map((u) => [u.id, toPublicUser(u)]));
    const toRow = (r: RankRow): LeaderboardRow | null => {
      const user = byId.get(r.id);
      if (!user) return null;
      const wins = Number(r.wins);
      const games = Number(r.games);
      return { rank: Number(r.rank), user, wins, losses: games - wins, winRate: games ? wins / games : 0 };
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
