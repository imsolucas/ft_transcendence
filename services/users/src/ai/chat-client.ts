import { config } from "../config.ts";

/**
 * LLM for the Coach: any remote OpenAI-compatible chat API (POST <AI_BASE_URL>/chat/completions
 * with streaming), e.g. OpenRouter, Groq, Google Gemini's OpenAI endpoint or Ollama's cloud
 * (https://ollama.com/v1). Questions are sent to that provider. null when AI_BASE_URL is not
 * set (then the coach answers 503 AI_DISABLED).
 */
export const coachModel = config.ai;

export type CoachErrorCode = "MODEL_LOADING" | "UNAVAILABLE" | "OVERLOADED" | "ERROR";

export class CoachError extends Error {
  // no parameter property: Node runs this file with type stripping only
  readonly code: CoachErrorCode;
  /** the provider's HTTP status, for the log (never its body: it could echo the question) */
  upstreamStatus?: number;
  constructor(code: CoachErrorCode, upstreamStatus?: number) {
    super(code);
    this.code = code;
    this.upstreamStatus = upstreamStatus;
  }
}

type Turn = { role: "system" | "user" | "assistant"; content: string };

/**
 * Streams the model's answer: yields text chunks, then returns why it stopped
 * ("end_turn" or "max_tokens"). Throws CoachError (never a raw upstream message).
 */
export async function* streamChat(messages: Turn[], signal: AbortSignal): AsyncGenerator<string, string> {
  if (!coachModel) throw new CoachError("UNAVAILABLE");
  let res: Response;
  try {
    res = await fetch(`${coachModel.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(coachModel.apiKey ? { authorization: `Bearer ${coachModel.apiKey}` } : {}),
      },
      body: JSON.stringify({ model: coachModel.model, messages, stream: true, max_tokens: 512, temperature: 0.6 }),
      // the player's abort, or 60 s for the whole answer
      signal: AbortSignal.any([signal, AbortSignal.timeout(60_000)]),
    });
  } catch (err) {
    if (signal.aborted) throw err;
    throw new CoachError("UNAVAILABLE");
  }
  if (res.status === 429 || res.status === 503) throw new CoachError("OVERLOADED", res.status);
  // 401/403 bad key, 402 no credits on the provider, 404 unknown model: the coach can't answer
  if (res.status === 401 || res.status === 402 || res.status === 403 || res.status === 404) throw new CoachError("UNAVAILABLE", res.status);
  if (!res.ok || !res.body) throw new CoachError("ERROR", res.status);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let stop = "end_turn";
  // a finish_reason or [DONE] means the answer is complete; EOF without one means it was cut off
  let finished = false;
  type Chunk = { choices?: { delta?: { content?: string | null }; finish_reason?: string | null }[]; error?: unknown };
  try {
    for (;;) {
      let step: ReadableStreamReadResult<Uint8Array>;
      try {
        step = await reader.read();
      } catch (err) {
        if (signal.aborted) throw err;
        throw new CoachError("UNAVAILABLE");
      }
      buffer += step.done ? decoder.decode() : decoder.decode(step.value, { stream: true });
      // Server-Sent Events: "data: {json}" lines, ending with "data: [DONE]"
      const lines = buffer.split("\n");
      buffer = step.done ? "" : (lines.pop() ?? "");
      for (const raw of lines) {
        const line = raw.trim();
        if (!line.startsWith("data:")) continue;
        const data = line.slice(5).trim();
        if (data === "[DONE]") return stop;
        let chunk: Chunk;
        try {
          chunk = JSON.parse(data) as Chunk;
        } catch {
          continue;
        }
        if (chunk.error) throw new CoachError("ERROR");
        const choice = chunk.choices?.[0];
        if (choice?.delta?.content) yield choice.delta.content;
        if (choice?.finish_reason) {
          finished = true;
          stop = choice.finish_reason === "length" ? "max_tokens" : "end_turn";
        }
      }
      if (step.done) break;
    }
    if (!finished) throw new CoachError("UNAVAILABLE");
  } finally {
    // stop the upstream generation whenever we leave early (error, abort, consumer gone)
    await reader.cancel().catch(() => {});
  }
  return stop;
}
