import type { FastifyInstance } from "fastify";
import type { AiStatus, CoachRequest } from "../../../../shared/types/api.types.ts";
import { requireUser } from "../../auth/guards.ts";
import { ai, aiErrorCode, FALLBACK } from "../../ai/claude.ts";
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

const LANGUAGE = { en: "English", es: "Spanish", fr: "French" } as const;

// Frozen per language, so each variant is cached as a prefix.
const system = (lang: keyof typeof LANGUAGE) => `You are Coach, the in-game assistant of ft_transcendence, an online Pong website
(1v1 online matches, private rooms, bracket tournaments, local two-player games, a computer
opponent with easy/normal/hard levels, power-ups in local games, friends, chat, leaderboard,
achievements and levels).
Help players with: Pong tactics (angles come from where the ball hits the paddle: near the edge
gives a steep angle, the centre a flat one), practising, how the site's features work, and
friendly encouragement. Keep answers short (a few sentences or a short list) and practical.
You can't see the player's account, matches or messages; say so if asked, and point them to
the right page (Profile, Leaderboard, Settings, Chat, Watch).
Never ask for or repeat passwords, emails or other personal data. Decline requests unrelated
to the game or the site in one friendly sentence.
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
    enabled: ai !== null,
    remaining: Math.max(0, remaining(req.user!.id)),
    limit: LIMIT,
  }));

  /** Streams the coach's answer as Server-Sent Events: delta {text} … then done {stopReason} or error {code}. */
  app.post("/ai/chat", { preHandler: requireUser, schema: { body: bodySchema } }, async (req, reply) => {
    if (!ai) return reply.code(503).send({ error: "The coach is turned off on this server.", code: "AI_DISABLED" });
    const { messages } = req.body as CoachRequest;
    // the conversation must start and end with the player
    if (messages[0]!.role !== "user" || messages[messages.length - 1]!.role !== "user") {
      return reply.code(400).send({ error: "The last message must be yours.", code: "BAD_HISTORY" });
    }
    const userId = req.user!.id;
    if (remaining(userId) <= 0) return reply.code(429).send({ error: "You've used the coach a lot this hour. Try again later.", code: "LIMIT" });
    usage.get(userId)!.push(Date.now());

    reply.hijack();
    const raw = reply.raw;
    raw.writeHead(200, {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Accel-Buffering": "no",
      Connection: "keep-alive",
    });
    const send = (event: string, data: unknown) => raw.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    // the player closed the page: stop generating (and paying) right away
    const abort = new AbortController();
    raw.on("close", () => abort.abort());

    try {
      const stream = ai.client.beta.messages.stream(
        {
          model: ai.model,
          max_tokens: 4000,
          ...FALLBACK,
          // chat: low effort answers quickly and well enough
          output_config: { effort: "low" },
          system: [{ type: "text", text: system(localeFrom(req)), cache_control: { type: "ephemeral" } }],
          // cache the growing conversation prefix between turns
          cache_control: { type: "ephemeral" },
          messages,
        },
        { signal: abort.signal },
      );
      for await (const event of stream) {
        if (event.type === "content_block_delta" && event.delta.type === "text_delta") send("delta", { text: event.delta.text });
      }
      const final = await stream.finalMessage();
      send("done", { stopReason: final.stop_reason });
    } catch (err) {
      if (!abort.signal.aborted) {
        req.log.error({ err: (err as Error).message }, "coach request failed");
        send("error", { code: aiErrorCode(err) });
      }
    } finally {
      raw.end();
    }
  });
}
