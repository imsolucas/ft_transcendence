import Fastify  from "fastify";
import type { FastifyInstance } from "fastify";
import dbPlugin from "./db/plugin.ts";
import userRoutes from "./routes/userRoutes.ts";

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: true });

  // Register CORS plugin
  await app.register(import("@fastify/cors"), {
    origin: [
      "http://localhost:3000",  // Frontend dev server
      "http://127.0.0.1:3000",  // Alternative localhost
      "http://localhost:5173",  // Vite default port (fallback)
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  });

  await app.register(dbPlugin);

  await app.register(userRoutes, { prefix: "/users"});
  app.get("/", async () => "Hello TypeScript + Fastify! 🟦");

  return app;
};
