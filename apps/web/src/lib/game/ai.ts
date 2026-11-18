import type { GameState, PlayerInputs } from "shared";

export type AiLevel = "easy" | "normal" | "hard";

/**
 * Computer opponent for the right paddle. It plays through the same inputs a person has
 * (up/down at normal paddle speed), and it is deliberately human:
 * - it only re-reads the ball every `reactMs` (reaction time), so fast changes surprise it;
 * - it predicts where the ball will cross its side, including wall bounces, but commits to
 *   one misjudgement per shot (`error`, in court units; the paddle covers about ±14), so
 *   some shots are simply misread and missed;
 * - between shots it drifts back towards the middle (not on easy);
 * - a small dead zone stops jittering, so it sometimes arrives a little late;
 * - with power-ups on, it angles its return towards the item on the court (the engine sets the
 *   ball's outgoing angle from where it hits the paddle), so it uses them like a player would.
 * Tuned by simulation against a perfect opponent: easy misses ~25% of shots, normal ~10%,
 * hard ~3%.
 */
const LEVELS: Record<AiLevel, { reactMs: number; error: number; deadZone: number; recentre: boolean }> = {
  easy: { reactMs: 450, error: 24, deadZone: 4, recentre: false },
  normal: { reactMs: 300, error: 18.5, deadZone: 3, recentre: true },
  hard: { reactMs: 180, error: 15.8, deadZone: 2, recentre: true },
};

const idle = (): PlayerInputs => ({ up: false, down: false, left: false, right: false, action_1: false, action_2: false });

export class PongAi {
  private target: number | null = null;
  private lastRead = -Infinity;
  /** the misjudgement for the shot currently coming in (null between shots) */
  private shotError: number | null = null;
  private readonly cfg;

  constructor(
    level: AiLevel,
    private readonly court = { x: 160, y: 100 },
    private readonly random: () => number = Math.random
  ) {
    this.cfg = LEVELS[level];
  }

  /** Where the ball will cross the right paddle's x, reflecting off the top/bottom walls. */
  private predictY(s: GameState): number | null {
    const { x, y, vx, vy } = s.ball;
    if (vx <= 0) return null; // moving away
    const t = (s.paddles[1].x - x) / vx;
    let py = y + vy * t;
    const h = this.court.y;
    // unfold the bounces
    const period = 2 * h;
    py = ((py % period) + period) % period;
    if (py > h) py = period - py;
    return py;
  }

  /**
   * Where on the paddle to meet the ball so the return heads for the power-up (0 = centre).
   * The engine sends the ball off at normalizedHit × 0.75 × speed vertically, where
   * normalizedHit = (ball − paddle centre) / (paddle height / 2).
   */
  private aimOffset(s: GameState, predicted: number): number {
    const item = s.powerUp;
    if (!item) return 0;
    const speed = Math.abs(s.ball.vx);
    const dx = s.paddles[1].x - item.x;
    if (speed === 0 || dx <= 0) return 0;
    const neededVy = (item.y - predicted) / (dx / speed);
    // keep the contact point well inside the paddle so aiming doesn't cost the return
    const normalized = Math.max(-0.6, Math.min(0.6, neededVy / (0.75 * speed)));
    const half = (s.paddleHeights?.[1] ?? 25) / 2;
    return normalized * half;
  }

  /** Call every frame with the current state and time (ms); returns the AI's inputs. */
  decide(s: GameState, nowMs: number): PlayerInputs {
    if (nowMs - this.lastRead >= this.cfg.reactMs) {
      this.lastRead = nowMs;
      const predicted = this.predictY(s);
      if (predicted === null) {
        this.shotError = null;
        this.target = this.cfg.recentre ? this.court.y / 2 : null;
      } else {
        this.shotError ??= (this.random() * 2 - 1) * this.cfg.error;
        this.target = Math.max(0, Math.min(this.court.y, predicted - this.aimOffset(s, predicted) + this.shotError));
      }
    }
    const inputs = idle();
    if (this.target === null) return inputs;
    const paddleY = s.paddles[1].y;
    const diff = this.target - paddleY;
    if (diff > this.cfg.deadZone) inputs.down = true;
    else if (diff < -this.cfg.deadZone) inputs.up = true;
    return inputs;
  }
}
