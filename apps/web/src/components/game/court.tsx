"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { GameConfig, GameState, PaddleSkinId, PlayerInputs } from "shared";
import { drawFrame, readCourtColors } from "@/lib/game/renderer";
import { CourtFx, type ReplayFrame } from "@/lib/game/fx";
import { playSfx, unlockAudio } from "@/lib/game/sfx";
import { usePrefs, useReducedMotion } from "@/lib/prefs";
import { useI18n } from "@/i18n/I18nProvider";

const idle = (): PlayerInputs => ({ up: false, down: false, left: false, right: false, action_1: false, action_2: false });

/**
 * The game court: a canvas drawn every animation frame from `getState()`, sized to its
 * container with the court's 16:10 aspect (rotated on portrait phones), plus keyboard and
 * touch input.
 * - `controls="local"`: W/S drive player 1, ↑/↓ player 2 (two people, one keyboard).
 * - `controls="online"`: W/S and ↑/↓ both drive your own paddle.
 * - `controls="none"`: watching only (spectators): no keys, no touch buttons.
 */
export function Court({
  config,
  getState,
  youSide,
  controls,
  onInputs,
  paused = false,
  onFirstMove,
  skins,
  sound = true,
  onPoint,
}: {
  config: GameConfig;
  getState: () => GameState | null;
  youSide: 0 | 1 | null;
  controls: "local" | "online" | "none" | "attract";
  onInputs?: (p1: PlayerInputs, p2: PlayerInputs) => void;
  paused?: boolean;
  onFirstMove?: () => void;
  /** paddle skins by paddle index (0 = left), from each player's look */
  skins?: readonly [PaddleSkinId, PaddleSkinId];
  /** sound effects (also needs the user's sound preference); off for the landing demo */
  sound?: boolean;
  /** each finished point's frames, for the slow-motion replay on the end screen */
  onPoint?: (frames: ReplayFrame[]) => void;
}) {
  const { t } = useI18n();
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const inputs = useRef<[PlayerInputs, PlayerInputs]>([idle(), idle()]);
  const moved = useRef(false);
  const reduced = useReducedMotion();
  const { courtTheme, sound: soundPref } = usePrefs().prefs;
  const [vertical, setVertical] = useState(false);

  // Size the canvas to the container (device-pixel aware) and pick orientation
  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const fit = () => {
      const rect = wrap.getBoundingClientRect();
      // The design rotates the court on portrait phones; we keep it landscape (letterboxed) so
      // the up/down controls always match the paddle's on-screen direction.
      const portrait = false;
      setVertical(portrait);
      const aspect = portrait ? 100 / 160 : 160 / 100;
      let w = rect.width;
      let h = w / aspect;
      if (h > rect.height) {
        h = rect.height;
        w = h * aspect;
      }
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, []);

  // read by the render loop on every frame (no restart when a skin arrives)
  const skinsRef = useRef(skins);
  const soundRef = useRef(sound && soundPref);
  const onPointRef = useRef(onPoint);
  useEffect(() => {
    skinsRef.current = skins;
    soundRef.current = sound && soundPref;
    onPointRef.current = onPoint;
  }, [skins, sound, soundPref, onPoint]);

  // Effects (particles, shake, flash, sounds, replay recording); one per court, made in the loop
  const fxRef = useRef<CourtFx | null>(null);
  // the point still in progress is handed over when the court goes away (match over)
  useEffect(() => () => fxRef.current?.flush(), []);

  // Render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const colors = readCourtColors(canvas);
    let raf = 0;
    const fx = (fxRef.current ??= new CourtFx({
      onSound: (kind) => {
        if (soundRef.current) playSfx(kind);
      },
      onPoint: (frames) => onPointRef.current?.(frames),
    }));
    fx.reduced = reduced;
    fx.youSide = youSide;
    const loop = (now: number) => {
      const state = getState();
      if (state) {
        fx.update(state, now, colors);
        drawFrame(ctx, state, config, colors, {
          youSide,
          vertical,
          glow: !reduced,
          skins: skinsRef.current,
          overlay: (c, sx, sy, w, h) => fx.draw(c, sx, sy, now, w, h),
        });
        const o = fx.shakeOffset(now);
        canvas.style.transform = o.x || o.y ? `translate(${o.x.toFixed(1)}px, ${o.y.toFixed(1)}px)` : "";
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // courtTheme: the canvas' data-court-theme changes --court-*, so re-read the colours
  }, [config, getState, youSide, vertical, reduced, courtTheme]);

  // Keyboard
  useEffect(() => {
    if (controls === "none") return;
    const emit = () => onInputs?.({ ...inputs.current[0] }, { ...inputs.current[1] });
    const set = (e: KeyboardEvent, down: boolean) => {
      if (paused) return;
      // shortcuts (Ctrl+S, Cmd+W, …) belong to the browser, not the paddle
      if (down && (e.ctrlKey || e.metaKey || e.altKey)) return;
      const [p1, p2] = inputs.current;
      const k = e.key.toLowerCase();
      let handled = true;
      if (controls === "local") {
        if (k === "w") p1.up = down;
        else if (k === "s") p1.down = down;
        else if (e.key === "ArrowUp") p2.up = down;
        else if (e.key === "ArrowDown") p2.down = down;
        else handled = false;
      } else if (controls === "attract") {
        // landing page: W/S take over at once; the arrows only once playing, so before
        // that they still scroll the page. Never while typing in a field.
        const target = e.target as HTMLElement | null;
        if (target?.closest("input, textarea, select, [contenteditable='true']")) return;
        // only while the court is on screen (the listener is on the whole page)
        if (!moved.current && !visibleRef.current) return;
        const arrows = moved.current;
        if (k === "w" || (arrows && e.key === "ArrowUp")) p1.up = down;
        else if (k === "s" || (arrows && e.key === "ArrowDown")) p1.down = down;
        else handled = false;
      } else {
        if (k === "w" || e.key === "ArrowUp") p1.up = down;
        else if (k === "s" || e.key === "ArrowDown") p1.down = down;
        else handled = false;
      }
      if (!handled) return;
      e.preventDefault();
      if (down && soundRef.current) unlockAudio();
      if (down && !moved.current) {
        moved.current = true;
        onFirstMove?.();
      }
      emit();
    };
    const down = (e: KeyboardEvent) => !e.repeat && set(e, true);
    const up = (e: KeyboardEvent) => set(e, false);
    // Alt-tab / hidden tab: release every key so no paddle keeps moving
    const release = () => {
      inputs.current = [idle(), idle()];
      emit();
    };
    const onVisibility = () => document.visibilityState === "hidden" && release();
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", release);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", release);
      document.removeEventListener("visibilitychange", onVisibility);
      // a key held while the controls change would never get its keyup here
      inputs.current = [idle(), idle()];
    };
  }, [controls, onInputs, paused, onFirstMove]);

  // attract: is the court on screen? (keys only take over while it is)
  const visibleRef = useRef(false);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (controls !== "attract" || !canvas || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([entry]) => {
      visibleRef.current = !!entry?.isIntersecting && entry.intersectionRatio >= 0.5;
    }, { threshold: [0, 0.5, 1] });
    io.observe(canvas);
    return () => io.disconnect();
  }, [controls]);

  // attract on touch: a tap starts playing; a swipe keeps scrolling the page
  const tapRef = useRef<{ x: number; y: number } | null>(null);
  const [touchPlaying, setTouchPlaying] = useState(false);

  // Release everything when pausing so no paddle keeps moving
  useEffect(() => {
    if (paused) {
      inputs.current = [idle(), idle()];
      onInputs?.(idle(), idle());
    }
  }, [paused, onInputs]);

  const hold = (dir: "up" | "down", pressed: boolean, who: 0 | 1 = 0) => {
    if (paused) return;
    inputs.current[who][dir] = pressed;
    if (pressed && soundRef.current) unlockAudio();
    if (pressed && !moved.current) {
      moved.current = true;
      onFirstMove?.();
    }
    onInputs?.({ ...inputs.current[0] }, { ...inputs.current[1] });
  };

  return (
    <div className="flex h-full w-full flex-col items-center gap-3">
      <div ref={wrapRef} className="flex min-h-0 w-full flex-1 items-center justify-center">
        <canvas
          ref={canvasRef}
          role="img"
          aria-label={t("game.courtLabel")}
          data-court-theme={courtTheme}
          className="rounded-lg border border-[color:var(--court-border)]"
          // attract: a vertical swipe still scrolls the page; a press on the court plays
          style={{ touchAction: controls === "attract" && !touchPlaying ? "pan-y" : "none" }}
          {...(controls === "attract"
            ? {
                onPointerDown: (e: ReactPointerEvent<HTMLCanvasElement>) => {
                  // first touch: wait for pointerup to tell a tap from a scroll
                  if (e.pointerType === "touch" && !moved.current) {
                    tapRef.current = { x: e.clientX, y: e.clientY };
                    return;
                  }
                  const r = e.currentTarget.getBoundingClientRect();
                  hold(e.clientY < r.top + r.height / 2 ? "up" : "down", true);
                },
                onPointerUp: (e: ReactPointerEvent<HTMLCanvasElement>) => {
                  const tap = tapRef.current;
                  tapRef.current = null;
                  if (tap && Math.hypot(e.clientX - tap.x, e.clientY - tap.y) < 10) {
                    // a tap: start playing (from now on the court takes the touch)
                    moved.current = true;
                    setTouchPlaying(true);
                    onFirstMove?.();
                    return;
                  }
                  hold("up", false);
                  hold("down", false);
                },
                onPointerCancel: () => {
                  tapRef.current = null;
                  hold("up", false);
                  hold("down", false);
                },
                onPointerLeave: () => {
                  hold("up", false);
                  hold("down", false);
                },
              }
            : {})}
        />
      </div>
      {/* Touch: 88px hold buttons; locally each player gets a pair (left: P1, right: P2) */}
      {controls !== "none" && controls !== "attract" && (
      <div className="flex w-full justify-between gap-4 md:hidden">
        {(controls === "local" ? ([0, 1] as const) : ([0] as const)).map((who) => (
          <div key={who} className={controls === "local" ? "flex gap-2" : "mx-auto flex gap-4"}>
            {(["up", "down"] as const).map((dir) => (
              <button
                key={dir}
                type="button"
                aria-label={who === 1 ? t(dir === "up" ? "game.p2Up" : "game.p2Down") : t(dir === "up" ? "game.upButton" : "game.downButton")}
                className={"btn select-none " + (controls === "local" ? "h-[72px] w-[72px]" : "h-[88px] w-[88px]")}
                onPointerDown={(e) => {
                  e.currentTarget.setPointerCapture(e.pointerId);
                  hold(dir, true, who);
                }}
                onPointerUp={() => hold(dir, false, who)}
                onPointerCancel={() => hold(dir, false, who)}
                onContextMenu={(e) => e.preventDefault()}
              >
                {dir === "up" ? <ChevronUp className="ico !h-8 !w-8" aria-hidden /> : <ChevronDown className="ico !h-8 !w-8" aria-hidden />}
              </button>
            ))}
          </div>
        ))}
      </div>
      )}
    </div>
  );
}
