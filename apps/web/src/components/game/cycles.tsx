"use client";

import { useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { CyclesState, PartyPlayer } from "shared";
import { useI18n } from "@/i18n/I18nProvider";
import { usePrefs, useReducedMotion } from "@/lib/prefs";
import { cn } from "@/lib/cn";
import { Avatar, Badge } from "@/components/ui/primitives";
import type { PartyDir } from "./party";

/** cells are drawn this many canvas pixels wide, then the canvas is scaled up with hard edges */
const CELL_PX = 8;

function seatColors(el: HTMLElement): string[] {
  const cs = getComputedStyle(el);
  return [0, 1, 2, 3].map((i) => cs.getPropertyValue(`--party-seat-${i}`).trim() || cs.getPropertyValue("--fg").trim());
}

function draw(ctx: CanvasRenderingContext2D, s: CyclesState, colors: string[], grid: string, bg: string, you: number | null, glow: boolean) {
  const px = s.size * CELL_PX;
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, px, px);
  // a faint grid every 8 cells
  ctx.fillStyle = grid;
  for (let i = 0; i <= s.size; i += 8) {
    ctx.fillRect(i * CELL_PX, 0, 1, px);
    ctx.fillRect(0, i * CELL_PX, px, 1);
  }
  for (const c of s.cycles) {
    if (!c.alive) continue;
    const color = colors[c.seat] ?? colors[0]!;
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.85;
    for (const idx of c.trail) {
      const x = idx % s.size;
      const y = Math.floor(idx / s.size);
      ctx.fillRect(x * CELL_PX + 1, y * CELL_PX + 1, CELL_PX - 2, CELL_PX - 2);
    }
    ctx.globalAlpha = 1;
    // the head: a bright block (a glow when motion is allowed)
    if (glow) {
      ctx.shadowColor = color;
      ctx.shadowBlur = 12;
    }
    ctx.fillRect(c.x * CELL_PX - 1, c.y * CELL_PX - 1, CELL_PX + 2, CELL_PX + 2);
    ctx.shadowBlur = 0;
    if (c.seat === you) {
      ctx.strokeStyle = colors[c.seat] ?? colors[0]!;
      ctx.lineWidth = 2;
      ctx.strokeRect(c.x * CELL_PX - 5, c.y * CELL_PX - 5, CELL_PX + 10, CELL_PX + 10);
    }
  }
}

/**
 * The Light Cycles arena: a square pixel canvas drawn from the latest state, plus turn
 * controls (A / ← left, D / → right; on touch, two big buttons). Turns are relative to where
 * your cycle is heading.
 */
export function CyclesCourt({
  getState,
  you,
  controls,
  onInputs,
  paused = false,
}: {
  getState: () => CyclesState | null;
  you: number | null;
  controls: "online" | "none";
  onInputs?: (dir: PartyDir) => void;
  paused?: boolean;
}) {
  const { t } = useI18n();
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dir = useRef<PartyDir>({ left: false, right: false });
  const reduced = useReducedMotion();
  const { courtTheme } = usePrefs().prefs;

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const fit = () => {
      const rect = wrap.getBoundingClientRect();
      const size = Math.max(0, Math.min(rect.width, rect.height));
      canvas.style.width = `${size}px`;
      canvas.style.height = `${size}px`;
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const colors = seatColors(canvas);
    const cs = getComputedStyle(canvas);
    const bg = cs.getPropertyValue("--court-bg").trim() || cs.getPropertyValue("--bg").trim();
    const grid = cs.getPropertyValue("--border").trim();
    let raf = 0;
    let drawnStep = -1;
    const loop = () => {
      const s = getState();
      if (s) {
        if (canvas.width !== s.size * CELL_PX) {
          canvas.width = s.size * CELL_PX;
          canvas.height = s.size * CELL_PX;
          drawnStep = -1;
        }
        // only redraw when the game moved (10–18 steps a second)
        // a leaver crashes without a new step: count crashes too
        const key = s.step * 100 + s.eliminated.length * 2 + (s.phase === "over" ? 1 : 0);
        if (key !== drawnStep) {
          draw(ctx, s, colors, grid, bg, you, !reduced);
          drawnStep = key;
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [getState, you, reduced, courtTheme]);

  useEffect(() => {
    if (controls === "none") return;
    const emit = () => onInputs?.({ ...dir.current });
    const set = (e: KeyboardEvent, down: boolean) => {
      // releases always count (a key let go during a pause must not stay held); presses wait
      if ((paused && down) || e.ctrlKey || e.metaKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if (k === "a" || e.key === "ArrowLeft") dir.current.left = down;
      else if (k === "d" || e.key === "ArrowRight") dir.current.right = down;
      else return;
      e.preventDefault();
      emit();
    };
    const down = (e: KeyboardEvent) => !e.repeat && set(e, true);
    const up = (e: KeyboardEvent) => set(e, false);
    const release = () => {
      dir.current = { left: false, right: false };
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
    };
  }, [controls, onInputs, paused]);

  useEffect(() => {
    if (!paused) return;
    dir.current = { left: false, right: false };
    onInputs?.({ left: false, right: false });
  }, [paused, onInputs]);

  const press = (side: "left" | "right", down: boolean) => {
    if (controls === "none" || (paused && down)) return;
    dir.current = { ...dir.current, [side]: down };
    onInputs?.({ ...dir.current });
  };

  return (
    <div className="flex h-full min-h-0 flex-col items-center gap-3">
      <div ref={wrapRef} className="grid min-h-0 w-full flex-1 place-items-center">
        <canvas ref={canvasRef} className="cycles-canvas" role="img" aria-label={t("cycles.arena")} />
      </div>
      {controls === "online" && (
        <div className="grid w-full max-w-[420px] grid-cols-2 gap-3 md:hidden">
          {(["left", "right"] as const).map((side) => (
            <button
              key={side}
              type="button"
              className="btn btn-secondary h-16 touch-none select-none"
              aria-label={t(side === "left" ? "cycles.turnLeft" : "cycles.turnRight")}
              onPointerDown={(e) => {
                e.preventDefault();
                press(side, true);
              }}
              onPointerUp={() => press(side, false)}
              onPointerLeave={() => press(side, false)}
              onPointerCancel={() => press(side, false)}
              onContextMenu={(e) => e.preventDefault()}
            >
              {side === "left" ? <ChevronLeft className="ico" aria-hidden /> : <ChevronRight className="ico" aria-hidden />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** riders and who's still on the grid */
export function CyclesRoster({ players, state, myId }: { players: PartyPlayer[]; state: CyclesState | null; myId: string | null }) {
  const { t } = useI18n();
  return (
    <ul className="grid w-full grid-cols-2 gap-2 sm:grid-cols-4" aria-label={t("party.players")}>
      {players.map((p) => {
        const alive = state?.cycles[p.seat]?.alive ?? true;
        return (
          <li key={p.id} className={cn("panel panel-2 !p-2 row !gap-2 min-w-0", !alive && "opacity-60")} style={{ borderColor: `var(--party-seat-${p.seat})` }}>
            <span aria-hidden className="h-8 w-1.5 shrink-0" style={{ background: `var(--party-seat-${p.seat})` }} />
            <Avatar name={p.name} src={p.picture} look={p.look} size="sm" ring={p.id === myId ? "you" : undefined} />
            <div className="min-w-0 grow">
              <p className="t-strong truncate text-sm">
                {p.name}
                {p.id === myId && <span className="subtle"> · {t("common.you")}</span>}
              </p>
              {alive ? <span className="t-caption c-green">{t("cycles.riding")}</span> : <Badge tone="red">{t("cycles.crashed")}</Badge>}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
