import Fastify, { FastifyInstance } from "fastify";
import Database from "better-sqlite3";
import userRoutes from "./routes/userRoutes.js";

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: true });

  const db = new Database("./db/data.sqlite");
  db.pragma("journal_mode = WAL");
  app.decorate("db", db);

  await app.register(userRoutes, { prefix: "/users"});
  app.get("/", async () => "Hello TypeScript + Fastify! 🟦");

  return app;
};
