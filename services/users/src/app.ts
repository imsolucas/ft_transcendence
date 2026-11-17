import Fastify from "fastify";
import type { FastifyInstance } from "fastify";
import { InternalServerError } from "./schemas/index.ts";
import { config } from "./config.ts";
import dbPlugin from "./db/plugin.ts";
import routes from "./routes/routes.ts";
import fastifySwagger from "@fastify/swagger";
import fastifySwaggerUi from "@fastify/swagger-ui";

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: { level: process.env.LOG_LEVEL || "info" },
    // Exactly one proxy (Caddy) sits in front: req.ip is the address Caddy saw,
    // not a client-supplied X-Forwarded-For value.
    trustProxy: 1,
    bodyLimit: 1024 * 1024,
  });

  // Allow empty JSON bodies (e.g. POST /api/friends/requests/:id/accept)
  app.addContentTypeParser("application/json", { parseAs: "string" }, (_req, body, done) => {
    try {
      done(null, body === "" || body == null ? {} : JSON.parse(body as string));
    } catch (err) {
      done(err as Error, undefined);
    }
  });

  // No CORS: the browser only ever talks to one origin (Caddy routes paths to services).

  app.addSchema(InternalServerError);

  // Never leak internals: unexpected errors become a generic 500 (logged with detail).
  app.setErrorHandler((err: { statusCode?: number; message?: string }, req, reply) => {
    const status = err.statusCode && err.statusCode < 500 ? err.statusCode : 500;
    if (status >= 500) req.log.error({ err }, "unhandled error");
    reply.code(status).send({ error: status >= 500 ? "Something went wrong. Please try again." : err.message });
  });

  await app.register(fastifySwagger, {
    openapi: {
      info: { title: "ft_transcendence users API", version: "2.0.0" },
      servers: [{ url: config.publicOrigin }],
      components: {
        securitySchemes: {
          apiKeyAuth: { type: "apiKey", in: "header", name: "X-API-Key" },
        },
      },
    },
  });
  // Served by the service on its internal port only; Caddy does not route /docs.
  await app.register(fastifySwaggerUi, { routePrefix: "/docs", staticCSP: true });

  await app.register(dbPlugin);
  await app.register(routes);

  return app;
}
