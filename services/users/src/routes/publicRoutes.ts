import type { FastifyInstance } from "fastify";
import * as controllers from "../controllers/publicControllers.ts";
import { apiKeyAuth } from "../middleware/apiKeyAuth.ts";
import { apiKeyRateLimiter } from "../middleware/rateLimiter.ts";

export default async function registerPublicRoutes(app: FastifyInstance) {
  // Register public routes as a scoped plugin to ensure hooks only apply to these routes
  await app.register(async function publicApiPlugin(pluginApp: FastifyInstance) {
    // Apply API key authentication and rate limiting only to routes in this plugin
    pluginApp.addHook("preHandler", async (req, reply) => {
      // First authenticate API key
      await apiKeyAuth(req, reply);
      
      // If authentication failed, don't proceed with rate limiting
      if (reply.sent) {
        return;
      }
      
      // Apply rate limiting (uses API key ID if available, falls back to IP)
      await apiKeyRateLimiter(req, reply);
    });

    // GET /api/public/users/:username - Public user profile
    pluginApp.get("/api/public/users/:username", {
    schema: {
      summary: "Get public user profile",
      description: "Retrieves public profile information for a user by username. Requires API key authentication.",
      tags: ["public"],
      security: [{ apiKeyAuth: [] }],
      params: {
        type: "object",
        required: ["username"],
        properties: {
          username: { type: "string", description: "Username of the user" }
        }
      },
      response: {
        200: {
          description: "User profile retrieved successfully.",
          type: "object",
          properties: {
            id: { type: "integer" },
            username: { type: "string" },
            avatar: { type: "string", format: "uri" },
            status: { type: "string", enum: ["ONLINE", "OFFLINE", "INGAME"] },
            createdAt: { type: "string", format: "date-time" }
          }
        },
        400: { description: "Invalid input." },
        401: { description: "API key required or invalid." },
        404: { description: "User not found." },
        500: { $ref: "InternalServerError#" }
      }
    }
    }, controllers.getPublicUserProfile);

    // GET /api/public/matches - Public match listing
    pluginApp.get("/api/public/matches", {
    schema: {
      summary: "Get public match listing",
      description: "Retrieves a paginated list of public matches. Requires API key authentication.",
      tags: ["public"],
      security: [{ apiKeyAuth: [] }],
      querystring: {
        type: "object",
        properties: {
          page: { type: "string", default: "1", description: "Page number (default: 1)" },
          limit: { type: "string", default: "20", description: "Items per page (default: 20, max: 100)" }
        }
      },
      response: {
        200: {
          description: "Matches retrieved successfully.",
          type: "object",
          properties: {
            matches: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "integer" },
                  player1DisplayName: { type: "string" },
                  player2DisplayName: { type: "string" },
                  player1Score: { type: "integer" },
                  player2Score: { type: "integer" },
                  winnerId: { type: "integer", nullable: true },
                  played_at: { type: "string", format: "date-time" },
                  end_at: { type: "string", format: "date-time" },
                  tournamentId: { type: "integer", nullable: true }
                }
              }
            },
            pagination: {
              type: "object",
              properties: {
                page: { type: "integer" },
                limit: { type: "integer" },
                total: { type: "integer" },
                totalPages: { type: "integer" }
              }
            }
          }
        },
        401: { description: "API key required or invalid." },
        500: { $ref: "InternalServerError#" }
      }
    }
    }, controllers.getPublicMatches);

    // GET /api/public/matches/:matchId - Public match details
    pluginApp.get("/api/public/matches/:matchId", {
    schema: {
      summary: "Get public match details",
      description: "Retrieves detailed information about a specific match. Requires API key authentication.",
      tags: ["public"],
      security: [{ apiKeyAuth: [] }],
      params: {
        type: "object",
        required: ["matchId"],
        properties: {
          matchId: { type: "string", description: "Match ID" }
        }
      },
      response: {
        200: {
          description: "Match details retrieved successfully.",
          type: "object",
          properties: {
            id: { type: "integer" },
            player1DisplayName: { type: "string" },
            player2DisplayName: { type: "string" },
            player1Score: { type: "integer" },
            player2Score: { type: "integer" },
            winnerId: { type: "integer", nullable: true },
            played_at: { type: "string", format: "date-time" },
            end_at: { type: "string", format: "date-time" },
            tournamentId: { type: "integer", nullable: true }
          }
        },
        400: { description: "Invalid match ID." },
        401: { description: "API key required or invalid." },
        404: { description: "Match not found." },
        500: { $ref: "InternalServerError#" }
      }
    }
    }, controllers.getPublicMatchDetails);

    // GET /api/public/tournaments - Public tournament listing
    pluginApp.get("/api/public/tournaments", {
    schema: {
      summary: "Get public tournament listing",
      description: "Retrieves a paginated list of public tournaments. Requires API key authentication.",
      tags: ["public"],
      security: [{ apiKeyAuth: [] }],
      querystring: {
        type: "object",
        properties: {
          page: { type: "string", default: "1", description: "Page number (default: 1)" },
          limit: { type: "string", default: "20", description: "Items per page (default: 20, max: 100)" }
        }
      },
      response: {
        200: {
          description: "Tournaments retrieved successfully.",
          type: "object",
          properties: {
            tournaments: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "integer" },
                  name: { type: "string" },
                  winnerId: { type: "integer", nullable: true },
                  start_at: { type: "string", format: "date-time" },
                  end_at: { type: "string", format: "date-time", nullable: true }
                }
              }
            },
            pagination: {
              type: "object",
              properties: {
                page: { type: "integer" },
                limit: { type: "integer" },
                total: { type: "integer" },
                totalPages: { type: "integer" }
              }
            }
          }
        },
        401: { description: "API key required or invalid." },
        500: { $ref: "InternalServerError#" }
      }
    }
    }, controllers.getPublicTournaments);

    // GET /api/public/leaderboard - Public leaderboard
    pluginApp.get("/api/public/leaderboard", {
    schema: {
      summary: "Get public leaderboard",
      description: "Retrieves the public leaderboard showing top players by wins and win rate. Requires API key authentication.",
      tags: ["public"],
      security: [{ apiKeyAuth: [] }],
      querystring: {
        type: "object",
        properties: {
          limit: { type: "string", default: "50", description: "Number of players to return (default: 50, max: 100)" }
        }
      },
      response: {
        200: {
          description: "Leaderboard retrieved successfully.",
          type: "object",
          properties: {
            leaderboard: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  userId: { type: "integer" },
                  username: { type: "string" },
                  avatar: { type: "string", format: "uri" },
                  status: { type: "string", enum: ["ONLINE", "OFFLINE", "INGAME"] },
                  wins: { type: "integer" },
                  losses: { type: "integer" },
                  totalMatches: { type: "integer" },
                  winRate: { type: "number" }
                }
              }
            },
            limit: { type: "integer" }
          }
        },
        401: { description: "API key required or invalid." },
        500: { $ref: "InternalServerError#" }
      }
    }
    }, controllers.getPublicLeaderboard);

    // GET /api/public/stats/:username - Public user statistics
    pluginApp.get("/api/public/stats/:username", {
    schema: {
      summary: "Get public user statistics",
      description: "Retrieves public statistics for a user by username. Requires API key authentication.",
      tags: ["public"],
      security: [{ apiKeyAuth: [] }],
      params: {
        type: "object",
        required: ["username"],
        properties: {
          username: { type: "string", description: "Username of the user" }
        }
      },
      response: {
        200: {
          description: "User statistics retrieved successfully.",
          type: "object",
          properties: {
            username: { type: "string" },
            avatar: { type: "string", format: "uri" },
            wins: { type: "integer" },
            losses: { type: "integer" },
            totalMatches: { type: "integer" },
            winRate: { type: "string" },
            level: { type: "integer" }
          }
        },
        400: { description: "Invalid input." },
        401: { description: "API key required or invalid." },
        404: { description: "User not found." },
        500: { $ref: "InternalServerError#" }
      }
    }
    }, controllers.getPublicUserStats);
  }, { prefix: "" }); // Empty prefix means routes keep their /api/public/ prefix
}

