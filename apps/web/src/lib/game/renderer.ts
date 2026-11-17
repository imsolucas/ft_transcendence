import type { GameConfig, GameState } from "shared";

export interface CourtColors {
  bg: string;
  line: string;
  you: string;
  opp: string;
  ball: string;
  border: string;
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
  opts: { youSide: 0 | 1 | null; vertical: boolean; glow: boolean }
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
  const ph = (config.paddleConfig.size?.y ?? 25) * sy;
  state.paddles.forEach((p, i) => {
    const colour = opts.youSide === null ? (i === 0 ? colors.you : colors.opp) : i === opts.youSide ? colors.you : colors.opp;
    ctx.fillStyle = colour;
    if (opts.glow) {
      ctx.shadowColor = colour;
      ctx.shadowBlur = 12;
    }
    const x = p.x * sx - pw / 2;
    const y = p.y * sy - ph / 2;
    ctx.beginPath();
    ctx.roundRect(x, y, pw, ph, Math.min(pw, ph) / 3);
    ctx.fill();
    ctx.shadowBlur = 0;
  });

  // ball
  const r = ((config.ballConfig.size?.x ?? 4) / 2) * Math.min(sx, sy);
  ctx.fillStyle = colors.ball;
  if (opts.glow) {
    ctx.shadowColor = colors.ball;
    ctx.shadowBlur = 10;
  }
  ctx.beginPath();
  ctx.arc(state.ball.x * sx, state.ball.y * sy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
