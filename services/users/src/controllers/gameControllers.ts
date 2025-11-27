import type { FastifyRequest, FastifyReply } from "fastify";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// GET /user/match-history
export async function getMatchHistory(req: FastifyRequest, reply: FastifyReply) {
  const userId = (req.user as any)?.id;
  if (!userId) return reply.code(401).send({ error: "Unauthorized" });

  // Find matches where user is player1 or player2, include tournament info if present
  const matches = await prisma.match.findMany({
    where: {
      OR: [
        { player1Id: userId },
        { player2Id: userId }
      ]
    },
    orderBy: { played_at: "desc" },
    include: {
      tournament: {
        select: {
          id: true,
          name: true,
          winnerId: true,
          start_at: true,
          end_at: true
        }
      }
    }
  });

  const result = matches.map(m => ({
    matchId: m.id,
    tournamentId: m.tournamentId ?? null,
    player1Id: m.player1Id,
    player2Id: m.player2Id,
    player1DisplayName: m.player1DisplayName,
    player2DisplayName: m.player2DisplayName,
    player1Score: m.player1Score,
    player2Score: m.player2Score,
    winnerId: m.winnerId ?? null,
    played_at: m.played_at,
    end_at: m.end_at,
    tournament: m.tournament
      ? {
          id: m.tournament.id,
          name: m.tournament.name,
          winnerId: m.tournament.winnerId,
          start_at: m.tournament.start_at,
          end_at: m.tournament.end_at
        }
      : null
  }));

  return reply.send(result);
}

// POST /game/match-history
export async function uploadMatchHistory(req: FastifyRequest, reply: FastifyReply) {
  const {
    player1Id,
    player2Id,
    player1Score,
    player2Score,
    player1DisplayName,
    player2DisplayName,
    tournamentId,
    winnerId,
    played_at,
    end_at
  } = req.body as {
    player1Id: number;
    player2Id: number;
    player1Score: number;
    player2Score: number;
    player1DisplayName: string;
    player2DisplayName: string;
    played_at: string;
    end_at: string;
    tournamentId?: number;
    winnerId?: number;
  };

  // Basic validation (add checks for tournamentId/winnerId if needed)

  const match = await prisma.match.create({
    data: {
      player1Id,
      player2Id,
      player1Score,
      player2Score,
      player1DisplayName,
      player2DisplayName,
      played_at: new Date(played_at),
      end_at: new Date(end_at),
      tournamentId: tournamentId ?? null,
      winnerId: winnerId ?? null
    }
  });

  return reply.code(201).send({
    matchId: match.id,
    tournamentId: match.tournamentId ?? null,
    player1Id: match.player1Id,
    player2Id: match.player2Id,
    player1DisplayName: match.player1DisplayName,
    player2DisplayName: match.player2DisplayName,
    player1Score: match.player1Score,
    player2Score: match.player2Score,
    winnerId: match.winnerId ?? null,
    played_at: match.played_at,
    end_at: match.end_at
  });
}

export async function postTournamentResult(req: FastifyRequest, reply: FastifyReply) {
  const body = req.body as {
    tournamentId?: number;
    name?: string;
    winnerId?: number;
    start_at?: string;
    end_at?: string;
    players?: Array<{ userId: number }>;
    matches?: Array<{
      player1Id: number;
      player2Id: number;
      player1DisplayName: string;
      player2DisplayName: string;
      player1Score: number;
      player2Score: number;
      winnerId?: number;
      played_at: string;
      end_at: string;
    }>;
  };

  const { tournamentId, name, winnerId, start_at, end_at, players, matches } = body;

  if (!tournamentId || !winnerId || !start_at || !end_at || !players || !matches) {
    return reply.code(400).send({ error: "Missing required tournament data" });
  }

  const startAt = new Date(start_at);
  const endAt = new Date(end_at);
  if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) {
    return reply.code(400).send({ error: "Invalid start_at or end_at datetime" });
  }

  try {
    // Create tournament
    const tournament = await prisma.tournament.create({
      data: {
        id: tournamentId,
        name: name ?? `Tournament ${tournamentId}`,
        winnerId,
        start_at: startAt,
        end_at: endAt,
        players: {
          create: players.map(p => ({
            userId: p.userId,
          })),
        },
        matches: {
          create: matches.map(m => ({
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
      include: { players: true, matches: true },
    });

    return reply.send({
      tournamentId: tournament.id,
      winnerId: tournament.winnerId,
      start_at: tournament.start_at,
      end_at: tournament.end_at,
      players: tournament.players,
      matches: tournament.matches,
    });
  } catch (err) {
    req.log?.error?.(err);
    return reply.code(500).send({ error: "Internal server error" });
  }
}
