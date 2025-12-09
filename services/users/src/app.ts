import Fastify  from "fastify";
import type { FastifyInstance } from "fastify";
import { FriendRequest, InternalServerError, MatchHistory, UnauthorizedApiKey, UnauthorizedError, UserProfile } from "./schemas/index.ts";
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

  // Register CORS plugin
  await app.register(import("@fastify/cors"), {
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      
      const allowedOrigins = [
        "http://localhost:4000",  // Local dev server
        "http://localhost:3000",  // Frontend dev server
        "http://127.0.0.1:3000",  // Alternative localhost
        "http://localhost:5173",  // Vite default port
        "http://127.0.0.1:5173",  // Alternative localhost Vite
      ];
      
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        // In development, allow any localhost origin
        if (origin.startsWith("http://localhost:") || origin.startsWith("http://127.0.0.1:")) {
          callback(null, true);
        } else {
          callback(new Error("Not allowed by CORS"), false);
        }
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "x-api-key"],
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
  app.addSchema(UnauthorizedApiKey);
  app.addSchema(InternalServerError);

  const JWT_SECRET = process.env.JWT_SECRET ?? "dev_secret";

  app.addHook("preHandler", async (req, reply) => {
    const path = req.routeOptions?.url;

    // JWT verification for /user and /game (except /auth)
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
        
        // Check if token is blacklisted
        const blacklistedTokens = await prisma.tokenBlacklist.findMany({
          where: {
            expiresAt: { gt: new Date() },
          },
        });

        let isBlacklisted = false;
        for (const blacklistedToken of blacklistedTokens) {
          const matches = await bcrypt.compare(token, blacklistedToken.tokenHash);
          if (matches) {
            isBlacklisted = true;
            break;
          }
        }

        if (isBlacklisted) {
          return reply.code(401).send({ error: "Token has been revoked" });
        }

        const payload = jwt.verify(token, JWT_SECRET);
        req.user = payload as any;
      } catch {
        return reply.code(401).send({ error: "Unauthorized" });
      }
    }

    // API key verification for routes that declare apiKeyAuth security
    if (
      req.routeOptions?.schema?.security &&
      req.routeOptions.schema.security.some((s: any) => s.apiKeyAuth)
    ) {
      const apiKey = req.headers["x-api-key"];
      if (!apiKey || apiKey !== process.env.INTERNAL_API_KEY) {
        return reply.code(401).send({ error: "Invalid or missing API key." });
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
            name: "x-api-key"
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
    }
  });

  await app.register(dbPlugin);

  await app.register(routes);
  app.get("/", async () => "Hello TypeScript + Fastify! 🟦");

  return app;
};
