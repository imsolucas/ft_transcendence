import type { FastifyInstance } from "fastify";
import type { MatchSummary, Page, Profile, SearchResult, UserStats } from "../../../../shared/types/api.types.ts";
import { DELETED_PREFIX, isDeletedHandle } from "../privacy/routes.ts";
import { computeAchievements } from "../gamification/routes.ts";
import { prisma } from "../../db/client.ts";
import { requireUser } from "../../auth/guards.ts";
import { PUBLIC_USER_SELECT, friendshipState, friendshipStates, parsePage, toPublicUser } from "../shared/presenters.ts";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function startOfIsoWeek(d: Date): Date {
  const day = (d.getUTCDay() + 6) % 7; // Monday = 0
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - day));
}

export async function computeStats(userId: number): Promise<UserStats> {
  const involves = { OR: [{ player1Id: userId }, { player2Id: userId }] };
  const since = startOfIsoWeek(new Date(Date.now() - 7 * WEEK_MS));

  const [wins, total, recent, lastWeeks] = await Promise.all([
    prisma.match.count({ where: { winnerId: userId } }),
    prisma.match.count({ where: involves }),
    // enough rows to compute the current streak
    prisma.match.findMany({
      where: involves,
      orderBy: [{ played_at: "desc" }, { id: "desc" }],
      take: 50,
      select: { winnerId: true },
    }),
    prisma.match.findMany({
      where: { winnerId: userId, played_at: { gte: since } },
      select: { played_at: true },
      take: 1000,
    }),
  ]);

  const losses = Math.max(0, total - wins);
  let streak = 0;
  for (const m of recent) {
    const won = m.winnerId === userId;
    if (streak === 0) streak = won ? 1 : -1;
    else if (won && streak > 0) streak++;
    else if (!won && streak < 0) streak--;
    else break;
  }

  const weeks: { weekStart: string; wins: number }[] = [];
  for (let i = 7; i >= 0; i--) {
    const start = startOfIsoWeek(new Date(Date.now() - i * WEEK_MS));
    weeks.push({ weekStart: start.toISOString().slice(0, 10), wins: 0 });
  }
  for (const m of lastWeeks) {
    const key = startOfIsoWeek(m.played_at).toISOString().slice(0, 10);
    const bucket = weeks.find((w) => w.weekStart === key);
    if (bucket) bucket.wins++;
  }

  return { wins, losses, winRate: total ? wins / total : 0, currentStreak: streak, winsPerWeek: weeks };
}

export default async function usersRoutes(app: FastifyInstance) {
  app.get(
    "/users/search",
    {
      preHandler: requireUser,
      schema: {
        querystring: {
          type: "object",
          required: ["q"],
          properties: {
            q: { type: "string", minLength: 2, maxLength: 30 },
            page: { type: "integer", minimum: 1 },
            pageSize: { type: "integer", minimum: 1, maximum: 50 },
          },
        },
      },
    },
    async (req): Promise<Page<SearchResult>> => {
      const { q } = req.query as { q: string };
      const { page, pageSize, skip } = parsePage(req.query, 20);
      const viewerId = req.user!.id;
      const where = {
        username: { contains: q.trim().toLowerCase(), not: { startsWith: DELETED_PREFIX } },
        id: { not: viewerId },
        // people who blocked the viewer don't show up
        blocksMade: { none: { blockedId: viewerId } },
      };
      const [rows, total] = await Promise.all([
        prisma.user.findMany({
          where,
          select: PUBLIC_USER_SELECT,
          orderBy: [{ username: "asc" }, { id: "asc" }],
          skip,
          take: pageSize,
        }),
        prisma.user.count({ where }),
      ]);
      const states = await friendshipStates(viewerId, rows.map((r) => r.id));
      return {
        items: rows.map((r) => ({ ...toPublicUser(r), friendship: states.get(r.id) ?? "none" })),
        page,
        pageSize,
        total,
      };
    }
  );

  app.get("/users/:username", { preHandler: requireUser }, async (req, reply): Promise<Profile | void> => {
    const { username } = req.params as { username: string };
    const u = await prisma.user.findUnique({
      where: { username: username.toLowerCase() },
      select: { ...PUBLIC_USER_SELECT, created_at: true },
    });
    if (!u || isDeletedHandle(u.username)) return reply.code(404).send({ error: "Player not found." });
    const [friendship, stats] = await Promise.all([friendshipState(req.user!.id, u.id), computeStats(u.id)]);
    const achievements = await computeAchievements(u.id, stats.wins, stats.wins + stats.losses);
    return { ...toPublicUser(u), memberSince: u.created_at.toISOString(), friendship, stats, achievements };
  });

  app.get("/users/:username/matches", { preHandler: requireUser }, async (req, reply): Promise<Page<MatchSummary> | void> => {
    const { username } = req.params as { username: string };
    const { page, pageSize, skip } = parsePage(req.query, 10, 50);
    const target = isDeletedHandle(username.toLowerCase())
      ? null
      : await prisma.user.findUnique({ where: { username: username.toLowerCase() }, select: { id: true } });
    if (!target) return reply.code(404).send({ error: "Player not found." });
    const where = { OR: [{ player1Id: target.id }, { player2Id: target.id }] };

    const [rows, total] = await Promise.all([
      prisma.match.findMany({
        where,
        orderBy: [{ played_at: "desc" }, { id: "desc" }],
        skip,
        take: pageSize,
        select: {
          id: true,
          played_at: true,
          end_at: true,
          player1Id: true,
          player1Score: true,
          player2Score: true,
          player1DisplayName: true,
          player2DisplayName: true,
          winnerId: true,
          player1: { select: PUBLIC_USER_SELECT },
          player2: { select: PUBLIC_USER_SELECT },
          tournament: { select: { id: true, name: true } },
        },
      }),
      prisma.match.count({ where }),
    ]);

    const items: MatchSummary[] = rows.map((m) => {
      const youAreP1 = m.player1Id === target.id;
      const you = youAreP1
        ? { user: toPublicUser(m.player1), displayName: m.player1DisplayName, score: m.player1Score }
        : { user: toPublicUser(m.player2), displayName: m.player2DisplayName, score: m.player2Score };
      const opponent = youAreP1
        ? { user: toPublicUser(m.player2), displayName: m.player2DisplayName, score: m.player2Score }
        : { user: toPublicUser(m.player1), displayName: m.player1DisplayName, score: m.player1Score };
      const result = m.winnerId === null ? "draw" : m.winnerId === target.id ? "win" : "loss";
      return {
        id: m.id,
        playedAt: m.played_at.toISOString(),
        endedAt: m.end_at.toISOString(),
        durationSeconds: Math.max(0, Math.round((m.end_at.getTime() - m.played_at.getTime()) / 1000)),
        you,
        opponent,
        result,
        tournament: m.tournament,
      };
    });
    return { items, page, pageSize, total };
  });
}
