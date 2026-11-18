import type { FastifyInstance } from "fastify";
import authRoutes from "./authRoutes.ts";
import registerHealthRoutes from "./healthRoutes.ts";
import meRoutes from "../modules/me/routes.ts";
import usersRoutes from "../modules/users/routes.ts";
import friendsRoutes from "../modules/friends/routes.ts";
import sessionRoutes from "../modules/sessions/routes.ts";
import chatRoutes from "../modules/chat/routes.ts";
import statusRoutes from "../modules/status/routes.ts";
import privacyRoutes from "../modules/privacy/routes.ts";
import gamificationRoutes from "../modules/gamification/routes.ts";
import aiRoutes from "../modules/ai/routes.ts";
import internalRoutes from "../modules/internal/routes.ts";
import tournamentRoutes from "../modules/tournaments/routes.ts";
import rankedRoutes from "../modules/ranked/routes.ts";
import { apiRateLimiter } from "../middleware/rateLimiter.ts";
import { config } from "../config.ts";
import type { PublicConfig } from "../../../shared/types/api.types.ts";

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
      await api.register(sessionRoutes);
      await api.register(chatRoutes);
      await api.register(statusRoutes);
      await api.register(privacyRoutes);
      await api.register(gamificationRoutes);
      await api.register(aiRoutes);
      await api.register(tournamentRoutes);
      await api.register(rankedRoutes);
    },
    { prefix: "/api" }
  );

  // Public client config (no secrets): which optional sign-up protections are on
  app.get(
    "/api/config",
    {
      schema: {
        response: {
          200: {
            type: "object",
            properties: { turnstileSiteKey: { type: ["string", "null"] }, emailVerification: { type: "boolean" } },
            required: ["turnstileSiteKey", "emailVerification"],
          },
        },
      },
    },
    async (_req, reply): Promise<PublicConfig> => {
    reply.header("Cache-Control", "public, max-age=300");
    return { turnstileSiteKey: config.turnstile?.siteKey ?? null, emailVerification: config.requireEmailVerification };
    }
  );

  // Expire the session cookies unconditionally (a revoked/stale cookie would otherwise keep the
  // browser bouncing between /login and the app). Harmless without a session, so no auth.
  app.post("/api/session/clear", async (_req, reply) => {
    for (const name of ["__Secure-ft.session_token", "__Secure-ft.session_data", "__Secure-ft.dont_remember"]) {
      reply.header("set-cookie", `${name}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`);
    }
    return reply.code(204).send();
  });

  // Game service only: /internal/* (service token; not proxied by Caddy)
  await app.register(internalRoutes);

  await registerHealthRoutes(app);
}
