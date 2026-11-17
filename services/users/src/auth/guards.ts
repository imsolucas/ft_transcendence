import type { FastifyReply, FastifyRequest } from "fastify";
import { fromNodeHeaders } from "better-auth/node";
import { auth } from "./auth.ts";
import { config } from "../config.ts";
import { safeEqual } from "./crypto.ts";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * Session guard for our own /api routes (Better Auth guards its own /api/auth/*).
 * The session cookie is sent automatically by browsers, so state-changing requests must
 * also come from our origin (CSRF): Origin must equal PUBLIC_ORIGIN.
 */
export async function requireUser(req: FastifyRequest, reply: FastifyReply) {
  if (!SAFE_METHODS.has(req.method) && req.headers.origin !== config.publicOrigin) {
    req.log.warn({ origin: req.headers.origin }, "[security] write from disallowed origin");
    return reply.code(403).send({ error: "Forbidden" });
  }

  const session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
  if (!session) return reply.code(401).send({ error: "Unauthorized" });

  req.user = { id: Number(session.user.id), username: String(session.user.username ?? "") };
}

/** Routes only the game service may call. Never routed by Caddy. */
export async function requireInternalService(req: FastifyRequest, reply: FastifyReply) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token || !safeEqual(token, config.internalServiceToken)) {
    req.log.warn("[security] internal route called without a valid service token");
    return reply.code(401).send({ error: "Unauthorized" });
  }
}
