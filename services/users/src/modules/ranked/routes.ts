import type { FastifyInstance } from "fastify";
import type { PublicUser, RankedLeaderboard, RankedMe, RankedRow, SeasonInfo } from "../../../../shared/types/api.types.ts";
import { PLACEMENT_GAMES, divisionFor } from "../../../../shared/ranked/ranked.ts";
import { prisma } from "../../db/client.ts";
import { requireUser } from "../../auth/guards.ts";
import { DELETED_PREFIX, isDeletedHandle } from "../privacy/routes.ts";
import { PUBLIC_USER_SELECT, parsePage, toPublicUser } from "../shared/presenters.ts";
import { currentSeason, ratingOf } from "./service.ts";

const seasonInfo = (s: { number: number; startsAt: Date; endsAt: Date }): SeasonInfo => ({
  number: s.number,
  startsAt: s.startsAt.toISOString(),
  endsAt: s.endsAt.toISOString(),
});

async function standingFor(userId: number): Promise<RankedMe> {
  const { season, row } = await ratingOf(userId);
  return {
    season: seasonInfo(season),
    standing: {
      rating: Math.round(row.rating),
      games: row.games,
      wins: row.wins,
      losses: row.games - row.wins,
      peak: Math.round(row.peak),
      division: divisionFor(row.rating, row.games),
      placementLeft: Math.max(0, PLACEMENT_GAMES - row.games),
    },
  };
}

export default async function rankedRoutes(app: FastifyInstance) {
  app.get("/ranked/me", { preHandler: requireUser }, async (req): Promise<RankedMe> => standingFor(req.user!.id));

  app.get(
    "/users/:username/ranked",
    {
      preHandler: requireUser,
      schema: { params: { type: "object", required: ["username"], properties: { username: { type: "string", maxLength: 64 } } } },
    },
    async (req, reply): Promise<RankedMe | void> => {
      const handle = (req.params as { username: string }).username.toLowerCase();
      const user = isDeletedHandle(handle) ? null : await prisma.user.findUnique({ where: { username: handle }, select: { id: true } });
      if (!user) return reply.code(404).send({ error: "Player not found." });
      return standingFor(user.id);
    }
  );

  // This season's placed players (PLACEMENT_GAMES+ ranked games), best rating first
  app.get(
    "/ranked/leaderboard",
    {
      preHandler: requireUser,
      schema: {
        querystring: {
          type: "object",
          additionalProperties: false,
          properties: { page: { type: "integer", minimum: 1 }, pageSize: { type: "integer", minimum: 1, maximum: 50 } },
        },
      },
    },
    async (req): Promise<RankedLeaderboard> => {
      const season = await currentSeason();
      const { page, pageSize, skip } = parsePage(req.query, 20, 50);
      const where = { seasonId: season.id, games: { gte: PLACEMENT_GAMES }, user: { NOT: { username: { startsWith: DELETED_PREFIX } } } };
      const select = { id: true, rating: true, games: true, wins: true, user: { select: PUBLIC_USER_SELECT } } as const;
      const [rows, total, mine] = await Promise.all([
        prisma.rating.findMany({ where, orderBy: [{ rating: "desc" }, { id: "asc" }], skip, take: pageSize, select }),
        prisma.rating.count({ where }),
        prisma.rating.findUnique({ where: { userId_seasonId: { userId: req.user!.id, seasonId: season.id } }, select }),
      ]);
      const toRow = (r: { id: number; rating: number; games: number; wins: number; user: Parameters<typeof toPublicUser>[0] }, rank: number): RankedRow => ({
        rank,
        user: toPublicUser(r.user) as PublicUser,
        rating: Math.round(r.rating),
        division: divisionFor(r.rating, r.games),
        games: r.games,
        wins: r.wins,
      });
      let you: RankedRow | null = null;
      if (mine && mine.games >= PLACEMENT_GAMES) {
        // same order as the list: rating desc, then row id
        const above = await prisma.rating.count({
          where: { ...where, OR: [{ rating: { gt: mine.rating } }, { rating: mine.rating, id: { lt: mine.id } }] },
        });
        you = toRow(mine, above + 1);
      }
      return { page, pageSize, total, items: rows.map((r, i) => toRow(r, skip + i + 1)), you, season: seasonInfo(season) };
    }
  );
}
