import type { FastifyRequest, FastifyReply } from "fastify";
import { healthWithDb } from "../modules/status/routes.ts";

export async function healthCheck(_req: FastifyRequest, reply: FastifyReply) {
  return (await healthWithDb()) ? reply.send({ status: "ok" }) : reply.code(503).send({ status: "database unreachable" });
}
