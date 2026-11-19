import { memo, useMemo } from "react";
import { CHARACTER_H, CHARACTER_POSES, CHARACTER_W, characterRuns, defaultLook, type PlayerLook } from "shared";

/** a stable number for a player id, so a player without a saved look always gets the same one */
function seed(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (Math.imul(h, 31) + id.charCodeAt(i)) >>> 0;
  return h;
}

/**
 * A full-body pixel character built from the player's avatar look: a standing pose plus a
 * 4-frame walk cycle. All poses are drawn once; CSS (styles/arcade.css) shows the right one
 * from the parent's data-moving / data-facing. Decorative: the name label carries the meaning.
 */
export const HallCharacter = memo(function HallCharacter({ id, look }: { id: string; look: PlayerLook | null }) {
  const spec = (look ?? defaultLook(seed(id))).pixel;
  const poses = useMemo(() => CHARACTER_POSES.map((pose) => ({ pose, runs: characterRuns(spec, pose) })), [spec]);
  return (
    <svg className="hall-char" viewBox={`0 0 ${CHARACTER_W} ${CHARACTER_H}`} shapeRendering="crispEdges" aria-hidden focusable="false">
      {poses.map(({ pose, runs }) => (
        <g key={pose} className={`hall-pose hall-pose-${pose}`}>
          {runs.map((r) => (
            <rect key={`${r.x}-${r.y}`} x={r.x} y={r.y} width={r.w} height={1} fill={r.c} />
          ))}
        </g>
      ))}
    </svg>
  );
});
