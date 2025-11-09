import { FastifyInstance } from "fastify";
import * as controllers from "../controllers";

export default async function registerGameRoutes(app: FastifyInstance) {
  // Match history (GET /user/match-history)
  app.get("/user/match-history", {
    schema: {
      summary: "Retrieve match history of authenticated user",
      description: "Retrieves the match history for the authenticated user. Returns a list of matches the user has participated in, including details such as opponent, scores, display names, start time and end time.",
      tags: ["game"],
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          description: "Match history retrieved successfully.",
          type: "array",
          items: { $ref: "MatchHistory#" }
        },
        401: { $ref: "UnauthorizedError#" },
        500: { $ref: "InternalServerError#" }
      }
    }
  }, controllers.getMatchHistory);

  // Game service: upload match history (POST /game/match-history)
  app.post("/game/match-history", {
    schema: {
      summary: "Upload match history",
      description: "Uploads a completed match record from the Game service. The request should include both player IDs, scores, display names, and match timestamps.",
      tags: ["game"],
      security: [{ bearerAuth: [] }],
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
          player1Id: { type: "integer", example: 1 },
          player2Id: { type: "integer", example: 2 },
          player1Score: { type: "integer", example: 10 },
          player2Score: { type: "integer", example: 8 },
          player1DisplayName: { type: "string", example: "Alice" },
          player2DisplayName: { type: "string", example: "Bob" },
          played_at: { type: "string", format: "date-time", example: "2025-11-06T10:30:00Z" },
          end_at: { type: "string", format: "date-time", example: "2025-11-06T10:40:00Z" }
        }
      },
      response: {
        201: {
          description: "Match record created successfully.",
          $ref: "MatchHistory#"
        },
        400: { description: "Invalid input." },
        401: { $ref: "UnauthorizedError#" },
        500: { $ref: "InternalServerError#" }
      }
    }
  }, controllers.uploadMatchHistory);
}
