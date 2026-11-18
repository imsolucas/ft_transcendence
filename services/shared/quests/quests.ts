/**
 * Coins and daily quests. Coins are derived from play (like XP) plus the quest rewards a
 * player claims, minus what they spent in the shop; the users service computes them.
 * Every UTC day picks 3 quests from the pool, the same for everyone.
 */

export type QuestId = "play_matches" | "win_match" | "party_game" | "cycles_race" | "daily_run" | "daily_score";

export interface QuestDef {
  id: QuestId;
  target: number;
  reward: number;
}

const POOL: readonly QuestDef[] = [
  { id: "play_matches", target: 2, reward: 30 },
  { id: "win_match", target: 1, reward: 40 },
  { id: "party_game", target: 1, reward: 30 },
  { id: "cycles_race", target: 1, reward: 30 },
  { id: "daily_run", target: 1, reward: 20 },
  { id: "daily_score", target: 5, reward: 40 },
];
export const QUESTS_PER_DAY = 3;

/** coins earned per thing you play (everything counts, so the balance also rewards history) */
export const COINS = { match: 5, win: 5, party: 5, partyWin: 5, dailyDay: 10 } as const;

function hash(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 0x01000193) >>> 0;
  return h >>> 0;
}

/** the day's quests: a deterministic shuffle of the pool by date */
export function questsFor(day: string): QuestDef[] {
  const list = [...POOL];
  let seed = hash(`volley-quests:${day}`);
  for (let i = list.length - 1; i > 0; i--) {
    seed = (Math.imul(seed, 1103515245) + 12345) >>> 0;
    const j = seed % (i + 1);
    [list[i], list[j]] = [list[j]!, list[i]!];
  }
  return list.slice(0, QUESTS_PER_DAY);
}

export const questById = (id: string): QuestDef | undefined => POOL.find((q) => q.id === id);
