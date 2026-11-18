import type { ReactNode } from "react";
import type { CabinetId, Rect } from "shared/hall/hall";

/**
 * Hall artwork drawn in code (no image files), at hall-pixel scale: arcade cabinets, the
 * high-score board and the couch. Colours are theme tokens so the court themes and light
 * surfaces still read.
 */

const TONE: Record<CabinetId, string> = {
  ranked: "var(--neon-magenta)",
  party: "var(--neon-green)",
  cycles: "var(--neon-cyan)",
  daily: "var(--neon-amber)",
  watch: "var(--neon-cyan)",
  local: "var(--neon-magenta)",
  board: "var(--neon-amber)",
};

/** a cabinet: marquee, screen (children), control deck, base */
export function CabinetArt({ id, box, near, children }: { id: CabinetId; box: Rect; near: boolean; children?: ReactNode }) {
  const tone = TONE[id];
  const { w, h } = box;
  return (
    <div className="hall-cab" style={{ width: w, height: h }} data-near={near || undefined}>
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} shapeRendering="crispEdges" aria-hidden focusable="false">
        {/* body */}
        <rect x="2" y="0" width={w - 4} height={h} fill="var(--surface-3)" />
        <rect x="2" y="0" width="2" height={h} fill="var(--border-strong)" />
        <rect x={w - 4} y="0" width="2" height={h} fill="var(--bg)" />
        {/* marquee */}
        <rect x="2" y="0" width={w - 4} height="7" fill={tone} />
        <rect x="4" y="2" width={w - 8} height="1" fill="var(--on-neon)" opacity=".35" />
        {/* screen bezel */}
        <rect x="5" y="9" width={w - 10} height="20" fill="var(--ink-black)" />
        {/* control deck: stick + buttons */}
        <rect x="3" y="31" width={w - 6} height="6" fill="var(--surface-2)" />
        <rect x="9" y="32" width="2" height="3" fill="var(--fg-muted)" />
        <rect x="8" y="31" width="4" height="2" fill="var(--neon-red)" />
        <rect x={w - 16} y="33" width="3" height="2" fill={tone} />
        <rect x={w - 11} y="33" width="3" height="2" fill="var(--neon-cyan)" />
        {/* coin slot */}
        <rect x={w / 2 - 3} y="41" width="6" height="4" fill="var(--bg)" />
        <rect x={w / 2 - 1} y="42" width="2" height="2" fill="var(--neon-amber)" />
      </svg>
      <div className="hall-screen" style={{ color: tone }}>
        {children}
      </div>
    </div>
  );
}

/** the high-score board on the wall */
export function BoardArt({ box, near, children }: { box: Rect; near: boolean; children?: ReactNode }) {
  return (
    <div className="hall-cab hall-board" style={{ width: box.w, height: box.h }} data-near={near || undefined}>
      <svg width={box.w} height={box.h} viewBox={`0 0 ${box.w} ${box.h}`} shapeRendering="crispEdges" aria-hidden focusable="false">
        <rect x="0" y="0" width={box.w} height={box.h - 8} fill="var(--ink-black)" />
        <rect x="0" y="0" width={box.w} height="2" fill="var(--neon-amber)" />
        <rect x="0" y={box.h - 10} width={box.w} height="2" fill="var(--neon-amber)" />
        <rect x="6" y={box.h - 8} width="3" height="8" fill="var(--surface-3)" />
        <rect x={box.w - 9} y={box.h - 8} width="3" height="8" fill="var(--surface-3)" />
      </svg>
      <div className="hall-board-text">{children}</div>
    </div>
  );
}

export function CouchArt({ box }: { box: Rect }) {
  return (
    <div className="hall-cab hall-prop" style={{ left: box.x, top: box.y - 8, width: box.w, height: box.h + 8, zIndex: Math.round(box.y + box.h) }} aria-hidden>
      <svg width={box.w} height={box.h + 8} viewBox={`0 0 ${box.w} ${box.h + 8}`} shapeRendering="crispEdges">
        <rect x="0" y="0" width={box.w} height="10" fill="var(--neon-magenta-soft)" />
        <rect x="0" y="0" width={box.w} height="2" fill="var(--neon-magenta)" />
        <rect x="0" y="8" width={box.w} height={box.h} fill="var(--surface-3)" />
        <rect x="0" y="8" width="6" height={box.h} fill="var(--surface-2)" />
        <rect x={box.w - 6} y="8" width="6" height={box.h} fill="var(--surface-2)" />
      </svg>
    </div>
  );
}
