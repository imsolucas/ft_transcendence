import type { FastifyRequest, FastifyReply } from "fastify";
import { prisma } from "../db/client.ts";


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

// GET /user/match-history/:userId
export async function getMatchHistoryByUserId(req: FastifyRequest, reply: FastifyReply) {
  const currentUserId = (req.user as any)?.id;
  if (!currentUserId) return reply.code(401).send({ error: "Unauthorized" });

  const { userId } = req.params as { userId?: string };
  if (!userId || isNaN(Number(userId))) {
    return reply.code(400).send({ error: "Invalid user ID." });
  }

  const targetUserId = parseInt(userId, 10);

  // Verify target user exists
  const targetUser = await prisma.user.findUnique({ where: { id: targetUserId } });
  if (!targetUser) {
    return reply.code(404).send({ error: "User not found." });
  }

  // Find matches where target user is player1 or player2, include tournament info if present
  const matches = await prisma.match.findMany({
    where: {
      OR: [
        { player1Id: targetUserId },
        { player2Id: targetUserId }
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
    end_at,
    matchId
  } = req.body as {
    matchId?: string;
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

  // Idempotency: the game service retries with the same matchId; a replay returns the stored row.
  if (matchId) {
    const existing = await prisma.match.findUnique({ where: { externalId: matchId } });
    if (existing) return reply.code(200).send(toMatchHistory(existing));
  }

  let match;
  try {
    match = await prisma.match.create({
      data: {
        externalId: matchId ?? null,
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
  } catch (err: any) {
    // Concurrent replay of the same matchId lost the race to the unique index
    if (err?.code === "P2002" && matchId) {
      const existing = await prisma.match.findUnique({ where: { externalId: matchId } });
      if (existing) return reply.code(200).send(toMatchHistory(existing));
    }
    throw err;
  }

  return reply.code(201).send(toMatchHistory(match));
}

function toMatchHistory(match: {
  id: number;
  tournamentId: number | null;
  player1Id: number;
  player2Id: number;
  player1DisplayName: string;
  player2DisplayName: string;
  player1Score: number;
  player2Score: number;
  winnerId: number | null;
  played_at: Date;
  end_at: Date;
}) {
  return {
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
  };
}

export async function postTournamentResult(req: FastifyRequest, reply: FastifyReply) {
  const body = req.body as {
    tournamentKey?: string;
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

  const { tournamentKey, name, winnerId, start_at, end_at, players, matches } = body;

  if (!tournamentKey || !winnerId || !start_at || !end_at || !players || !matches) {
    return reply.code(400).send({ error: "Missing required tournament data" });
  }

  const startAt = new Date(start_at);
  const endAt = new Date(end_at);
  if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) {
    return reply.code(400).send({ error: "Invalid start_at or end_at datetime" });
  }

  // Idempotency: a retried report returns the stored tournament.
  const replay = await prisma.tournament.findUnique({
    where: { externalId: tournamentKey },
    include: { players: true, matches: true },
  });
  if (replay) {
    return reply.send({
      tournamentId: replay.id,
      winnerId: replay.winnerId,
      start_at: replay.start_at,
      end_at: replay.end_at,
      players: replay.players,
      matches: replay.matches,
    });
  }

  try {
    // Create tournament
    const tournament = await prisma.tournament.create({
      data: {
        externalId: tournamentKey,
        name: name ?? "Tournament",
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
  } catch (err: any) {
    // A concurrent replay of the same tournamentKey lost the race to the unique index.
    if (err?.code === "P2002") {
      const existing = await prisma.tournament.findUnique({
        where: { externalId: tournamentKey },
        include: { players: true, matches: true },
      });
      if (existing) {
        return reply.send({
          tournamentId: existing.id,
          winnerId: existing.winnerId,
          start_at: existing.start_at,
          end_at: existing.end_at,
          players: existing.players,
          matches: existing.matches,
        });
      }
    }
    req.log?.error?.({ err }, "failed to store tournament result");
    return reply.code(500).send({ error: "Internal server error" });
  }
}
