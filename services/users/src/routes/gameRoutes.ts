import type { FastifyInstance } from "fastify";
import * as controllers from "../controllers/gameControllers.ts";

export default async function registerGameRoutes(app: FastifyInstance) {
  // GET /user/match-history
  app.get("/user/match-history", {
    schema: {
      summary: "Retrieve match history of authenticated user",
      description: "Retrieves the match history for the authenticated user. Returns a list of matches the user has participated in, including details such as opponent, scores, display names, start time and end time. If a match is part of a tournament, tournament details are included.",
      tags: ["game"],
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          description: "Match history retrieved successfully.",
          type: "array",
          items: {
            allOf: [
              { $ref: "MatchHistory#" },
              {
                type: "object",
                properties: {
                  tournament: {
                    type: ["object", "null"],
                    properties: {
                      id: { type: "integer" },
                      name: { type: "string" },
                      winnerId: { type: "integer" },
                      start_at: { type: "string", format: "date-time" },
                      end_at: { type: "string", format: "date-time" }
                    }
                  }
                }
              }
            ]
          }
        },
        401: { $ref: "UnauthorizedError#" },
        500: { $ref: "InternalServerError#" }
      }
    }
  }, controllers.getMatchHistory);

  // POST /game/match-result
  app.post("/game/match-result", {
    schema: {
      summary: "Upload match result",
      description: "Uploads a completed match record from the Game service. The request should include both player IDs, scores, display names, match timestamps, and optionally tournament and winner information.",
      tags: ["game"],
      body: {
        type: "object",
        required: [
          "player1Id",
          "player2Id",
          "player1Score",
          "player2Score",
          "player1DisplayName",
          "player2DisplayName",
          "played_at",
          "end_at"
        ],
        properties: {
          player1Id: { type: "integer" },
          player2Id: { type: "integer" },
          player1Score: { type: "integer" },
          player2Score: { type: "integer" },
          player1DisplayName: { type: "string" },
          player2DisplayName: { type: "string" },
          tournamentId: { type: "integer", nullable: true },
          winnerId: { type: "integer", nullable: true },
          played_at: { type: "string", format: "date-time" },
          end_at: { type: "string", format: "date-time" }
        }
      },
      response: {
        201: {
          description: "Match record created successfully.",
          $ref: "MatchHistory#"
        },
        400: { description: "Invalid input." },
        500: { $ref: "InternalServerError#" }
      }
    }
  }, controllers.uploadMatchHistory);

  // GET /user/match-history/:userId
  app.get("/user/match-history/:userId", {
    schema: {
      summary: "Retrieve match history by user ID",
      description: "Retrieves the match history for a specific user by their user ID. Returns a list of matches the user has participated in.",
      tags: ["game"],
      security: [{ bearerAuth: [] }],
      params: {
        type: "object",
        properties: {
          userId: { type: "integer" }
        }
      },
      response: {
        200: {
          description: "Match history retrieved successfully.",
          type: "array",
          items: {
            allOf: [
              { $ref: "MatchHistory#" },
              {
                type: "object",
                properties: {
                  tournament: {
                    type: ["object", "null"],
                    properties: {
                      id: { type: "integer" },
                      name: { type: "string" },
                      winnerId: { type: "integer" },
                      start_at: { type: "string", format: "date-time" },
                      end_at: { type: "string", format: "date-time" }
                    }
                  }
                }
              }
            ]
          }
        },
        401: { $ref: "UnauthorizedError#" },
        404: { description: "User not found." },
        500: { $ref: "InternalServerError#" }
      }
    }
  }, controllers.getMatchHistoryByUserId);

  // POST /game/tournament-result
  app.post("/game/tournament-result", {
    schema: {
      summary: "Post tournament result",
      description: "Creates a tournament record with all details after the tournament ends. The request must include tournament ID, name, winner ID, start/end times, players, and matches.",
      tags: ["game"],
      body: {
        type: "object",
        required: ["tournamentId", "winnerId", "start_at", "end_at", "players", "matches"],
        properties: {
          tournamentId: { type: "integer" },
          name: { type: "string" },
          winnerId: { type: "integer" },
          start_at: { type: "string", format: "date-time" },
          end_at: { type: "string", format: "date-time" },
          players: {
            type: "array",
            items: {
              type: "object",
              required: ["userId"],
              properties: {
                userId: { type: "integer" }
              }
            }
          },
          matches: {
            type: "array",
            items: {
              type: "object",
              required: [
                "player1Id",
                "player2Id",
                "player1DisplayName",
                "player2DisplayName",
                "player1Score",
                "player2Score",
                "played_at",
                "end_at"
              ],
              properties: {
                player1Id: { type: "integer" },
                player2Id: { type: "integer" },
                player1DisplayName: { type: "string" },
                player2DisplayName: { type: "string" },
                player1Score: { type: "integer" },
                player2Score: { type: "integer" },
                winnerId: { type: "integer", nullable: true },
                played_at: { type: "string", format: "date-time" },
                end_at: { type: "string", format: "date-time" }
              }
            }
          }
        }
      },
      response: {
        200: {
          description: "Tournament result recorded successfully.",
          type: "object",
          properties: {
            tournamentId: { type: "integer" },
            winnerId: { type: "integer" },
            start_at: { type: "string", format: "date-time" },
            end_at: { type: "string", format: "date-time" },
            players: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "integer" },
                  tournamentId: { type: "integer" },
                  userId: { type: "integer" }
                }
              }
            },
            matches: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "integer" },
                  tournamentId: { type: "integer", nullable: true },
                  player1Id: { type: "integer" },
                  player2Id: { type: "integer" },
                  player1DisplayName: { type: "string" },
                  player2DisplayName: { type: "string" },
                  player1Score: { type: "integer" },
                  player2Score: { type: "integer" },
                  winnerId: { type: "integer", nullable: true },
                  played_at: { type: "string", format: "date-time" },
                  end_at: { type: "string", format: "date-time" }
                }
              }
            }
          }
        },
        400: { description: "Invalid input." },
        500: { $ref: "InternalServerError#" }
      }
    }
  }, controllers.postTournamentResult);
}
