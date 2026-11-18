/**
 * Player looks: a 12×12 pixel avatar built from parts, an avatar frame and a paddle skin.
 * Shared by web (rendering, builder), users (validation, defaults) and game (paddle skins).
 * Pure data and functions: no DOM, no Node APIs.
 *
 * The pixel-art palettes below are artwork, not UI colours, so they are listed here as hex
 * values on purpose (UI colours still come from the design tokens).
 */

/** Achievement ids (kept in sync with AchievementId in types/api.types.ts) */
type AchievementRef = "first_win" | "ten_wins" | "fifty_wins" | "regular" | "streak_5" | "shutout" | "champion" | "social";

export type Unlock = { level: number } | { achievement: AchievementRef } | null;

export interface AvatarSpec {
  v: 1;
  skin: number;
  hair: number;
  hairColor: number;
  eyes: number;
  mouth: number;
  shirt: number;
  bg: number;
  item: number;
}

export const FRAME_IDS = ["none", "neon", "duo", "gold", "glitch"] as const;
export type FrameId = (typeof FRAME_IDS)[number];
export const PADDLE_IDS = ["classic", "hollow", "striped", "pixel", "gold", "prism"] as const;
export type PaddleSkinId = (typeof PADDLE_IDS)[number];

export interface PlayerLook {
  pixel: AvatarSpec;
  frame: FrameId;
  paddle: PaddleSkinId;
}

// ---------------------------------------------------------------- catalog

type Rows = readonly string[];
interface Part {
  id: string;
  unlock: Unlock;
  rows: Rows;
}

const SKINS: { id: string; unlock: Unlock; base: string; shade: string }[] = [
  { id: "porcelain", unlock: null, base: "#f6d7b0", shade: "#dcb48a" },
  { id: "sand", unlock: null, base: "#e8b98a", shade: "#c99868" },
  { id: "copper", unlock: null, base: "#c98b5b", shade: "#a66d42" },
  { id: "umber", unlock: null, base: "#a0663d", shade: "#7f4e2c" },
  { id: "ebony", unlock: null, base: "#6e4426", shade: "#52311a" },
  { id: "synth", unlock: { level: 10 }, base: "#7fe3c4", shade: "#4fb79a" },
];
const HAIR_COLORS = ["#1b1424", "#4a2f1f", "#b5651d", "#f2d16b", "#e8e6f0", "#ff2e97", "#22e6ff", "#7cff6b"];
const SHIRTS = ["#ff2e97", "#22e6ff", "#ffb02e", "#7cff6b", "#9b5cff", "#e8e6f0"];
const BACKGROUNDS = ["#2a1745", "#13294b", "#3a1030", "#0f3b33", "#3b2a0b", "#1a1a2e"];
const INK = { eye: "#0b0614", white: "#ffffff", mouth: "#7a2a3a" };

// rows 0..11; "." = transparent. Letters: H hair, E eye, W white, M mouth, A/a item colours.
const HAIRS: Part[] = [
  { id: "short", unlock: null, rows: ["", "...HHHHHH...", "..HHHHHHHH..", "..H......H.."] },
  { id: "spiky", unlock: null, rows: ["...H.H.H.H..", "..HHHHHHHH..", "..HHHHHHHH..", "..H......H.."] },
  { id: "long", unlock: null, rows: ["", "...HHHHHH...", "..HHHHHHHH..", ".HH......HH.", ".H........H.", ".H........H.", ".H........H.", ".H........H.", ".H........H."] },
  { id: "afro", unlock: null, rows: ["..HHHHHHHH..", ".HHHHHHHHHH.", ".HHHHHHHHHH.", ".HH......HH.", ".H........H."] },
  { id: "bald", unlock: null, rows: [] },
  { id: "mohawk", unlock: { level: 3 }, rows: [".....HH.....", ".....HH.....", "....HHHH...."] },
  { id: "bun", unlock: { level: 5 }, rows: [".....HH.....", "....HHHH....", "..HHHHHHHH..", "..H......H.."] },
];
const EYES: Part[] = [
  { id: "dots", unlock: null, rows: ["", "", "", "", "", "....E..E...."] },
  { id: "wide", unlock: null, rows: ["", "", "", "", "", "...WE..WE..."] },
  { id: "sleepy", unlock: null, rows: ["", "", "", "", "", "...EE..EE..."] },
  { id: "wink", unlock: { level: 2 }, rows: ["", "", "", "", "", "...WE..EE..."] },
];
const MOUTHS: Part[] = [
  { id: "smile", unlock: null, rows: ["", "", "", "", "", "", "", "...M....M...", "....MMMM...."] },
  { id: "flat", unlock: null, rows: ["", "", "", "", "", "", "", "", "....MMMM...."] },
  { id: "open", unlock: null, rows: ["", "", "", "", "", "", "", ".....MM.....", ".....MM....."] },
  { id: "grin", unlock: { level: 4 }, rows: ["", "", "", "", "", "", "", "", "....MWWM...."] },
];
const ITEMS: (Part & { colors: { A: string; a: string } })[] = [
  { id: "none", unlock: null, rows: [], colors: { A: "", a: "" } },
  { id: "headband", unlock: null, rows: ["", "", "", "..AAAAAAAA.."], colors: { A: "#ff2e97", a: "#ff2e97" } },
  { id: "shades", unlock: { level: 2 }, rows: ["", "", "", "", "", "..AaaAAaaA.."], colors: { A: "#0b0614", a: "#22e6ff" } },
  { id: "visor", unlock: { level: 6 }, rows: ["", "", "", "", "..AAAAAAAA..", "..aaaaaaaa.."], colors: { A: "#1b1424", a: "#22e6ff" } },
  { id: "headphones", unlock: { achievement: "social" }, rows: ["", "", "..aaaaaaaa..", ".A........A.", "AA........AA", "AA........AA"], colors: { A: "#1b1424", a: "#ff2e97" } },
  { id: "horns", unlock: { achievement: "streak_5" }, rows: ["..A......A..", "..AA....AA.."], colors: { A: "#ff4d4d", a: "#ff4d4d" } },
  { id: "crown", unlock: { achievement: "champion" }, rows: ["...A..A..A..", "...AAAAAAA.."], colors: { A: "#ffb02e", a: "#ffb02e" } },
  { id: "halo", unlock: { level: 15 }, rows: ["...aaaaaa..."], colors: { A: "#fff3a0", a: "#fff3a0" } },
];
const HEAD: Rows = ["", "", "...SSSSSS...", "..SSSSSSSS..", "..SSSSSSSS..", "..SSSSSSSS..", ".sSSSSSSSSs.", "..SSSSSSSS..", "..SSSSSSSS..", "...SSSSSS..."];
const BODY: Rows = ["", "", "", "", "", "", "", "", "", "", "..CCCssCCC..", ".CCCCCCCCCC."];

export const FRAMES: { id: FrameId; unlock: Unlock }[] = [
  { id: "none", unlock: null },
  { id: "neon", unlock: { level: 3 } },
  { id: "duo", unlock: { level: 8 } },
  { id: "gold", unlock: { achievement: "champion" } },
  { id: "glitch", unlock: { level: 15 } },
];
export const PADDLES: { id: PaddleSkinId; unlock: Unlock }[] = [
  { id: "classic", unlock: null },
  { id: "hollow", unlock: { level: 2 } },
  { id: "striped", unlock: { level: 4 } },
  { id: "pixel", unlock: { level: 7 } },
  { id: "gold", unlock: { achievement: "ten_wins" } },
  { id: "prism", unlock: { level: 12 } },
];

/** Builder catalog: every option per slot, in display order (index = value in AvatarSpec). */
export const AVATAR_PARTS = {
  skin: SKINS.map((s) => ({ id: s.id, unlock: s.unlock, swatch: s.base })),
  hair: HAIRS.map((p) => ({ id: p.id, unlock: p.unlock })),
  hairColor: HAIR_COLORS.map((c, i) => ({ id: `c${i}`, unlock: null as Unlock, swatch: c })),
  eyes: EYES.map((p) => ({ id: p.id, unlock: p.unlock })),
  mouth: MOUTHS.map((p) => ({ id: p.id, unlock: p.unlock })),
  shirt: SHIRTS.map((c, i) => ({ id: `c${i}`, unlock: null as Unlock, swatch: c })),
  bg: BACKGROUNDS.map((c, i) => ({ id: `c${i}`, unlock: null as Unlock, swatch: c })),
  item: ITEMS.map((p) => ({ id: p.id, unlock: p.unlock })),
} as const;
export type AvatarSlot = keyof typeof AVATAR_PARTS;
export const AVATAR_SLOTS = Object.keys(AVATAR_PARTS) as AvatarSlot[];

// ---------------------------------------------------------------- unlocks

export interface Progress {
  level: number;
  achievements: readonly string[];
}

export function isUnlocked(unlock: Unlock, p: Progress): boolean {
  if (!unlock) return true;
  if ("level" in unlock) return p.level >= unlock.level;
  return p.achievements.includes(unlock.achievement);
}

/** Every locked option the player has unlocked, as "slot:id" / "frame:id" / "paddle:id". */
export function unlockedKeys(p: Progress): string[] {
  const keys: string[] = [];
  for (const slot of AVATAR_SLOTS) {
    for (const opt of AVATAR_PARTS[slot]) if (opt.unlock && isUnlocked(opt.unlock, p)) keys.push(`${slot}:${opt.id}`);
  }
  for (const f of FRAMES) if (f.unlock && isUnlocked(f.unlock, p)) keys.push(`frame:${f.id}`);
  for (const k of PADDLES) if (k.unlock && isUnlocked(k.unlock, p)) keys.push(`paddle:${k.id}`);
  return keys;
}

/** Shape check (any input) → a valid look, or null. Doesn't check unlocks. */
export function parseLook(raw: unknown): PlayerLook | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const px = r.pixel as Record<string, unknown> | undefined;
  if (!px || typeof px !== "object" || px.v !== 1) return null;
  const pixel = { v: 1 } as AvatarSpec;
  for (const slot of AVATAR_SLOTS) {
    const n = px[slot];
    if (typeof n !== "number" || !Number.isInteger(n) || n < 0 || n >= AVATAR_PARTS[slot].length) return null;
    pixel[slot] = n;
  }
  if (!FRAME_IDS.includes(r.frame as FrameId) || !PADDLE_IDS.includes(r.paddle as PaddleSkinId)) return null;
  return { pixel, frame: r.frame as FrameId, paddle: r.paddle as PaddleSkinId };
}

/** The first locked choice in `look` the player hasn't unlocked ("slot:id"), or null. */
export function firstLocked(look: PlayerLook, p: Progress): string | null {
  for (const slot of AVATAR_SLOTS) {
    const opt = AVATAR_PARTS[slot][look.pixel[slot]]!;
    if (!isUnlocked(opt.unlock, p)) return `${slot}:${opt.id}`;
  }
  const f = FRAMES.find((x) => x.id === look.frame)!;
  if (!isUnlocked(f.unlock, p)) return `frame:${f.id}`;
  const k = PADDLES.find((x) => x.id === look.paddle)!;
  if (!isUnlocked(k.unlock, p)) return `paddle:${k.id}`;
  return null;
}

// ---------------------------------------------------------------- defaults

/** Small deterministic PRNG (mulberry32) so a player's default avatar never changes. */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The default look for a user id: a random-looking avatar made of free parts only. */
export function defaultLook(userId: number): PlayerLook {
  const next = rng(userId * 2654435761);
  const pick = (slot: AvatarSlot) => {
    const free = AVATAR_PARTS[slot].map((o, i) => (o.unlock ? -1 : i)).filter((i) => i >= 0);
    return free[Math.floor(next() * free.length)]!;
  };
  const pixel = { v: 1 } as AvatarSpec;
  for (const slot of AVATAR_SLOTS) pixel[slot] = pick(slot);
  // most default players have no item; a few start with a headband
  pixel.item = next() < 0.8 ? 0 : 1;
  return { pixel, frame: "none", paddle: "classic" };
}

/** A stored look if valid, else the generated default (never fails). */
export function lookFor(userId: number, stored: unknown): PlayerLook {
  return parseLook(stored) ?? defaultLook(userId);
}

// ---------------------------------------------------------------- rendering

export const AVATAR_GRID = 12;

/** Horizontal runs of one colour: { x, y, w, c } (rendered as SVG rects or on a canvas). */
export function avatarRuns(spec: AvatarSpec): { x: number; y: number; w: number; c: string }[] {
  const grid: (string | null)[][] = Array.from({ length: AVATAR_GRID }, () => Array<string | null>(AVATAR_GRID).fill(BACKGROUNDS[spec.bg] ?? BACKGROUNDS[0]!));
  const skin = SKINS[spec.skin] ?? SKINS[0]!;
  const paint = (rows: Rows, colour: (ch: string) => string | null) => {
    rows.forEach((row, y) => {
      for (let x = 0; x < row.length && x < AVATAR_GRID; x++) {
        const ch = row[x]!;
        if (ch === ".") continue;
        const c = colour(ch);
        if (c) grid[y]![x] = c;
      }
    });
  };
  paint(BODY, (ch) => (ch === "C" ? (SHIRTS[spec.shirt] ?? SHIRTS[0]!) : ch === "s" ? skin.shade : null));
  paint(HEAD, (ch) => (ch === "S" ? skin.base : ch === "s" ? skin.shade : null));
  paint(EYES[spec.eyes]?.rows ?? [], (ch) => (ch === "E" ? INK.eye : ch === "W" ? INK.white : null));
  paint(MOUTHS[spec.mouth]?.rows ?? [], (ch) => (ch === "M" ? INK.mouth : ch === "W" ? INK.white : null));
  paint(HAIRS[spec.hair]?.rows ?? [], (ch) => (ch === "H" ? (HAIR_COLORS[spec.hairColor] ?? HAIR_COLORS[0]!) : null));
  const item = ITEMS[spec.item];
  if (item) paint(item.rows, (ch) => (ch === "A" ? item.colors.A : ch === "a" ? item.colors.a : null));

  const runs: { x: number; y: number; w: number; c: string }[] = [];
  grid.forEach((row, y) => {
    let x = 0;
    while (x < AVATAR_GRID) {
      const c = row[x]!;
      let w = 1;
      while (x + w < AVATAR_GRID && row[x + w] === c) w++;
      if (c) runs.push({ x, y, w, c });
      x += w;
    }
  });
  return runs;
}
