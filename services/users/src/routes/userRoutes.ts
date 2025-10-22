import type { FastifyInstance } from "fastify";
import {
  getUsers,
  getUserByName,
  createUser,
  updateUser,
  deleteUser,
} from "../controllers/userControllers.ts";

export default async function userRoutes(fastify: FastifyInstance) {
  // List users
  fastify.get("/", getUsers);

  // Get single user by name
  fastify.get<{ Params: { name: string } }>("/:name", getUserByName);

  // Create user
  fastify.post("/", createUser);

  // Update user
  fastify.patch<{ Params: { id: string }; Body: { name?: string; email?: string; avatar?: string } }>("/:id", updateUser);

  // Delete user
  fastify.delete<{ Params: { id: string } }>("/:id", deleteUser);
};
