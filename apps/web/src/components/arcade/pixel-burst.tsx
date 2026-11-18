"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "@/lib/prefs";

/** Square pixels flying out from the centre of the parent (position: relative), once. */
const DEFAULT_COLORS = ["var(--neon-amber)", "var(--neon-magenta)", "var(--neon-cyan)"];

export function PixelBurst({ count = 18, colors = DEFAULT_COLORS, radius = 120 }: { count?: number; colors?: string[]; radius?: number }) {
  const reduced = useReducedMotion();
  // positions are random: made after mount (never during render / on the server)
  const [bits, setBits] = useState<{ x: number; y: number; c: string; d: number }[]>([]);
  useEffect(() => {
    if (reduced) return;
    const id = requestAnimationFrame(() =>
      setBits(
        Array.from({ length: count }, (_, i) => {
          const a = (i / count) * Math.PI * 2 + Math.random() * 0.4;
          const r = radius * (0.55 + Math.random() * 0.45);
          // snap to a 6px grid: it should look like pixels, not confetti
          return { x: Math.round((Math.cos(a) * r) / 6) * 6, y: Math.round((Math.sin(a) * r) / 6) * 6, c: colors[i % colors.length]!, d: Math.floor(Math.random() * 3) * 40 };
        }),
      ),
    );
    return () => cancelAnimationFrame(id);
    // once per mount: re-randomising would make the squares jump mid-flight
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduced]);
  if (reduced || bits.length === 0) return null;
  return (
    <span className="arcade-burst" aria-hidden>
      {bits.map((b, i) => (
        <i key={i} style={{ "--x": `${b.x}px`, "--y": `${b.y}px`, "--c": b.c, "--d": `${b.d}ms` } as React.CSSProperties} />
      ))}
    </span>
  );
}
