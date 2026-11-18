import type { FastifyInstance } from "fastify";
import type { AiStatus, CoachRequest } from "../../../../shared/types/api.types.ts";
import { requireUser } from "../../auth/guards.ts";
import { CoachError, coachModel, streamChat } from "../../ai/chat-client.ts";
import { localeFrom } from "../../email/mailer.ts";

/** Per-user budget for the coach: LIMIT requests per rolling hour (in memory, per process). */
const LIMIT = 20;
const WINDOW_MS = 60 * 60 * 1000;
const usage = new Map<number, number[]>();
function remaining(userId: number, now = Date.now()) {
  const recent = (usage.get(userId) ?? []).filter((t) => now - t < WINDOW_MS);
  usage.set(userId, recent);
  return LIMIT - recent.length;
}

/** A few answers at a time (free API tiers are rate limited): the rest are told to retry. */
const MAX_CONCURRENT = 3;
let running = 0;

/** Only the latest turns are sent (keeps requests small and cheap). */
const MAX_TURNS = 8;

const LANGUAGE = { en: "English", es: "Spanish", fr: "French" } as const;

const system = (lang: keyof typeof LANGUAGE) => `You are Coach, the assistant of VOLLEY.EXE, an online Pong game
(1v1 online matches, private rooms with invite links, bracket tournaments, local two-player
games, a computer opponent with easy/normal/hard levels, power-ups in local games, friends,
chat, leaderboard, achievements and levels).
Help with Pong tactics (the angle depends on where the ball hits the paddle: near the edge
gives a steep angle, the centre a flat one), practice ideas, how the site's features work,
and friendly encouragement. Keep answers short: a few sentences or a short list.
You can't see the player's account, matches or messages; if asked, point them to the right
page (Profile, Leaderboard, Settings, Chat, Watch).
Never ask for passwords, emails or other personal data. Politely decline anything unrelated
to the game or the site in one sentence.
Always answer in ${LANGUAGE[lang]}.`;

const bodySchema = {
  type: "object",
  additionalProperties: false,
  required: ["messages"],
  properties: {
    messages: {
      type: "array",
      minItems: 1,
      maxItems: 20,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["role", "content"],
        properties: {
          role: { type: "string", enum: ["user", "assistant"] },
          content: { type: "string", minLength: 1, maxLength: 2000 },
        },
      },
    },
  },
} as const;

export default async function aiRoutes(app: FastifyInstance) {
  app.get("/ai/status", { preHandler: requireUser }, async (req): Promise<AiStatus> => ({
    enabled: coachModel !== null,
    remaining: Math.max(0, remaining(req.user!.id)),
    limit: LIMIT,
  }));

  /** Streams the coach's answer as Server-Sent Events: delta {text} … then done {stopReason} or error {code}. */
  app.post("/ai/chat", { preHandler: requireUser, schema: { body: bodySchema } }, async (req, reply) => {
    if (!coachModel) return reply.code(503).send({ error: "The coach is turned off on this server.", code: "AI_DISABLED" });
    const { messages } = req.body as CoachRequest;
    // the conversation must start and end with the player
    if (messages[0]!.role !== "user" || messages[messages.length - 1]!.role !== "user") {
      return reply.code(400).send({ error: "The last message must be yours.", code: "BAD_HISTORY" });
    }
    const userId = req.user!.id;
    if (remaining(userId) <= 0) return reply.code(429).send({ error: "You've used the coach a lot this hour. Try again later.", code: "LIMIT" });
    if (running >= MAX_CONCURRENT) return reply.code(503).send({ error: "The coach is busy. Try again in a moment.", code: "OVERLOADED" });
    const stamp = Date.now();
    usage.get(userId)!.push(stamp);

    reply.hijack();
    const raw = reply.raw;
    raw.writeHead(200, {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Accel-Buffering": "no",
      Connection: "keep-alive",
    });
    const send = (event: string, data: unknown) => raw.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    // the player closed the page: stop generating right away (frees the CPU)
    const abort = new AbortController();
    raw.on("close", () => abort.abort());

    running++;
    try {
      // keep the latest turns, still starting with the player
      let recent = messages.slice(-MAX_TURNS);
      if (recent[0]!.role !== "user") recent = recent.slice(1);
      const stream = streamChat([{ role: "system", content: system(localeFrom(req)) }, ...recent], abort.signal);
      let step = await stream.next();
      while (!step.done) {
        send("delta", { text: step.value });
        step = await stream.next();
      }
      send("done", { stopReason: step.value });
    } catch (err) {
      if (!abort.signal.aborted) {
        const code = err instanceof CoachError ? err.code : "ERROR";
        // the coach couldn't answer at all: don't count it against the hourly budget
        if (code === "MODEL_LOADING" || code === "UNAVAILABLE" || code === "OVERLOADED") {
          const list = usage.get(userId);
          const i = list?.lastIndexOf(stamp) ?? -1;
          if (list && i >= 0) list.splice(i, 1);
        }
        // never log the conversation; the upstream message isn't sent to the browser either
        req.log.error({ code, upstreamStatus: (err as { upstreamStatus?: number }).upstreamStatus, err: (err as Error).message }, "coach request failed");
        send("error", { code });
      }
    } finally {
      running--;
      raw.end();
    }
  });
}
