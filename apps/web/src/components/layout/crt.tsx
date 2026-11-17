/** The CRT overlay: one fixed, pointer-events:none layer above the app (off via `crt-off`). */
export function CRTFrame() {
  return (
    <div className="crt" aria-hidden>
      <div className="crt-noise" />
    </div>
  );
}

/** Grid horizon + sunset: landing hero and match-end only, behind content. */
export function Horizon() {
  return (
    <div className="horizon" aria-hidden>
      <div className="horizon-glow" />
      <div className="horizon-sun" />
      <div className="horizon-grid" />
      <div className="horizon-fade" />
    </div>
  );
}
