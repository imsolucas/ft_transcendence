import Fastify  from "fastify";
import type { FastifyInstance } from "fastify";
import { FriendRequest, InternalServerError, MatchHistory, UnauthorizedError, UserProfile } from "./schemas/index.ts";
import jwt from "jsonwebtoken";
import dbPlugin from "./db/plugin.ts";
import routes from "./routes/routes.ts";
import fastifySwagger from "@fastify/swagger";
import fastifySwaggerUi from "@fastify/swagger-ui";

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: true });

  // Register CORS plugin
  await app.register(import("@fastify/cors"), {
    origin: [
      "https://localhost:8443",
      "http://localhost:4000",  // Local dev server
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
        const payload = jwt.verify(token, JWT_SECRET);
        req.user = payload as any;
      } catch {
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
