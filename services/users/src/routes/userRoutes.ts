import type { FastifyInstance } from "fastify";
import {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
} from "../controllers/userControllers.ts";
import {
  getFriendships
} from "../controllers/friendshipControllers.ts"

export default async function userRoutes(fastify: FastifyInstance) {
  // List users
  fastify.get("/", getUsers);

  // Get single user by id
  fastify.get<{ Params: { id: string } }>("/:id", getUserById);

  // Create user
  fastify.post("/", createUser);

  // Update user
  fastify.patch<{ Params: { id: string }; Body: { name?: string; email?: string; avatar?: string } }>("/:id", updateUser);

  // Delete user
  fastify.delete<{ Params: { id: string } }>("/:id", deleteUser);

  // List friends
  fastify.get<{ Params: { id: string } }>("/:id/friends", getFriendships);
};
