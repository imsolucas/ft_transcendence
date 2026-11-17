import type { FastifyInstance } from "fastify";
import { fromNodeHeaders } from "better-auth/node";
import { auth } from "../../auth/auth.ts";
import { requireUser } from "../../auth/guards.ts";
import { prisma } from "../../db/client.ts";

export interface SessionInfo {
  id: number;
  createdAt: string;
  expiresAt: string;
  ipAddress: string | null;
  userAgent: string | null;
  current: boolean;
}

/**
 * Active sessions for Settings → Security, by id (Better Auth's own list/revoke endpoints
 * work with raw session tokens, which we never expose to the browser).
 */
export default async function sessionRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireUser);

  app.get("/sessions", async (req): Promise<SessionInfo[]> => {
    const current = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
    const rows = await prisma.session.findMany({
      where: { userId: req.user!.id, expiresAt: { gt: new Date() } },
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      take: 50,
      select: { id: true, createdAt: true, expiresAt: true, ipAddress: true, userAgent: true },
    });
    return rows.map((s) => ({
      id: s.id,
      createdAt: s.createdAt.toISOString(),
      expiresAt: s.expiresAt.toISOString(),
      ipAddress: s.ipAddress,
      userAgent: s.userAgent,
      current: Number(current?.session.id) === s.id,
    }));
  });

  app.delete("/sessions/:id", async (req, reply) => {
    const id = Number((req.params as { id: string }).id);
    const deleted = await prisma.session.deleteMany({ where: { id, userId: req.user!.id } });
    if (deleted.count !== 1) return reply.code(404).send({ error: "Session not found." });
    return reply.code(204).send();
  });

  // "Log out everywhere else"
  app.delete("/sessions", async (req, reply) => {
    const current = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
    await prisma.session.deleteMany({
      where: { userId: req.user!.id, NOT: { id: Number(current?.session.id) || 0 } },
    });
    return reply.code(204).send();
  });
}
