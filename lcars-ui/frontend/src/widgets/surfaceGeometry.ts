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

// largeArc is taken as an explicit parameter, not recomputed from (startAngle, endAngle), because
// callers building a closed washer/wedge path draw the SAME angular span twice - once forward
// (outer boundary) and once backward (inner boundary, swapped start/end so it closes correctly).
// Recomputing normalizedSpan() on the swapped arguments gives the COMPLEMENT span (360 - span),
// not the same span traversed the other way, which silently flips a small wedge into a near-full-
// circle large arc. Both calls must share one flag, computed once from the true forward span.
function arcSegment(cx: number, cy: number, r: number, endAngle: number, sweepFlag: 0 | 1, largeArc: 0 | 1): string {
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
  const largeArc = span > 180 ? 1 : 0;
  return [`M ${start.x} ${start.y}`, arcSegment(cx, cy, r, endAngle, 1, largeArc)].join(" ");
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

  const largeArc = span > 180 ? 1 : 0;
  const outerStart = polarToCartesian(cx, cy, outerR, startAngle);
  if (!hasHole) {
    // True pie/wedge: center -> outer arc start -> arc to outer end -> back to center.
    return [
      `M ${cx} ${cy}`,
      `L ${outerStart.x} ${outerStart.y}`,
      arcSegment(cx, cy, outerR, endAngle, 1, largeArc),
      "Z",
    ].join(" ");
  }

  // Washer segment: outer arc forward, radial line down to the inner boundary, inner arc
  // backward, close (Z draws the final radial line back to outerStart). The line to innerEnd is
  // required, not cosmetic: after the outer arc the pen sits at radius outerR, and an SVG arc
  // command interpolates between whatever the CURRENT pen position is and its given end point -
  // it does not reposition the pen to "radius innerR" first. Starting the inner arc directly from
  // an outerR-radius pen position means the two endpoints can't actually lie on a radius-innerR
  // circle, so the spec's automatic radius-rescale kicks in and silently balloons the inner arc's
  // effective radius into something much larger than intended. Both arcs share `largeArc` (see
  // arcSegment's comment) - they trace the same angular span in opposite directions.
  const innerEnd = polarToCartesian(cx, cy, innerR, endAngle);
  return [
    `M ${outerStart.x} ${outerStart.y}`,
    arcSegment(cx, cy, outerR, endAngle, 1, largeArc),
    `L ${innerEnd.x} ${innerEnd.y}`,
    arcSegment(cx, cy, innerR, startAngle, 0, largeArc),
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

// --- Elbow ---
//
// The classic LCARS "elbow" bracket: an L-shaped bar (one arm hugging a horizontal edge, one
// hugging an adjacent vertical edge) with a convex-rounded OUTER corner and a concave-rounded
// INNER corner where the two arms meet. The existing renderer builds this with a pure-CSS trick
// (an outer rounded block plus an offset, smaller-radius rounded cutout via ::after) - there is no
// JS geometry to port. This derives the equivalent path from scratch.
//
// Each of the 4 corner variants below was hand-derived and cross-checked independently (not by
// mirroring one canonical case and hoping the sweep flags still hold) - a coordinate reflection
// silently flips which rotational direction is "the short way around" for every arc, and getting
// that wrong is exactly the class of bug that shipped in Milestone 2's ring/wedge code. For each
// corner, the outer arc's bulge direction (must point away from the shape, convex) and the inner
// arc's bulge direction (must point into the shape's notch, concave) were verified against the
// angle each arc's midpoint sits at, not just assumed from the flag arithmetic.
export type ElbowCorner = "top-left" | "top-right" | "bottom-left" | "bottom-right";

/**
 * An elbow bracket inside the box (x, y, w, h): one arm of thickness armThicknessY hugging a
 * horizontal edge, one of thickness armThicknessX hugging the adjacent vertical edge, joined at
 * `corner`. outerRadius rounds the bracket's outer corner (convex); innerRadius rounds the notch
 * where the two arms meet (concave). Both radii are clamped to the arm thicknesses so the fillets
 * can never overlap or exceed the available material.
 */
export function elbowPath(
  x: number,
  y: number,
  w: number,
  h: number,
  armThicknessX: number,
  armThicknessY: number,
  corner: ElbowCorner,
  outerRadius: number,
  innerRadius: number,
): string {
  if (w <= 0 || h <= 0) return "";
  const ax = Math.max(0, Math.min(armThicknessX, w));
  const ay = Math.max(0, Math.min(armThicknessY, h));
  const outerR = Math.max(0, Math.min(outerRadius, ax, ay));
  const innerR = Math.max(0, Math.min(innerRadius, ax, ay));
  const at = (dx: number, dy: number): Point => ({ x: x + dx, y: y + dy });

  switch (corner) {
    case "top-left": {
      // Arms hug the top and left edges; outer corner is the box's top-left.
      const outerCenter = at(outerR, outerR);
      const innerCenter = at(ax, ay);
      const p1 = at(outerR, 0);
      const p2 = at(w, 0);
      const p3 = at(w, ay);
      const p4 = polarToCartesian(innerCenter.x, innerCenter.y, innerR, 0);
      const p6 = at(ax, h);
      const p7 = at(0, h);
      const p8 = polarToCartesian(outerCenter.x, outerCenter.y, outerR, 180);
      return [
        `M ${p1.x} ${p1.y}`, `L ${p2.x} ${p2.y}`, `L ${p3.x} ${p3.y}`, `L ${p4.x} ${p4.y}`,
        arcSegment(innerCenter.x, innerCenter.y, innerR, 90, 1, 0),
        `L ${p6.x} ${p6.y}`, `L ${p7.x} ${p7.y}`, `L ${p8.x} ${p8.y}`,
        arcSegment(outerCenter.x, outerCenter.y, outerR, 270, 1, 0),
        "Z",
      ].join(" ");
    }
    case "top-right": {
      // Arms hug the top and right edges; outer corner is the box's top-right.
      const outerCenter = at(w - outerR, outerR);
      const innerCenter = at(w - ax, ay);
      const p1 = at(w - outerR, 0);
      const p2 = at(0, 0);
      const p3 = at(0, ay);
      const p4 = polarToCartesian(innerCenter.x, innerCenter.y, innerR, 180);
      const p6 = at(w - ax, h);
      const p7 = at(w, h);
      const p8 = polarToCartesian(outerCenter.x, outerCenter.y, outerR, 0);
      return [
        `M ${p1.x} ${p1.y}`, `L ${p2.x} ${p2.y}`, `L ${p3.x} ${p3.y}`, `L ${p4.x} ${p4.y}`,
        arcSegment(innerCenter.x, innerCenter.y, innerR, 90, 0, 0),
        `L ${p6.x} ${p6.y}`, `L ${p7.x} ${p7.y}`, `L ${p8.x} ${p8.y}`,
        arcSegment(outerCenter.x, outerCenter.y, outerR, 270, 0, 0),
        "Z",
      ].join(" ");
    }
    case "bottom-left": {
      // Arms hug the bottom and left edges; outer corner is the box's bottom-left.
      const outerCenter = at(outerR, h - outerR);
      const innerCenter = at(ax, h - ay);
      const p1 = at(outerR, h);
      const p2 = at(w, h);
      const p3 = at(w, h - ay);
      const p4 = polarToCartesian(innerCenter.x, innerCenter.y, innerR, 0);
      const p6 = at(ax, 0);
      const p7 = at(0, 0);
      const p8 = polarToCartesian(outerCenter.x, outerCenter.y, outerR, 180);
      return [
        `M ${p1.x} ${p1.y}`, `L ${p2.x} ${p2.y}`, `L ${p3.x} ${p3.y}`, `L ${p4.x} ${p4.y}`,
        arcSegment(innerCenter.x, innerCenter.y, innerR, 270, 0, 0),
        `L ${p6.x} ${p6.y}`, `L ${p7.x} ${p7.y}`, `L ${p8.x} ${p8.y}`,
        arcSegment(outerCenter.x, outerCenter.y, outerR, 90, 0, 0),
        "Z",
      ].join(" ");
    }
    case "bottom-right": {
      // Arms hug the bottom and right edges; outer corner is the box's bottom-right.
      const outerCenter = at(w - outerR, h - outerR);
      const innerCenter = at(w - ax, h - ay);
      const p1 = at(w - outerR, h);
      const p2 = at(0, h);
      const p3 = at(0, h - ay);
      const p4 = polarToCartesian(innerCenter.x, innerCenter.y, innerR, 180);
      const p6 = at(w - ax, 0);
      const p7 = at(w, 0);
      const p8 = polarToCartesian(outerCenter.x, outerCenter.y, outerR, 0);
      return [
        `M ${p1.x} ${p1.y}`, `L ${p2.x} ${p2.y}`, `L ${p3.x} ${p3.y}`, `L ${p4.x} ${p4.y}`,
        arcSegment(innerCenter.x, innerCenter.y, innerR, 270, 1, 0),
        `L ${p6.x} ${p6.y}`, `L ${p7.x} ${p7.y}`, `L ${p8.x} ${p8.y}`,
        arcSegment(outerCenter.x, outerCenter.y, outerR, 90, 1, 0),
        "Z",
      ].join(" ");
    }
    default: {
      const exhaustive: never = corner;
      throw new Error(`Unknown elbow corner: ${String(exhaustive)}`);
    }
  }
}

// --- Polygon / raw path ---

/** A closed polygon through the given points. Returns "" for fewer than 3 points. */
export function polygonPath(points: Point[]): string {
  if (points.length < 3) return "";
  const [first, ...rest] = points;
  return [
    `M ${first.x} ${first.y}`,
    ...rest.map((p) => `L ${p.x} ${p.y}`),
    "Z",
  ].join(" ");
}

// A typed, non-stringly subset of SVG path commands - enough for arbitrary custom shapes
// (straight edges plus circular arcs) without exposing a raw SVG path string through the Python
// DSL, where a typo would only surface as a silently-broken render.
export type PathCommand =
  | { op: "move"; x: number; y: number }
  | { op: "line"; x: number; y: number }
  | { op: "arc"; rx: number; ry: number; rotation: number; largeArc: 0 | 1; sweep: 0 | 1; x: number; y: number }
  | { op: "close" };

/** Builds an SVG path `d` string from a typed command list. Returns "" for an empty list. */
export function pathFromCommands(commands: PathCommand[]): string {
  if (commands.length === 0) return "";
  return commands
    .map((c) => {
      switch (c.op) {
        case "move":
          return `M ${c.x} ${c.y}`;
        case "line":
          return `L ${c.x} ${c.y}`;
        case "arc":
          return `A ${c.rx} ${c.ry} ${c.rotation} ${c.largeArc} ${c.sweep} ${c.x} ${c.y}`;
        case "close":
          return "Z";
        default: {
          const exhaustive: never = c;
          throw new Error(`Unknown path command: ${JSON.stringify(exhaustive)}`);
        }
      }
    })
    .join(" ");
}
