import type { FastifyInstance, FastifyReply } from "fastify";
import type { FriendRequest, PublicUser } from "../../../../shared/types/api.types.ts";
import { prisma } from "../../db/client.ts";
import { requireUser } from "../../auth/guards.ts";
import { ID_PARAMS } from "../shared/presenters.ts";
import { PUBLIC_USER_SELECT, toPublicUser } from "../shared/presenters.ts";
import { notify } from "../../realtime/notify.ts";

const usernameBody = {
  type: "object",
  required: ["username"],
  additionalProperties: false,
  properties: { username: { type: "string", minLength: 1, maxLength: 30 } },
} as const;

async function findUser(username: string) {
  return prisma.user.findUnique({ where: { username: username.trim().toLowerCase() }, select: { id: true } });
}

function notFound(reply: FastifyReply, what = "Player not found.") {
  return reply.code(404).send({ error: what });
}

export default async function friendsRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireUser);

  app.get("/friends", async (req): Promise<PublicUser[]> => {
    const me = req.user!.id;
    const rows = await prisma.friendship.findMany({
      where: { status: "ACCEPTED", OR: [{ requesterId: me }, { addresseeId: me }] },
      select: {
        requesterId: true,
        requester: { select: PUBLIC_USER_SELECT },
        addressee: { select: PUBLIC_USER_SELECT },
      },
      take: 500,
    });
    const friends = rows.map((f) => toPublicUser(f.requesterId === me ? f.addressee : f.requester));
    // online first, then in game, then offline; alphabetical within
    const rank = { ONLINE: 0, INGAME: 1, OFFLINE: 2 } as const;
    return friends.sort((a, b) => rank[a.presence] - rank[b.presence] || a.username.localeCompare(b.username));
  });

  app.get("/friends/requests", async (req): Promise<FriendRequest[]> => {
    const me = req.user!.id;
    const rows = await prisma.friendship.findMany({
      where: { status: "PENDING", OR: [{ requesterId: me }, { addresseeId: me }] },
      orderBy: [{ created_at: "desc" }, { id: "desc" }],
      take: 200,
      select: {
        id: true,
        requesterId: true,
        created_at: true,
        requester: { select: PUBLIC_USER_SELECT },
        addressee: { select: PUBLIC_USER_SELECT },
      },
    });
    return rows.map((r) => ({
      id: r.id,
      direction: r.requesterId === me ? "sent" : "received",
      user: toPublicUser(r.requesterId === me ? r.addressee : r.requester),
      createdAt: r.created_at.toISOString(),
    }));
  });

  app.post("/friends/requests", { schema: { body: usernameBody } }, async (req, reply) => {
    const me = req.user!.id;
    const target = await findUser((req.body as { username: string }).username);
    if (!target) return notFound(reply);
    if (target.id === me) return reply.code(400).send({ error: "You can't add yourself." });
    type Outcome = { status: number; body: unknown };
    // Check + create in one serializable transaction so A→B and B→A (or a request racing a
    // block) can't both succeed. A serialization failure (P2034) means "try again".
    const run = () =>
      prisma.$transaction(
        async (tx): Promise<Outcome> => {
          const blocked = await tx.block.count({
            where: {
              OR: [
                { blockerId: me, blockedId: target.id },
                { blockerId: target.id, blockedId: me },
              ],
            },
          });
          // Same answer as "not found" so a block isn't revealed
          if (blocked > 0) return { status: 404, body: { error: "Player not found." } };

          const existing = await tx.friendship.findFirst({
            where: {
              OR: [
                { requesterId: me, addresseeId: target.id },
                { requesterId: target.id, addresseeId: me },
              ],
            },
          });
          if (existing?.status === "ACCEPTED") return { status: 409, body: { error: "You're already friends." } };
          if (existing?.status === "PENDING") {
            return existing.requesterId === me
              ? { status: 409, body: { error: "Request already sent." } }
              : { status: 409, body: { error: "They already sent you a request. Accept it instead." } };
          }
          if (existing) await tx.friendship.delete({ where: { id: existing.id } }); // stale REJECTED row

          const created = await tx.friendship.create({
            data: { requesterId: me, addresseeId: target.id, status: "PENDING" },
            select: { id: true, created_at: true, addressee: { select: PUBLIC_USER_SELECT } },
          });
          const body: FriendRequest = {
            id: created.id,
            direction: "sent",
            user: toPublicUser(created.addressee),
            createdAt: created.created_at.toISOString(),
          };
          return { status: 201, body };
        },
        { isolationLevel: "Serializable" }
      );

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const outcome = await run();
        if (outcome.status === 201) {
          const from = await prisma.user.findUnique({ where: { id: me }, select: PUBLIC_USER_SELECT });
          if (from) notify([target.id], { type: "friend:request", from: toPublicUser(from) });
        }
        return reply.code(outcome.status).send(outcome.body);
      } catch (err: any) {
        if (err?.code === "P2002") return reply.code(409).send({ error: "Request already sent." });
        if (err?.code !== "P2034") throw err;
      }
    }
    return reply.code(409).send({ error: "Please try again." });
  });

  app.post("/friends/requests/:id/accept", { schema: { params: ID_PARAMS } }, async (req, reply) => {
    const me = req.user!.id;
    const id = Number((req.params as { id: string }).id);
    // Conditional update: only the addressee of a still-pending request can accept it
    const updated = await prisma.friendship.updateMany({
      where: { id, addresseeId: me, status: "PENDING" },
      data: { status: "ACCEPTED" },
    });
    if (updated.count !== 1) return notFound(reply, "Request not found.");
    const row = await prisma.friendship.findUnique({
      where: { id },
      select: { requester: { select: PUBLIC_USER_SELECT }, addressee: { select: PUBLIC_USER_SELECT } },
    });
    notify([row!.requester.id], { type: "friend:accepted", by: toPublicUser(row!.addressee) });
    return toPublicUser(row!.requester);
  });

  app.post("/friends/requests/:id/decline", { schema: { params: ID_PARAMS } }, async (req, reply) => {
    const id = Number((req.params as { id: string }).id);
    const deleted = await prisma.friendship.deleteMany({ where: { id, addresseeId: req.user!.id, status: "PENDING" } });
    if (deleted.count !== 1) return notFound(reply, "Request not found.");
    return reply.code(204).send();
  });

  app.delete("/friends/requests/:id", { schema: { params: ID_PARAMS } }, async (req, reply) => {
    const id = Number((req.params as { id: string }).id);
    const deleted = await prisma.friendship.deleteMany({ where: { id, requesterId: req.user!.id, status: "PENDING" } });
    if (deleted.count !== 1) return notFound(reply, "Request not found.");
    return reply.code(204).send();
  });

  app.delete("/friends/:username", async (req, reply) => {
    const me = req.user!.id;
    const target = await findUser((req.params as { username: string }).username);
    if (!target) return notFound(reply);
    const deleted = await prisma.friendship.deleteMany({
      where: {
        status: "ACCEPTED",
        OR: [
          { requesterId: me, addresseeId: target.id },
          { requesterId: target.id, addresseeId: me },
        ],
      },
    });
    if (deleted.count === 0) return notFound(reply, "You're not friends.");
    return reply.code(204).send();
  });

  // ---- blocks
  app.get("/blocks", async (req): Promise<PublicUser[]> => {
    const rows = await prisma.block.findMany({
      where: { blockerId: req.user!.id },
      orderBy: { createdAt: "desc" },
      take: 500,
      select: { blocked: { select: PUBLIC_USER_SELECT } },
    });
    return rows.map((r) => toPublicUser(r.blocked));
  });

  app.post("/blocks", { schema: { body: usernameBody } }, async (req, reply) => {
    const me = req.user!.id;
    const target = await findUser((req.body as { username: string }).username);
    if (!target) return notFound(reply);
    if (target.id === me) return reply.code(400).send({ error: "You can't block yourself." });
    await prisma.$transaction(
      [
      prisma.friendship.deleteMany({
        where: {
          OR: [
            { requesterId: me, addresseeId: target.id },
            { requesterId: target.id, addresseeId: me },
          ],
        },
      }),
      prisma.block.upsert({
        where: { blockerId_blockedId: { blockerId: me, blockedId: target.id } },
        create: { blockerId: me, blockedId: target.id },
        update: {},
      }),
      ],
      { isolationLevel: "Serializable" }
    );
    return reply.code(204).send();
  });

  app.delete("/blocks/:username", async (req, reply) => {
    const target = await findUser((req.params as { username: string }).username);
    if (!target) return notFound(reply);
    await prisma.block.deleteMany({ where: { blockerId: req.user!.id, blockedId: target.id } });
    return reply.code(204).send();
  });
}
