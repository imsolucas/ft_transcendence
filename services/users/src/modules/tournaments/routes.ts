import type { FastifyInstance } from "fastify";
import type { Page, TournamentSummary } from "../../../../shared/types/api.types.ts";
import { prisma } from "../../db/client.ts";
import { requireUser } from "../../auth/guards.ts";
import { isDeletedHandle } from "../privacy/routes.ts";
import { PUBLIC_USER_SELECT, parsePage, toPublicUser } from "../shared/presenters.ts";

const PUBLIC_USER_SCHEMA = {
  type: "object",
  properties: {
    id: { type: "integer" },
    username: { type: "string" },
    displayName: { type: "string" },
    avatar: { type: ["string", "null"] },
    presence: { type: "string" },
    // validated look (services/shared/cosmetics/look.ts); passed through as is
    look: { type: "object", additionalProperties: true },
  },
} as const;

const NULLABLE_STRING = { type: ["string", "null"] } as const;
const ERROR = { type: "object", properties: { error: { type: "string" } } } as const;

const TOURNAMENT_PAGE_SCHEMA = {
  type: "object",
  properties: {
    page: { type: "integer" },
    pageSize: { type: "integer" },
    total: { type: "integer" },
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "integer" },
          name: { type: "string" },
          startedAt: { type: "string" },
          endedAt: NULLABLE_STRING,
          playerCount: { type: "integer" },
          matchCount: { type: "integer" },
          winner: { anyOf: [PUBLIC_USER_SCHEMA, { type: "null" }] },
          won: { type: "boolean" },
        },
      },
    },
  },
} as const;

export default async function tournamentRoutes(app: FastifyInstance) {
  // Tournaments a player took part in, newest first.
  app.get(
    "/users/:username/tournaments",
    {
      preHandler: requireUser,
      schema: {
        params: { type: "object", required: ["username"], properties: { username: { type: "string", maxLength: 64 } } },
        querystring: {
          type: "object",
          additionalProperties: false,
          properties: { page: { type: "integer", minimum: 1 }, pageSize: { type: "integer", minimum: 1, maximum: 50 } },
        },
        response: { 200: TOURNAMENT_PAGE_SCHEMA, 404: ERROR },
      },
    },
    async (req, reply): Promise<Page<TournamentSummary> | void> => {
      const { username } = req.params as { username: string };
      const handle = username.toLowerCase();
      const target = isDeletedHandle(handle)
        ? null
        : await prisma.user.findUnique({ where: { username: handle }, select: { id: true } });
      if (!target) return reply.code(404).send({ error: "Player not found." });
      const { page, pageSize, skip } = parsePage(req.query, 10, 50);
      const where = { players: { some: { userId: target.id } } };
      const [rows, total] = await Promise.all([
        prisma.tournament.findMany({
          where,
          orderBy: [{ start_at: "desc" }, { id: "desc" }],
          skip,
          take: pageSize,
          select: {
            id: true,
            name: true,
            start_at: true,
            end_at: true,
            winnerId: true,
            winner: { select: PUBLIC_USER_SELECT },
            _count: { select: { players: true, matches: true } },
          },
        }),
        prisma.tournament.count({ where }),
      ]);
      return {
        page,
        pageSize,
        total,
        items: rows.map((t) => ({
          id: t.id,
          name: t.name,
          startedAt: t.start_at.toISOString(),
          endedAt: t.end_at ? t.end_at.toISOString() : null,
          playerCount: t._count.players,
          matchCount: t._count.matches,
          winner: t.winner ? toPublicUser(t.winner) : null,
          won: t.winnerId === target.id,
        })),
      };
    }
  );

}
