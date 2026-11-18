import type { PowerUpKind, PowerUpView } from "../types/pong.types.ts";
import type EntityManager from "./managers/EntityManager.ts";
import { defaults } from "./defaults.ts";

/**
 * Power-ups (opt-in with config.powerUps). Every 6–10 s of play an item appears mid-court;
 * when the ball passes through it, the player who hit the ball last gets the effect:
 * - grow:   their paddle ×1.5 for 8 s
 * - shrink: the opponent's paddle ×0.6 for 8 s
 * - fast:   the ball speeds up ×1.35 (until the point ends)
 * An item nobody reaches disappears after 8 s, so a new one can spawn elsewhere.
 * Everything resets when a point is scored. Randomness comes from a seeded generator, so
 * the same seed and inputs always produce the same game.
 */
const EFFECT_S = 8;
const PICKUP_RADIUS = 6;
const ITEM_TTL_S = 8;
const KINDS: PowerUpKind[] = ["grow", "shrink", "fast"];

/** mulberry32: small, fast, deterministic (integer maths only) */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class PowerUpSystem {
  #random: () => number;
  #clock = 0;
  #nextSpawn = 6;
  #item: PowerUpView | null = null;
  #itemExpires = 0;
  #effects: { side: 0 | 1; until: number }[] = [];
  #lastHitter: 0 | 1 | null = null;
  // no parameter properties: Node's type stripping runs this file (users service)
  private readonly court: { x: number; y: number };

  constructor(court: { x: number; y: number }, seed = 1) {
    this.court = court;
    this.#random = rng(seed);
  }

  update(dt: number, entities: EntityManager) {
    this.#clock += dt;
    const ball = entities.getBall();
    const paddles = entities.getPaddles();
    const v = ball.getVelocity();
    // moving right = paddle 0 (left) hit it last
    if (v.x > 0) this.#lastHitter = 0;
    else if (v.x < 0) this.#lastHitter = 1;

    if (!this.#item && this.#clock >= this.#nextSpawn) {
      this.#item = {
        x: this.court.x * (0.35 + this.#random() * 0.3),
        y: this.court.y * (0.15 + this.#random() * 0.7),
        kind: KINDS[Math.floor(this.#random() * KINDS.length)]!,
      };
      this.#itemExpires = this.#clock + ITEM_TTL_S;
    }
    if (this.#item && this.#clock >= this.#itemExpires) {
      this.#item = null;
      this.#nextSpawn = this.#clock + 2 + this.#random() * 3;
    }

    const item = this.#item;
    if (item && this.#lastHitter !== null) {
      const p = ball.getPos();
      // squared distance: exact in every JS engine (Math.hypot may differ), so a replay matches
      const dx = p.x - item.x;
      const dy = p.y - item.y;
      if (dx * dx + dy * dy < PICKUP_RADIUS * PICKUP_RADIUS) {
        const side = this.#lastHitter;
        if (item.kind === "fast") ball.setVelocity({ x: v.x * 1.35, y: v.y * 1.35 });
        else {
          const target: 0 | 1 = item.kind === "grow" ? side : side === 0 ? 1 : 0;
          paddles[target]?.setHeight(defaults.PADDLE_HEIGHT * (item.kind === "grow" ? 1.5 : 0.6));
          this.#effects = this.#effects.filter((e) => e.side !== target);
          this.#effects.push({ side: target, until: this.#clock + EFFECT_S });
        }
        this.#item = null;
        this.#nextSpawn = this.#clock + 6 + this.#random() * 4;
      }
    }

    for (const e of this.#effects) if (this.#clock >= e.until) paddles[e.side]?.setHeight(defaults.PADDLE_HEIGHT);
    this.#effects = this.#effects.filter((e) => this.#clock < e.until);
  }

  /** a point was scored: clear the court and every effect */
  reset(entities: EntityManager) {
    this.#item = null;
    this.#effects = [];
    this.#lastHitter = null;
    this.#nextSpawn = this.#clock + 6 + this.#random() * 4;
    for (const p of entities.getPaddles()) p.setHeight(defaults.PADDLE_HEIGHT);
  }

  item(): PowerUpView | null {
    return this.#item;
  }
}
