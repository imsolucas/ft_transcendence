import type { FastifyRequest, FastifyReply } from "fastify";
import type { Prisma } from "@prisma/client";

export const getUsers = (req: FastifyRequest, res: FastifyReply) => {
  return res.send([{ id: 1, name: "Alice" }, { id: 2, name: "Bob" }]);
};
