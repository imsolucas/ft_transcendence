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
          items: { $ref: "FriendRequest#" }
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
}
