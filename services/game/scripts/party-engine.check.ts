// Headless checks of the party engine (3 and 4 players). No server, no browser.
// Run from services/game: npm run party:check
import assert from "node:assert/strict";
import { PartyEngine, partyDefaults as D, alongSide, edgeDistance, paddleWorld, type PartySide, type PartyState } from "shared";

const DT = 1 / 60;
let passed = 0;
function test(name: string, fn: () => void) {
  fn();
  passed++;
  process.stdout.write(`ok - ${name}\n`);
}

/**
 * Imperfect, deterministic bots: each follows where the ball was a reaction time ago (like a
 * human), so fast balls get past them. skill 1 ≈ 120 ms, skill 0 ≈ 400 ms.
 */
const history: PartyState[] = [];
function botInputs(state: PartyState, skill: number[]) {
  history.push(state);
  if (history.length > 30) history.shift();
  return state.paddles.map((p) => {
    const s0 = skill[p.seat] ?? 0;
    const lag = Math.round(7 + (1 - s0) * 17);
    const seen = history[Math.max(0, history.length - 1 - lag)]!;
    const target = alongSide(p.side, seen.ball.x, seen.ball.y);
    const s = skill[p.seat] ?? 0;
    const dead = 2 + (1 - s) * 12; // worse bots wait longer before moving
    return { left: target < p.pos - dead, right: target > p.pos + dead };
  });
}

interface RunResult {
  states: string[];
  final: PartyState;
  ticks: number;
}

/** Runs a full game, checking invariants every tick. */
function run(players: 3 | 4, seed: number, skill: number[], opts: { record?: boolean; maxTicks?: number; onTick?: (e: PartyEngine, t: number) => void } = {}): RunResult {
  const e = new PartyEngine(players, seed);
  history.length = 0;
  const states: string[] = [];
  let prev = e.getState();
  let t = 0;
  const max = opts.maxTicks ?? 60 * 60 * 20;
  while (!e.over && t < max) {
    botInputs(prev, skill).forEach((inp, seat) => e.input(seat, inp));
    opts.onTick?.(e, t);
    e.tick(DT);
    const s = e.getState();
    if (opts.record) states.push(JSON.stringify(s));

    // walls (missing 4th side, eliminated sides) never let the ball out
    for (let side = 0 as PartySide; side < 4; side = (side + 1) as PartySide) {
      // a wall since the previous tick (a side knocked out this tick still has the ball behind it)
      const seat = prev.paddles[side];
      const isWall = !seat || !seat.alive;
      if (isWall) assert.ok(edgeDistance(side, s.ball.x, s.ball.y) >= s.ball.r - 1e-9, `ball escaped through wall ${side} at tick ${t}: ${JSON.stringify(s.ball)} prev ${JSON.stringify(prev.ball)} ${prev.phase} ${JSON.stringify(prev.paddles)}`);
    }
    // lives only go down, one at a time, and only for alive seats
    s.paddles.forEach((p, i) => {
      const before = prev.paddles[i]!;
      assert.ok(p.lives <= before.lives, "lives went up");
      if (p.lives < before.lives && before.alive && p.alive) assert.equal(before.lives - p.lives, 1, "lost two lives at once");
      if (!p.alive) assert.equal(p.lives, 0, "an eliminated seat keeps lives");
      assert.ok(p.pos >= D.CORNER + D.PADDLE_LENGTH / 2 - 1e-9 && p.pos <= D.COURT - D.CORNER - D.PADDLE_LENGTH / 2 + 1e-9, "paddle left its track");
    });
    const totalBefore = prev.paddles.reduce((n, p) => n + p.lives, 0);
    const totalAfter = s.paddles.reduce((n, p) => n + p.lives, 0);
    if (totalAfter < totalBefore && s.phase !== "over") assert.equal(s.phase, "serving", "no pause after a life was lost");
    const speed = Math.hypot(s.ball.vx, s.ball.vy);
    assert.ok(speed <= D.BALL_SPEED_MAX + 1e-6, `ball too fast: ${speed}`);
    assert.ok(s.ball.x > -5 && s.ball.x < D.COURT + 5 && s.ball.y > -5 && s.ball.y < D.COURT + 5, "ball far outside the court");
    prev = s;
    t++;
  }
  return { states, final: e.getState(), ticks: t };
}

function checkFinished(r: RunResult, players: number) {
  const s = r.final;
  assert.equal(s.phase, "over", `game did not finish in ${r.ticks} ticks`);
  assert.equal(s.eliminated.length, players - 1, "everyone but one is out");
  assert.notEqual(s.winner, null);
  const w = s.paddles[s.winner!]!;
  assert.ok(w.alive && w.lives > 0, "the winner is alive");
  assert.ok(!s.eliminated.includes(s.winner!), "the winner was not eliminated");
  assert.equal(s.paddles.filter((p) => p.alive).length, 1, "exactly one player standing");
}

test("4 players: lives, elimination, last standing wins", () => {
  const r = run(4, 42, [0.9, 0.5, 0.7, 0.3]);
  checkFinished(r, 4);
  process.stdout.write(`    4p game: ${(r.ticks / 60).toFixed(1)} s, out in order ${r.final.eliminated.join(",")}, winner seat ${r.final.winner}\n`);
});

test("3 players: the 4th side is a wall, last standing wins", () => {
  for (const seed of [1, 2, 3, 7, 99]) {
    const r = run(3, seed, [0.6, 0.6, 0.6]);
    checkFinished(r, 3);
    assert.equal(r.final.paddles.length, 3);
  }
});

test("many seeds finish without escapes (3 and 4 players)", () => {
  for (let seed = 100; seed < 140; seed++) {
    checkFinished(run(seed % 2 ? 3 : 4, seed, [0.8, 0.4, 0.6, 0.2]), seed % 2 ? 3 : 4);
  }
});

test("determinism: same seed + inputs = same game; another seed differs", () => {
  const a = run(4, 1234, [0.7, 0.7, 0.7, 0.7], { record: true });
  const b = run(4, 1234, [0.7, 0.7, 0.7, 0.7], { record: true });
  assert.deepEqual(a.states, b.states);
  const c = run(4, 4321, [0.7, 0.7, 0.7, 0.7], { record: true });
  assert.notDeepEqual(a.states.slice(0, 600), c.states.slice(0, 600));
});

test("determinism holds with uneven dt (fixed sub-steps)", () => {
  const e1 = new PartyEngine(3, 5);
  const e2 = new PartyEngine(3, 5);
  for (let i = 0; i < 600; i++) {
    e1.tick(1 / 60);
    e2.tick(1 / 120);
    e2.tick(1 / 120);
  }
  // equal total time in steps of STEP: same state
  assert.deepEqual(e1.getState(), e2.getState());
});

test("eliminate(): the side becomes a wall and the ball bounces off it", () => {
  let checked = false;
  const r = run(4, 77, [0.9, 0.9, 0.9, 0.9], {
    onTick: (e, t) => {
      if (t === 10) e.eliminate(2);
      if (t > 10 && !checked) {
        const s = e.getState();
        assert.equal(s.paddles[2]!.alive, false);
        assert.equal(s.paddles[2]!.lives, 0);
        assert.deepEqual(s.eliminated.slice(0, 1), [2]);
        checked = true;
      }
    },
  });
  checkFinished(r, 4);
  assert.ok(r.final.eliminated[0] === 2);
});

test("eliminating all but one ends the game at once with that winner", () => {
  const e = new PartyEngine(3, 9);
  e.tick(1);
  e.eliminate(0);
  assert.equal(e.over, false);
  e.eliminate(2);
  assert.equal(e.over, true);
  assert.equal(e.winner, 1);
  const st = e.standings();
  assert.deepEqual(st.map((x) => [x.seat, x.place]), [[1, 1], [2, 2], [0, 3]]);
  // ticking a finished game is a no-op
  const before = JSON.stringify(e.getState());
  e.tick(1);
  assert.equal(JSON.stringify(e.getState()), before);
});

test("a life lost starts a serve pause and the ball goes back to the centre", () => {
  const e = new PartyEngine(4, 3);
  // nobody moves: someone loses a life soon
  let s = e.getState();
  let ticks = 0;
  while (s.paddles.every((p) => p.lives === D.LIVES) && ticks < 60 * 60) {
    e.tick(DT);
    s = e.getState();
    ticks++;
  }
  assert.ok(ticks < 60 * 60, "no life lost while idle");
  assert.equal(s.phase, "serving");
  assert.equal(s.ball.x, D.COURT / 2);
  assert.equal(s.ball.y, D.COURT / 2);
  assert.ok(Math.abs(s.serveIn - D.LOSS_PAUSE_S) < 0.05);
  assert.notEqual(s.lastLoss, null);
});

test("serve rotation: every alive seat is served once per round of the bag", () => {
  const served: number[] = [];
  let before = "serving";
  const r = run(4, 11, [0.5, 0.5, 0.5, 0.5], {
    onTick: (e) => {
      const s = e.getState();
      if (before === "serving" && s.phase === "playing" && s.eliminated.length === 0) served.push(s.serveTo!);
      before = s.phase;
    },
  });
  checkFinished(r, 4);
  assert.ok(served.length >= 4, `only ${served.length} serves before the first elimination`);
  for (let i = 0; i + 4 <= served.length; i += 4) assert.deepEqual([...served.slice(i, i + 4)].sort(), [0, 1, 2, 3], `round ${i / 4}: ${served.join(",")}`);
});

test("controls: right moves the paddle to its owner's right on every side", () => {
  for (const side of [0, 1, 2, 3] as PartySide[]) {
    const e = new PartyEngine(4, 1);
    const before = e.getState().paddles[side]!.pos;
    e.input(side, { left: false, right: true });
    e.tick(0.2);
    const after = e.getState().paddles[side]!.pos;
    assert.ok(after > before, `side ${side}: right did not increase pos`);
    // and in world terms, rotated so the side sits at the bottom, it moves to the screen's right
    const w0 = paddleWorld(side, before);
    const w1 = paddleWorld(side, after);
    const rot = (x: number, y: number) => {
      // rotate about the centre by -90°·side (the renderer's view rotation)
      const a = (-Math.PI / 2) * side;
      const dx = x - 50, dy = y - 50;
      return { x: 50 + dx * Math.cos(a) - dy * Math.sin(a), y: 50 + dx * Math.sin(a) + dy * Math.cos(a) };
    };
    const s0 = rot(w0.x, w0.y), s1 = rot(w1.x, w1.y);
    assert.ok(s1.x > s0.x + 1e-6, `side ${side}: not to the right on screen`);
    assert.ok(Math.abs(s0.y - (D.COURT - (D.PADDLE_INSET - D.PADDLE_THICKNESS / 2))) < 1e-6, `side ${side}: not at the bottom on screen`);
  }
});

test("constructor refuses anything but 3 or 4 players", () => {
  assert.throws(() => new PartyEngine(2, 1));
  assert.throws(() => new PartyEngine(5, 1));
});

process.stdout.write(`\n${passed} party engine checks passed\n`);
