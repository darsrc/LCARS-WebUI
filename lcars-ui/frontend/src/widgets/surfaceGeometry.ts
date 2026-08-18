// Path-string generators for the Surface engine's arc/ring/wedge geometry nodes.
//
// Angle convention (shared by every function here and by the polar layout system that
// consumes them): degrees, 0deg = +x axis (3 o'clock / east), increasing clockwise. This
// falls straight out of standard cos/sin trig on an SVG/screen coordinate system (+y down),
// with no extra sign flip needed - the least error-prone convention to implement correctly.
//
// SVG arc commands (`A rx ry x-axis-rotation large-arc-flag sweep-flag x y`) cannot represent
// a true 360deg circle in one segment (identical start/end point degenerates to nothing), and
// a ring (annulus) needs two independent closed subpaths - one for the outer boundary, one for
// the inner - filled with fill-rule="evenodd" so the hole in the middle actually renders as a
// hole. Both of those are handled explicitly below rather than left as a caller footgun.

const EPSILON = 1e-6;

export interface Point {
  x: number;
  y: number;
}

export function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number): Point {
  const angleRad = (angleDeg * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(angleRad),
    y: cy + r * Math.sin(angleRad),
  };
}

// Angular span swept clockwise from startAngle to endAngle, normalized to (0, 360]. Exactly 0
// only when startAngle === endAngle (a genuinely empty/degenerate request, not a full circle -
// author a full circle with e.g. start_angle=0, end_angle=360).
function normalizedSpan(startAngle: number, endAngle: number): number {
  const raw = endAngle - startAngle;
  if (raw === 0) return 0;
  let span = raw % 360;
  if (span <= 0) span += 360;
  return span;
}

function arcSegment(cx: number, cy: number, r: number, startAngle: number, endAngle: number, sweepFlag: 0 | 1): string {
  const largeArc = normalizedSpan(startAngle, endAngle) > 180 ? 1 : 0;
  const end = polarToCartesian(cx, cy, r, endAngle);
  return `A ${r} ${r} 0 ${largeArc} ${sweepFlag} ${end.x} ${end.y}`;
}

// A full circle needs two half-arc segments (SVG can't express 360deg in one A command); the
// second point (start + 180deg) is an arbitrary but valid waypoint, not itself meaningful.
function fullCirclePath(cx: number, cy: number, r: number, startAngle: number): string {
  const start = polarToCartesian(cx, cy, r, startAngle);
  const mid = polarToCartesian(cx, cy, r, startAngle + 180);
  return [
    `M ${start.x} ${start.y}`,
    `A ${r} ${r} 0 1 1 ${mid.x} ${mid.y}`,
    `A ${r} ${r} 0 1 1 ${start.x} ${start.y}`,
    "Z",
  ].join(" ");
}

/**
 * An open arc stroke (no fill interior implied) from startAngle to endAngle at radius r.
 * Returns "" for a zero-span request (nothing to draw) - callers should skip rendering rather
 * than emit an empty <path>.
 */
export function arcPath(cx: number, cy: number, r: number, startAngle: number, endAngle: number): string {
  const span = normalizedSpan(startAngle, endAngle);
  if (span === 0 || r <= 0) return "";
  if (Math.abs(span - 360) < EPSILON) {
    // An open 360deg "arc" is a full circle outline; drop the closing Z since this is a stroke,
    // not a fill region - two half-arcs still avoid the degenerate zero-length-arc case.
    const start = polarToCartesian(cx, cy, r, startAngle);
    const mid = polarToCartesian(cx, cy, r, startAngle + 180);
    return [
      `M ${start.x} ${start.y}`,
      `A ${r} ${r} 0 1 1 ${mid.x} ${mid.y}`,
      `A ${r} ${r} 0 1 1 ${start.x} ${start.y}`,
    ].join(" ");
  }
  const start = polarToCartesian(cx, cy, r, startAngle);
  return [`M ${start.x} ${start.y}`, arcSegment(cx, cy, r, startAngle, endAngle, 1)].join(" ");
}

/**
 * A filled annulus segment (ring/wedge) between innerR and outerR, from startAngle to endAngle.
 * innerR <= 0 collapses to a true pie/wedge slice (straight lines to/from the center point
 * instead of a degenerate zero-radius inner arc). A full 360deg span produces a closed ring via
 * two independent subpaths - the caller MUST render the result with fill-rule="evenodd" for the
 * inner hole (when innerR > 0) to actually appear as a hole rather than a solid filled disk.
 * Returns "" for a zero-span or non-positive outerR request.
 */
export function annulusSegmentPath(
  cx: number,
  cy: number,
  innerR: number,
  outerR: number,
  startAngle: number,
  endAngle: number,
): string {
  if (outerR <= 0) return "";
  const span = normalizedSpan(startAngle, endAngle);
  if (span === 0) return "";
  const isFullCircle = Math.abs(span - 360) < EPSILON;
  const hasHole = innerR > EPSILON;

  if (isFullCircle) {
    const outer = fullCirclePath(cx, cy, outerR, startAngle);
    if (!hasHole) return outer;
    // Inner subpath swept the opposite direction (its own two half-arcs) so evenodd fill
    // correctly punches the hole regardless of winding-direction quirks in the outer subpath.
    return `${outer} ${fullCirclePath(cx, cy, innerR, startAngle)}`;
  }

  const outerStart = polarToCartesian(cx, cy, outerR, startAngle);
  if (!hasHole) {
    // True pie/wedge: center -> outer arc start -> arc to outer end -> back to center.
    return [
      `M ${cx} ${cy}`,
      `L ${outerStart.x} ${outerStart.y}`,
      arcSegment(cx, cy, outerR, startAngle, endAngle, 1),
      "Z",
    ].join(" ");
  }

  // Washer segment: outer arc forward, line to inner boundary, inner arc backward, close.
  const innerStart = polarToCartesian(cx, cy, innerR, startAngle);
  return [
    `M ${outerStart.x} ${outerStart.y}`,
    arcSegment(cx, cy, outerR, startAngle, endAngle, 1),
    arcSegment(cx, cy, innerR, endAngle, startAngle, 0),
    `L ${innerStart.x} ${innerStart.y}`,
    "Z",
  ].join(" ");
}

/** A ring (annulus, typically but not necessarily a full circle). Alias of annulusSegmentPath. */
export function ringPath(
  cx: number,
  cy: number,
  innerR: number,
  outerR: number,
  startAngle: number,
  endAngle: number,
): string {
  return annulusSegmentPath(cx, cy, innerR, outerR, startAngle, endAngle);
}

/** A wedge (pie-slice sector, or a washer segment if innerR > 0). Alias of annulusSegmentPath. */
export function wedgePath(
  cx: number,
  cy: number,
  innerR: number,
  outerR: number,
  startAngle: number,
  endAngle: number,
): string {
  return annulusSegmentPath(cx, cy, innerR, outerR, startAngle, endAngle);
}
