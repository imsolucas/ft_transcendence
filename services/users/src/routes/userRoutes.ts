import type { FastifyInstance } from "fastify";
import {
  getUsers,
  getUserById,
  createUser,
  // updateUser,
  // deleteUser,
} from "../controllers/userControllers.ts";

export default async function userRoutes(fastify: FastifyInstance) {
  // List users
  fastify.get("/", getUsers);

  // Get single user by id
  fastify.get<{ Params: { id: string } }>("/:id", getUserById);

  // Create user
  fastify.post("/", createUser);

  // // Update user (replace or partial)
  // fastify.put<{ Params: { id: string }; Body: { name?: string } }>("/:id", updateUser);
  // fastify.patch<{ Params: { id: string }; Body: { name?: string } }>("/:id", updateUser);

  // // Delete user
  // fastify.delete<{ Params: { id: string } }>("/:id", deleteUser);
};
