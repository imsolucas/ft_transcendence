import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "../../db/client.ts";
import { COINS, questsFor, type QuestDef } from "../../../../shared/quests/quests.ts";
import { DAILY_MIN_TICKS } from "../../../../shared/daily/daily.ts";
import type { QuestView } from "../../../../shared/types/api.types.ts";

type Db = PrismaClient | Prisma.TransactionClient;

/** a game only earns coins (and counts for quests) if it was really played, not an instant forfeit */
const MIN_MATCH_POINTS = 3;
const MIN_PARTY_SECONDS = 45;

const dayRange = (day: string) => {
  const gte = new Date(`${day}T00:00:00Z`);
  return { gte, lt: new Date(gte.getTime() + 86_400_000) };
};

/**
 * Coins earned so far: derived from play (1v1 matches and wins, party games and wins, Daily
 * Challenge days) plus the quest rewards collected. Recomputed on demand, so nothing can be
 * awarded twice.
 */
interface PlayCounts {
  played: number;
  wins: number;
  partyPlayed: number;
  partyWins: number;
}

/**
 * Real games only: a 1v1 with at least MIN_MATCH_POINTS scored, a party game of at least
 * MIN_PARTY_SECONDS. Optionally within one UTC day (by when the game ended) and one party game.
 */
async function playCounts(userId: number, db: Db, day?: string, partyGame?: "pong" | "cycles"): Promise<PlayCounts> {
  const range = day ? dayRange(day) : null;
  const from = range?.gte ?? new Date(0);
  const to = range?.lt ?? new Date("9999-12-31T00:00:00Z");
  const [m] = await db.$queryRaw<{ played: bigint; wins: bigint }[]>`
    SELECT COUNT(*) AS played, COUNT(*) FILTER (WHERE "winnerId" = ${userId}) AS wins
    FROM "Matches"
    WHERE (${userId} IN ("player1Id", "player2Id")) AND "player1Score" + "player2Score" >= ${MIN_MATCH_POINTS}
      AND end_at >= ${from} AND end_at < ${to}`;
  const [pm] = await db.$queryRaw<{ played: bigint; wins: bigint }[]>`
    SELECT COUNT(*) AS played, COUNT(*) FILTER (WHERE m."winnerId" = ${userId}) AS wins
    FROM "PartyMatchPlayers" p JOIN "PartyMatches" m ON m.id = p."partyMatchId"
    WHERE p."userId" = ${userId} AND m.end_at - m.played_at >= make_interval(secs => ${MIN_PARTY_SECONDS})
      AND m.end_at >= ${from} AND m.end_at < ${to} AND (${partyGame ?? null}::text IS NULL OR m.game = ${partyGame ?? null})`;
  return { played: Number(m?.played ?? 0), wins: Number(m?.wins ?? 0), partyPlayed: Number(pm?.played ?? 0), partyWins: Number(pm?.wins ?? 0) };
}

export async function coinsEarned(userId: number, db: Db = prisma): Promise<number> {
  const [{ played, wins, partyPlayed, partyWins }, dailyDays, claims] = await Promise.all([
    playCounts(userId, db),
    db.dailyRun.findMany({ where: { userId, score: { not: null }, ticks: { gte: DAILY_MIN_TICKS } }, distinct: ["day"], select: { day: true } }),
    db.questClaim.aggregate({ where: { userId }, _sum: { reward: true } }),
  ]);
  return (
    played * COINS.match + wins * COINS.win + partyPlayed * COINS.party + partyWins * COINS.partyWin + dailyDays.length * COINS.dailyDay + (claims._sum.reward ?? 0)
  );
}

export async function coinsSpent(userId: number, db: Db = prisma): Promise<number> {
  const r = await db.purchase.aggregate({ where: { userId }, _sum: { cost: true } });
  return r._sum.cost ?? 0;
}

export async function balanceOf(userId: number, db: Db = prisma): Promise<number> {
  const [earned, spent] = await Promise.all([coinsEarned(userId, db), coinsSpent(userId, db)]);
  return earned - spent;
}

/** how far along today's quests are, from today's play */
async function progressFor(userId: number, day: string, quests: QuestDef[]): Promise<Record<string, number>> {
  const need = new Set(quests.map((q) => q.id));
  const out: Record<string, number> = {};
  const jobs: Promise<void>[] = [];
  // the same "really played" rules as coins, dated by when the game ended
  if (need.has("play_matches") || need.has("win_match"))
    jobs.push(
      playCounts(userId, prisma, day).then((c) => {
        out.play_matches = c.played;
        out.win_match = c.wins;
      })
    );
  if (need.has("party_game")) jobs.push(playCounts(userId, prisma, day, "pong").then((c) => void (out.party_game = c.partyPlayed)));
  if (need.has("cycles_race")) jobs.push(playCounts(userId, prisma, day, "cycles").then((c) => void (out.cycles_race = c.partyPlayed)));
  if (need.has("daily_run"))
    jobs.push(prisma.dailyRun.count({ where: { userId, day, score: { not: null }, ticks: { gte: DAILY_MIN_TICKS } } }).then((n) => void (out.daily_run = n)));
  if (need.has("daily_score"))
    jobs.push(
      prisma.dailyRun
        .aggregate({ where: { userId, day, score: { not: null }, ticks: { gte: DAILY_MIN_TICKS } }, _max: { score: true } })
        .then((r) => void (out.daily_score = r._max.score ?? 0))
    );
  await Promise.all(jobs);
  return out;
}

export async function questsToday(userId: number, day: string): Promise<QuestView[]> {
  const quests = questsFor(day);
  const [progress, claims] = await Promise.all([
    progressFor(userId, day, quests),
    prisma.questClaim.findMany({ where: { userId, day }, select: { quest: true } }),
  ]);
  const claimed = new Set(claims.map((c) => c.quest));
  return quests.map((q) => {
    const p = Math.min(q.target, progress[q.id] ?? 0);
    return { id: q.id, target: q.target, reward: q.reward, progress: p, done: p >= q.target, claimed: claimed.has(q.id) };
  });
}

export async function ownedItems(userId: number): Promise<string[]> {
  const rows = await prisma.purchase.findMany({ where: { userId }, select: { item: true } });
  return rows.map((r) => r.item);
}
