import type { FastifyInstance } from "fastify";
import { healthWithDb } from "../status/routes.ts";

const statusBody = { type: "object", properties: { status: { type: "string" } } } as const;

export default async function healthRoutes(app: FastifyInstance) {
  app.get(
    "/health",
    {
      schema: {
        summary: "Health check",
        description: "Returns the health status of the service.",
        response: {
          200: { description: "Service is healthy.", ...statusBody },
          503: { description: "Database unreachable.", ...statusBody },
        },
      },
    },
    async (_req, reply) => ((await healthWithDb()) ? reply.send({ status: "ok" }) : reply.code(503).send({ status: "database unreachable" })),
  );
}
