import "fastify";
import type { PrismaClient } from "@prisma/client";

declare module "fastify" {
  interface FastifyInstance {
    db: PrismaClient;
  }

  interface FastifyRequest {
    // Set by requireUser from the Better Auth session (never from the request body)
    user?: { id: number; username: string };
    // Set by apiKeyAuth for /api/public/* routes
    apiUser?: { id: number; username: string; avatar: string | null; status: string };
    apiKeyId?: number;
  }
}
