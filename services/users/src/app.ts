import Fastify from "fastify";
import type { FastifyInstance } from "fastify";
import { InternalServerError } from "./schemas/index.ts";
import dbPlugin from "./db/plugin.ts";
import routes from "./routes/routes.ts";
import { setLogger } from "./log.ts";

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

  await app.register(dbPlugin);
  await app.register(routes);

  return app;
}
