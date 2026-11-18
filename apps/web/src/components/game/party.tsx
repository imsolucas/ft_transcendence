"use client";

import { useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, Heart, Skull } from "lucide-react";
import type { PartyPlayer, PartySide, PartyState } from "shared";
import { drawParty, readPartyColors } from "@/lib/game/party-renderer";
import { usePrefs, useReducedMotion } from "@/lib/prefs";
import { useI18n } from "@/i18n/I18nProvider";
import { cn } from "@/lib/cn";
import { Avatar, Badge } from "@/components/ui/primitives";

export type PartyDir = { left: boolean; right: boolean };

/** Which edge of the screen a seat's side is on, for a view rotated to `viewSide`. */
export function screenSide(side: PartySide, viewSide: PartySide): PartySide {
  return (((side - viewSide) % 4) + 4) % 4 as PartySide;
}

const SIDE_KEYS = ["party.sideBottom", "party.sideLeft", "party.sideTop", "party.sideRight"] as const;

/**
 * Square party court: a canvas drawn every frame from `getState()`, rotated so your side is at
 * the bottom. A/D or ←/→ (and the touch buttons) move your paddle left/right on screen.
 */
export function PartyCourt({
  getState,
  viewSide,
  you,
  controls,
  onInputs,
  paused = false,
}: {
  getState: () => PartyState | null;
  viewSide: PartySide;
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

  // square canvas, as large as the container allows (device-pixel aware)
  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const fit = () => {
      const rect = wrap.getBoundingClientRect();
      const size = Math.max(0, Math.min(rect.width, rect.height));
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.style.width = `${size}px`;
      canvas.style.height = `${size}px`;
      canvas.width = Math.round(size * dpr);
      canvas.height = Math.round(size * dpr);
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
    const colors = readPartyColors(canvas);
    let raf = 0;
    const loop = () => {
      const state = getState();
      if (state) drawParty(ctx, state, colors, { viewSide, you, glow: !reduced });
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // courtTheme changes --court-*: re-read the colours
  }, [getState, viewSide, you, reduced, courtTheme]);

  useEffect(() => {
    if (controls === "none") return;
    const emit = () => onInputs?.({ ...dir.current });
    const set = (e: KeyboardEvent, down: boolean) => {
      if (paused) return;
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
    if (paused) {
      dir.current = { left: false, right: false };
      onInputs?.({ left: false, right: false });
    }
  }, [paused, onInputs]);

  const hold = (key: "left" | "right", pressed: boolean) => {
    if (paused) return;
    dir.current[key] = pressed;
    onInputs?.({ ...dir.current });
  };

  return (
    <div className="flex h-full w-full flex-col items-center gap-3">
      <div ref={wrapRef} className="flex min-h-0 w-full flex-1 items-center justify-center">
        <canvas
          ref={canvasRef}
          role="img"
          aria-label={t("party.courtLabel")}
          data-court-theme={courtTheme}
          className="rounded-lg border border-[color:var(--court-border)]"
          style={{ touchAction: "none" }}
        />
      </div>
      {controls !== "none" && (
        <div className="flex w-full justify-center gap-6 md:hidden">
          {(["left", "right"] as const).map((key) => (
            <button
              key={key}
              type="button"
              aria-label={t(key === "left" ? "party.leftButton" : "party.rightButton")}
              className="btn h-[88px] w-[88px] select-none"
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId);
                hold(key, true);
              }}
              onPointerUp={() => hold(key, false)}
              onPointerCancel={() => hold(key, false)}
              onContextMenu={(e) => e.preventDefault()}
            >
              {key === "left" ? <ChevronLeft className="ico !h-8 !w-8" aria-hidden /> : <ChevronRight className="ico !h-8 !w-8" aria-hidden />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Who is playing: colour swatch + name + where their side is on your screen + lives (heart icon
 * and a number, so nothing depends on colour alone). Knocked-out players are marked "out".
 */
export function PartyRoster({ players, state, myId, viewSide }: { players: PartyPlayer[]; state: PartyState | null; myId: string | null; viewSide: PartySide }) {
  const { t } = useI18n();
  return (
    <ul className="grid w-full grid-cols-2 gap-2 sm:grid-cols-4" aria-label={t("party.players")}>
      {players.map((p) => {
        const paddle = state?.paddles[p.seat];
        const lives = paddle?.lives ?? 0;
        const alive = paddle?.alive ?? true;
        const where = paddle ? t(SIDE_KEYS[screenSide(paddle.side, viewSide)]) : "";
        return (
          <li key={p.id} className={cn("panel panel-2 !p-2 row !gap-2 min-w-0", !alive && "opacity-60")} style={{ borderColor: `var(--party-seat-${p.seat})` }}>
            <span aria-hidden className="h-8 w-1.5 shrink-0 rounded-full" style={{ background: `var(--party-seat-${p.seat})` }} />
            <Avatar name={p.name} src={p.picture} look={p.look} size="sm" ring={p.id === myId ? "you" : undefined} />
            <div className="min-w-0 grow">
              <p className="t-strong truncate text-sm">
                {p.name}
                {p.id === myId && <span className="subtle"> · {t("common.you")}</span>}
              </p>
              <p className="t-caption subtle truncate">{where}</p>
            </div>
            {alive ? (
              <span className="row !gap-1 num" aria-label={t("party.lives", { n: lives })}>
                <Heart className="ico !h-4 !w-4 c-red" aria-hidden />
                {lives}
              </span>
            ) : (
              <Badge tone="red" icon={<Skull className="ico !h-3.5 !w-3.5" aria-hidden />}>
                {t("party.out")}
              </Badge>
            )}
          </li>
        );
      })}
    </ul>
  );
}
