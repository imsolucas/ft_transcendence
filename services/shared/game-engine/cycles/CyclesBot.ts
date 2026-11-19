import type { CycleDir } from "../../types/cycles.types.ts";
import { CYCLES_SIZE, type CyclesEngine } from "./CyclesEngine.ts";

/**
 * A Light Cycles bot: once per step it scores going straight, left and right by how much open
 * arena each leads to (a capped flood fill), never rides into a wall or trail it can see, and
 * (normal / hard) avoids the cell another rider is about to enter (a head-on crash kills both).
 * Difficulty is how far it looks and how often it slips. Pure: pass `rand` for the slips.
 */
export type CyclesBotLevel = "easy" | "normal" | "hard";
/** -1 left, 0 straight, 1 right (relative to where the cycle is heading) */
export type CyclesTurn = -1 | 0 | 1;

const DX = [0, 1, 0, -1] as const;
const DY = [-1, 0, 1, 0] as const;

const LEVELS: Record<CyclesBotLevel, { look: number; slip: number; wander: number; headOn: boolean }> = {
  // short sight, and now and then picks any open way, even a dead end
  easy: { look: 40, slip: 0.1, wander: 0.05, headOn: false },
  normal: { look: 220, slip: 0.025, wander: 0.02, headOn: true },
  hard: { look: 1200, slip: 0, wander: 0.01, headOn: true },
};

/** open cells reachable from (x, y), counting up to `cap` */
function space(engine: CyclesEngine, x: number, y: number, cap: number): number {
  const seen = new Uint8Array(CYCLES_SIZE * CYCLES_SIZE);
  const queue = [y * CYCLES_SIZE + x];
  seen[queue[0]!] = 1;
  let count = 0;
  for (let i = 0; i < queue.length && count < cap; i++) {
    const idx = queue[i]!;
    count++;
    const cx = idx % CYCLES_SIZE;
    const cy = (idx - cx) / CYCLES_SIZE;
    for (let d = 0; d < 4; d++) {
      const nx = cx + DX[d]!;
      const ny = cy + DY[d]!;
      if (!engine.isFree(nx, ny)) continue;
      const n = ny * CYCLES_SIZE + nx;
      if (seen[n]) continue;
      seen[n] = 1;
      queue.push(n);
    }
  }
  return count;
}

/** another rider's next cell if it keeps going straight */
function headOn(engine: CyclesEngine, seat: number, x: number, y: number): boolean {
  for (let s = 0; s < engine.riders; s++) {
    if (s === seat) continue;
    const r = engine.rider(s);
    if (r?.alive && r.x + DX[r.dir] === x && r.y + DY[r.dir] === y) return true;
  }
  return false;
}

export function chooseTurn(engine: CyclesEngine, seat: number, level: CyclesBotLevel, rand: () => number = Math.random): CyclesTurn {
  const me = engine.rider(seat);
  if (!me || !me.alive) return 0;
  const cfg = LEVELS[level];
  // straight first: on a tie the bot keeps its line instead of zig-zagging
  const options = ([0, -1, 1] as const).map((turn) => {
    const dir = (((me.dir + turn) % 4) + 4) % 4 as CycleDir;
    const nx = me.x + DX[dir];
    const ny = me.y + DY[dir];
    if (!engine.isFree(nx, ny)) return { turn, score: -1 };
    let score = space(engine, nx, ny, cfg.look);
    if (cfg.headOn && headOn(engine, seat, nx, ny)) score = Math.min(score, 1);
    return { turn, score };
  });
  const open = options.filter((o) => o.score > 0);
  if (open.length === 0) return 0;
  if (rand() < cfg.slip) return open[Math.floor(rand() * open.length)]!.turn;
  let best = open[0]!;
  for (const o of open) if (o.score > best.score) best = o;
  // a little variety: sometimes take another way that is nearly as roomy
  if (rand() < cfg.wander) {
    const close = open.filter((o) => o.score >= best.score * 0.9);
    return close[Math.floor(rand() * close.length)]!.turn;
  }
  return best.turn;
}
