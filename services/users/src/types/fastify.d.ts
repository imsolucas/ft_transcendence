import "fastify";
import type { PrismaClient } from "@prisma/client";

declare module "fastify" {
  interface FastifyInstance {
    db: PrismaClient;
  }

  interface FastifyRequest {
    // Set by the auth hook from a verified access token (never from the request body)
    user?: {
      id: number;
      username: string;
      jti: string;
      exp: number;
    };
    // Set by apiKeyAuth for /api/public/* routes
    apiUser?: { id: number; username: string; avatar: string; status: string };
    apiKeyId?: number;
  }
}
