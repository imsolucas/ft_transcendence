"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "@/lib/prefs";

/**
 * A number that counts up to its value in arcade steps (score-counter style, ~0.5 s).
 * Screen readers get the final value straight away; reduced motion shows it directly.
 */
export function TickNumber({ value, format = String, className }: { value: number; format?: (n: number) => string; className?: string }) {
  const reduced = useReducedMotion();
  const [shown, setShown] = useState(reduced ? value : 0);
  // what is on screen right now: a new value counts on from there, not from the last target
  const from = useRef(0);
  const showing = useRef(0);
  useEffect(() => {
    showing.current = shown;
  }, [shown]);
  useEffect(() => {
    if (reduced) {
      from.current = value;
      return;
    }
    const start = performance.now();
    const begin = from.current;
    const STEPS = 12;
    const DURATION = 480;
    let raf = 0;
    const step = (now: number) => {
      const k = Math.min(1, Math.floor(((now - start) / DURATION) * STEPS) / STEPS);
      setShown(Math.round(begin + (value - begin) * k));
      if (k < 1) raf = requestAnimationFrame(step);
      else from.current = value;
    };
    raf = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(raf);
      from.current = showing.current;
    };
  }, [value, reduced]);
  return (
    <span className={className}>
      <span aria-hidden>{format(reduced ? value : shown)}</span>
      <span className="sr-only">{format(value)}</span>
    </span>
  );
}
