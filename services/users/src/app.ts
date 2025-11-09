import Fastify  from "fastify";
import type { FastifyInstance } from "fastify";
import { FriendRequest, InternalServerError, MatchHistory, UnauthorizedError, UserProfile } from "./schemas/index.ts";
import dbPlugin from "./db/plugin.ts";
import routes from "./routes/routes.ts";

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

  app.addSchema(UserProfile);
  app.addSchema(FriendRequest);
  app.addSchema(MatchHistory);
  app.addSchema(UnauthorizedError);
  app.addSchema(InternalServerError);

  await app.register(dbPlugin);

  await app.register(routes);
  app.get("/", async () => "Hello TypeScript + Fastify! 🟦");

  return app;
};
