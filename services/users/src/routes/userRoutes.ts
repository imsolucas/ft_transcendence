import type { FastifyInstance } from "fastify";
import * as controllers from "../controllers/userControllers.ts";

export default async function registerUserRoutes(app: FastifyInstance) {
  // User profile
  app.get("/user/profile", {
    schema: {
      summary: "Get user profile",
      description: "Retrieves the profile information of the authenticated user.",
      tags: ["user"],
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          description: "User profile retrieved successfully.",
          $ref: "UserProfile#"
        },
        401: { $ref: "UnauthorizedError#" },
        500: { $ref: "InternalServerError#" }
      }
    }
  }, controllers.getUserProfile);

  app.patch("/user/profile", {
    schema: {
      summary: "Update user profile",
      description: "Updates the profile information of the authenticated user.",
      tags: ["user"],
      security: [{ bearerAuth: [] }],
      body: {
        type: "object",
        properties: {
          username: { type: "string" },
          email: { type: "string", format: "email" },
          avatar: { type: "string", format: "uri" }
        }
      },
      response: {
        200: { description: "Profile updated successfully.", $ref: "UserProfile#" },
        400: {
          description: "Invalid fields.",
          type: "object",
          properties: {
            error: { type: "string" }
          }
        },
        401: { $ref: "UnauthorizedError#" },
        500: { $ref: "InternalServerError#" }
      }
    }
  }, controllers.updateUserProfile);

  app.get("/user/profile/:username", {
    schema: {
      summary: "Get user profile by username",
      description: "Retrieves the profile information of a user by their username.",
      tags: ["user"],
      security: [{ bearerAuth: [] }],
      params: {
        type: "object",
        properties: {
          username: { type: "string" }
        }
      },
      response: {
        200: {
          description: "User profile retrieved successfully.",
          $ref: "UserProfile#"
        },
        401: { $ref: "UnauthorizedError#" },
        404: { description: "User not found." },
        500: { $ref: "InternalServerError#" }
      }
    }
  }, controllers.getUserProfileByUsername);

  // Friends
  app.get("/user/friends", {
    schema: {
      summary: "Get friend list",
      description: "Retrieves the friend list of the authenticated user.",
      tags: ["friends"],
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          description: "Friend list retrieved successfully.",
          type: "array",
          items: {
            type: "object",
            properties: {
              username: { type: "string" },
              avatar: { type: "string", format: "uri" },
              status: { type: "string", enum: ["ONLINE", "OFFLINE", "INGAME"] }
            }
          }
        },
        401: { $ref: "UnauthorizedError#" },
        500: { $ref: "InternalServerError#" }
      }
    }
  }, controllers.getFriends);

  // Friend requests
  app.post("/user/friend-request", {
    schema: {
      summary: "Send a friend request",
      description: "Sends a friend request from the authenticated user to another user.",
      tags: ["friends"],
      security: [{ bearerAuth: [] }],
      body: {
        type: "object",
        properties: {
          username: { type: "string" }
        }
      },
      response: {
        201: { description: "Friend request sent successfully.", $ref: "FriendRequest#" },
        400: { description: "Invalid input or already friends." },
        401: { $ref: "UnauthorizedError#" },
        404: { description: "Target user not found." },
        409: { description: "Friend request already exists." },
        500: { $ref: "InternalServerError#" }
      }
    }
  }, controllers.sendFriendRequest);

  app.get("/user/friend-request", {
    schema: {
      summary: "Retrieve friend requests",
      description: "Retrieves the list of friend requests for the authenticated user.",
      tags: ["friends"],
      security: [{ bearerAuth: [] }],
      querystring: {
        type: "object",
        properties: {
          direction: { type: "string", enum: ["sent", "received"], description: "Filter by sent or received friend requests." }
        }
      },
      response: {
        200: {
          description: "Friend requests retrieved successfully.",
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "integer" },
              fromId: { type: "integer" },
              toId: { type: "integer" },
              requesterUsername: { type: "string" },
              addresseeUsername: { type: "string" },
              requester: { type: "string" },
              requesterAvatar: { type: "string", format: "uri" },
              status: { type: "string" },
              created_at: { type: "string", format: "date-time" }
            }
          }
        },
        401: { $ref: "UnauthorizedError#" },
        500: { $ref: "InternalServerError#" }
      }
    }
  }, controllers.getFriendRequests);

  app.patch("/user/friend-request/:requestId", {
    schema: {
      summary: "Accept or reject a friend request",
      description: "Update the status of a friend request (accept or reject).",
      tags: ["friends"],
      security: [{ bearerAuth: [] }],
      params: {
        type: "object",
        properties: {
          requestId: { type: "integer" }
        }
      },
      body: {
        type: "object",
        properties: {
          status: { type: "string", enum: ["ACCEPTED", "REJECTED"] }
        }
      },
      response: {
        200: { description: "Friend request updated successfully." },
        400: { description: "Invalid request." },
        401: { $ref: "UnauthorizedError#" },
        404: { description: "Friend request not found." },
        500: { $ref: "InternalServerError#" }
      }
    }
  }, controllers.updateFriendRequest);

  app.delete("/user/friends/:username", {
    schema: {
      summary: "Remove a friend",
      description: "Removes a friendship between the authenticated user and another user.",
      tags: ["friends"],
      security: [{ bearerAuth: [] }],
      params: {
        type: "object",
        properties: {
          username: { type: "string" }
        }
      },
      response: {
        200: { description: "Friend removed successfully." },
        400: { description: "Cannot remove yourself as a friend." },
        401: { $ref: "UnauthorizedError#" },
        404: { description: "Friendship not found." },
        500: { $ref: "InternalServerError#" }
      }
    }
  }, controllers.removeFriend);

  app.get("/user/search", {
    schema: {
      summary: "Search users by username",
      description: "Searches for users by username. Returns a list of users matching the query.",
      tags: ["user"],
      security: [{ bearerAuth: [] }],
      querystring: {
        type: "object",
        properties: {
          q: { type: "string", description: "Search query (username)" }
        },
        required: ["q"]
      },
      response: {
        200: {
          description: "Users found successfully.",
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "integer" },
              username: { type: "string" },
              avatar: { type: "string", format: "uri" },
              status: { type: "string", enum: ["ONLINE", "OFFLINE", "INGAME"] }
            }
          }
        },
        400: { description: "Search query is required." },
        401: { $ref: "UnauthorizedError#" },
        500: { $ref: "InternalServerError#" }
      }
    }
  }, controllers.searchUsers);

  // 2FA setup
  app.post("/user/2fa/setup", {
    schema: {
      summary: "Enable 2FA for user",
      description: "Generates a 2FA secret and returns a QR code for setup. The user must scan the QR code with an authenticator app and verify with a code.",
      tags: ["user", "security"],
      security: [{ bearerAuth: [] }],
      body: {
        type: "object",
        // Allow empty body
        additionalProperties: false
      },
      response: {
        200: {
          description: "2FA setup info",
          type: "object",
          properties: {
            secret: { type: "string", example: "JBSWY3DPEHPK3PXP" },
            qrCode: { type: "string", format: "uri", example: "data:image/png;base64,..." }
          }
        },
        400: {
          description: "2FA is already enabled.",
          type: "object",
          properties: {
            error: { type: "string", example: "2FA is already enabled." }
          }
        },
        401: { $ref: "UnauthorizedError#" },
        500: { $ref: "InternalServerError#" }
      }
    }
  }, controllers.enable2FA);

  // Update user status
  app.patch("/user/status", {
    schema: {
      summary: "Update user status",
      description: "Updates the status of the authenticated user. This endpoint allows the user to set their current status (e.g., ONLINE, OFFLINE, INGAME). The status can be used to indicate availability or activity within the application.",
      tags: ["user"],
      security: [{ bearerAuth: [] }],
      body: {
        type: "object",
        properties: {
          status: { type: "string", enum: ["ONLINE", "OFFLINE", "INGAME"] }
        }
      },
      response: {
        200: {
          description: "User status updated successfully.",
          type: "object",
          properties: {
            status: { type: "string", enum: ["ONLINE", "OFFLINE", "INGAME"] }
          }
        }
      }
    }
  }, controllers.updateUserStatus);

  // API Key Management
  app.post("/user/api-keys", {
    schema: {
      summary: "Generate new API key",
      description: "Generates a new API key for the authenticated user. The API key is returned only once and must be saved securely.",
      tags: ["user"],
      security: [{ bearerAuth: [] }],
      body: {
        type: "object",
        required: ["name"],
        properties: {
          name: { type: "string", description: "Name for the API key (e.g., 'Production API', 'Development')" }
        }
      },
      response: {
        201: {
          description: "API key created successfully.",
          type: "object",
          properties: {
            id: { type: "integer" },
            name: { type: "string" },
            apiKey: { type: "string", description: "The API key (shown only once)" },
            createdAt: { type: "string", format: "date-time" },
            message: { type: "string" }
          }
        },
        400: { description: "Invalid input." },
        401: { $ref: "UnauthorizedError#" },
        500: { $ref: "InternalServerError#" }
      }
    }
  }, controllers.generateApiKey);

  app.get("/user/api-keys", {
    schema: {
      summary: "List user's API keys",
      description: "Retrieves a list of all API keys for the authenticated user. The actual API key values are not returned for security.",
      tags: ["user"],
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          description: "API keys retrieved successfully.",
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "integer" },
              name: { type: "string" },
              isActive: { type: "boolean" },
              createdAt: { type: "string", format: "date-time" },
              lastUsedAt: { type: "string", format: "date-time", nullable: true }
            }
          }
        },
        401: { $ref: "UnauthorizedError#" },
        500: { $ref: "InternalServerError#" }
      }
    }
  }, controllers.listApiKeys);

  app.delete("/user/api-keys/:id", {
    schema: {
      summary: "Revoke API key",
      description: "Revokes (deletes) an API key belonging to the authenticated user.",
      tags: ["user"],
      security: [{ bearerAuth: [] }],
      params: {
        type: "object",
        required: ["id"],
        properties: {
          id: { type: "string", description: "API key ID" }
        }
      },
      response: {
        200: {
          description: "API key revoked successfully.",
          type: "object",
          properties: {
            message: { type: "string" }
          }
        },
        400: { description: "Invalid API key ID." },
        401: { $ref: "UnauthorizedError#" },
        404: { description: "API key not found." },
        500: { $ref: "InternalServerError#" }
      }
    }
  }, controllers.revokeApiKey);
}
