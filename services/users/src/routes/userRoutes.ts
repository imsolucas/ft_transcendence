import { FastifyInstance } from "fastify";
import { getUsers } from "../controllers/userControllers.js";

export default async function userRoutes(fastify: FastifyInstance) {
  fastify.get("/", getUsers);
};
