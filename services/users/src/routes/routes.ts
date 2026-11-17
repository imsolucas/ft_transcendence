import type { FastifyInstance } from "fastify";
import authRoutes from "./authRoutes.ts";
import registerHealthRoutes from "./healthRoutes.ts";
import registerPublicRoutes from "./publicRoutes.ts";
import meRoutes from "../modules/me/routes.ts";
import usersRoutes from "../modules/users/routes.ts";
import friendsRoutes from "../modules/friends/routes.ts";
import apiKeyRoutes from "../modules/apiKeys/routes.ts";
import sessionRoutes from "../modules/sessions/routes.ts";
import chatRoutes from "../modules/chat/routes.ts";
import internalRoutes from "../modules/internal/routes.ts";
import { apiRateLimiter } from "../middleware/rateLimiter.ts";

export default async function routes(app: FastifyInstance) {
  // Better Auth: /api/auth/*
  await app.register(authRoutes);

  // Our browser API: /api/* (session cookie)
  await app.register(
    async (api) => {
      api.addHook("onRequest", apiRateLimiter);
      await api.register(meRoutes);
      await api.register(usersRoutes);
      await api.register(friendsRoutes);
      await api.register(apiKeyRoutes);
      await api.register(sessionRoutes);
      await api.register(chatRoutes);
    },
    { prefix: "/api" }
  );

  // Public API: /api/public/* (X-API-Key)
  await registerPublicRoutes(app);

  // Game service only: /internal/* (service token; not proxied by Caddy)
  await app.register(internalRoutes);

  await registerHealthRoutes(app);
}
