/**
 * The arcade hall: one small single-screen room where players walk to cabinets. The game
 * server simulates everyone's movement from their input bits (authoritative); the browser
 * runs the same `moveInHall` to predict its own avatar and reconciles to the snapshots.
 *
 * Units are hall pixels: the room is HALL_W × HALL_H and the browser scales it up with hard
 * pixel edges. Positions are the avatar's feet.
 */

export const HALL_W = 480;
export const HALL_H = 270;
/** players per copy of the hall; more people open another copy */
export const HALL_CAPACITY = 20;
/** server simulation and snapshot rates */
export const HALL_SIM_HZ = 20;
export const HALL_SNAPSHOT_HZ = 10;
export const HALL_SPEED = 100;

/** input bits: 1 up, 2 down, 4 left, 8 right */
export const HALL_UP = 1;
export const HALL_DOWN = 2;
export const HALL_LEFT = 4;
export const HALL_RIGHT = 8;

export type CabinetId = "ranked" | "party" | "cycles" | "daily" | "watch" | "local" | "board";

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Cabinet {
  id: CabinetId;
  /** the machine itself (solid) */
  box: Rect;
  /** where to stand to use it */
  zone: Rect;
  /** web route it opens (with the query string the lobby uses) */
  path: string;
}

const cabinet = (id: CabinetId, x: number, path: string, w = 40): Cabinet => ({
  id,
  box: { x, y: 34, w, h: 50 },
  zone: { x: x - 6, y: 84, w: w + 12, h: 26 },
  path,
});

/** the back wall's machines, left to right, and the high-score board on the right */
export const CABINETS: readonly Cabinet[] = [
  cabinet("ranked", 20, "/play?mode=quick"),
  cabinet("party", 72, "/party"),
  cabinet("cycles", 124, "/party?game=cycles"),
  cabinet("daily", 176, "/daily"),
  cabinet("watch", 228, "/watch"),
  cabinet("local", 280, "/local"),
  { id: "board", box: { x: 380, y: 30, w: 76, h: 54 }, zone: { x: 374, y: 84, w: 88, h: 26 }, path: "/leaderboard" },
];

/** where you can't walk: the back wall, the machines, and a couch in the middle of the floor */
export const OBSTACLES: readonly Rect[] = [
  { x: 0, y: 0, w: HALL_W, h: 84 },
  { x: 196, y: 196, w: 88, h: 18 },
];

/** the floor's walkable bounds (feet) */
const MIN_X = 8;
const MAX_X = HALL_W - 8;
const MIN_Y = 86;
const MAX_Y = HALL_H - 6;
/** the feet's collision box */
const FOOT_W = 12;
const FOOT_H = 6;

export const HALL_SPAWN = { x: 240, y: 236 };

export interface HallPos {
  x: number;
  y: number;
  /** 1 = facing right, -1 = left */
  facing: 1 | -1;
}

const overlaps = (x: number, y: number, r: Rect) => x + FOOT_W / 2 > r.x && x - FOOT_W / 2 < r.x + r.w && y > r.y && y - FOOT_H < r.y + r.h;
const blocked = (x: number, y: number) => x < MIN_X || x > MAX_X || y < MIN_Y || y > MAX_Y || OBSTACLES.some((r) => overlaps(x, y, r));

/** one movement step; x and y move separately so you slide along walls */
export function moveInHall(p: HallPos, bits: number, dt: number): HallPos {
  let dx = (bits & HALL_RIGHT ? 1 : 0) - (bits & HALL_LEFT ? 1 : 0);
  let dy = (bits & HALL_DOWN ? 1 : 0) - (bits & HALL_UP ? 1 : 0);
  if (dx !== 0 && dy !== 0) {
    dx *= Math.SQRT1_2;
    dy *= Math.SQRT1_2;
  }
  const step = HALL_SPEED * Math.min(dt, 0.1);
  let { x, y } = p;
  // already inside something (e.g. an old spawn): any move is allowed, so you can walk out
  const stuck = blocked(x, y);
  const nx = x + dx * step;
  if (stuck || !blocked(nx, y)) x = nx;
  const ny = y + dy * step;
  if (stuck || !blocked(x, ny)) y = ny;
  return { x, y, facing: dx > 0 ? 1 : dx < 0 ? -1 : p.facing };
}

/** spawn spots below the couch: 3 rows of 8, none inside an obstacle */
const SPAWN_ROWS = [236, 252, 222];
export function spawnSpots(): HallPos[] {
  const spots: HallPos[] = [];
  for (const y of SPAWN_ROWS) for (let col = 0; col < 8; col++) spots.push({ x: HALL_SPAWN.x - 84 + col * 24, y, facing: col < 4 ? 1 : -1 });
  return spots.filter((s) => !blocked(s.x, s.y));
}

/** the first spawn spot nobody is standing on (others: current positions) */
export function spawnPoint(others: readonly { x: number; y: number }[]): HallPos {
  const spots = spawnSpots();
  return spots.find((s) => others.every((o) => Math.abs(o.x - s.x) > 10 || Math.abs(o.y - s.y) > 10)) ?? spots[others.length % spots.length]!;
}

/** the cabinet whose zone you're standing in, if any */
export function cabinetAt(x: number, y: number): Cabinet | null {
  return CABINETS.find((c) => x >= c.zone.x && x <= c.zone.x + c.zone.w && y >= c.zone.y && y <= c.zone.y + c.zone.h) ?? null;
}

export const HALL_EMOTES = ["hi", "gg", "play", "nice", "wow", "heart"] as const;
export type HallEmote = (typeof HALL_EMOTES)[number];
