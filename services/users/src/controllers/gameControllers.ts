import type { FastifyRequest, FastifyReply } from "fastify";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// GET /user/match-history
export async function getMatchHistory(req: FastifyRequest, reply: FastifyReply) {
  const userId = (req.user as any)?.id;
  if (!userId) return reply.code(401).send({ error: "Unauthorized" });

  // Find matches where user is player1 or player2
  const matches = await prisma.match.findMany({
    where: {
      OR: [
        { player1Id: userId },
        { player2Id: userId }
      ]
    },
    orderBy: { played_at: "desc" }
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
    end_at: m.end_at
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
