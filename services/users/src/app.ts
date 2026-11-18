import Fastify from "fastify";
import type { FastifyInstance } from "fastify";
import { InternalServerError } from "./schemas/index.ts";
import { config } from "./config.ts";
import dbPlugin from "./db/plugin.ts";
import routes from "./routes/routes.ts";
import fastifySwagger from "@fastify/swagger";
import { setLogger } from "./log.ts";
import fastifySwaggerUi from "@fastify/swagger-ui";
import { registerHttpMetrics } from "./metrics.ts";

/** Strips one-time tokens from a URL before it is logged. */
export function redactTokens(url: string): string {
  return url
    .replace(/(\/reset-password\/)[^/?#]+/, "$1[redacted]")
    .replace(/([?&](?:token|code)=)[^&#]*/g, "$1[redacted]");
}

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL || "info",
      serializers: {
        // never log one-time tokens: the reset link carries one in the path, email
        // verification in the query (anyone reading logs could otherwise redeem them)
        req: (req) => ({
          method: req.method,
          url: redactTokens(req.url),
          host: req.host,
          remoteAddress: req.ip,
        }),
      },
    },
    // Exactly one proxy (Caddy) sits in front: req.ip is the address Caddy saw,
    // not a client-supplied X-Forwarded-For value.
    trustProxy: 1,
    bodyLimit: 1024 * 1024,
  });
  setLogger(app.log);

  // Allow empty JSON bodies (e.g. POST /api/friends/requests/:id/accept)
  app.addContentTypeParser("application/json", { parseAs: "string" }, (_req, body, done) => {
    try {
      done(null, body === "" || body == null ? {} : JSON.parse(body as string));
    } catch {
      // a malformed body is the client's mistake: 400, not a logged 500
      done(Object.assign(new Error("Invalid JSON body."), { statusCode: 400 }), undefined);
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

  // Prometheus: request counter/histogram for every route below, and GET /metrics
  registerHttpMetrics(app);

  await app.register(fastifySwagger, {
    openapi: {
      info: {
        title: "ft_transcendence public API",
        version: "2.0.0",
        description: "Authenticate with an API key from Settings > API keys, sent as the X-API-Key header. Limit: 120 requests per minute per key (429 when exceeded). Write endpoints act as the key's owner.",
      },
      servers: [{ url: config.publicOrigin }],
      components: {
        securitySchemes: {
          apiKeyAuth: { type: "apiKey", in: "header", name: "X-API-Key" },
        },
      },
    },
    transform: ({ schema, url }) => ({
      schema: url.startsWith("/api/public/") ? schema : { ...(schema ?? {}), hide: true },
      url,
    }),
  });
  // Public API documentation (only /api/public/* is documented; everything else is hidden).
  await app.register(fastifySwaggerUi, {
    routePrefix: "/api/public/docs",
    staticCSP: true,
    // Swagger UI sets a few inline styles itself; scripts stay restricted to 'self'
    transformStaticCSP: (header) => header.replace("style-src 'self' https:", "style-src 'self' https: 'unsafe-inline'"),
  });

  await app.register(dbPlugin);
  await app.register(routes);

  return app;
}
