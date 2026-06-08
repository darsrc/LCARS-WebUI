/*
 * The elbow — a filled quarter-round sweep, not a stroked border.
 *
 * The corner reaches past the rail (vertical arm = rail width) to carry the
 * horizontal arm, with a large outer radius and a smaller concave inner radius.
 * Drawn as an exact path so the curve is true at the canonical size.
 */

// viewBox 240x96 — vertical arm 168 wide, horizontal arm 38 tall, outer r48 / inner r28
const TOP_PATH = "M0 48 Q0 0 48 0 L240 0 L240 38 L196 38 Q168 38 168 66 L168 96 L0 96 Z";
// viewBox 240x56 — horizontal arm 30 tall at the bottom, outer r36 / inner r20
const BOT_PATH = "M0 0 L168 0 L168 6 Q168 26 188 26 L240 26 L240 56 L36 56 Q0 56 0 20 Z";

export function Elbow({ variant }: { variant: "top" | "bot" }) {
  const top = variant === "top";
  return (
    <div className={`lcars-elbow lcars-elbow--${variant}`} aria-hidden="true">
      <svg viewBox={top ? "0 0 240 96" : "0 0 240 56"} preserveAspectRatio="none">
        <path d={top ? TOP_PATH : BOT_PATH} />
      </svg>
    </div>
  );
}
