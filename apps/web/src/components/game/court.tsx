"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { GameConfig, GameState, PlayerInputs } from "shared";
import { drawFrame, readCourtColors } from "@/lib/game/renderer";
import { useReducedMotion } from "@/lib/prefs";
import { useI18n } from "@/i18n/I18nProvider";

const idle = (): PlayerInputs => ({ up: false, down: false, left: false, right: false, action_1: false, action_2: false });

/**
 * The game court: a canvas drawn every animation frame from `getState()`, sized to its
 * container with the court's 16:10 aspect (rotated on portrait phones), plus keyboard and
 * touch input.
 * - `controls="local"`: W/S drive player 1, ↑/↓ player 2 (two people, one keyboard).
 * - `controls="online"`: W/S and ↑/↓ both drive your own paddle.
 */
export function Court({
  config,
  getState,
  youSide,
  controls,
  onInputs,
  paused = false,
  onFirstMove,
}: {
  config: GameConfig;
  getState: () => GameState | null;
  youSide: 0 | 1 | null;
  controls: "local" | "online";
  onInputs: (p1: PlayerInputs, p2: PlayerInputs) => void;
  paused?: boolean;
  onFirstMove?: () => void;
}) {
  const { t } = useI18n();
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const inputs = useRef<[PlayerInputs, PlayerInputs]>([idle(), idle()]);
  const moved = useRef(false);
  const reduced = useReducedMotion();
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

  // Render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const colors = readCourtColors(canvas);
    let raf = 0;
    const loop = () => {
      const state = getState();
      if (state) drawFrame(ctx, state, config, colors, { youSide, vertical, glow: !reduced });
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [config, getState, youSide, vertical, reduced]);

  // Keyboard
  useEffect(() => {
    const emit = () => onInputs({ ...inputs.current[0] }, { ...inputs.current[1] });
    const set = (e: KeyboardEvent, down: boolean) => {
      if (paused) return;
      const [p1, p2] = inputs.current;
      const k = e.key.toLowerCase();
      let handled = true;
      if (controls === "local") {
        if (k === "w") p1.up = down;
        else if (k === "s") p1.down = down;
        else if (e.key === "ArrowUp") p2.up = down;
        else if (e.key === "ArrowDown") p2.down = down;
        else handled = false;
      } else {
        if (k === "w" || e.key === "ArrowUp") p1.up = down;
        else if (k === "s" || e.key === "ArrowDown") p1.down = down;
        else handled = false;
      }
      if (!handled) return;
      e.preventDefault();
      if (down && !moved.current) {
        moved.current = true;
        onFirstMove?.();
      }
      emit();
    };
    const down = (e: KeyboardEvent) => !e.repeat && set(e, true);
    const up = (e: KeyboardEvent) => set(e, false);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [controls, onInputs, paused, onFirstMove]);

  // Release everything when pausing so no paddle keeps moving
  useEffect(() => {
    if (paused) {
      inputs.current = [idle(), idle()];
      onInputs(idle(), idle());
    }
  }, [paused, onInputs]);

  const hold = (dir: "up" | "down", pressed: boolean) => {
    if (paused) return;
    // On a vertical court, "up" on screen moves your paddle towards the opponent's side,
    // which in court coordinates is "down" for the bottom paddle; keep the labels literal.
    inputs.current[0][dir] = pressed;
    if (pressed && !moved.current) {
      moved.current = true;
      onFirstMove?.();
    }
    onInputs({ ...inputs.current[0] }, { ...inputs.current[1] });
  };

  return (
    <div className="flex h-full w-full flex-col items-center gap-3">
      <div ref={wrapRef} className="flex min-h-0 w-full flex-1 items-center justify-center">
        <canvas
          ref={canvasRef}
          role="img"
          aria-label="Pong court"
          className="rounded-lg border border-border"
          style={{ touchAction: "none" }}
        />
      </div>
      {/* Touch: two 88px hold buttons (online, or player 1 locally) */}
      <div className="flex gap-4 md:hidden">
        {(["up", "down"] as const).map((dir) => (
          <button
            key={dir}
            type="button"
            aria-label={dir === "up" ? t("game.upButton") : t("game.downButton")}
            className="btn h-[88px] w-[88px] select-none"
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              hold(dir, true);
            }}
            onPointerUp={() => hold(dir, false)}
            onPointerCancel={() => hold(dir, false)}
            onContextMenu={(e) => e.preventDefault()}
          >
            {dir === "up" ? <ChevronUp className="ico !h-8 !w-8" aria-hidden /> : <ChevronDown className="ico !h-8 !w-8" aria-hidden />}
          </button>
        ))}
      </div>
    </div>
  );
}
