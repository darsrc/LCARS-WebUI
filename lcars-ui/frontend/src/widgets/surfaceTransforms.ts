// surfaceTransforms.ts - affine-transform math for lcars.surface().group() (Milestone 5:
// mirror/repeat/rotate transform groups). Unlike Milestone 4's anchor/constraint resolver,
// these transforms are deliberately NOT resolved server-side: the manifest carries the group's
// spec (mirror/repeat_radial/repeat_linear/rotate) as-is, and the renderer expands it into N
// copy transforms at render time via a cheap SVG <g transform="matrix(...)"> per copy, keeping
// the JSON payload small regardless of repeat count.

export interface AffineMatrix {
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  f: number;
}

// x' = a*x + c*y + e
// y' = b*x + d*y + f
export const IDENTITY: AffineMatrix = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };

export function matrixToCss(m: AffineMatrix): string {
  return `matrix(${m.a},${m.b},${m.c},${m.d},${m.e},${m.f})`;
}

export function transformPoint(m: AffineMatrix, x: number, y: number): { x: number; y: number } {
  return { x: m.a * x + m.c * y + m.e, y: m.b * x + m.d * y + m.f };
}

// Composes m2 after m1: applying the result to a point is the same as applying m1, then m2.
export function composeMatrix(m2: AffineMatrix, m1: AffineMatrix): AffineMatrix {
  return {
    a: m2.a * m1.a + m2.c * m1.b,
    b: m2.b * m1.a + m2.d * m1.b,
    c: m2.a * m1.c + m2.c * m1.d,
    d: m2.b * m1.c + m2.d * m1.d,
    e: m2.a * m1.e + m2.c * m1.f + m2.e,
    f: m2.b * m1.e + m2.d * m1.f + m2.f,
  };
}

export type MirrorAxis = "x" | "y" | "xy";

// "x" reflects across a VERTICAL line at x=axisX (flips left/right).
// "y" reflects across a HORIZONTAL line at y=axisY (flips top/bottom).
// "xy" is a point reflection through (axisX, axisY) - both at once.
export function mirrorMatrix(axis: MirrorAxis, axisX: number, axisY: number): AffineMatrix {
  switch (axis) {
    case "x":
      return { a: -1, b: 0, c: 0, d: 1, e: 2 * axisX, f: 0 };
    case "y":
      return { a: 1, b: 0, c: 0, d: -1, e: 0, f: 2 * axisY };
    case "xy":
      return { a: -1, b: 0, c: 0, d: -1, e: 2 * axisX, f: 2 * axisY };
  }
}

export function rotationMatrix(angleDeg: number, pivotX: number, pivotY: number): AffineMatrix {
  const rad = (angleDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return {
    a: cos,
    b: sin,
    c: -sin,
    d: cos,
    e: pivotX - pivotX * cos + pivotY * sin,
    f: pivotY - pivotX * sin - pivotY * cos,
  };
}

export function translationMatrix(dx: number, dy: number): AffineMatrix {
  return { a: 1, b: 0, c: 0, d: 1, e: dx, f: dy };
}

export interface GroupTransformSpec {
  mirror?: { axis: MirrorAxis; axis_x?: number | null; axis_y?: number | null } | null;
  repeat_radial?: {
    count: number;
    center_x: number;
    center_y: number;
    start_angle: number;
    end_angle: number;
  } | null;
  repeat_linear?: { count: number; dx: number; dy: number } | null;
  rotate?: number | null;
  rotate_pivot_x?: number | null;
  rotate_pivot_y?: number | null;
}

// One AffineMatrix per copy the group should render. mirror="x"/"y" always produces exactly 2
// copies (identity + the reflection); "xy" produces exactly 2 as well (point reflection is a
// single combined transform, not a 4-way mirror - a caller wanting all 4 quadrants composes two
// separate "x" and "y" mirror groups). repeat_radial/repeat_linear each produce `count` copies.
// `rotate` composes an extra rotation onto every copy (or is the sole transform if nothing else
// is set) - it is not mutually exclusive with the others. designWidth/designHeight supply the
// default mirror axis / rotation pivot (the surface's own center) when not explicitly given.
export function groupCopyTransforms(
  spec: GroupTransformSpec,
  designWidth: number,
  designHeight: number,
): AffineMatrix[] {
  let base: AffineMatrix[];
  if (spec.mirror) {
    const axisX = spec.mirror.axis_x ?? designWidth / 2;
    const axisY = spec.mirror.axis_y ?? designHeight / 2;
    base = [IDENTITY, mirrorMatrix(spec.mirror.axis, axisX, axisY)];
  } else if (spec.repeat_radial) {
    const { count, center_x, center_y, start_angle, end_angle } = spec.repeat_radial;
    base = [];
    for (let i = 0; i < count; i++) {
      const angle = count > 1 ? start_angle + ((end_angle - start_angle) * i) / (count - 1) : start_angle;
      base.push(rotationMatrix(angle, center_x, center_y));
    }
  } else if (spec.repeat_linear) {
    const { count, dx, dy } = spec.repeat_linear;
    base = [];
    for (let i = 0; i < count; i++) base.push(translationMatrix(dx * i, dy * i));
  } else {
    base = [IDENTITY];
  }

  if (spec.rotate != null) {
    const pivotX = spec.rotate_pivot_x ?? designWidth / 2;
    const pivotY = spec.rotate_pivot_y ?? designHeight / 2;
    const rot = rotationMatrix(spec.rotate, pivotX, pivotY);
    base = base.map((m) => composeMatrix(rot, m));
  }

  return base;
}
