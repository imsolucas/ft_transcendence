import type { FastifyInstance } from "fastify";
import { auth } from "../../auth/auth.ts";
import { requireInternalService } from "../../auth/guards.ts";
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
      return { user: toPublicUser(user), sessionExpiresAt: session.session.expiresAt };
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
          },
        },
      },
    },
    async (req, reply) => {
      const b = req.body as {
        matchId: string; player1Id: number; player2Id: number; player1Score: number; player2Score: number;
        player1DisplayName: string; player2DisplayName: string; tournamentId?: number | null; winnerId?: number | null;
        played_at: string; end_at: string;
      };
      // Idempotent: a retried report with the same matchId returns the stored row
      const existing = await prisma.match.findUnique({ where: { externalId: b.matchId }, select: { id: true } });
      if (existing) return reply.code(200).send({ id: existing.id });
      try {
        const created = await prisma.match.create({
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
          },
          select: { id: true },
        });
        return reply.code(201).send({ id: created.id });
      } catch (err: any) {
        if (err?.code === "P2002") {
          const row = await prisma.match.findUnique({ where: { externalId: b.matchId }, select: { id: true } });
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

