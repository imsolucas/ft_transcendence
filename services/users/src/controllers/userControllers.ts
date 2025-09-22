import type { FastifyRequest, FastifyReply } from "fastify";

export const getUsers = (req: FastifyRequest, res: FastifyReply) => {
  return res.send([{ id: 1, name: "Alice" }, { id: 2, name: "Bob" }]);
};
