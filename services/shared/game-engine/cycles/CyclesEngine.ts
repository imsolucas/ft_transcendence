import type { CycleDir, CycleHead, CyclesDelta, CyclesState } from "../../types/cycles.types.ts";

/**
 * Light Cycles (2–4 players): every cycle moves one cell per step and leaves a solid trail;
 * hitting a wall or any trail (yours too) crashes you, and your trail disappears. Last one
 * riding wins. Turns are relative (left/right), at most one per step, so a cycle can never
 * reverse into itself. Integer-only and deterministic; the game server runs it at the room's
 * tick rate and broadcasts one small delta per step.
 */

export const CYCLES_SIZE = 64;
const COUNTDOWN_S = 3;
const START_SPS = 10;
const MAX_SPS = 18;
/** one more step per second every this many seconds of play */
const RAMP_S = 8;
const MAX_QUEUED_TURNS = 2;

const DX = [0, 1, 0, -1] as const;
const DY = [-1, 0, 1, 0] as const;

/** start cells: a pinwheel, so nobody starts head-on */
const STARTS: Record<number, { x: number; y: number; dir: CycleDir }[]> = {
  2: [
    { x: 12, y: 24, dir: 1 },
    { x: 51, y: 39, dir: 3 },
  ],
  3: [
    { x: 20, y: 56, dir: 0 },
    { x: 8, y: 20, dir: 1 },
    { x: 44, y: 8, dir: 2 },
  ],
  4: [
    { x: 20, y: 56, dir: 0 },
    { x: 8, y: 20, dir: 1 },
    { x: 44, y: 8, dir: 2 },
    { x: 56, y: 44, dir: 3 },
  ],
};

interface Cycle {
  seat: number;
  x: number;
  y: number;
  dir: CycleDir;
  alive: boolean;
  trail: number[];
  turns: number[];
  left: boolean;
  right: boolean;
}

export class CyclesEngine {
  #grid: Int8Array;
  #cycles: Cycle[];
  #phase: CyclesState["phase"] = "countdown";
  #countdown = COUNTDOWN_S;
  #acc = 0;
  #elapsed = 0;
  #step = 0;
  /** seats knocked out, grouped by the step they crashed in (crashing together = a tie) */
  #out: number[][] = [];
  #winner: number | null = null;

  constructor(players: number) {
    const n = Math.max(2, Math.min(4, players));
    this.#grid = new Int8Array(CYCLES_SIZE * CYCLES_SIZE).fill(-1);
    this.#cycles = STARTS[n]!.map((s, seat) => {
      const idx = s.y * CYCLES_SIZE + s.x;
      this.#grid[idx] = seat;
      return { seat, x: s.x, y: s.y, dir: s.dir, alive: true, trail: [idx], turns: [], left: false, right: false };
    });
  }

  get over(): boolean {
    return this.#phase === "over";
  }
  get winner(): number | null {
    return this.#winner;
  }
  /** steps ridden so far (a race shorter than a few seconds isn't recorded) */
  get steps(): number {
    return this.#step;
  }
  isAlive(seat: number): boolean {
    return this.#cycles[seat]?.alive === true;
  }
  /** 1 while riding, 0 when out (the party "lives" column) */
  livesBySeat(): number[] {
    return this.#cycles.map((c) => (c.alive ? 1 : 0));
  }

  get phase(): CyclesState["phase"] {
    return this.#phase;
  }
  /** for bots: inside the arena and not on any trail */
  isFree(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < CYCLES_SIZE && y < CYCLES_SIZE && this.#grid[y * CYCLES_SIZE + x] === -1;
  }
  /** for bots: where a rider is and which way it's heading (null for an unknown seat) */
  rider(seat: number): CycleHead | null {
    const c = this.#cycles[seat];
    return c ? { seat: c.seat, x: c.x, y: c.y, dir: c.dir, alive: c.alive } : null;
  }
  get riders(): number {
    return this.#cycles.length;
  }

  /** held buttons; a press (not a hold) queues one turn */
  input(seat: number, inputs: { left: boolean; right: boolean }): void {
    const c = this.#cycles[seat];
    if (!c || !c.alive) return;
    // turns only count once the race is on (presses in the countdown would fire at the start)
    const racing = this.#phase === "playing";
    if (racing && inputs.left && !c.left && c.turns.length < MAX_QUEUED_TURNS) c.turns.push(-1);
    if (racing && inputs.right && !c.right && c.turns.length < MAX_QUEUED_TURNS) c.turns.push(1);
    c.left = inputs.left;
    c.right = inputs.right;
  }

  private stepsPerSecond(): number {
    return Math.min(MAX_SPS, START_SPS + Math.floor(this.#elapsed / RAMP_S));
  }

  /** advance by dt seconds; returns one delta per simulation step taken */
  tick(dt: number): CyclesDelta[] {
    if (this.#phase === "over") return [];
    if (this.#phase === "countdown") {
      this.#countdown = Math.max(0, this.#countdown - dt);
      if (this.#countdown === 0) this.#phase = "playing";
      return [];
    }
    this.#elapsed += dt;
    this.#acc += dt;
    const out: CyclesDelta[] = [];
    let interval = 1 / this.stepsPerSecond();
    while (this.#acc >= interval && this.#phase === "playing") {
      this.#acc -= interval;
      out.push(this.advance());
      interval = 1 / this.stepsPerSecond();
    }
    return out;
  }

  private advance(): CyclesDelta {
    this.#step++;
    const riding = this.#cycles.filter((c) => c.alive);
    const targets = new Map<Cycle, number>();
    const count = new Map<number, number>();
    for (const c of riding) {
      const turn = c.turns.shift();
      if (turn !== undefined) c.dir = (((c.dir + turn) % 4) + 4) % 4 as CycleDir;
      const nx = c.x + DX[c.dir];
      const ny = c.y + DY[c.dir];
      const idx = nx < 0 || ny < 0 || nx >= CYCLES_SIZE || ny >= CYCLES_SIZE ? -1 : ny * CYCLES_SIZE + nx;
      targets.set(c, idx);
      if (idx >= 0) count.set(idx, (count.get(idx) ?? 0) + 1);
    }
    const crashed: Cycle[] = [];
    for (const c of riding) {
      const idx = targets.get(c)!;
      if (idx < 0 || this.#grid[idx] !== -1 || (count.get(idx) ?? 0) > 1) crashed.push(c);
    }
    for (const c of riding) {
      if (crashed.includes(c)) continue;
      const idx = targets.get(c)!;
      c.x = idx % CYCLES_SIZE;
      c.y = Math.floor(idx / CYCLES_SIZE);
      this.#grid[idx] = c.seat;
      c.trail.push(idx);
    }
    for (const c of crashed) this.crash(c);
    if (crashed.length) this.#out.push(crashed.map((c) => c.seat));
    this.checkOver();
    return this.delta(crashed.map((c) => c.seat));
  }

  private crash(c: Cycle) {
    c.alive = false;
    c.turns = [];
    for (const idx of c.trail) if (this.#grid[idx] === c.seat) this.#grid[idx] = -1;
    c.trail = [];
  }

  private checkOver() {
    const left = this.#cycles.filter((c) => c.alive);
    if (left.length <= 1) {
      this.#phase = "over";
      this.#winner = left[0]?.seat ?? null;
    }
  }

  /** a player left or forfeited: they crash now; returns the delta to broadcast */
  eliminate(seat: number): CyclesDelta | null {
    const c = this.#cycles[seat];
    if (!c || !c.alive || this.#phase === "over") return null;
    this.crash(c);
    this.#out.push([seat]);
    this.checkOver();
    return this.delta([seat]);
  }

  private heads(): CycleHead[] {
    return this.#cycles.map((c) => ({ seat: c.seat, x: c.x, y: c.y, dir: c.dir, alive: c.alive }));
  }

  private delta(crashed: number[]): CyclesDelta {
    return { step: this.#step, phase: this.#phase, heads: this.heads(), crashed, winner: this.#winner };
  }

  getState(): CyclesState {
    return {
      kind: "cycles",
      phase: this.#phase,
      size: CYCLES_SIZE,
      step: this.#step,
      countdownIn: this.#countdown,
      cycles: this.#cycles.map((c) => ({ seat: c.seat, x: c.x, y: c.y, dir: c.dir, alive: c.alive, trail: [...c.trail] })),
      eliminated: this.#out.flat(),
      winner: this.#winner,
    };
  }

  /** 1 = winner; crashing in the same step shares a place; the earliest out is last */
  standings(): { seat: number; place: number; lives: number }[] {
    const rows: { seat: number; place: number; lives: number }[] = [];
    let place = 1;
    const alive = this.#cycles.filter((c) => c.alive).map((c) => c.seat);
    for (const seat of alive) rows.push({ seat, place, lives: 1 });
    place += alive.length;
    for (let i = this.#out.length - 1; i >= 0; i--) {
      const group = this.#out[i]!;
      for (const seat of group) rows.push({ seat, place, lives: 0 });
      place += group.length;
    }
    return rows;
  }
}

/** The browser's copy: apply a step's delta to the last full state (heads become trail cells). */
export function applyCyclesDelta(s: CyclesState, d: CyclesDelta): CyclesState {
  const cycles = s.cycles.map((c) => {
    const h = d.heads.find((x) => x.seat === c.seat);
    if (!h) return c;
    if (d.crashed.includes(c.seat)) return { ...c, ...h, alive: false, trail: [] };
    const idx = h.y * s.size + h.x;
    const moved = h.alive && c.trail[c.trail.length - 1] !== idx;
    return { ...c, ...h, trail: moved ? [...c.trail, idx] : c.trail };
  });
  return {
    ...s,
    phase: d.phase,
    step: d.step,
    countdownIn: 0,
    cycles,
    eliminated: d.crashed.length ? [...s.eliminated, ...d.crashed] : s.eliminated,
    winner: d.winner,
  };
}
