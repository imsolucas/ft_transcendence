import type { FastifyRequest, FastifyReply } from "fastify";

export async function healthCheck(req: FastifyRequest, reply: FastifyReply) {
  return reply.send({ status: "ok" });
}
