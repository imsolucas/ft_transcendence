import { paddleWorld, partyDefaults, type PartySide, type PartyState } from "shared";

export interface PartyColors {
  bg: string;
  line: string;
  border: string;
  ball: string;
  /** one per seat (--party-seat-0..3) */
  seats: string[];
}

/** Reads the court and seat tokens, so the canvas uses the UI palette. */
export function readPartyColors(el: Element): PartyColors {
  const css = getComputedStyle(el);
  const v = (name: string) => css.getPropertyValue(name).trim();
  return {
    bg: v("--court-bg"),
    line: v("--court-line"),
    border: v("--court-border"),
    ball: v("--court-ball"),
    seats: [0, 1, 2, 3].map((i) => v(`--party-seat-${i}`)),
  };
}

/**
 * Draws one party frame on a square canvas, rotated so `viewSide` is at the bottom (each
 * player sees their own side at the bottom; spectators see seat 0 there). Walls (the empty
 * 4th side, knocked-out players) are solid lines; your own paddle gets a ring.
 */
export function drawParty(
  ctx: CanvasRenderingContext2D,
  state: PartyState,
  colors: PartyColors,
  opts: { viewSide: PartySide; you: number | null; glow: boolean }
) {
  const { width, height } = ctx.canvas;
  const c = state.court;
  const s = Math.min(width, height) / c;
  ctx.save();
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = colors.bg;
  ctx.fillRect(0, 0, width, height);

  // world → screen: scale, then rotate about the centre so viewSide sits at the bottom
  ctx.translate(width / 2, height / 2);
  ctx.rotate((-Math.PI / 2) * opts.viewSide);
  ctx.scale(s, s);
  ctx.translate(-c / 2, -c / 2);

  // centre cross-hair, faint
  ctx.strokeStyle = colors.line;
  ctx.globalAlpha = 0.35;
  ctx.lineWidth = 0.4;
  ctx.setLineDash([2, 2]);
  ctx.beginPath();
  ctx.arc(c / 2, c / 2, 10, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.globalAlpha = 1;

  const k = state.corner;
  // corner blocks
  ctx.fillStyle = colors.border;
  for (const [x, y] of [
    [0, 0],
    [c - k, 0],
    [0, c - k],
    [c - k, c - k],
  ] as const) {
    ctx.fillRect(x, y, k, k);
  }

  const thick = partyDefaults.PADDLE_THICKNESS;
  for (const side of [0, 1, 2, 3] as PartySide[]) {
    const seat = state.paddles[side];
    // the side's opening, as a segment along the edge
    const [x0, y0, x1, y1] = side === 0 ? [k, c, c - k, c] : side === 1 ? [0, k, 0, c - k] : side === 2 ? [k, 0, c - k, 0] : [c, k, c, c - k];
    if (!seat || !seat.alive) {
      // a wall
      ctx.strokeStyle = colors.line;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();
      continue;
    }
    const colour = colors.seats[side] ?? colors.ball;
    // goal line in the seat's colour, faint
    ctx.strokeStyle = colour;
    ctx.globalAlpha = state.lastLoss === side && state.phase === "serving" ? 0.9 : 0.3;
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
    ctx.globalAlpha = 1;

    // paddle
    const p = paddleWorld(side, seat.pos);
    const horizontal = side === 0 || side === 2;
    const w = horizontal ? state.paddleLength : thick;
    const h = horizontal ? thick : state.paddleLength;
    ctx.fillStyle = colour;
    if (opts.glow) {
      ctx.shadowColor = colour;
      ctx.shadowBlur = 10;
    }
    ctx.beginPath();
    ctx.roundRect(p.x - w / 2, p.y - h / 2, w, h, thick / 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    if (opts.you === side) {
      // "you": an outline ring, so it doesn't depend on colour alone
      ctx.strokeStyle = colors.ball;
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.roundRect(p.x - w / 2 - 1, p.y - h / 2 - 1, w + 2, h + 2, thick);
      ctx.stroke();
    }
  }

  // serve direction: a small arrow from the centre toward the side about to be served
  if (state.phase === "serving" && state.serveTo !== null) {
    const side = state.paddles[state.serveTo]?.side;
    if (side !== undefined) {
      const dir = side === 0 ? [0, 1] : side === 1 ? [-1, 0] : side === 2 ? [0, -1] : [1, 0];
      const [dx, dy] = dir as [number, number];
      const tip = { x: c / 2 + dx * 9, y: c / 2 + dy * 9 };
      ctx.fillStyle = colors.seats[side] ?? colors.ball;
      ctx.beginPath();
      ctx.moveTo(tip.x, tip.y);
      ctx.lineTo(tip.x - dx * 3 - dy * 2, tip.y - dy * 3 + dx * 2);
      ctx.lineTo(tip.x - dx * 3 + dy * 2, tip.y - dy * 3 - dx * 2);
      ctx.closePath();
      ctx.fill();
    }
  }

  // ball
  ctx.fillStyle = colors.ball;
  if (opts.glow) {
    ctx.shadowColor = colors.ball;
    ctx.shadowBlur = 8;
  }
  ctx.beginPath();
  ctx.arc(state.ball.x, state.ball.y, state.ball.r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
