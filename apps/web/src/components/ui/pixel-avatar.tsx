import { AVATAR_GRID, avatarRuns, type AvatarSpec } from "shared";

/** A 12×12 pixel avatar as crisp SVG rects (one rect per run of same-coloured pixels). */
export function PixelAvatar({ spec, className }: { spec: AvatarSpec; className?: string }) {
  return (
    <svg viewBox={`0 0 ${AVATAR_GRID} ${AVATAR_GRID}`} className={className} shapeRendering="crispEdges" aria-hidden focusable="false">
      {avatarRuns(spec).map((r) => (
        <rect key={`${r.x}-${r.y}`} x={r.x} y={r.y} width={r.w} height={1} fill={r.c} />
      ))}
    </svg>
  );
}
