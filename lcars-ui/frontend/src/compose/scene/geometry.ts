import { elbowPath, pathFromCommands } from "../../widgets/surfaceGeometry";
import type { ElbowCorner, Point, PathCommand } from "../../widgets/surfaceGeometry";
import type { Rect, ScenePath } from "./types";

export type Cap = "none" | "start" | "end" | "both";

export interface BandShape {
  d: string;
  bbox: Rect;
}

function bandShape(d: string, bbox: Rect): BandShape {
  return { d, bbox };
}

/** Return a horizontal band path and its bounding box. */
export function hBand(x: number, y: number, w: number, t: number, cap: Cap = "none"): BandShape {
  const radius = Math.min(t / 2, w / 2);
  const hasStartCap = cap === "start" || cap === "both";
  const hasEndCap = cap === "end" || cap === "both";
  const d = `M ${x + (hasStartCap ? radius : 0)} ${y} L ${x + w - (hasEndCap ? radius : 0)} ${y} ${hasEndCap ? `A ${radius} ${radius} 0 0 1 ${x + w} ${y + radius} L ${x + w} ${y + t - radius} A ${radius} ${radius} 0 0 1 ${x + w - radius} ${y + t}` : `L ${x + w} ${y + t}`} L ${x + (hasStartCap ? radius : 0)} ${y + t} ${hasStartCap ? `A ${radius} ${radius} 0 0 1 ${x} ${y + t - radius} L ${x} ${y + radius} A ${radius} ${radius} 0 0 1 ${x + radius} ${y}` : `L ${x} ${y}`} Z`;
  return bandShape(d, { x, y, w, h: t });
}

/** Return a vertical band path and its bounding box. */
export function vBand(x: number, y: number, h: number, t: number, cap: Cap = "none"): BandShape {
  const radius = Math.min(t / 2, h / 2);
  const hasStartCap = cap === "start" || cap === "both";
  const hasEndCap = cap === "end" || cap === "both";
  const d = `M ${x} ${y + (hasStartCap ? radius : 0)} ${hasStartCap ? `A ${radius} ${radius} 0 0 1 ${x + radius} ${y} L ${x + t - radius} ${y} A ${radius} ${radius} 0 0 1 ${x + t} ${y + radius}` : `L ${x + t} ${y}`} L ${x + t} ${y + h - (hasEndCap ? radius : 0)} ${hasEndCap ? `A ${radius} ${radius} 0 0 1 ${x + t - radius} ${y + h} L ${x + radius} ${y + h} A ${radius} ${radius} 0 0 1 ${x} ${y + h - radius}` : `L ${x} ${y + h}`} Z`;
  return bandShape(d, { x, y, w: t, h });
}

/** Return an elbow path and its bounding box. */
export function elbow(
  rect: Rect,
  corner: ElbowCorner,
  armX: number,
  armY: number,
  outer: number,
  inner: number,
): BandShape {
  return bandShape(
    elbowPath(rect.x, rect.y, rect.w, rect.h, armX, armY, corner, outer, inner),
    rect,
  );
}

export type Branch = "up" | "down" | "left" | "right";

/** Return a junction path and its bounding box. */
export function junction(x: number, y: number, t: number, branches: Branch[]): BandShape {
  const branchSet = new Set(branches);
  const left = branchSet.has("left") ? x - t : x;
  const right = branchSet.has("right") ? x + 2 * t : x + t;
  const top = branchSet.has("up") ? y - t : y;
  const bottom = branchSet.has("down") ? y + 2 * t : y + t;
  const points: Point[] = [
    { x, y: top },
    { x: x + t, y: top },
    { x: x + t, y },
    { x: right, y },
    { x: right, y: y + t },
    { x: x + t, y: y + t },
    { x: x + t, y: bottom },
    { x, y: bottom },
    { x, y: y + t },
    { x: left, y: y + t },
    { x: left, y },
    { x, y },
  ];
  const commands: PathCommand[] = [
    { op: "move", ...points[0] },
    ...points.slice(1).map((point): PathCommand => ({ op: "line", ...point })),
    { op: "close" },
  ];
  return bandShape(pathFromCommands(commands), {
    x: left,
    y: top,
    w: right - left,
    h: bottom - top,
  });
}

/** Return a rounded stepped band path and its bounding box. */
export function stepPath(points: Point[], t: number, radius: number): BandShape {
  if (points.length < 2) return bandShape("", { x: 0, y: 0, w: 0, h: 0 });
  const directions = points.slice(1).map((point, index) => {
    const deltaX = point.x - points[index].x;
    const deltaY = point.y - points[index].y;
    if ((deltaX === 0) === (deltaY === 0)) {
      throw new Error("Step segments must be nonzero and orthogonal");
    }
    return { x: Math.sign(deltaX), y: Math.sign(deltaY) };
  });
  const side = (sign: number): Point[] =>
    points.map((point, index) => {
      const previousDirection = directions[Math.max(0, index - 1)];
      const nextDirection = directions[Math.min(directions.length - 1, index)];
      if (
        index > 0 &&
        index < points.length - 1 &&
        previousDirection.x === -nextDirection.x &&
        previousDirection.y === -nextDirection.y
      ) {
        throw new Error("Step cannot reverse direction");
      }
      const divisor = index === 0 || index === points.length - 1 ? 2 : 1;
      return {
        x: point.x - (sign * t * (previousDirection.y + nextDirection.y)) / (2 * divisor),
        y: point.y + (sign * t * (previousDirection.x + nextDirection.x)) / (2 * divisor),
      };
    });
  const polygon = [...side(1), ...side(-1).reverse()];
  const minX = Math.min(...polygon.map((point) => point.x));
  const minY = Math.min(...polygon.map((point) => point.y));
  const maxX = Math.max(...polygon.map((point) => point.x));
  const maxY = Math.max(...polygon.map((point) => point.y));
  const commands: PathCommand[] = [];
  for (let index = 0; index < polygon.length; index += 1) {
    const previous = polygon[(index + polygon.length - 1) % polygon.length];
    const point = polygon[index];
    const next = polygon[(index + 1) % polygon.length];
    const previousDistance = Math.hypot(point.x - previous.x, point.y - previous.y);
    const nextDistance = Math.hypot(next.x - point.x, next.y - point.y);
    const cornerRadius = Math.max(0, Math.min(radius, previousDistance / 2, nextDistance / 2));
    const before = {
      x: point.x + ((previous.x - point.x) * cornerRadius) / (previousDistance || 1),
      y: point.y + ((previous.y - point.y) * cornerRadius) / (previousDistance || 1),
    };
    const after = {
      x: point.x + ((next.x - point.x) * cornerRadius) / (nextDistance || 1),
      y: point.y + ((next.y - point.y) * cornerRadius) / (nextDistance || 1),
    };
    commands.push(index === 0 ? { op: "move", ...before } : { op: "line", ...before });
    if (cornerRadius) {
      commands.push({
        op: "arc",
        rx: cornerRadius,
        ry: cornerRadius,
        rotation: 0,
        largeArc: 0,
        sweep:
          (point.x - previous.x) * (next.y - point.y) -
            (point.y - previous.y) * (next.x - point.x) >
          0
            ? 1
            : 0,
        ...after,
      });
    }
  }
  commands.push({ op: "close" });
  return bandShape(pathFromCommands(commands), {
    x: minX,
    y: minY,
    w: maxX - minX,
    h: maxY - minY,
  });
}

/** Return a bridge path and its bounding box between two rects. */
export function bridge(a: Rect, b: Rect, t: number): BandShape {
  const left = a.x <= b.x ? a : b;
  const right = left === a ? b : a;
  const centerY = (Math.max(left.y, right.y) + Math.min(left.y + left.h, right.y + right.h)) / 2;
  const startX = left.x + left.w;
  const endX = right.x;
  return hBand(startX, centerY - t / 2, endX - startX, t);
}

/** Construct a ScenePath, including its optional bounds and relation identifier. */
export function scenePath(
  id: string,
  kind: ScenePath["kind"],
  d: string,
  tone: ScenePath["tone"],
  bbox?: Rect,
  relationId?: string,
): ScenePath {
  return { id, kind, d, tone, ...(bbox ? { bbox } : {}), ...(relationId ? { relationId } : {}) };
}
