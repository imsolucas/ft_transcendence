import Fastify, { FastifyInstance } from "fastify";
import userRoutes from "./routes/userRoutes.js";

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: true });

  await app.register(userRoutes, { prefix: "/users"});
  app.get("/", async () => "Hello TypeScript + Fastify! 🟦");

  return app;
};
