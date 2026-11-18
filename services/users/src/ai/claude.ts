import Anthropic from "@anthropic-ai/sdk";
import { config } from "../config.ts";

/**
 * The Claude client, or null when ANTHROPIC_API_KEY is not set (then the coach answers 503
 * and chat moderation is skipped). Created once per process.
 */
export const ai = config.ai
  ? {
      client: new Anthropic({ apiKey: config.ai.apiKey, maxRetries: 2 }),
      model: config.ai.model,
    }
  : null;

/**
 * Server-side refusal fallback: if a safety classifier declines, the API re-runs the
 * request on a fallback model it picks by refusal category, inside the same call.
 */
export const FALLBACK = { betas: ["server-side-fallback-2026-07-01"] as Anthropic.Beta.AnthropicBeta[], fallbacks: "default" as const };

/** Maps SDK errors to a stable code the browser can translate (never the raw message). */
export function aiErrorCode(err: unknown): "RATE_LIMITED" | "OVERLOADED" | "UNAVAILABLE" | "BAD_REQUEST" | "ERROR" {
  if (err instanceof Anthropic.RateLimitError) return "RATE_LIMITED";
  if (err instanceof Anthropic.BadRequestError) return "BAD_REQUEST";
  if (err instanceof Anthropic.AuthenticationError || err instanceof Anthropic.PermissionDeniedError) return "UNAVAILABLE";
  if (err instanceof Anthropic.APIConnectionError) return "UNAVAILABLE";
  if (err instanceof Anthropic.APIError && (err.status ?? 0) >= 500) return "OVERLOADED";
  return "ERROR";
}
