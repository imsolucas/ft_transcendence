"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "@/lib/prefs";

/**
 * BIT, VOLLEY.EXE's mascot: an original 16×16 pixel bot (round cyan body, visor face, antenna).
 * Sprite frames are drawn in code (no image files) and play at ~6 fps in steps, like an
 * arcade sprite. Decorative: hidden from screen readers. Reduced motion: the first frame only.
 *
 * Pixel art colours are artwork, not UI tokens (same rule as the avatar palettes).
 */
export type BitMood = "idle" | "wave" | "cheer" | "sad";

const PALETTE: Record<string, string> = {
  K: "#0b0614", // outline
  C: "#2de2e6", // body
  c: "#1a9ea3", // body shade
  V: "#1b1124", // visor
  E: "#ff2e97", // eyes
  W: "#f3eeff", // shine
  A: "#7c66ad", // antenna / feet
  T: "#ffb000", // antenna tip
};

const BASE = [
  "................",
  ".......TT.......",
  "........A.......",
  "........A.......",
  "....KKKKKKKK....",
  "...KCCCCCCCCK...",
  "..KCWCCCCCCCCK..",
  "..KCVVVVVVVVCK..",
  "..KCVEEVVEEVCK..",
  "..KCVEEVVEEVCK..",
  "..KCVVVVVVVVCK..",
  "..KCCCCCCCCCCK..",
  "...KcCCCCCCcK...",
  "....KKKKKKKK....",
  "....AA....AA....",
  "................",
];

type Rows = string[];
const set = (rows: Rows, y: number, x: number, ch: string) => {
  const r = rows[y]!;
  rows[y] = r.slice(0, x) + ch + r.slice(x + 1);
};
const copy = (rows: Rows) => [...rows];
/** body up by n rows (feet stay), for jumps */
const lift = (rows: Rows, n: number) => {
  const out = copy(rows);
  for (let y = 0; y < 14; y++) out[y] = rows[y + n] ?? "................";
  out[14] = rows[14]!;
  out[15] = rows[15]!;
  return out;
};

function frames(mood: BitMood): Rows[] {
  const a = copy(BASE);
  switch (mood) {
    case "idle": {
      // blink + antenna tip wobble
      const b = copy(BASE);
      b[8] = "..KCVVVVVVVVCK..";
      b[9] = "..KCVEEVVEEVCK..";
      b[1] = "........TT......";
      return [a, a, a, b];
    }
    case "wave": {
      const up = copy(BASE);
      set(up, 4, 13, "C");
      set(up, 3, 14, "C");
      set(up, 2, 14, "C");
      const down = copy(BASE);
      set(down, 6, 14, "C");
      set(down, 5, 15, "C");
      set(down, 4, 15, "C");
      return [up, down];
    }
    case "cheer": {
      // ^ ^ eyes, both arms up, jumping
      const happy = copy(BASE);
      happy[8] = "..KCVVEVVEVVCK..";
      happy[9] = "..KCVEVVVVEVCK..";
      for (const x of [1, 14]) {
        set(happy, 5, x, "C");
        set(happy, 4, x, "C");
      }
      return [lift(happy, 1), happy];
    }
    case "sad": {
      // eyes down, antenna drooped, slumped
      const s = copy(BASE);
      s[8] = "..KCVVVVVVVVCK..";
      s[9] = "..KCVEEVVEEVCK..";
      s[10] = "..KCVEEVVEEVCK..";
      s[1] = "......TT........";
      s[2] = ".......A........";
      const s2 = copy(s);
      s2[1] = ".....TT.........";
      return [s, s, s2];
    }
  }
}

function Sprite({ rows }: { rows: Rows }) {
  const rects: { x: number; y: number; w: number; c: string }[] = [];
  rows.forEach((row, y) => {
    let x = 0;
    while (x < 16) {
      const ch = row[x]!;
      let w = 1;
      while (x + w < 16 && row[x + w] === ch) w++;
      if (ch !== ".") rects.push({ x, y, w, c: PALETTE[ch]! });
      x += w;
    }
  });
  return (
    <>
      {rects.map((r) => (
        <rect key={`${r.x}-${r.y}`} x={r.x} y={r.y} width={r.w} height={1} fill={r.c} />
      ))}
    </>
  );
}

export function Bit({ mood = "idle", size = 64, className }: { mood?: BitMood; size?: number; className?: string }) {
  const reduced = useReducedMotion();
  const list = frames(mood);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (reduced || list.length < 2) return;
    const id = setInterval(() => setTick((t) => t + 1), mood === "idle" ? 450 : 170);
    return () => clearInterval(id);
  }, [reduced, mood, list.length]);
  const rows = list[reduced ? 0 : tick % list.length]!;
  return (
    <svg className={"bit " + (className ?? "")} width={size} height={size} viewBox="0 0 16 16" shapeRendering="crispEdges" aria-hidden focusable="false">
      <Sprite rows={rows} />
    </svg>
  );
}
