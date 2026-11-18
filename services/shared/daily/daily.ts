import type { GameConfig, GameState, PlayerInputs } from "../types/pong.types.ts";
import { GameEngine } from "../game-engine/GameEngine.ts";
import { rng } from "../game-engine/PowerUps.ts";
import { PongAi, type AiLevel } from "../ai/pong-ai.ts";

/**
 * Daily Challenge: you vs BIT, with one twist per UTC day. You have 3 lives (BIT scoring takes
 * one); your score is the points you take off BIT. 3 counted tries a day, best one counts.
 *
 * The run plays in the browser (no network lag) and the users service replays the input log
 * through this same class to get the score, so a score can't be made up: only inputs are
 * sent. That needs a bit-identical simulation in every JS engine, hence: a fixed 1/60 s tick,
 * seeded randomness (the try's seed comes from the server at start), BIT on simulation time,
 * and only exact arithmetic in the engine (no trig or Math.hypot on this path).
 */

export const DAILY_TICK_S = 1 / 60;
export const DAILY_TICKS_PER_S = 60;
export const DAILY_LIVES = 3;
export const DAILY_ATTEMPTS = 3;
/** a run ends after 8 minutes of play at most */
export const DAILY_MAX_TICKS = 8 * 60 * DAILY_TICKS_PER_S;
/** a try shorter than this (5 s) doesn't count as played: no streak, XP or board spot */
export const DAILY_MIN_TICKS = 5 * DAILY_TICKS_PER_S;
/** input log entries (numbers) accepted: enough for an input change on every tick */
export const DAILY_MAX_LOG = 2 * 8 * 60 * 60;

export type DailyTwist = "classic" | "turbo" | "powerUps" | "bitHard" | "heavyPaddle" | "rally" | "chaos";

export interface DailyChallenge {
  /** UTC day, YYYY-MM-DD */
  day: string;
  twist: DailyTwist;
  ballSpeed: number;
  paddleSpeed: number;
  powerUps: boolean;
  ai: AiLevel;
  /** the ball gets faster with every point you score */
  rally: boolean;
}

const TWISTS: Record<DailyTwist, Omit<DailyChallenge, "day" | "twist">> = {
  classic: { ballSpeed: 50, paddleSpeed: 47, powerUps: false, ai: "normal", rally: false },
  turbo: { ballSpeed: 70, paddleSpeed: 52, powerUps: false, ai: "normal", rally: false },
  powerUps: { ballSpeed: 50, paddleSpeed: 47, powerUps: true, ai: "normal", rally: false },
  bitHard: { ballSpeed: 50, paddleSpeed: 47, powerUps: false, ai: "hard", rally: false },
  heavyPaddle: { ballSpeed: 45, paddleSpeed: 35, powerUps: false, ai: "easy", rally: false },
  rally: { ballSpeed: 42, paddleSpeed: 50, powerUps: false, ai: "normal", rally: true },
  chaos: { ballSpeed: 58, paddleSpeed: 52, powerUps: true, ai: "normal", rally: false },
};
const ORDER = Object.keys(TWISTS) as DailyTwist[];
/** arcade difficulty: every point makes the ball a little faster (rally: a lot faster for your points) */
const SPEED_PER_POINT = 2;
const RALLY_STEP = 4;
const SPEED_MAX = 85;

/** today's UTC day as YYYY-MM-DD */
export function utcDay(at: Date = new Date()): string {
  return at.toISOString().slice(0, 10);
}

/** when the next challenge starts (next UTC midnight) */
export function nextDailyReset(at: Date = new Date()): Date {
  return new Date(Date.UTC(at.getUTCFullYear(), at.getUTCMonth(), at.getUTCDate() + 1));
}

/** FNV-1a: the same day always picks the same twist */
function hash(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 0x01000193) >>> 0;
  return h >>> 0;
}

export function dailyChallenge(day: string): DailyChallenge {
  const twist = ORDER[hash(`volley-daily:${day}`) % ORDER.length]!;
  return { day, twist, ...TWISTS[twist] };
}

function dailyConfig(c: DailyChallenge, seed: number): GameConfig {
  return {
    paddleConfig: { color: "", speed: c.paddleSpeed },
    ballConfig: { color: "", speed: c.ballSpeed },
    playerNames: ["", "BIT"],
    backgroundColor: "",
    // the engine never ends the game: the run ends when BIT has taken all your lives
    pointsToWin: 9999,
    isPrivate: true,
    mode: "standard",
    powerUps: c.powerUps,
    seed,
  };
}

/** input bits for one tick: 1 = up, 2 = down */
export const inputBits = (i: Pick<PlayerInputs, "up" | "down"> | null | undefined): number => (i?.up ? 1 : 0) | (i?.down ? 2 : 0);
const fromBits = (b: number): PlayerInputs => ({ up: (b & 1) !== 0, down: (b & 2) !== 0, left: false, right: false, action_1: false, action_2: false });

/** One Daily Challenge run. The browser and the server's replay both step it one tick at a time. */
export class DailyRun {
  readonly challenge: DailyChallenge;
  #engine: GameEngine;
  #ai: PongAi;
  #config: GameConfig;
  #ticks = 0;
  #over = false;
  #state: GameState;

  constructor(challenge: DailyChallenge, seed: number) {
    this.challenge = challenge;
    this.#config = dailyConfig(challenge, seed >>> 0);
    this.#engine = new GameEngine(this.#config);
    // BIT's misjudgements get their own stream (power-ups use the seed itself)
    this.#ai = new PongAi(challenge.ai, { x: 160, y: 100 }, rng((seed ^ 0x9e3779b9) >>> 0));
    this.#state = this.#engine.getGameState();
  }

  /** advance one tick (1/60 s) with the player's input bits */
  step(bits: number): void {
    if (this.#over) return;
    const before = (this.#state.scores[0] ?? 0) + (this.#state.scores[1] ?? 0);
    this.#engine.input(fromBits(bits), this.#ai.decide(this.#state, (this.#ticks * 1000) / DAILY_TICKS_PER_S));
    this.#engine.tick(DAILY_TICK_S);
    this.#ticks++;
    this.#state = this.#engine.getGameState();
    const mine = this.#state.scores[0] ?? 0;
    const points = mine + (this.#state.scores[1] ?? 0);
    if (points !== before) {
      const speed = Math.min(SPEED_MAX, this.challenge.ballSpeed + SPEED_PER_POINT * points + (this.challenge.rally ? RALLY_STEP * mine : 0));
      // later hits read the speed from the config; the serve was already set this tick, so redo it
      this.#engine.getContext().config.ballConfig.speed = speed;
      const ball = this.#engine.getBall();
      const v = ball.getVelocity();
      ball.setVelocity({ x: Math.sign(v.x) * speed, y: v.y });
      this.#state = this.#engine.getGameState();
    }
    if ((this.#state.scores[1] ?? 0) >= DAILY_LIVES || this.#ticks >= DAILY_MAX_TICKS) this.#over = true;
  }

  get state(): GameState {
    return this.#state;
  }
  get config(): GameConfig {
    return this.#config;
  }
  get score(): number {
    return this.#state.scores[0] ?? 0;
  }
  get livesLeft(): number {
    return Math.max(0, DAILY_LIVES - (this.#state.scores[1] ?? 0));
  }
  get ticks(): number {
    return this.#ticks;
  }
  get over(): boolean {
    return this.#over;
  }
}

/** Run-length input log: [bits, ticks, bits, ticks, …]. Small enough to send at the end. */
export class DailyInputLog {
  #out: number[] = [];
  push(bits: number): void {
    const n = this.#out.length;
    if (n >= 2 && this.#out[n - 2] === bits) this.#out[n - 1]!++;
    else this.#out.push(bits, 1);
  }
  toArray(): number[] {
    return [...this.#out];
  }
}

export type DailyReplay = { ok: true; score: number; ticks: number; over: boolean } | { ok: false; reason: string };

/**
 * The server's check: replay a log and return the score it produces. A log that ended early is
 * fine (the player quit: what they scored counts); inputs after the run ended are not.
 */
export function replayDaily(challenge: DailyChallenge, seed: number, log: readonly number[]): DailyReplay {
  if (!Array.isArray(log) || log.length % 2 !== 0 || log.length > DAILY_MAX_LOG) return { ok: false, reason: "bad log" };
  let total = 0;
  for (let i = 0; i < log.length; i += 2) {
    const bits = log[i]!;
    const count = log[i + 1]!;
    if (!Number.isInteger(bits) || bits < 0 || bits > 3 || !Number.isInteger(count) || count < 1) return { ok: false, reason: "bad log" };
    total += count;
  }
  if (total > DAILY_MAX_TICKS) return { ok: false, reason: "too long" };
  const run = new DailyRun(challenge, seed);
  for (let i = 0; i < log.length; i += 2) {
    for (let n = 0; n < log[i + 1]!; n++) {
      if (run.over) return { ok: false, reason: "inputs after the end" };
      run.step(log[i]!);
    }
  }
  return { ok: true, score: run.score, ticks: run.ticks, over: run.over };
}

/** initials on the daily board: three letters A–Z, like a cabinet */
export const DAILY_INITIALS = /^[A-Z]{3}$/;
