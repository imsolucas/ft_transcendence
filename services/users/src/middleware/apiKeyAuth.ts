import type { FastifyRequest, FastifyReply } from "fastify";
import { prisma } from "../db/client.ts";
import { safeEqual, sha256 } from "../auth/crypto.ts";

// Keys look like ft_<12 hex prefix>_<43 base64url secret>
const API_KEY_PATTERN = /^ft_([0-9a-f]{12})_([A-Za-z0-9_-]{43})$/;

// lastUsedAt is informational; don't write it on every request
const LAST_USED_WRITE_INTERVAL_MS = 60 * 1000;

/**
 * API Key Authentication Middleware
 * Verifies X-API-Key header and attaches user info to req.apiUser.
 * Lookup is by the indexed prefix; the full key is compared as SHA-256 in constant time.
 */
export async function apiKeyAuth(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  const apiKey = req.headers["x-api-key"];

  if (typeof apiKey !== "string" || apiKey.length === 0) {
    return reply.code(401).send({
      error: "API key required",
      message: "Please provide an API key in the X-API-Key header",
    });
  }

  const invalid = () =>
    reply.code(401).send({
      error: "Invalid API key",
      message: "The provided API key is invalid or has been revoked",
    });

  const match = API_KEY_PATTERN.exec(apiKey);
  if (!match) return invalid();

  try {
    const keyRecord = await prisma.apiKey.findUnique({
      where: { prefix: match[1] },
      select: {
        id: true,
        keyHash: true,
        isActive: true,
        lastUsedAt: true,
        user: { select: { id: true, username: true, avatar: true, status: true } },
      },
    });

    if (!keyRecord || !keyRecord.isActive || !safeEqual(sha256(apiKey), keyRecord.keyHash)) {
      return invalid();
    }

    const now = Date.now();
    if (!keyRecord.lastUsedAt || now - keyRecord.lastUsedAt.getTime() > LAST_USED_WRITE_INTERVAL_MS) {
      prisma.apiKey
        .update({ where: { id: keyRecord.id }, data: { lastUsedAt: new Date(now) } })
        .catch((err) => req.log.warn({ err }, "failed to update API key lastUsedAt"));
    }

    req.apiUser = keyRecord.user;
    req.apiKeyId = keyRecord.id;
  } catch (err) {
    req.log.error({ err }, "API key authentication error");
    return reply.code(500).send({
      error: "Authentication error",
      message: "An error occurred while verifying the API key",
    });
  }
}
