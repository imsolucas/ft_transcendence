import type { GameConfig, GameState, PaddleSkinId } from "shared";

/** Arcade display: the court is drawn at this many pixels (16:10) and scaled up with hard edges. */
export const PIXEL_W = 320;
export const PIXEL_H = 200;

export interface CourtColors {
  bg: string;
  line: string;
  you: string;
  opp: string;
  ball: string;
  border: string;
  /** power-ups: grow (green), shrink (red), fast (amber) */
  power: { grow: string; shrink: string; fast: string };
}

/** Reads the design tokens from CSS so the canvas uses the same palette as the UI. */
export function readCourtColors(el: Element): CourtColors {
  const css = getComputedStyle(el);
  const v = (name: string, fallback: string) => css.getPropertyValue(name).trim() || fallback;
  return {
    bg: v("--court-bg", "#0b0614"),
    line: v("--court-line", "#7c66ad"),
    you: v("--court-you", "#ff2e97"),
    opp: v("--court-opp", "#2de2e6"),
    ball: v("--court-ball", "#f3eeff"),
    border: v("--court-border", "#3a2b5c"),
    power: { grow: v("--neon-green", "#39ff88"), shrink: v("--neon-red", "#ff4d6d"), fast: v("--neon-amber", "#ffb000") },
  };
}

/**
 * Draws one frame. The court is courtSize units (160×100); `youSide` is the paddle index
 * drawn in magenta (0 = left, 1 = right), the other is cyan. `vertical` rotates the court
 * 90° for portrait phones (your paddle at the bottom).
 */
export function drawFrame(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  config: GameConfig,
  colors: CourtColors,
  opts: {
    youSide: 0 | 1 | null;
    vertical: boolean;
    glow: boolean;
    skins?: readonly [PaddleSkinId, PaddleSkinId];
    /** arcade display: low-res canvas, so the ball is a square pixel block */
    pixel?: boolean;
    /** drawn last, inside the court transform (effects: particles, flash) */
    overlay?: (ctx: CanvasRenderingContext2D, sx: number, sy: number, w: number, h: number) => void;
  }
) {
  const { width, height } = ctx.canvas;
  const court = config.courtSize ?? { x: 160, y: 100 };
  ctx.save();
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = colors.bg;
  ctx.fillRect(0, 0, width, height);

  if (opts.vertical) {
    // rotate so the court's x axis runs bottom→top; left paddle (index 0) ends up at the bottom
    ctx.translate(0, height);
    ctx.rotate(-Math.PI / 2);
    if (opts.youSide === 1) {
      ctx.translate(height, width);
      ctx.rotate(Math.PI);
    }
  }
  // "You are always on the left": mirror the court when your paddle is the right one
  if (!opts.vertical && opts.youSide === 1) {
    ctx.translate(width, 0);
    ctx.scale(-1, 1);
  }
  const w = opts.vertical ? height : width;
  const h = opts.vertical ? width : height;
  const sx = w / court.x;
  const sy = h / court.y;

  // centre line, dashed
  ctx.strokeStyle = colors.line;
  ctx.globalAlpha = 0.5;
  ctx.lineWidth = Math.max(1, sx * 0.6);
  ctx.setLineDash([sy * 3, sy * 3]);
  ctx.beginPath();
  ctx.moveTo(w / 2, 0);
  ctx.lineTo(w / 2, h);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.globalAlpha = 1;

  // paddles (positions are centres)
  const pw = (config.paddleConfig.size?.x ?? 4) * sx;
  state.paddles.forEach((p, i) => {
    // power-ups change paddle heights; the state carries the current ones
    const ph = (state.paddleHeights?.[i] ?? config.paddleConfig.size?.y ?? 25) * sy;
    const colour = opts.youSide === null ? (i === 0 ? colors.you : colors.opp) : i === opts.youSide ? colors.you : colors.opp;
    ctx.fillStyle = colour;
    if (opts.glow) {
      ctx.shadowColor = colour;
      ctx.shadowBlur = 12;
    }
    const x = p.x * sx - pw / 2;
    const y = p.y * sy - ph / 2;
    drawPaddle(ctx, opts.skins?.[i] ?? "classic", x, y, pw, ph, colour, colors);
    ctx.shadowBlur = 0;
  });

  // power-up: a diamond with a symbol (shapes, not text, so mirroring can't flip it)
  if (state.powerUp) {
    const { x, y, kind } = state.powerUp;
    const cx = x * sx, cy = y * sy, s = 4 * Math.min(sx, sy);
    const colour = colors.power[kind];
    ctx.strokeStyle = colour;
    ctx.fillStyle = colour;
    ctx.lineWidth = Math.max(1.5, s / 4);
    if (opts.glow) {
      ctx.shadowColor = colour;
      ctx.shadowBlur = 14;
    }
    ctx.beginPath();
    ctx.moveTo(cx, cy - s);
    ctx.lineTo(cx + s, cy);
    ctx.lineTo(cx, cy + s);
    ctx.lineTo(cx - s, cy);
    ctx.closePath();
    ctx.stroke();
    ctx.shadowBlur = 0;
    const k = s * 0.45;
    ctx.beginPath();
    if (kind === "grow") {
      ctx.moveTo(cx - k, cy); ctx.lineTo(cx + k, cy); ctx.moveTo(cx, cy - k); ctx.lineTo(cx, cy + k);
    } else if (kind === "shrink") {
      ctx.moveTo(cx - k, cy); ctx.lineTo(cx + k, cy);
    } else {
      ctx.moveTo(cx - k, cy - k); ctx.lineTo(cx, cy); ctx.lineTo(cx - k, cy + k);
      ctx.moveTo(cx, cy - k); ctx.lineTo(cx + k, cy); ctx.lineTo(cx, cy + k);
    }
    ctx.stroke();
  }

  // ball
  const r = ((config.ballConfig.size?.x ?? 4) / 2) * Math.min(sx, sy);
  ctx.fillStyle = colors.ball;
  if (opts.glow) {
    ctx.shadowColor = colors.ball;
    ctx.shadowBlur = 10;
  }
  if (opts.pixel) {
    ctx.fillRect(Math.round(state.ball.x * sx - r), Math.round(state.ball.y * sy - r), Math.round(r * 2), Math.round(r * 2));
  } else {
    ctx.beginPath();
    ctx.arc(state.ball.x * sx, state.ball.y * sy, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.shadowBlur = 0;
  opts.overlay?.(ctx, sx, sy, w, h);
  ctx.restore();
}

/** One paddle in its cosmetic skin (fill colour = the side's colour unless the skin has its own). */
function drawPaddle(ctx: CanvasRenderingContext2D, skin: PaddleSkinId, x: number, y: number, w: number, h: number, colour: string, colors: CourtColors) {
  const r = Math.min(w, h) / 3;
  ctx.beginPath();
  switch (skin) {
    case "hollow": {
      const lw = Math.max(1.5, w * 0.3);
      ctx.strokeStyle = colour;
      ctx.lineWidth = lw;
      ctx.roundRect(x + lw / 2, y + lw / 2, w - lw, h - lw, r);
      ctx.stroke();
      return;
    }
    case "pixel": {
      // stacked blocks with small gaps
      const block = w;
      const gap = Math.max(1, w * 0.25);
      for (let yy = y; yy < y + h - 0.5; yy += block + gap) ctx.rect(x, yy, w, Math.min(block, y + h - yy));
      ctx.fill();
      return;
    }
    case "gold": {
      ctx.fillStyle = colors.power.fast;
      ctx.roundRect(x, y, w, h, r);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = colors.ball;
      ctx.globalAlpha = 0.7;
      ctx.fillRect(x + w * 0.25, y + r, Math.max(1, w * 0.18), h - 2 * r);
      ctx.globalAlpha = 1;
      return;
    }
    case "prism": {
      const g = ctx.createLinearGradient(0, y, 0, y + h);
      g.addColorStop(0, colors.you);
      g.addColorStop(0.5, colors.power.fast);
      g.addColorStop(1, colors.opp);
      ctx.fillStyle = g;
      ctx.roundRect(x, y, w, h, r);
      ctx.fill();
      return;
    }
    case "striped": {
      ctx.roundRect(x, y, w, h, r);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = colors.bg;
      ctx.globalAlpha = 0.45;
      const step = Math.max(3, w * 1.2);
      for (let yy = y + step / 2; yy < y + h - 1; yy += step) ctx.fillRect(x, yy, w, Math.max(1, step * 0.35));
      ctx.globalAlpha = 1;
      return;
    }
    default:
      ctx.roundRect(x, y, w, h, r);
      ctx.fill();
  }
}
