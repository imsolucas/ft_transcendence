import { PrismaClient } from "@prisma/client";
import type { FastifyRequest, FastifyReply } from "fastify";

export const getFriendships = async (
  req: FastifyRequest<{ Params: { id: string } }>,
  res: FastifyReply
) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) return res.code(400).send({ error: "Invalid id" });

  const user = await req.server.db.user.findUnique({ where: {id} });
  if (!user) return res.code(404).send({ error: "User not found" });

  const friendships = await req.server.db.friendship.findMany({
    where: {
      OR: [
        { requesterId: id },
        { addresseeId: id }
      ]
    },
    include: {
      requester: true,
      addressee: true
    }
  });

  return res.send(friendships);
};
