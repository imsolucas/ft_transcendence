import type { FastifyInstance, FastifyReply } from "fastify";
import type { ChatMessage, Conversation } from "../../../../shared/types/api.types.ts";
import { isDeletedHandle } from "../privacy/routes.ts";
import { prisma } from "../../db/client.ts";
import { requireUser } from "../../auth/guards.ts";
import { notify } from "../../realtime/notify.ts";
import { moderateMessage } from "../../ai/moderation.ts";
import { PUBLIC_USER_SELECT, toPublicUser } from "../shared/presenters.ts";

const MAX_BODY = 1000;
const SENDS_PER_MINUTE = 20;
const sendTimes = new Map<number, number[]>();
const ROOM_CODE = /^[0-9a-f]{8}$/;

type Row = { id: number; senderId: number; recipientId: number; kind: string; body: string; inviteCode: string | null; createdAt: Date; readAt: Date | null; moderation?: string | null };
const toMessage = (m: Row): ChatMessage => ({
  id: m.id,
  from: m.senderId,
  to: m.recipientId,
  kind: m.kind === "invite" || m.kind === "result" || m.kind === "tournament" ? m.kind : "text",
  body: m.body,
  inviteCode: m.inviteCode,
  createdAt: m.createdAt.toISOString(),
  readAt: m.readAt?.toISOString() ?? null,
  ...(m.moderation === "removed" ? { removed: true, body: "" } : {}),
});

async function peer(username: string) {
  if (isDeletedHandle(username.toLowerCase())) return null;
  return prisma.user.findUnique({ where: { username: username.toLowerCase() }, select: PUBLIC_USER_SELECT });
}

/**
 * Game notifications in chat: the server posts a match result or a tournament win into the
 * two players' thread (skipped if either account is deleted or one blocked the other).
 */
export async function postGameNotice(fromId: number, toId: number, kind: "result" | "tournament", body: string) {
  if (fromId === toId) return;
  const users = await prisma.user.findMany({ where: { id: { in: [fromId, toId] } }, select: PUBLIC_USER_SELECT });
  const sender = users.find((u) => u.id === fromId);
  if (users.length !== 2 || !sender || users.some((u) => isDeletedHandle(u.username))) return;
  if (await blockedEitherWay(fromId, toId)) return;
  const row = await prisma.message.create({ data: { senderId: fromId, recipientId: toId, kind, body: body.slice(0, 200) } });
  notify([fromId, toId], { type: "chat:message", message: toMessage(row), from: toPublicUser(sender) });
}

async function blockedEitherWay(a: number, b: number) {
  return (
    (await prisma.block.count({
      where: {
        OR: [
          { blockerId: a, blockedId: b },
          { blockerId: b, blockedId: a },
        ],
      },
    })) > 0
  );
}

const notFound = (reply: FastifyReply) => reply.code(404).send({ error: "Player not found." });

export default async function chatRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireUser);

  // One row per conversation partner: latest message + unread count. Bounded to recent activity.
  app.get("/chat/conversations", async (req): Promise<Conversation[]> => {
    const me = req.user!.id;
    const recent = await prisma.message.findMany({
      where: { OR: [{ senderId: me }, { recipientId: me }] },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 500,
    });
    const latest = new Map<number, Row>();
    for (const m of recent) {
      const other = m.senderId === me ? m.recipientId : m.senderId;
      if (!latest.has(other)) latest.set(other, m);
    }
    const ids = [...latest.keys()];
    if (ids.length === 0) return [];
    const [users, unread] = await Promise.all([
      prisma.user.findMany({ where: { id: { in: ids } }, select: PUBLIC_USER_SELECT }),
      prisma.message.groupBy({
        by: ["senderId"],
        where: { recipientId: me, readAt: null, senderId: { in: ids } },
        _count: { _all: true },
      }),
    ]);
    const unreadBy = new Map(unread.map((u) => [u.senderId, u._count._all]));
    const byId = new Map(users.map((u) => [u.id, u]));
    return ids
      .filter((id) => byId.has(id))
      .map((id) => ({ user: toPublicUser(byId.get(id)!), lastMessage: toMessage(latest.get(id)!), unread: unreadBy.get(id) ?? 0 }));
  });

  app.get("/chat/unread", async (req) => {
    const count = await prisma.message.count({ where: { recipientId: req.user!.id, readAt: null } });
    return { count };
  });

  app.get(
    "/chat/:username/messages",
    {
      schema: {
        querystring: {
          type: "object",
          properties: {
            before: { type: "integer", minimum: 1 },
            limit: { type: "integer", minimum: 1, maximum: 50 },
          },
        },
      },
    },
    async (req, reply): Promise<ChatMessage[] | void> => {
      const me = req.user!.id;
      const other = await peer((req.params as { username: string }).username);
      if (!other) return notFound(reply);
      const { before, limit = 50 } = req.query as { before?: number; limit?: number };
      const rows = await prisma.message.findMany({
        where: {
          OR: [
            { senderId: me, recipientId: other.id },
            { senderId: other.id, recipientId: me },
          ],
          ...(before ? { id: { lt: before } } : {}),
        },
        orderBy: [{ id: "desc" }],
        take: limit,
      });
      return rows.reverse().map(toMessage);
    }
  );

  app.post(
    "/chat/:username/messages",
    {
      schema: {
        body: {
          type: "object",
          additionalProperties: false,
          properties: {
            body: { type: "string", maxLength: MAX_BODY },
            invite: { type: "string", pattern: "^[0-9a-fA-F]{8}$" },
          },
        },
      },
    },
    async (req, reply) => {
      const me = req.user!.id;
      const other = await peer((req.params as { username: string }).username);
      if (!other || other.id === me) return notFound(reply);
      // Same answer as an unknown player, so a block isn't revealed
      if (await blockedEitherWay(me, other.id)) return notFound(reply);

      // per-sender flood limit (also bounds moderation calls): 20 messages a minute
      const now = Date.now();
      const recent = (sendTimes.get(me) ?? []).filter((t) => now - t < 60_000);
      if (recent.length >= SENDS_PER_MINUTE) return reply.code(429).send({ error: "You're sending messages too fast.", code: "SLOW_DOWN" });
      recent.push(now);
      sendTimes.set(me, recent);
      // muted after repeated moderation removals
      const mute = await prisma.user.findUnique({ where: { id: me }, select: { chatMutedUntil: true } });
      if (mute?.chatMutedUntil && mute.chatMutedUntil > new Date()) {
        return reply.code(403).send({ error: "You can't send messages for a while.", code: "MUTED", until: mute.chatMutedUntil.toISOString() });
      }
      const { body, invite } = req.body as { body?: string; invite?: string };
      const text = (body ?? "").trim();
      if (!invite && !text) return reply.code(400).send({ error: "Write a message first." });
      if (invite && !ROOM_CODE.test(invite.toLowerCase())) return reply.code(400).send({ error: "Invalid room code." });

      const row = await prisma.message.create({
        data: {
          senderId: me,
          recipientId: other.id,
          kind: invite ? "invite" : "text",
          body: invite ? "" : text,
          inviteCode: invite ? invite.toLowerCase() : null,
        },
      });
      const message = toMessage(row);
      const sender = await prisma.user.findUnique({ where: { id: me }, select: PUBLIC_USER_SELECT });
      notify([other.id, me], { type: "chat:message", message, from: toPublicUser(sender!) });
      // AI moderation runs after delivery (never delays sending); no-op without an API key
      if (row.kind === "text") moderateMessage(row.id, me, other.id, row.body, req.log).catch(() => {});
      return reply.code(201).send(message);
    }
  );

  app.post("/chat/:username/read", async (req, reply) => {
    const me = req.user!.id;
    const other = await peer((req.params as { username: string }).username);
    if (!other) return notFound(reply);
    const last = await prisma.message.findFirst({
      where: { senderId: other.id, recipientId: me, readAt: null },
      orderBy: { id: "desc" },
      select: { id: true },
    });
    if (last) {
      await prisma.message.updateMany({ where: { senderId: other.id, recipientId: me, readAt: null, id: { lte: last.id } }, data: { readAt: new Date() } });
      notify([other.id], { type: "chat:read", by: me, upTo: last.id });
    }
    return reply.code(204).send();
  });
}
