import type { ModerationCategory } from "../../../shared/types/api.types.ts";
import { prisma } from "../db/client.ts";
import { notify } from "../realtime/notify.ts";

/**
 * Strikes: only slurs ("hate") and repeated spam count. MUTE_AFTER strikes within 24 h
 * mute the sender's chat for MUTE_MINUTES (Users.chatMutedUntil, enforced by the send
 * route). Strikes live in memory (like the rate limiters): a restart forgives them, but a
 * mute already set stays in the database.
 */
const MUTE_AFTER = 3;
const MUTE_MINUTES = 60;
const DAY_MS = 24 * 60 * 60 * 1000;
const strikes = new Map<number, number[]>();

type Log = { error: (o: object, m: string) => void; info: (o: object, m: string) => void };

export async function addStrike(userId: number, category: Extract<ModerationCategory, "hate" | "spam">, log: Log): Promise<void> {
  const now = Date.now();
  const recent = (strikes.get(userId) ?? []).filter((t) => now - t < DAY_MS);
  recent.push(now);
  strikes.set(userId, recent);
  let mutedUntil: Date | null = null;
  if (recent.length >= MUTE_AFTER) {
    mutedUntil = new Date(now + MUTE_MINUTES * 60 * 1000);
    try {
      await prisma.user.updateMany({ where: { id: userId }, data: { chatMutedUntil: mutedUntil } });
    } catch (err) {
      log.error({ err: (err as Error).message, userId }, "could not store chat mute");
      mutedUntil = null;
    }
  }
  log.info({ userId, category, strikes: recent.length, muted: !!mutedUntil }, "chat strike");
  notify([userId], { type: "moderation:warning", category, mutedUntil: mutedUntil?.toISOString() ?? null });
}

/**
 * Repeated spam, within REPEAT_WINDOW_MS: the same text (after trimming, lower-casing and
 * squashing whitespace; MIN_REPEAT_LENGTH characters or more) is refused once it was already
 * delivered PER_PEER_LIMIT times to the same person, or TOTAL_LIMIT times to anyone ("good
 * game!" to a few friends is fine). Only delivered messages are recorded, and a refused text
 * is a strike only the first time in the window, so retrying a refused message can't mute you.
 */
const REPEAT_WINDOW_MS = 2 * 60 * 1000;
const MIN_REPEAT_LENGTH = 8;
const PER_PEER_LIMIT = 2;
const TOTAL_LIMIT = 4;
const sent = new Map<number, { text: string; to: number; at: number }[]>();
const struck = new Map<number, Map<string, number>>();

const normalise = (text: string) => text.trim().toLowerCase().replace(/\s+/g, " ");

export type RepeatVerdict = "ok" | "refuse" | "refuse-and-strike";

export function checkRepeat(userId: number, to: number, text: string): RepeatVerdict {
  const norm = normalise(text);
  // "gg", "ok", "lol": normal to send several times
  if (norm.length < MIN_REPEAT_LENGTH) return "ok";
  const now = Date.now();
  const same = (sent.get(userId) ?? []).filter((e) => now - e.at < REPEAT_WINDOW_MS && e.text === norm);
  if (same.filter((e) => e.to === to).length < PER_PEER_LIMIT && same.length < TOTAL_LIMIT) return "ok";
  const mine = struck.get(userId) ?? new Map<string, number>();
  const last = mine.get(norm);
  if (last !== undefined && now - last < REPEAT_WINDOW_MS) return "refuse";
  mine.set(norm, now);
  struck.set(userId, mine);
  return "refuse-and-strike";
}

/** Call after a text message was delivered. */
export function recordSend(userId: number, to: number, text: string): void {
  const norm = normalise(text);
  if (norm.length < MIN_REPEAT_LENGTH) return;
  const now = Date.now();
  const recent = (sent.get(userId) ?? []).filter((e) => now - e.at < REPEAT_WINDOW_MS);
  recent.push({ text: norm, to, at: now });
  // bounded: a flood is already stopped by the per-minute send limit
  sent.set(userId, recent.slice(-30));
}

// Forget idle users so the maps don't grow forever
setInterval(() => {
  const now = Date.now();
  for (const [id, times] of strikes) if (times.every((t) => now - t >= DAY_MS)) strikes.delete(id);
  for (const [id, list] of sent) if (list.every((e) => now - e.at >= REPEAT_WINDOW_MS)) sent.delete(id);
  for (const [id, texts] of struck) {
    for (const [text, at] of texts) if (now - at >= REPEAT_WINDOW_MS) texts.delete(text);
    if (texts.size === 0) struck.delete(id);
  }
}, 10 * 60 * 1000).unref();
