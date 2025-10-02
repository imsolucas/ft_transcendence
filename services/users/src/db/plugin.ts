import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import { PrismaClient } from "@prisma/client";

async function dbPlugin(fastify: FastifyInstance) {
  const prisma = new PrismaClient();

  fastify.decorate("db", prisma);

  fastify.addHook("onClose", async (instance) => {
    try {
      await instance.db.$disconnect();
      fastify.log.info("Prisma client disconnected");
    } catch (err) {
      fastify.log.error(err);
    }
  });
}

export default fp(dbPlugin);
