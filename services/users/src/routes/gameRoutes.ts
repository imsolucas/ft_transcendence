import type { FastifyInstance } from "fastify";
import * as controllers from "../controllers/gameControllers.ts";

export default async function registerGameRoutes(app: FastifyInstance) {
  // GET /user/match-history
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

  // POST /game/match-result
  app.post("/game/match-result", {
    schema: {
      summary: "Upload match result",
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
          player1Id: { type: "integer" },
          player2Id: { type: "integer" },
          player1Score: { type: "integer" },
          player2Score: { type: "integer" },
          player1DisplayName: { type: "string" },
          player2DisplayName: { type: "string" },
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
        401: { $ref: "UnauthorizedError#" },
        500: { $ref: "InternalServerError#" }
      }
    }
  }, controllers.uploadMatchHistory);
}
