import type { FastifyInstance } from "fastify";
import { getUsers } from "../controllers/userControllers.ts";

export default async function userRoutes(fastify: FastifyInstance) {
  fastify.get("/", getUsers);
};
