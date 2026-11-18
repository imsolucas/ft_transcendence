import type { FastifyInstance } from "fastify";
import { fromNodeHeaders } from "better-auth/node";
import { auth } from "./auth.ts";
import { config } from "../config.ts";

/**
 * Mounts Better Auth at /api/auth/* (Fastify integration pattern from
 * https://www.better-auth.com/docs/integrations/fastify). Better Auth does its own
 * origin/CSRF checks, rate limiting and cookie handling for these routes.
 */
/**
 * Better Auth echoes the session token in JSON bodies (sign-in, get-session, list-sessions).
 * The browser only needs the httpOnly cookie, and a token in a JSON body is readable by any
 * script on the page, so drop every `token` field. Session management goes through our own
 * /api/sessions routes, which use session ids.
 */
function stripSessionTokens(json: string): string {
  try {
    return JSON.stringify(JSON.parse(json), (key, value) => (key === "token" ? undefined : value));
  } catch {
    return json;
  }
}

export default async function authRoutes(app: FastifyInstance) {
  app.route({
    method: ["GET", "POST"],
    url: "/api/auth/*",
    async handler(request, reply) {
      // Better Auth only checks Origin when cookies are present; also refuse cross-site
      // POSTs without cookies (login CSRF: signing a victim into an attacker's account).
      if (request.method === "POST" && request.headers.origin !== config.publicOrigin) {
        request.log.warn({ origin: request.headers.origin }, "[security] auth POST from disallowed origin");
        return reply.code(403).send({ error: "Forbidden" });
      }
      const url = new URL(request.url, `https://${request.headers.host ?? "localhost"}`);
      const headers = fromNodeHeaders(request.headers);
      const body =
        request.method !== "GET" && request.body !== undefined ? JSON.stringify(request.body) : undefined;
      const response = await auth.handler(new Request(url, { method: request.method, headers, body }));

      reply.status(response.status);
      // Copy headers; Set-Cookie can repeat, so forward every value
      response.headers.forEach((value, key) => {
        if (key.toLowerCase() !== "set-cookie") reply.header(key, value);
      });
      const cookies = response.headers.getSetCookie?.() ?? [];
      if (cookies.length) reply.header("set-cookie", cookies);
      const text = await response.text();
      if (text && (response.headers.get("content-type") ?? "").includes("application/json")) {
        reply.removeHeader("content-length");
        return reply.send(stripSessionTokens(text));
      }
      return reply.send(text || null);
    },
  });
}
