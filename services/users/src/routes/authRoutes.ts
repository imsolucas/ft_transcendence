import type { FastifyInstance } from "fastify";
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
          name: { type: "string" },
          email: { type: "string", format: "email" },
          password: { type: "string", format: "password" }
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
          name: { type: "string" },
          password: { type: "string", format: "password" }
        }
      },
      response: {
        200: {
          description: "OK",
          type: "object",
          properties: {
            token: { type: "string" },
            user: {
              type: "object",
              properties: {
                id: { type: "integer" },
                username: { type: "string" },
                email: { type: "string", format: "email" },
                avatar: { type: "string", format: "uri" }
              }
            }
          }
        },
        401: {
          description: "Invalid username or password",
          type: "object",
          properties: {
            error: { type: "string" }
          }
        },
        500: {
          $ref: "InternalServerError#"
        }
      }
    }
  }, controllers.login);

  // Google OAuth
  app.post("/auth/google", {
    schema: {
      summary: "Google OAuth authentication",
      description: "Authenticate user with Google OAuth credential.",
      body: {
        type: "object",
        required: ["credential"],
        properties: {
          credential: { type: "string" }
        }
      },
      response: {
        200: {
          description: "OK",
          type: "object",
          properties: {
            token: { type: "string" },
            user: {
              type: "object",
              properties: {
                id: { type: "integer" },
                username: { type: "string" },
                email: { type: "string", format: "email" },
                avatar: { type: "string", format: "uri" }
              }
            }
          }
        },
        400: {
          description: "Invalid input",
          type: "object",
          properties: {
            error: { type: "string" }
          }
        },
        500: {
          $ref: "InternalServerError#"
        }
      }
    }
  }, controllers.googleAuth);
}
