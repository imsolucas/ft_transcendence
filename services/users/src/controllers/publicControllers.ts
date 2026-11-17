import { topPlayers } from "../modules/gamification/routes.ts";
import { isDeletedHandle } from "../modules/privacy/routes.ts";
import type { FastifyRequest, FastifyReply } from "fastify";
import { prisma } from "../db/client.ts";


/**
 * Public API Controllers
 * These endpoints are accessible via API key authentication
 * They expose public data only (no sensitive information)
 */

// GET /api/public/users/:username - Public user profile
export async function getPublicUserProfile(req: FastifyRequest, reply: FastifyReply) {
  try {
    const { username } = req.params as { username: string };
    
    if (!username) {
      return reply.code(400).send({ error: "Username is required." });
    }

    if (isDeletedHandle(username.toLowerCase())) return reply.code(404).send({ error: "User not found." });
    const user = await prisma.user.findUnique({
      where: { username: username.toLowerCase() },
      select: {
        id: true,
        username: true,
        avatar: true,
        status: true,
        created_at: true,
      },
    });

    if (!user) {
      return reply.code(404).send({ error: "User not found." });
    }

    // Map created_at to createdAt for API response (camelCase to match Swagger schema)
    return reply.send({
      id: user.id,
      username: user.username,
      avatar: user.avatar,
      status: user.status,
      createdAt: user.created_at,
    });
  } catch (error: any) {
    req.log?.error({ err: error }, "Error fetching public user profile:");
    return reply.code(500).send({
      error: "Internal server error",
      message: "Please try again later."
    });
  }
}

// GET /api/public/matches - Public match listing (paginated)
export async function getPublicMatches(req: FastifyRequest, reply: FastifyReply) {
  try {
    const { page = "1", limit = "20" } = req.query as { page?: string; limit?: string };
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const matches = await prisma.match.findMany({
      skip,
      take: limitNum,
      orderBy: { played_at: "desc" },
      select: {
        id: true,
        player1DisplayName: true,
        player2DisplayName: true,
        player1Score: true,
        player2Score: true,
        winnerId: true,
        played_at: true,
        end_at: true,
        tournamentId: true,
        tournament: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    const total = await prisma.match.count();

    return reply.send({
      matches,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error: any) {
    req.log?.error({ err: error }, "Error fetching public matches:");
    return reply.code(500).send({
      error: "Internal server error",
      message: "Please try again later."
    });
  }
}

// GET /api/public/matches/:matchId - Public match details
export async function getPublicMatchDetails(req: FastifyRequest, reply: FastifyReply) {
  try {
    const { matchId } = req.params as { matchId?: string };
    
    if (!matchId || isNaN(Number(matchId))) {
      return reply.code(400).send({ error: "Invalid match ID." });
    }

    const match = await prisma.match.findUnique({
      where: { id: parseInt(matchId, 10) },
      select: {
        id: true,
        player1DisplayName: true,
        player2DisplayName: true,
        player1Score: true,
        player2Score: true,
        winnerId: true,
        played_at: true,
        end_at: true,
        tournamentId: true,
        tournament: {
          select: {
            id: true,
            name: true,
            winnerId: true,
            start_at: true,
            end_at: true,
          },
        },
      },
    });

    if (!match) {
      return reply.code(404).send({ error: "Match not found." });
    }

    return reply.send(match);
  } catch (error: any) {
    req.log?.error({ err: error }, "Error fetching public match details:");
    return reply.code(500).send({
      error: "Internal server error",
      message: "Please try again later."
    });
  }
}

// GET /api/public/tournaments - Public tournament listing
export async function getPublicTournaments(req: FastifyRequest, reply: FastifyReply) {
  try {
    const { page = "1", limit = "20" } = req.query as { page?: string; limit?: string };
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const tournaments = await prisma.tournament.findMany({
      skip,
      take: limitNum,
      orderBy: { start_at: "desc" },
      select: {
        id: true,
        name: true,
        winnerId: true,
        start_at: true,
        end_at: true,
        players: {
          select: {
            userId: true,
            user: {
              select: {
                username: true,
                avatar: true,
              },
            },
          },
        },
      },
    });

    const total = await prisma.tournament.count();

    return reply.send({
      tournaments,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error: any) {
    req.log?.error({ err: error }, "Error fetching public tournaments:");
    return reply.code(500).send({
      error: "Internal server error",
      message: "Please try again later."
    });
  }
}

// GET /api/public/leaderboard - Public leaderboard
export async function getPublicLeaderboard(req: FastifyRequest, reply: FastifyReply) {
  try {
    const { limit = "50" } = req.query as { limit?: string };
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));

    // ranked in one SQL query (never load every user and sort in JS)
    const leaderboard = await topPlayers(limitNum);

    return reply.send({
      leaderboard,
      limit: limitNum,
    });
  } catch (error: any) {
    req.log?.error({ err: error }, "Error fetching public leaderboard:");
    return reply.code(500).send({
      error: "Internal server error",
      message: "Please try again later."
    });
  }
}

// GET /api/public/stats/:username - Public user statistics
export async function getPublicUserStats(req: FastifyRequest, reply: FastifyReply) {
  try {
    const { username } = req.params as { username: string };
    
    if (!username) {
      return reply.code(400).send({ error: "Username is required." });
    }

    if (isDeletedHandle(username.toLowerCase())) return reply.code(404).send({ error: "User not found." });
    const user = await prisma.user.findUnique({
      where: { username: username.toLowerCase() },
      select: {
        id: true,
        username: true,
        avatar: true,
        matchesWon: {
          select: {
            id: true,
          },
        },
        matchesAsPlayer1: {
          select: {
            id: true,
            winnerId: true,
          },
        },
        matchesAsPlayer2: {
          select: {
            id: true,
            winnerId: true,
          },
        },
      },
    });

    if (!user) {
      return reply.code(404).send({ error: "User not found." });
    }

    // Calculate statistics
    const wins = user.matchesWon.length;
    const totalMatches = user.matchesAsPlayer1.length + user.matchesAsPlayer2.length;
    const losses = totalMatches - wins;
    const winRate = totalMatches > 0 ? Math.round((wins / totalMatches) * 100) : 0;
    const level = 1 + Math.floor(wins / 5); // Simple level calculation

    return reply.send({
      username: user.username,
      avatar: user.avatar,
      wins,
      losses,
      totalMatches,
      winRate: `${winRate}%`,
      level,
    });
  } catch (error: any) {
    req.log?.error({ err: error }, "Error fetching public user stats:");
    return reply.code(500).send({
      error: "Internal server error",
      message: "Please try again later."
    });
  }
}

