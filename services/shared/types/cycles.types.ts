// ---------------------------------------------------------------- Light Cycles (2–4 players)
// A party game (same rooms, queue, ready check and results as party Pong). The server runs
// CyclesEngine; partyStart carries the full CyclesState, then every step is a small delta.

/** 0 up, 1 right, 2 down, 3 left (clockwise) */
export type CycleDir = 0 | 1 | 2 | 3;

export interface CycleHead {
  seat: number;
  x: number;
  y: number;
  dir: CycleDir;
  alive: boolean;
}

export interface CycleView extends CycleHead {
  /** cells (y * size + x), oldest first; cleared when the cycle crashes */
  trail: number[];
}

export interface CyclesState {
  kind: "cycles";
  phase: "countdown" | "playing" | "over";
  size: number;
  step: number;
  /** seconds left in the countdown */
  countdownIn: number;
  cycles: CycleView[];
  /** seats in the order they crashed */
  eliminated: number[];
  winner: number | null;
}

/** one simulation step */
export interface CyclesDelta {
  step: number;
  phase: CyclesState["phase"];
  heads: CycleHead[];
  /** seats that crashed this step (their trails clear) */
  crashed: number[];
  winner: number | null;
}

/** which game a party room plays */
export type PartyGame = "pong" | "cycles";
