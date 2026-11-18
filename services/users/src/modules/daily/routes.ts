import crypto from "node:crypto";
import type { FastifyInstance, FastifyRequest } from "fastify";
import { fromNodeHeaders } from "better-auth/node";
import type { DailyBoardRow, DailyFinish, DailyFinishBody, DailyInfo, DailyStart, PublicUser } from "../../../../shared/types/api.types.ts";
import {
  DAILY_ATTEMPTS,
  DAILY_INITIALS,
  DAILY_MAX_LOG,
  DAILY_MAX_TICKS,
  DAILY_MIN_TICKS,
  DAILY_TICKS_PER_S,
  dailyChallenge,
  nextDailyReset,
  replayDaily,
  utcDay,
} from "../../../../shared/daily/daily.ts";
import { prisma } from "../../db/client.ts";
import { auth } from "../../auth/auth.ts";
import { requireUser } from "../../auth/guards.ts";
import { createRateLimiter } from "../../middleware/rateLimiter.ts";
import { filterChat } from "../../moderation/filter.ts";
import { PUBLIC_USER_SELECT, toPublicUser } from "../shared/presenters.ts";
import { syncAchievementsLater } from "../gamification/routes.ts";
import { bestToday, dailyBoard, dailyStreaks, dailyXpFor, defaultInitials } from "./service.ts";

const BOARD_SIZE = 20;
/** a started try must be finished within this time (an 8-minute run plus pauses) */
const RUN_TTL_MS = 30 * 60_000;
/** wall time can't be shorter than the simulated time (minus this slack for clocks/latency) */
const FAST_SLACK_MS = 3_000;

const perUser = (name: string, max: number) =>
  createRateLimiter({ max, windowMs: 60_000, keyGenerator: (req: FastifyRequest) => `rate-limit:daily-${name}:${req.user?.id ?? req.ip}` });
const startLimiter = perUser("start", 10);
const finishLimiter = perUser("finish", 10);

const errorSchema = { type: "object", properties: { error: { type: "string" } } } as const;

export default async function dailyRoutes(app: FastifyInstance) {
  // Today's challenge and board; guests get it too (no `me`)
  app.get("/daily", async (req): Promise<DailyInfo> => {
    const session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) }).catch(() => null);
    const meId = session ? Number(session.user.id) : null;
    const day = utcDay();
    const entries = await dailyBoard(day, BOARD_SIZE, meId);
    const users = await prisma.user.findMany({
      where: { id: { in: entries.map((e) => e.userId) } },
      select: { ...PUBLIC_USER_SELECT, dailyInitials: true },
    });
    const byId = new Map(users.map((u) => [u.id, u]));
    const board: DailyBoardRow[] = entries.flatMap((e) => {
      const u = byId.get(e.userId);
      if (!u) return [];
      return [{ rank: e.rank, initials: u.dailyInitials ?? defaultInitials(u.username), user: toPublicUser(u) as PublicUser, score: e.score }];
    });
    let me: DailyInfo["me"] = null;
    if (meId !== null) {
      const [used, best, streaks, user] = await Promise.all([
        prisma.dailyRun.count({ where: { userId: meId, day } }),
        bestToday(meId, day),
        dailyStreaks(meId, day),
        prisma.user.findUnique({ where: { id: meId }, select: { dailyInitials: true } }),
      ]);
      me = {
        attemptsUsed: used,
        attemptsLeft: Math.max(0, DAILY_ATTEMPTS - used),
        best,
        rank: entries.find((e) => e.userId === meId)?.rank ?? null,
        streak: streaks.current,
        initials: user?.dailyInitials ?? null,
      };
    }
    return { day, challenge: dailyChallenge(day), resetsAt: nextDailyReset().toISOString(), attempts: DAILY_ATTEMPTS, board, me };
  });

  // Insert the coin: uses up one of today's tries and hands out its seed
  app.post(
    "/daily/start",
    {
      preHandler: [requireUser, startLimiter],
      schema: {
        response: {
          200: {
            type: "object",
            required: ["runId", "seed", "attempt", "attemptsLeft", "challenge"],
            properties: {
              runId: { type: "integer" },
              seed: { type: "integer" },
              attempt: { type: "integer" },
              attemptsLeft: { type: "integer" },
              challenge: {
                type: "object",
                properties: {
                  day: { type: "string" },
                  twist: { type: "string" },
                  ballSpeed: { type: "number" },
                  paddleSpeed: { type: "number" },
                  powerUps: { type: "boolean" },
                  ai: { type: "string" },
                  rally: { type: "boolean" },
                },
              },
            },
          },
          409: errorSchema,
        },
      },
    },
    async (req, reply): Promise<DailyStart | void> => {
      const userId = req.user!.id;
      const day = utcDay();
      const used = await prisma.dailyRun.count({ where: { userId, day } });
      if (used >= DAILY_ATTEMPTS) return reply.code(409).send({ error: "No tries left today." });
      try {
        const run = await prisma.dailyRun.create({
          data: { userId, day, attempt: used + 1, seed: crypto.randomInt(1, 2 ** 31 - 1) },
          select: { id: true, seed: true, attempt: true },
        });
        return { runId: run.id, seed: run.seed, attempt: run.attempt, attemptsLeft: DAILY_ATTEMPTS - run.attempt, challenge: dailyChallenge(day) };
      } catch (err: any) {
        // two starts at once took the same attempt number: the other one won
        if (err?.code === "P2002") return reply.code(409).send({ error: "A try is already starting. Try again." });
        throw err;
      }
    }
  );

  // Game over (or quit): replay the inputs, record what they score
  app.post(
    "/daily/runs/:id/finish",
    {
      preHandler: [requireUser, finishLimiter],
      schema: {
        params: { type: "object", required: ["id"], properties: { id: { type: "integer", minimum: 1 } } },
        body: {
          type: "object",
          additionalProperties: false,
          required: ["log"],
          properties: {
            log: { type: "array", maxItems: DAILY_MAX_LOG, items: { type: "integer", minimum: 0, maximum: DAILY_MAX_TICKS } },
            initials: { type: "string", pattern: DAILY_INITIALS.source },
          },
        },
        response: {
          200: {
            type: "object",
            required: ["score", "best", "newBest", "rank", "streak", "attemptsLeft", "xpGained"],
            properties: {
              score: { type: "integer" },
              best: { type: "integer" },
              newBest: { type: "boolean" },
              rank: { type: ["integer", "null"] },
              streak: { type: "integer" },
              attemptsLeft: { type: "integer" },
              xpGained: { type: "integer" },
            },
          },
          400: errorSchema,
          404: errorSchema,
          409: errorSchema,
          410: errorSchema,
          422: errorSchema,
        },
      },
    },
    async (req, reply): Promise<DailyFinish | void> => {
      const userId = req.user!.id;
      const { id } = req.params as { id: number };
      const { log, initials } = req.body as DailyFinishBody;
      if (initials && filterChat(initials).masked) return reply.code(400).send({ error: "Pick other initials." });

      const run = await prisma.dailyRun.findFirst({ where: { id, userId }, select: { id: true, day: true, seed: true, startedAt: true, finishedAt: true } });
      if (!run) return reply.code(404).send({ error: "Run not found." });
      if (run.finishedAt) return reply.code(409).send({ error: "This try is already over." });

      const elapsed = Date.now() - run.startedAt.getTime();
      const before = await bestToday(userId, run.day);
      const close = (score: number | null, ticks: number | null) =>
        // only the first finish counts (a double submit can't record twice)
        prisma.dailyRun.updateMany({ where: { id: run.id, finishedAt: null }, data: { score, ticks, finishedAt: new Date() } });

      if (elapsed > RUN_TTL_MS) {
        await close(null, null);
        return reply.code(410).send({ error: "This try timed out." });
      }
      const replay = replayDaily(dailyChallenge(run.day), run.seed, log);
      // a run can't be played faster than real time
      const tooFast = replay.ok && (replay.ticks * 1000) / DAILY_TICKS_PER_S > elapsed + FAST_SLACK_MS;
      if (!replay.ok || tooFast) {
        req.log.warn({ userId, runId: run.id, reason: replay.ok ? "faster than real time" : replay.reason }, "[daily] run failed verification");
        await close(0, replay.ok ? replay.ticks : null);
        return reply.code(422).send({ error: "We couldn't verify this run, so it counts as 0." });
      }
      const closed = await close(replay.score, replay.ticks);
      if (closed.count === 0) return reply.code(409).send({ error: "This try is already over." });
      if (initials) await prisma.user.update({ where: { id: userId }, data: { dailyInitials: initials } });

      // under 5 s of play the try is used but doesn't count (no board spot, XP or streak)
      const counted = replay.ticks >= DAILY_MIN_TICKS;
      const after = counted ? Math.max(before ?? -1, replay.score) : before;
      const best = after ?? 0;
      const [entries, streaks, used] = await Promise.all([
        dailyBoard(run.day, BOARD_SIZE, userId),
        dailyStreaks(userId, run.day),
        prisma.dailyRun.count({ where: { userId, day: run.day } }),
      ]);
      syncAchievementsLater([userId], req.log);
      return {
        score: replay.score,
        best,
        newBest: counted && (before === null || replay.score > before),
        rank: entries.find((e) => e.userId === userId)?.rank ?? null,
        streak: streaks.current,
        attemptsLeft: Math.max(0, DAILY_ATTEMPTS - used),
        xpGained: dailyXpFor(after) - dailyXpFor(before),
      };
    }
  );
}
