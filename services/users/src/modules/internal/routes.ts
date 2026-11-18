import type { FastifyInstance } from "fastify";
import { applyRankedResult, currentSeason, ratingOf, serializable } from "../ranked/service.ts";

/** the same two players count for ranked at most this many times per window */
const MAX_RANKED_PER_PAIR = 3;
const PAIR_WINDOW_MS = 24 * 60 * 60 * 1000;
import { auth } from "../../auth/auth.ts";
import { requireInternalService } from "../../auth/guards.ts";
import { syncAchievementsLater } from "../gamification/routes.ts";
import { postGameNotice } from "../chat/routes.ts";
import { DELETED_PREFIX } from "../privacy/routes.ts";

/**
 * The game caches display names at connect time; a player who deleted their account during
 * a match must still be stored as "Deleted player" (GDPR erasure must not be undone).
 */
async function deletedIds(ids: number[]): Promise<Set<number>> {
  const rows = await prisma.user.findMany({
    where: { id: { in: [...new Set(ids)] }, username: { startsWith: DELETED_PREFIX } },
    select: { id: true },
  });
  return new Set(rows.map((r) => r.id));
}
const DELETED_NAME = "Deleted player";
import { prisma } from "../../db/client.ts";
import { PUBLIC_USER_SELECT, toPublicUser } from "../shared/presenters.ts";

/**
 * Service-to-service routes for the game server. Guarded by INTERNAL_SERVICE_TOKEN and
 * never proxied by Caddy (only /api/* is).
 */
export default async function internalRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireInternalService);

  // Resolve a browser session from its Cookie header (forwarded verbatim by the game at
  // socket handshake). Uses Better Auth, so revoked/expired sessions are refused at once.
  app.post(
    "/internal/session",
    {
      schema: {
        body: {
          type: "object",
          required: ["cookie"],
          additionalProperties: false,
          properties: { cookie: { type: "string", maxLength: 8192 } },
        },
      },
    },
    async (req, reply) => {
      const { cookie } = req.body as { cookie: string };
      const session = await auth.api.getSession({ headers: new Headers({ cookie }) });
      if (!session) return reply.code(401).send({ error: "Unauthorized" });
      const user = await prisma.user.findUnique({ where: { id: Number(session.user.id) }, select: PUBLIC_USER_SELECT });
      if (!user) return reply.code(401).send({ error: "Unauthorized" });
      // current-season rating, for rating-aware matchmaking
      const { row } = await ratingOf(user.id);
      return { user: toPublicUser(user), rating: Math.round(row.rating), sessionExpiresAt: session.session.expiresAt };
    }
  );

  // Presence comes from live game sockets
  app.post(
    "/internal/presence",
    {
      schema: {
        body: {
          type: "object",
          required: ["userId", "presence"],
          additionalProperties: false,
          properties: {
            userId: { type: "integer", minimum: 1 },
            presence: { type: "string", enum: ["ONLINE", "INGAME", "OFFLINE"] },
          },
        },
      },
    },
    async (req, reply) => {
      const { userId, presence } = req.body as { userId: number; presence: "ONLINE" | "INGAME" | "OFFLINE" };
      await prisma.user.updateMany({ where: { id: userId }, data: { status: presence } });
      return reply.code(204).send();
    }
  );

  // Game service boot: nobody has a live socket yet
  app.post("/internal/presence/reset", async (_req, reply) => {
    await prisma.user.updateMany({ where: { status: { not: "OFFLINE" } }, data: { status: "OFFLINE" } });
    return reply.code(204).send();
  });

  app.post(
    "/internal/game/match-result",
    {
      schema: {
        body: {
          type: "object",
          required: ["matchId", "player1Id", "player2Id", "player1Score", "player2Score", "player1DisplayName", "player2DisplayName", "played_at", "end_at"],
          additionalProperties: false,
          properties: {
            matchId: { type: "string", minLength: 8, maxLength: 64 },
            player1Id: { type: "integer", minimum: 1 },
            player2Id: { type: "integer", minimum: 1 },
            player1Score: { type: "integer", minimum: 0 },
            player2Score: { type: "integer", minimum: 0 },
            player1DisplayName: { type: "string", maxLength: 50 },
            player2DisplayName: { type: "string", maxLength: 50 },
            tournamentId: { type: ["integer", "null"] },
            winnerId: { type: ["integer", "null"] },
            played_at: { type: "string", format: "date-time" },
            end_at: { type: "string", format: "date-time" },
            // matchmaking-queue match: counts for the season's Glicko-2 ratings
            ranked: { type: "boolean" },
          },
        },
      },
    },
    async (req, reply) => {
      const b = req.body as {
        matchId: string; player1Id: number; player2Id: number; player1Score: number; player2Score: number;
        player1DisplayName: string; player2DisplayName: string; tournamentId?: number | null; winnerId?: number | null;
        played_at: string; end_at: string; ranked?: boolean;
      };
      // Idempotent: a retried report with the same matchId returns the stored row
      const existing = await prisma.match.findUnique({ where: { externalId: b.matchId }, select: { id: true } });
      if (existing) return reply.code(200).send({ id: existing.id });
      const gone = await deletedIds([b.player1Id, b.player2Id]);
      if (gone.has(b.player1Id)) b.player1DisplayName = DELETED_NAME;
      if (gone.has(b.player2Id)) b.player2DisplayName = DELETED_NAME;
      // ranked only with a winner, two different live accounts, no tournament, at least one point
      // scored (a 0-0 forfeit proves nothing) and not the same pair over and over (rating farming)
      let ranked =
        b.ranked === true && b.tournamentId == null && b.winnerId != null && b.player1Id !== b.player2Id &&
        (b.winnerId === b.player1Id || b.winnerId === b.player2Id) && !gone.has(b.player1Id) && !gone.has(b.player2Id) &&
        b.player1Score + b.player2Score > 0;
      if (ranked) {
        const since = new Date(Date.now() - PAIR_WINDOW_MS);
        const recent = await prisma.match.count({
          where: {
            ranked: true,
            end_at: { gte: since },
            OR: [
              { player1Id: b.player1Id, player2Id: b.player2Id },
              { player1Id: b.player2Id, player2Id: b.player1Id },
            ],
          },
        });
        if (recent >= MAX_RANKED_PER_PAIR) ranked = false;
      }
      // outside the transaction: a concurrent season creation must not abort it
      const rankedSeason = ranked ? await currentSeason() : null;
      try {
        // the match row and both ratings change together (or not at all)
        const { created, ratings } = await serializable(async (tx) => {
          const season = rankedSeason;
          const ratings = season ? await applyRankedResult(tx, season.id, b.player1Id, b.player2Id, b.winnerId!) : null;
          const created = await tx.match.create({
            data: {
              externalId: b.matchId,
              player1Id: b.player1Id,
              player2Id: b.player2Id,
              player1Score: b.player1Score,
              player2Score: b.player2Score,
              player1DisplayName: b.player1DisplayName,
              player2DisplayName: b.player2DisplayName,
              tournamentId: b.tournamentId ?? null,
              winnerId: b.winnerId ?? null,
              played_at: new Date(b.played_at),
              end_at: new Date(b.end_at),
              ranked: !!season,
              seasonId: season?.id ?? null,
              player1RatingDelta: ratings?.[b.player1Id]?.delta ?? null,
              player2RatingDelta: ratings?.[b.player2Id]?.delta ?? null,
            },
            select: { id: true },
          });
          return { created, ratings };
        });
        syncAchievementsLater([b.player1Id, b.player2Id], req.log);
        // 1v1 result into the players' chat thread (tournament games get one notice at the end)
        if (b.tournamentId == null) {
          postGameNotice(b.player1Id, b.player2Id, "result", `${b.player1Score}-${b.player2Score}`).catch((err) =>
            req.log.error({ err }, "result notice failed"),
          );
        }
        return reply.code(201).send({ id: created.id, ...(ratings ? { ratings } : {}) });
      } catch (err: any) {
        if (err?.code === "P2002") {
          const row = await prisma.match.findUnique({ where: { externalId: b.matchId }, select: { id: true } });
          if (row) return reply.code(200).send({ id: row.id });
        }
        throw err;
      }
    }
  );

  // Party mode (3–4 players): one PartyMatch with every player's placement. Stored apart from
  // the 1v1 Match table so win rates and head-to-head history are not distorted.
  app.post(
    "/internal/game/party-result",
    {
      schema: {
        body: {
          type: "object",
          required: ["matchId", "winnerId", "played_at", "end_at", "players"],
          additionalProperties: false,
          properties: {
            matchId: { type: "string", minLength: 8, maxLength: 64 },
            // party Pong (3–4 players) or Light Cycles (2–4)
            game: { type: "string", enum: ["pong", "cycles"] },
            winnerId: { type: ["integer", "null"], minimum: 1 },
            played_at: { type: "string", format: "date-time" },
            end_at: { type: "string", format: "date-time" },
            players: {
              type: "array",
              minItems: 2,
              maxItems: 4,
              items: {
                type: "object",
                required: ["userId", "displayName", "placement", "livesLeft"],
                additionalProperties: false,
                properties: {
                  userId: { type: "integer", minimum: 1 },
                  displayName: { type: "string", maxLength: 50 },
                  placement: { type: "integer", minimum: 1, maximum: 4 },
                  livesLeft: { type: "integer", minimum: 0, maximum: 9 },
                },
              },
            },
          },
        },
        response: {
          200: { type: "object", properties: { id: { type: "integer" } } },
          201: { type: "object", properties: { id: { type: "integer" } } },
          400: { type: "object", properties: { error: { type: "string" } } },
        },
      },
    },
    async (req, reply) => {
      const b = req.body as {
        matchId: string; game?: "pong" | "cycles"; winnerId: number | null; played_at: string; end_at: string;
        players: { userId: number; displayName: string; placement: number; livesLeft: number }[];
      };
      const ids = b.players.map((p) => p.userId);
      const game = b.game ?? "pong";
      if (new Set(ids).size !== ids.length || (b.winnerId !== null && !ids.includes(b.winnerId)) || (game === "pong" && ids.length < 3)) {
        return reply.code(400).send({ error: "Invalid party result" });
      }
      const existing = await prisma.partyMatch.findUnique({ where: { externalId: b.matchId }, select: { id: true } });
      if (existing) return reply.code(200).send({ id: existing.id });
      const gone = await deletedIds(ids);
      try {
        const created = await prisma.partyMatch.create({
          data: {
            externalId: b.matchId,
            game,
            winnerId: b.winnerId,
            played_at: new Date(b.played_at),
            end_at: new Date(b.end_at),
            players: {
              create: b.players.map((p) => ({
                userId: p.userId,
                displayName: gone.has(p.userId) ? DELETED_NAME : p.displayName,
                placement: p.placement,
                livesLeft: p.livesLeft,
              })),
            },
          },
          select: { id: true },
        });
        // party games and wins count toward XP (see syncAchievements)
        syncAchievementsLater(ids, req.log);
        return reply.code(201).send({ id: created.id });
      } catch (err: any) {
        if (err?.code === "P2002") {
          const row = await prisma.partyMatch.findUnique({ where: { externalId: b.matchId }, select: { id: true } });
          if (row) return reply.code(200).send({ id: row.id });
        }
        throw err;
      }
    }
  );

  app.post(
    "/internal/game/tournament-result",
    {
      schema: {
        body: {
          type: "object",
          required: ["tournamentKey", "winnerId", "start_at", "end_at", "players", "matches"],
          additionalProperties: false,
          properties: {
            tournamentKey: { type: "string", minLength: 8, maxLength: 64 },
            name: { type: "string", maxLength: 80 },
            winnerId: { type: "integer", minimum: 1 },
            start_at: { type: "string", format: "date-time" },
            end_at: { type: "string", format: "date-time" },
            players: {
              type: "array",
              maxItems: 8,
              items: { type: "object", required: ["userId"], properties: { userId: { type: "integer", minimum: 1 } } },
            },
            matches: {
              type: "array",
              maxItems: 16,
              items: {
                type: "object",
                required: ["player1Id", "player2Id", "player1Score", "player2Score", "player1DisplayName", "player2DisplayName", "played_at", "end_at"],
                properties: {
                  player1Id: { type: "integer" },
                  player2Id: { type: "integer" },
                  player1Score: { type: "integer" },
                  player2Score: { type: "integer" },
                  player1DisplayName: { type: "string", maxLength: 50 },
                  player2DisplayName: { type: "string", maxLength: 50 },
                  winnerId: { type: ["integer", "null"] },
                  played_at: { type: "string", format: "date-time" },
                  end_at: { type: "string", format: "date-time" },
                },
              },
            },
          },
        },
      },
    },
    async (req, reply) => {
      const b = req.body as {
        tournamentKey: string; name?: string; winnerId: number; start_at: string; end_at: string;
        players: { userId: number }[];
        matches: { player1Id: number; player2Id: number; player1Score: number; player2Score: number; player1DisplayName: string; player2DisplayName: string; winnerId?: number | null; played_at: string; end_at: string }[];
      };
      const existing = await prisma.tournament.findUnique({ where: { externalId: b.tournamentKey }, select: { id: true } });
      if (existing) return reply.code(200).send({ id: existing.id });
      const gone = await deletedIds(b.matches.flatMap((m) => [m.player1Id, m.player2Id]));
      for (const m of b.matches) {
        if (gone.has(m.player1Id)) m.player1DisplayName = DELETED_NAME;
        if (gone.has(m.player2Id)) m.player2DisplayName = DELETED_NAME;
      }
      try {
        const t = await prisma.tournament.create({
          data: {
            externalId: b.tournamentKey,
            name: b.name ?? "Tournament",
            winnerId: b.winnerId,
            start_at: new Date(b.start_at),
            end_at: new Date(b.end_at),
            players: { create: b.players.map((p) => ({ userId: p.userId })) },
            matches: {
              create: b.matches.map((m) => ({
                player1Id: m.player1Id,
                player2Id: m.player2Id,
                player1DisplayName: m.player1DisplayName,
                player2DisplayName: m.player2DisplayName,
                player1Score: m.player1Score,
                player2Score: m.player2Score,
                winnerId: m.winnerId ?? null,
                played_at: new Date(m.played_at),
                end_at: new Date(m.end_at),
              })),
            },
          },
          select: { id: true },
        });
        syncAchievementsLater([b.winnerId, ...b.players.map((p) => p.userId), ...b.matches.flatMap((m) => [m.player1Id, m.player2Id])], req.log);
        for (const p of new Set(b.players.map((p) => p.userId))) {
          if (p !== b.winnerId) {
            postGameNotice(b.winnerId, p, "tournament", b.name ?? "Tournament").catch((err) => req.log.error({ err }, "tournament notice failed"));
          }
        }
        return reply.code(201).send({ id: t.id });
      } catch (err: any) {
        if (err?.code === "P2002") {
          const row = await prisma.tournament.findUnique({ where: { externalId: b.tournamentKey }, select: { id: true } });
          if (row) return reply.code(200).send({ id: row.id });
        }
        throw err;
      }
    }
  );
}

