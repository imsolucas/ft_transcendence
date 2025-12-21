import type { FastifyRequest, FastifyReply } from "fastify";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

/**
 * API Key Authentication Middleware
 * Verifies X-API-Key header and attaches user info to req.apiUser
 */
export async function apiKeyAuth(
  req: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const apiKey = req.headers["x-api-key"] as string | undefined;

  if (!apiKey) {
    return reply.code(401).send({
      error: "API key required",
      message: "Please provide an API key in the X-API-Key header"
    });
  }

  try {
    // Find all active API keys
    const apiKeys = await prisma.apiKey.findMany({
      where: {
        isActive: true,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            avatar: true,
            status: true,
          },
        },
      },
    });

    // Check if any API key matches
    let matchedKey = null;
    for (const keyRecord of apiKeys) {
      try {
        const matches = await bcrypt.compare(apiKey, keyRecord.keyHash);
        if (matches) {
          matchedKey = keyRecord;
          break;
        }
      } catch (compareError) {
        // Continue to next key if comparison fails
        continue;
      }
    }

    if (!matchedKey) {
      return reply.code(401).send({
        error: "Invalid API key",
        message: "The provided API key is invalid or has been revoked"
      });
    }

    // Update last used timestamp
    await prisma.apiKey.update({
      where: { id: matchedKey.id },
      data: { lastUsedAt: new Date() },
    }).catch(() => {
      // Ignore errors updating lastUsedAt - not critical
    });

    // Attach user info to request for use in controllers
    (req as any).apiUser = matchedKey.user;
    (req as any).apiKeyId = matchedKey.id;

    // Continue to next handler
  } catch (error: any) {
    req.log?.error("API key authentication error:", error);
    return reply.code(500).send({
      error: "Authentication error",
      message: "An error occurred while verifying the API key"
    });
  }
}

