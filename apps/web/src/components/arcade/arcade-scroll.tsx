"use client";

import { useEffect } from "react";
import { usePrefs, useReducedMotion } from "@/lib/prefs";

/** the page moves on a 4 px grid, one jump per arcade "frame" (~20 fps) */
const GRID = 4;
const FRAME_MS = 50;

/** Is there an inner scroll box (chat list, dialog, menu) under the pointer that should scroll instead? */
function innerScroller(target: EventTarget | null, dy: number): boolean {
  let el = target instanceof Element ? target : null;
  while (el && el !== document.body && el !== document.documentElement) {
    const oy = getComputedStyle(el).overflowY;
    if ((oy === "auto" || oy === "scroll") && el.scrollHeight > el.clientHeight) {
      const atTop = el.scrollTop <= 0;
      const atEnd = el.scrollTop + el.clientHeight >= el.scrollHeight - 1;
      if ((dy < 0 && !atTop) || (dy > 0 && !atEnd)) return true;
    }
    el = el.parentElement;
  }
  return false;
}

/**
 * Arcade scrolling (Arcade display on, motion allowed): the mouse wheel moves the page in
 * chunky steps snapped to a pixel grid at a low frame rate, like an arcade screen scrolling,
 * instead of the browser's smooth glide. Only the wheel: keyboard, scrollbar and touch
 * scrolling stay native. Inner scroll boxes and zoom (ctrl + wheel) are left alone.
 */
export function ArcadeScroll() {
  const { arcade } = usePrefs().prefs;
  const reduced = useReducedMotion();
  useEffect(() => {
    if (!arcade || reduced) return;
    let target = 0;
    let raf = 0;
    let last = 0;
    const max = () => document.documentElement.scrollHeight - window.innerHeight;
    const tick = (t: number) => {
      raf = 0;
      if (t - last < FRAME_MS) {
        raf = requestAnimationFrame(tick);
        return;
      }
      last = t;
      const cur = window.scrollY;
      const d = target - cur;
      if (Math.abs(d) <= GRID) {
        window.scrollTo({ top: target, behavior: "instant" });
        return;
      }
      // big jumps first, smaller ones as it lands: always whole grid cells
      const move = Math.sign(d) * Math.max(GRID, Math.round((Math.abs(d) * 0.5) / GRID) * GRID);
      window.scrollTo({ top: cur + move, behavior: "instant" });
      raf = requestAnimationFrame(tick);
    };
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.defaultPrevented || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      if (innerScroller(e.target, e.deltaY)) return;
      // a dialog has locked the page: leave the event to it
      if (getComputedStyle(document.body).overflowY === "hidden") return;
      e.preventDefault();
      const unit = e.deltaMode === 1 ? 40 : e.deltaMode === 2 ? window.innerHeight : 1;
      if (!raf) target = window.scrollY; // idle: start from where the page is (keyboard/scrollbar may have moved it)
      target = Math.round(Math.min(max(), Math.max(0, target + e.deltaY * unit)) / GRID) * GRID;
      if (!raf) {
        last = 0;
        raf = requestAnimationFrame(tick);
      }
    };
    window.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      window.removeEventListener("wheel", onWheel);
      cancelAnimationFrame(raf);
    };
  }, [arcade, reduced]);
  return null;
}
