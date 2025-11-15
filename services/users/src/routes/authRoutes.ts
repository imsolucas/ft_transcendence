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
        202: {
          description: "2FA required",
          type: "object",
          properties: {
            twoFARequired: { type: "boolean" },
            id: { type: "integer" }
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

  // Google auth
  app.post("/auth/google", {
    schema: {
      summary: "Sign in or sign up with Google",
      description: "Authenticates a user using a Google account. The frontend should send a Google ID token in the request body. If the user does not exist, a new account will be created. On success, returns an application JWT token and user profile.",
      body: {
        type: "object",
        required: ["idToken"],
        properties: {
          idToken: { type: "string" }
        }
      },
      response: {
        200: {
          description: "Google sign-in or sign-up successful.",
          type: "object",
          properties: {
            token: { type: "string" },
            user: {
              $ref: "UserProfile#"
            }
          }
        },
        400: {
          description: "Invalid Google token.",
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

  // POST /auth/verify-2fa
  app.post("/auth/verify-2fa", {
    schema: {
      summary: "Verify 2FA code",
      description: "Verifies the 2FA code and returns a JWT token if successful.",
      body: {
        type: "object",
        required: ["userId", "code"],
        properties: {
          userId: { type: "integer" },
          code: { type: "string" }
        }
      },
      response: {
        200: {
          description: "2FA verification successful",
          type: "object",
          properties: {
            token: { type: "string" },
            user: { $ref: "UserProfile#" }
          }
        },
        401: {
          description: "Invalid 2FA code",
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
  }, controllers.verify2FA);
}
