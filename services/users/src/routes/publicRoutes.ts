import type { FastifyInstance } from "fastify";
import * as controllers from "../controllers/publicControllers.ts";
import { apiKeyAuth } from "../middleware/apiKeyAuth.ts";
import { apiKeyRateLimiter, publicIpRateLimiter } from "../middleware/rateLimiter.ts";
import { prisma } from "../db/client.ts";
import { removeFriend, sendFriendRequest } from "../modules/friends/routes.ts";

export default async function registerPublicRoutes(app: FastifyInstance) {
  // Register public routes as a scoped plugin to ensure hooks only apply to these routes
  await app.register(async function publicApiPlugin(pluginApp: FastifyInstance) {
    // Apply API key authentication and rate limiting only to routes in this plugin
    // onRequest: runs before body parsing and schema validation, so unauthenticated callers
    // get 401 (not validation details), and every request, failed auth included, is limited.
    pluginApp.addHook("onRequest", async (req, reply) => {
      await publicIpRateLimiter(req, reply);
      if (reply.sent) return;
      // Then authenticate the API key
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
                  rank: { type: "integer" },
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

    // ---- Acting as the key's owner (read and write) ----
    const ownerSchema = {
      type: "object",
      properties: {
        id: { type: "integer" },
        username: { type: "string" },
        displayName: { type: "string" },
        avatar: { type: ["string", "null"] },
        status: { type: "string", enum: ["ONLINE", "OFFLINE", "INGAME"] },
        createdAt: { type: "string", format: "date-time" },
      },
    } as const;
    const loadOwner = async (id: number) => {
      const u = await prisma.user.findUnique({
        where: { id },
        select: { id: true, username: true, displayUsername: true, avatar: true, status: true, created_at: true },
      });
      return u && { id: u.id, username: u.username, displayName: u.displayUsername ?? u.username, avatar: u.avatar, status: u.status, createdAt: u.created_at.toISOString() };
    };
    const errorBody = { type: "object", properties: { error: { type: "string" } } } as const;

    // GET /api/public/me
    pluginApp.get("/api/public/me", {
      schema: {
        summary: "Get the key owner's profile",
        tags: ["public"],
        security: [{ apiKeyAuth: [] }],
        response: { 200: ownerSchema, 401: errorBody },
      },
    }, async (req) => loadOwner(req.apiUser!.id));

    // PUT /api/public/me
    pluginApp.put("/api/public/me", {
      schema: {
        summary: "Update the key owner's display name",
        description: "The display name is the username with its own casing; a different name must be free. 3-30 characters of letters, digits, _ and .",
        tags: ["public"],
        security: [{ apiKeyAuth: [] }],
        body: {
          type: "object",
          additionalProperties: false,
          required: ["displayName"],
          properties: { displayName: { type: "string", minLength: 3, maxLength: 30, pattern: "^[A-Za-z0-9_.]+$" } },
        },
        response: { 200: ownerSchema, 400: errorBody, 401: errorBody, 409: errorBody },
      },
    }, async (req, reply) => {
      const { displayName } = req.body as { displayName: string };
      const handle = displayName.toLowerCase();
      try {
        await prisma.user.update({
          where: { id: req.apiUser!.id },
          data: { username: handle, displayUsername: displayName, name: displayName },
        });
      } catch (err: any) {
        if (err?.code === "P2002") return reply.code(409).send({ error: "That username is taken." });
        throw err;
      }
      return loadOwner(req.apiUser!.id);
    });

    // GET /api/public/friends
    pluginApp.get("/api/public/friends", {
      schema: {
        summary: "List the key owner's friends",
        tags: ["public"],
        security: [{ apiKeyAuth: [] }],
        response: {
          200: {
            type: "object",
            properties: {
              friends: { type: "array", items: { type: "object", properties: { username: { type: "string" }, status: { type: "string" }, since: { type: "string", format: "date-time" } } } },
            },
          },
          401: errorBody,
        },
      },
    }, async (req) => {
      const me = req.apiUser!.id;
      const rows = await prisma.friendship.findMany({
        where: { status: "ACCEPTED", OR: [{ requesterId: me }, { addresseeId: me }] },
        select: { created_at: true, requesterId: true, requester: { select: { username: true, status: true } }, addressee: { select: { username: true, status: true } } },
        orderBy: { id: "asc" },
        take: 500,
      });
      return {
        friends: rows.map((r) => {
          const other = r.requesterId === me ? r.addressee : r.requester;
          return { username: other.username, status: other.status, since: r.created_at.toISOString() };
        }),
      };
    });

    // POST /api/public/friends
    pluginApp.post("/api/public/friends", {
      schema: {
        summary: "Send a friend request",
        description: "Same rules as the app: no duplicates, no requests to or from blocked players (answered as not found).",
        tags: ["public"],
        security: [{ apiKeyAuth: [] }],
        body: { type: "object", additionalProperties: false, required: ["username"], properties: { username: { type: "string", minLength: 1, maxLength: 30 } } },
        response: {
          201: { type: "object", properties: { id: { type: "integer" }, direction: { type: "string" }, createdAt: { type: "string" }, user: { type: "object", properties: { username: { type: "string" }, displayName: { type: "string" } } } } },
          400: errorBody, 401: errorBody, 404: errorBody, 409: errorBody,
        },
      },
    }, async (req, reply) => {
      const outcome = await sendFriendRequest(req.apiUser!.id, (req.body as { username: string }).username);
      return reply.code(outcome.status as 201 | 400 | 404 | 409).send(outcome.body as never);
    });

    // DELETE /api/public/friends/:username
    pluginApp.delete("/api/public/friends/:username", {
      schema: {
        summary: "Remove a friend or cancel a pending request",
        tags: ["public"],
        security: [{ apiKeyAuth: [] }],
        params: { type: "object", required: ["username"], properties: { username: { type: "string", minLength: 1, maxLength: 30 } } },
        response: { 204: { type: "null", description: "Removed." }, 401: errorBody, 404: errorBody },
      },
    }, async (req, reply) => {
      const outcome = await removeFriend(req.apiUser!.id, (req.params as { username: string }).username);
      return reply.code(outcome.status as 204 | 404).send(outcome.body as never);
    });
  }, { prefix: "" }); // Empty prefix means routes keep their /api/public/ prefix
}

