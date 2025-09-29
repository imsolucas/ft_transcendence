import Fastify  from "fastify";
import type { FastifyInstance } from "fastify";
import dbPlugin from "./db/plugin.ts";
import userRoutes from "./routes/userRoutes.ts";

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: true });

  await app.register(dbPlugin);

  await app.register(userRoutes, { prefix: "/users"});
  app.get("/", async () => "Hello TypeScript + Fastify! 🟦");

  return app;
};
