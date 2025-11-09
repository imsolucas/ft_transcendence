import { FastifyInstance } from "fastify";
import * as controllers from "../controllers/authControllers.ts";

export default async function registerAuthRoutes(app: FastifyInstance) {
  // Auth signup
  app.post("/auth/signup", {
    schema: {
      summary: "User signup",
      description: "Create a new user account.",
      body: {
        type: "object",
        required: ["name", "email", "password"],
        properties: {
          name: { type: "string", example: "Alice" },
          email: { type: "string", format: "email", example: "alice@example.com" },
          password: { type: "string", format: "password", example: "SuperSecret123" }
        }
      },
      response: {
        201: {
          description: "User created successfully."
        },
        400: {
          description: "Invalid input."
        },
        500: {
          $ref: "InternalServerError#"
        }
      }
    }
  }, controllers.signup);

  // Auth login
  app.post("/auth/login", {
    schema: {
      summary: "User login",
      description: "Login to user account.",
      body: {
        type: "object",
        required: ["name", "password"],
        properties: {
          name: { type: "string", example: "Alice" },
          password: { type: "string", format: "password", example: "SuperSecret123" }
        }
      },
      response: {
        200: {
          description: "OK",
          type: "object",
          properties: {
            token: { type: "string", example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." },
            user: {
              type: "object",
              properties: {
                id: { type: "integer", example: 1 },
                username: { type: "string", example: "Alice" },
                email: { type: "string", format: "email", example: "alice@example.com" },
                avatar: { type: "string", format: "uri", example: "https://example.com/avatar.png" }
              }
            }
          }
        },
        401: {
          description: "Invalid username or password",
          type: "object",
          properties: {
            error: { type: "string", example: "Invalid username or password" }
          }
        },
        500: {
          $ref: "InternalServerError#"
        }
      }
    }
  }, controllers.login);
}
