import type { GameState } from "shared";
import type { CourtColors } from "./renderer";
import type { Sfx } from "./sfx";

/**
 * Game feel, client-side only: reads consecutive states and turns what happened (paddle hit,
 * wall bounce, point, power-up pickup) into particles, screen shake, a flash and sounds.
 * The server stays authoritative; none of this changes the simulation.
 */

export type CourtEvent = "paddle" | "wall" | "score" | "power";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  color: string;
}

/** One recorded frame for the slow-motion replay (court units, ms since the point began). */
export interface ReplayFrame {
  t: number;
  s: GameState;
}

const MAX_PARTICLES = 160;
const MAX_FRAMES = 1200; // ~20 s at 60 fps; longer rallies keep their last 20 s

const sign = (n: number) => (n > 0 ? 1 : n < 0 ? -1 : 0);

/** What happened between two states (empty when nothing notable did). */
export function detectEvents(prev: GameState | null, s: GameState): CourtEvent[] {
  if (!prev) return [];
  const events: CourtEvent[] = [];
  const scored = prev.scores[0] !== s.scores[0] || prev.scores[1] !== s.scores[1];
  if (scored) events.push("score");
  else {
    const flippedX = sign(prev.ball.vx) !== 0 && sign(s.ball.vx) !== 0 && sign(prev.ball.vx) !== sign(s.ball.vx);
    const flippedY = sign(prev.ball.vy) !== 0 && sign(s.ball.vy) !== 0 && sign(prev.ball.vy) !== sign(s.ball.vy);
    if (flippedX) events.push("paddle");
    else if (flippedY) events.push("wall");
    // a pickup, not an expiry (items vanish after a few seconds): the ball is on the item
    if (prev.powerUp && !s.powerUp && Math.hypot(s.ball.x - prev.powerUp.x, s.ball.y - prev.powerUp.y) < 12) events.push("power");
  }
  return events;
}

export class CourtFx {
  private particles: Particle[] = [];
  private prev: GameState | null = null;
  private shakeUntil = 0;
  private shakeStart = 0;
  private shakePower = 0;
  private flashUntil = 0;
  private flashColor = "";
  private pointStart = 0;
  private frames: ReplayFrame[] = [];
  private lastTick = 0;

  /** reduced motion: no shake or flash, fewer particles (set by the court) */
  reduced = false;

  constructor(
    private readonly opts: {
      onSound?: (kind: Sfx) => void;
      /** a point just ended: its frames, for the replay */
      onPoint?: (frames: ReplayFrame[]) => void;
    },
  ) {}

  /** whose paddle is drawn in "you" colours (same rule as drawFrame) */
  youSide: 0 | 1 | null = null;
  private sideColor(index: 0 | 1, colors: CourtColors) {
    const you = this.youSide === null ? index === 0 : index === this.youSide;
    return you ? colors.you : colors.opp;
  }

  /** Feed the latest state once per animation frame. */
  update(s: GameState, now: number, colors: CourtColors): void {
    const dt = this.lastTick ? Math.min(0.05, (now - this.lastTick) / 1000) : 0;
    this.lastTick = now;
    // states arrive at the server's rate online: only act on a new one
    const fresh = s !== this.prev;
    if (fresh) {
      for (const e of detectEvents(this.prev, s)) this.on(e, s, now, colors);
      // the match is over: nothing left to record (and nothing to overwrite the last point with)
      if (s.name !== "GameOverState") {
        if (this.frames.length === 0) this.pointStart = now;
        this.frames.push({ t: now - this.pointStart, s });
        // ring buffer: a very long rally keeps its end (the part that decided the point)
        if (this.frames.length > MAX_FRAMES) this.frames.shift();
      }
      this.prev = s;
    }
    for (const p of this.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.94;
      p.vy *= 0.94;
      p.life -= dt;
    }
    this.particles = this.particles.filter((p) => p.life > 0);
  }

  /** Hands over the point in progress (e.g. when the court unmounts at the end of a match). */
  flush(): void {
    if (this.frames.length > 1) this.opts.onPoint?.(this.frames);
    this.frames = [];
  }

  private on(e: CourtEvent, s: GameState, now: number, colors: CourtColors) {
    const { x, y } = s.ball;
    const many = this.reduced ? 0.3 : 1;
    switch (e) {
      case "paddle": {
        const color = this.sideColor(s.ball.vx > 0 ? 0 : 1, colors); // moving right = it hit the left paddle
        this.burst(x, y, Math.round(14 * many), color, 40, 0.35, Math.sign(s.ball.vx));
        this.shake(now, 1.5, 110);
        this.opts.onSound?.("paddle");
        break;
      }
      case "wall":
        this.burst(x, y, Math.round(6 * many), colors.ball, 25, 0.25, 0);
        this.opts.onSound?.("wall");
        break;
      case "power":
        this.burst(x, y, Math.round(18 * many), colors.power.grow, 45, 0.45, 0);
        this.opts.onSound?.("power");
        break;
      case "score": {
        // the frames of the point that just ended (this state is the reset: not part of it)
        if (this.frames.length > 1) this.opts.onPoint?.(this.frames);
        this.frames = [];
        const prev = this.prev;
        const leftScored = !!prev && s.scores[0] > prev.scores[0];
        const color = this.sideColor(leftScored ? 0 : 1, colors);
        const gx = prev ? prev.ball.x : x;
        const gy = prev ? prev.ball.y : y;
        this.burst(gx, gy, Math.round(36 * many), color, 70, 0.7, 0);
        this.shake(now, 5, 280);
        if (!this.reduced) {
          this.flashUntil = now + 160;
          this.flashColor = color;
        }
        this.opts.onSound?.("score");
        break;
      }
    }
  }

  private burst(x: number, y: number, n: number, color: string, speed: number, life: number, dir: number) {
    for (let i = 0; i < n && this.particles.length < MAX_PARTICLES; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = speed * (0.3 + Math.random() * 0.7);
      this.particles.push({ x, y, vx: Math.cos(a) * v + dir * speed * 0.5, vy: Math.sin(a) * v, life: life * (0.6 + Math.random() * 0.4), max: life, color });
    }
  }

  private shake(now: number, power: number, ms: number) {
    if (this.reduced) return;
    this.shakeStart = now;
    this.shakeUntil = now + ms;
    this.shakePower = power;
  }

  /** CSS pixels to offset the canvas by this frame. */
  shakeOffset(now: number): { x: number; y: number } {
    if (now >= this.shakeUntil) return { x: 0, y: 0 };
    const k = (this.shakeUntil - now) / (this.shakeUntil - this.shakeStart);
    const p = this.shakePower * k;
    return { x: (Math.random() * 2 - 1) * p, y: (Math.random() * 2 - 1) * p };
  }

  /** Draws particles and the flash; call inside the court's transform (court units × sx/sy). */
  draw(ctx: CanvasRenderingContext2D, sx: number, sy: number, now: number, w: number, h: number): void {
    const size = Math.max(1.5, Math.min(sx, sy) * 1.1);
    for (const p of this.particles) {
      ctx.globalAlpha = Math.max(0, p.life / p.max);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x * sx - size / 2, p.y * sy - size / 2, size, size);
    }
    ctx.globalAlpha = 1;
    if (now < this.flashUntil) {
      ctx.globalAlpha = ((this.flashUntil - now) / 160) * 0.18;
      ctx.fillStyle = this.flashColor;
      ctx.fillRect(0, 0, w, h);
      ctx.globalAlpha = 1;
    }
  }
}

/**
 * Hit-stop for games simulated in the browser (local, vs AI, landing): a paddle hit freezes the
 * simulation for a few frames, which makes contact feel solid. Never used online (the server
 * owns the clock there).
 */
export class HitStop {
  private until = 0;
  private prev: GameState | null = null;
  constructor(private readonly ms = 55) {}
  /** Call after each tick with the new state. */
  check(s: GameState, now: number): void {
    if (detectEvents(this.prev, s).includes("paddle")) this.until = now + this.ms;
    this.prev = s;
  }
  frozen(now: number): boolean {
    return now < this.until;
  }
}
