import type { FastifyInstance } from "fastify";
import crypto from "node:crypto";
import type { ApiKeySummary, CreatedApiKey } from "../../../../shared/types/api.types.ts";
import { prisma } from "../../db/client.ts";
import { requireUser } from "../../auth/guards.ts";
import { sha256 } from "../../auth/crypto.ts";

const MAX_KEYS_PER_USER = 10;

type Row = { id: number; name: string; prefix: string; createdAt: Date; lastUsedAt: Date | null };
const toSummary = (k: Row): ApiKeySummary => ({
  id: k.id,
  name: k.name,
  prefix: `ft_${k.prefix}`,
  createdAt: k.createdAt.toISOString(),
  lastUsedAt: k.lastUsedAt?.toISOString() ?? null,
});

export default async function apiKeyRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireUser);

  app.get("/api-keys", async (req): Promise<ApiKeySummary[]> => {
    const rows = await prisma.apiKey.findMany({
      where: { userId: req.user!.id, isActive: true },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      select: { id: true, name: true, prefix: true, createdAt: true, lastUsedAt: true },
      take: MAX_KEYS_PER_USER,
    });
    return rows.map(toSummary);
  });

  app.post(
    "/api-keys",
    {
      schema: {
        body: {
          type: "object",
          required: ["name"],
          additionalProperties: false,
          properties: { name: { type: "string", minLength: 1, maxLength: 50 } },
        },
      },
    },
    async (req, reply) => {
      const userId = req.user!.id;
      const count = await prisma.apiKey.count({ where: { userId, isActive: true } });
      if (count >= MAX_KEYS_PER_USER) {
        return reply.code(409).send({ error: `You can have at most ${MAX_KEYS_PER_USER} keys. Revoke one first.` });
      }
      // ft_<prefix>_<secret>: prefix is the indexed lookup key; only SHA-256 of the full key is stored
      const prefix = crypto.randomBytes(6).toString("hex");
      const key = `ft_${prefix}_${crypto.randomBytes(32).toString("base64url")}`;
      const row = await prisma.apiKey.create({
        data: { userId, prefix, keyHash: sha256(key), name: (req.body as { name: string }).name.trim() },
        select: { id: true, name: true, prefix: true, createdAt: true, lastUsedAt: true },
      });
      const body: CreatedApiKey = { ...toSummary(row), key };
      return reply.code(201).send(body);
    }
  );

  app.delete("/api-keys/:id", async (req, reply) => {
    const id = Number((req.params as { id: string }).id);
    const deleted = await prisma.apiKey.deleteMany({ where: { id, userId: req.user!.id } });
    if (deleted.count !== 1) return reply.code(404).send({ error: "Key not found." });
    return reply.code(204).send();
  });
}
