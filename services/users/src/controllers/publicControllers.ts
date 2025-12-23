import type { FastifyRequest, FastifyReply } from "fastify";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

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

    const user = await prisma.user.findUnique({
      where: { username },
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
    req.log?.error("Error fetching public user profile:", error);
    return reply.code(500).send({
      error: "Internal server error",
      message: error?.message || "Unknown error"
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
    req.log?.error("Error fetching public matches:", error);
    return reply.code(500).send({
      error: "Internal server error",
      message: error?.message || "Unknown error"
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
    req.log?.error("Error fetching public match details:", error);
    return reply.code(500).send({
      error: "Internal server error",
      message: error?.message || "Unknown error"
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
    req.log?.error("Error fetching public tournaments:", error);
    return reply.code(500).send({
      error: "Internal server error",
      message: error?.message || "Unknown error"
    });
  }
}

// GET /api/public/leaderboard - Public leaderboard
export async function getPublicLeaderboard(req: FastifyRequest, reply: FastifyReply) {
  try {
    const { limit = "50" } = req.query as { limit?: string };
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));

    // Get all users with their match statistics
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        avatar: true,
        status: true,
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

    // Calculate statistics for each user
    const leaderboard = users
      .map((user) => {
        const wins = user.matchesWon.length;
        const totalMatches =
          user.matchesAsPlayer1.length + user.matchesAsPlayer2.length;
        const losses = totalMatches - wins;
        const winRate = totalMatches > 0 ? (wins / totalMatches) * 100 : 0;

        return {
          userId: user.id,
          username: user.username,
          avatar: user.avatar,
          status: user.status,
          wins,
          losses,
          totalMatches,
          winRate: Math.round(winRate * 100) / 100, // Round to 2 decimal places
        };
      })
      .filter((entry) => entry.totalMatches > 0) // Only include users with matches
      .sort((a, b) => {
        // Sort by wins (descending), then by win rate (descending)
        if (b.wins !== a.wins) {
          return b.wins - a.wins;
        }
        return b.winRate - a.winRate;
      })
      .slice(0, limitNum);

    return reply.send({
      leaderboard,
      limit: limitNum,
    });
  } catch (error: any) {
    req.log?.error("Error fetching public leaderboard:", error);
    return reply.code(500).send({
      error: "Internal server error",
      message: error?.message || "Unknown error"
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

    const user = await prisma.user.findUnique({
      where: { username },
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
    req.log?.error("Error fetching public user stats:", error);
    return reply.code(500).send({
      error: "Internal server error",
      message: error?.message || "Unknown error"
    });
  }
}

