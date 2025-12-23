import Fastify  from "fastify";
import type { FastifyInstance } from "fastify";
import { FriendRequest, InternalServerError, MatchHistory, UnauthorizedError, UserProfile } from "./schemas/index.ts";
import jwt from "jsonwebtoken";
import dbPlugin from "./db/plugin.ts";
import routes from "./routes/routes.ts";
import fastifySwagger from "@fastify/swagger";
import fastifySwaggerUi from "@fastify/swagger-ui";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: true });
  
  // Configure content type parser to allow empty JSON bodies
  // This is needed for endpoints like /auth/logout that don't require a body
  app.addContentTypeParser('application/json', { parseAs: 'string' }, (req, body, done) => {
    try {
      if (body === '' || body === null || body === undefined) {
        // Empty body is allowed - return empty object
        done(null, {});
      } else {
        // Parse JSON body normally
        const json = JSON.parse(body as string);
        done(null, json);
      }
    } catch (err) {
      done(err as Error, undefined);
    }
  });

  // Register CORS plugin
  await app.register(import("@fastify/cors"), {
    // origin: (origin, callback) => {
    //   // Allow requests with no origin (like mobile apps or curl requests)
    //   if (!origin) return callback(null, true);

    //   const allowedOrigins = [
    //   "https://localhost:8443",
    //     "http://localhost:4000",  // Local dev server
    //     "http://localhost:3000",  // Frontend dev server
    //     "http://127.0.0.1:3000",  // Alternative localhost
    //     "http://localhost:5173",  // Vite default port
    //     "http://127.0.0.1:5173",  // Alternative localhost Vite
    //   ];

    //   if (allowedOrigins.includes(origin)) {
    //     callback(null, true);
    //   } else {
    //     // In development, allow any localhost origin
    //     if (origin.startsWith("http://localhost:") || origin.startsWith("http://127.0.0.1:")) {
    //       callback(null, true);
    //     } else {
    //       callback(new Error("Not allowed by CORS"), false);
    //     }
    //   }
    // },
    origin: true,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  });

  // Register cookie plugin
  await app.register(import("@fastify/cookie"), {
    secret: process.env.COOKIE_SECRET || "dev_cookie_secret_change_in_production",
    hook: "onRequest",
  });

  app.addSchema(UserProfile);
  app.addSchema(FriendRequest);
  app.addSchema(MatchHistory);
  app.addSchema(UnauthorizedError);
  app.addSchema(InternalServerError);

  const JWT_SECRET = process.env.JWT_SECRET ?? "dev_secret";

  app.addHook("preHandler", async (req, reply) => {
    // Only check for routes that require auth (exclude auth routes)
    const path = req.routeOptions?.url;
    if (
      path &&
      path.startsWith("/user") && !path.startsWith("/auth")
    ) {
      const auth = req.headers.authorization;
      if (!auth || !auth.startsWith("Bearer ")) {
        return reply.code(401).send({ error: "Unauthorized" });
      }
      try {
        const token = auth.replace("Bearer ", "");

        // Decode token to get expiration and issued time for optimization
        const tokenPayload = jwt.decode(token) as { exp?: number; iat?: number; id?: number } | null;
        const tokenExp = tokenPayload?.exp ? new Date(tokenPayload.exp * 1000) : null;
        const tokenIat = tokenPayload?.iat ? new Date(tokenPayload.iat * 1000) : null;

        // #region agent log
        try {
          const fs = await import('fs');
          const logPath = '/home/imsolucas/42project/ft_transcendence/.cursor/debug.log';
          fs.appendFileSync(logPath, JSON.stringify({location:'app.ts:75',message:'JWT validation starting',data:{path,hasToken:!!token,tokenLength:token.length,tokenUserId:tokenPayload?.id,tokenExp:tokenExp?.toISOString(),tokenIat:tokenIat?.toISOString()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})+'\n');
        } catch (logErr) {}
        // #endregion

        // Check if token is blacklisted
        // First, clean up expired blacklist entries
        await prisma.tokenBlacklist.deleteMany({
          where: {
            expiresAt: { lte: new Date() },
          },
        });

        let isBlacklisted = false;

        // Optimization: Skip blacklist check for tokens issued in the last 5 minutes
        // These tokens are too new to have been blacklisted (logout happens before new token is issued)
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        const shouldCheckBlacklist = tokenExp && tokenExp > new Date() &&
                                     (!tokenIat || tokenIat < fiveMinutesAgo);

        if (shouldCheckBlacklist) {
          // Only check blacklist entries that could potentially match (not expired yet)
          const blacklistedTokens = await prisma.tokenBlacklist.findMany({
            where: {
              expiresAt: { gt: new Date() },
            },
            orderBy: {
              createdAt: 'desc',
            },
            take: 100, // Limit to most recent 100 entries for performance
          });

          // #region agent log
          try {
            const fs = await import('fs');
            const logPath = '/home/imsolucas/42project/ft_transcendence/.cursor/debug.log';
            fs.appendFileSync(logPath, JSON.stringify({location:'app.ts:103',message:'checking blacklist',data:{blacklistCount:blacklistedTokens.length,tokenUserId:tokenPayload?.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})+'\n');
          } catch (logErr) {}
          // #endregion

          if (blacklistedTokens.length > 0) {
            // Use Promise.all for parallel comparison (faster)
            const comparisonPromises = blacklistedTokens.map(async (blacklistedToken) => {
              try {
                const matches = await bcrypt.compare(token, blacklistedToken.tokenHash);
                // #region agent log
                if (matches) {
                  try {
                    const fs = await import('fs');
                    const logPath = '/home/imsolucas/42project/ft_transcendence/.cursor/debug.log';
                    fs.appendFileSync(logPath, JSON.stringify({location:'app.ts:115',message:'token found in blacklist',data:{blacklistId:blacklistedToken.id,blacklistExpiresAt:blacklistedToken.expiresAt.toISOString()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})+'\n');
                  } catch (logErr) {}
                }
                // #endregion
                return matches;
              } catch (err) {
                // If comparison fails, assume not blacklisted
                return false;
              }
            });

            const results = await Promise.all(comparisonPromises);
            isBlacklisted = results.some(match => match === true);
          }
        } else {
          // #region agent log
          try {
            const fs = await import('fs');
            const logPath = '/home/imsolucas/42project/ft_transcendence/.cursor/debug.log';
            fs.appendFileSync(logPath, JSON.stringify({location:'app.ts:130',message:'skipping blacklist check - token too recent',data:{tokenIat:tokenIat?.toISOString(),fiveMinutesAgo:fiveMinutesAgo.toISOString()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})+'\n');
          } catch (logErr) {}
          // #endregion
        }

        // #region agent log
        try {
          const fs = await import('fs');
          const logPath = '/home/imsolucas/42project/ft_transcendence/.cursor/debug.log';
          fs.appendFileSync(logPath, JSON.stringify({location:'app.ts:158',message:'blacklist check complete',data:{isBlacklisted,shouldCheckBlacklist},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})+'\n');
        } catch (logErr) {}
        // #endregion

        if (isBlacklisted) {
          // #region agent log
          try {
            const fs = await import('fs');
            const logPath = '/home/imsolucas/42project/ft_transcendence/.cursor/debug.log';
            fs.appendFileSync(logPath, JSON.stringify({location:'app.ts:123',message:'returning token revoked',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})+'\n');
          } catch (logErr) {}
          // #endregion
          return reply.code(401).send({ error: "Token has been revoked" });
        }

        // #region agent log
        try {
          const fs = await import('fs');
          const logPath = '/home/imsolucas/42project/ft_transcendence/.cursor/debug.log';
          fs.appendFileSync(logPath, JSON.stringify({location:'app.ts:128',message:'attempting JWT verify',data:{tokenLength:token.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})+'\n');
        } catch (logErr) {}
        // #endregion

        const payload = jwt.verify(token, JWT_SECRET);
        // #region agent log
        try {
          const fs = await import('fs');
          const logPath = '/home/imsolucas/42project/ft_transcendence/.cursor/debug.log';
          fs.appendFileSync(logPath, JSON.stringify({location:'app.ts:133',message:'JWT verified successfully',data:{userId:(payload as any).id,username:(payload as any).username},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})+'\n');
        } catch (logErr) {}
        // #endregion
        req.user = payload as any;
      } catch (error) {
        // #region agent log
        const errorMsg = error instanceof Error ? error.message : String(error);
        const errorName = error instanceof Error ? error.name : 'Unknown';
        try {
          const fs = await import('fs');
          const logPath = '/home/imsolucas/42project/ft_transcendence/.cursor/debug.log';
          fs.appendFileSync(logPath, JSON.stringify({location:'app.ts:140',message:'JWT verification failed',data:{error:errorMsg,errorName,isJwtError:errorName.includes('JsonWebToken') || errorName.includes('TokenExpired')},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})+'\n');
        } catch (logErr) {}
        // #endregion
        return reply.code(401).send({ error: "Unauthorized" });
      }
    }
  });

  await app.register(fastifySwagger, {
    openapi: {
      info: {
        title: "User Management System",
        version: "1.0.0"
      },
      servers: [{ url: "http://localhost:4000" }],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT"
          },
          apiKeyAuth: {
            type: "apiKey",
            in: "header",
            name: "X-API-Key",
            description: "API key for public API access. Obtain an API key from /user/api-keys endpoint."
          }
        }
      }
    }
  });

  await app.register(fastifySwaggerUi, {
    routePrefix: "/docs",
    uiConfig: {
      docExpansion: "full",
      deepLinking: false
    },
    staticCSP: true,
    transformSpecification: (spec) => {
      // Ensure the spec is served from the correct gateway path
      spec.servers = [{ url: "https://localhost:8443/users" }];
      return spec;
    }
  });

  await app.register(dbPlugin);

  await app.register(routes);
  app.get("/", async () => "Hello TypeScript + Fastify! 🟦");

  return app;
};
