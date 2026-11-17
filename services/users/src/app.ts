import Fastify from "fastify";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { FriendRequest, InternalServerError, MatchHistory, UnauthorizedError, UserProfile } from "./schemas/index.ts";
import { config } from "./config.ts";
import dbPlugin from "./db/plugin.ts";
import routes from "./routes/routes.ts";
import fastifySwagger from "@fastify/swagger";
import fastifySwaggerUi from "@fastify/swagger-ui";
import {
  ACCESS_COOKIE,
  failsCsrfCheck,
  isAccessTokenRevoked,
  purgeExpiredBlacklist,
  readAccessToken,
  safeEqual,
  verifyAccessToken,
} from "./auth/tokens.ts";

/** Routes under these prefixes require a signed-in user. */
function requiresUser(path: string): boolean {
  return path.startsWith("/user");
}

/** Routes only the game service may call (never routed by nginx). */
function requiresInternalService(path: string): boolean {
  return path.startsWith("/game/");
}

async function authenticateUser(req: FastifyRequest, reply: FastifyReply) {
  const found = readAccessToken(req);
  if (!found) return reply.code(401).send({ error: "Unauthorized" });

  let claims = verifyAccessToken(found.token);
  let via = found.via;

  // A stale Bearer (legacy frontend) must not shadow a valid session cookie.
  const cookie = req.cookies?.[ACCESS_COOKIE];
  if (!claims && found.via === "bearer" && cookie) {
    claims = verifyAccessToken(cookie);
    via = "cookie";
  }
  if (!claims) return reply.code(401).send({ error: "Unauthorized" });

  // Cookies are sent automatically by browsers, so cookie-authenticated writes must
  // come from an allowed origin. Bearer tokens can't be attached cross-site.
  if (via === "cookie" && failsCsrfCheck(req)) {
    req.log.warn({ origin: req.headers.origin }, "[security] cookie-authenticated write from disallowed origin");
    return reply.code(403).send({ error: "Forbidden" });
  }

  if (await isAccessTokenRevoked(claims.jti)) {
    return reply.code(401).send({ error: "Token has been revoked" });
  }

  req.user = claims;
}

async function authenticateInternalService(req: FastifyRequest, reply: FastifyReply) {
  const auth = req.headers.authorization;
  const token = auth?.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!token || !safeEqual(token, config.internalServiceToken)) {
    req.log.warn("[security] internal route called without a valid service token");
    return reply.code(401).send({ error: "Unauthorized" });
  }
}

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: true,
    // Exactly one proxy (nginx) sits in front: req.ip is the address nginx saw,
    // not a client-supplied X-Forwarded-For value.
    trustProxy: 1,
    bodyLimit: 1024 * 1024,
  });

  // Allow empty JSON bodies (e.g. POST /auth/logout, /auth/refresh)
  app.addContentTypeParser("application/json", { parseAs: "string" }, (req, body, done) => {
    try {
      if (body === "" || body === null || body === undefined) {
        done(null, {});
      } else {
        done(null, JSON.parse(body as string));
      }
    } catch (err) {
      done(err as Error, undefined);
    }
  });

  await app.register(import("@fastify/cors"), {
    origin: (origin, cb) => {
      // Same-origin requests and non-browser clients send no Origin header
      if (!origin || config.allowedOrigins.includes(origin)) return cb(null, true);
      cb(null, false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "X-API-Key"],
  });

  await app.register(import("@fastify/cookie"), {
    secret: config.cookieSecret,
    hook: "onRequest",
  });

  app.addSchema(UserProfile);
  app.addSchema(FriendRequest);
  app.addSchema(MatchHistory);
  app.addSchema(UnauthorizedError);
  app.addSchema(InternalServerError);

  app.addHook("preHandler", async (req, reply) => {
    const path = req.routeOptions?.url;
    if (!path) return;
    if (requiresInternalService(path)) return authenticateInternalService(req, reply);
    if (requiresUser(path)) return authenticateUser(req, reply);
  });

  await app.register(fastifySwagger, {
    openapi: {
      info: {
        title: "User Management System",
        version: "1.0.0",
      },
      servers: [{ url: "http://localhost:4000" }],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT",
          },
          apiKeyAuth: {
            type: "apiKey",
            in: "header",
            name: "X-API-Key",
            description: "API key for public API access. Obtain an API key from /user/api-keys endpoint.",
          },
        },
      },
    },
  });

  // Swagger UI is served by the service but not routed through nginx.
  await app.register(fastifySwaggerUi, {
    routePrefix: "/docs",
    uiConfig: {
      docExpansion: "full",
      deepLinking: false,
    },
    staticCSP: true,
  });

  await app.register(dbPlugin);

  await app.register(routes);
  app.get("/", async () => "Hello TypeScript + Fastify! 🟦");

  // Blacklist housekeeping, off the request path
  const purge = setInterval(() => {
    purgeExpiredBlacklist().catch((err) => app.log.error({ err }, "blacklist purge failed"));
  }, 10 * 60 * 1000);
  purge.unref();
  app.addHook("onClose", async () => clearInterval(purge));

  return app;
}
