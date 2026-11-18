import type { FastifyInstance, FastifyRequest } from "fastify";
import type { CoinsInfo, CoinsResult, ShopBuyBody } from "../../../../shared/types/api.types.ts";
import { nextDailyReset, utcDay } from "../../../../shared/daily/daily.ts";
import { questById, questsFor } from "../../../../shared/quests/quests.ts";
import { shopItems } from "../../../../shared/cosmetics/look.ts";
import { prisma } from "../../db/client.ts";
import { requireUser } from "../../auth/guards.ts";
import { createRateLimiter } from "../../middleware/rateLimiter.ts";
import { balanceOf, questsToday } from "./service.ts";

const writeLimiter = createRateLimiter({ max: 20, windowMs: 60_000, keyGenerator: (req: FastifyRequest) => `rate-limit:coins:${req.user?.id ?? req.ip}` });
const errorSchema = { type: "object", properties: { error: { type: "string" }, code: { type: "string" } } } as const;
const balanceSchema = { type: "object", required: ["balance"], properties: { balance: { type: "integer" } } } as const;

export default async function coinsRoutes(app: FastifyInstance) {
  // Balance and today's quests
  app.get("/me/coins", { preHandler: requireUser }, async (req): Promise<CoinsInfo> => {
    const userId = req.user!.id;
    const day = utcDay();
    const [balance, quests] = await Promise.all([balanceOf(userId), questsToday(userId, day)]);
    return { balance, day, resetsAt: nextDailyReset().toISOString(), quests };
  });

  // Collect a finished quest's coins (once; today's quests only)
  app.post(
    "/quests/:id/claim",
    {
      preHandler: [requireUser, writeLimiter],
      schema: {
        params: { type: "object", required: ["id"], properties: { id: { type: "string", maxLength: 32 } } },
        response: { 200: balanceSchema, 404: errorSchema, 409: errorSchema },
      },
    },
    async (req, reply): Promise<CoinsResult | void> => {
      const userId = req.user!.id;
      const { id } = req.params as { id: string };
      const day = utcDay();
      const quest = questById(id);
      if (!quest || !questsFor(day).some((q) => q.id === id)) return reply.code(404).send({ error: "That isn't one of today's quests." });
      const status = (await questsToday(userId, day)).find((q) => q.id === id);
      if (!status?.done) return reply.code(409).send({ error: "Finish the quest first.", code: "NOT_DONE" });
      try {
        await prisma.questClaim.create({ data: { userId, day, quest: id, reward: quest.reward } });
      } catch (err: any) {
        if (err?.code !== "P2002") throw err;
        return reply.code(409).send({ error: "Already collected.", code: "CLAIMED" });
      }
      return { balance: await balanceOf(userId) };
    }
  );

  // Buy a shop item with coins
  app.post(
    "/shop/buy",
    {
      preHandler: [requireUser, writeLimiter],
      schema: {
        body: { type: "object", additionalProperties: false, required: ["item"], properties: { item: { type: "string", maxLength: 48 } } },
        response: { 200: balanceSchema, 404: errorSchema, 409: errorSchema },
      },
    },
    async (req, reply): Promise<CoinsResult | void> => {
      const userId = req.user!.id;
      const { item } = req.body as ShopBuyBody;
      const offer = shopItems().find((s) => s.key === item);
      if (!offer) return reply.code(404).send({ error: "That isn't for sale." });
      // one purchase at a time per player: lock their row, then check the balance and buy
      const result = await prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT id FROM "Users" WHERE id = ${userId} FOR UPDATE`;
        const owned = await tx.purchase.findUnique({ where: { userId_item: { userId, item } }, select: { id: true } });
        if (owned) return { error: "OWNED" as const };
        const balance = await balanceOf(userId, tx);
        if (balance < offer.cost) return { error: "POOR" as const };
        await tx.purchase.create({ data: { userId, item, cost: offer.cost } });
        return { balance: balance - offer.cost };
      });
      if ("error" in result) {
        return result.error === "OWNED"
          ? reply.code(409).send({ error: "You already own that.", code: "OWNED" })
          : reply.code(409).send({ error: "Not enough coins.", code: "NOT_ENOUGH_COINS" });
      }
      return result;
    }
  );
}
