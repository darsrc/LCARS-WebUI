export interface FloatingRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FloatingBounds {
  width: number;
  height: number;
}

export interface SizeLimits {
  minWidth: number;
  minHeight: number;
  maxWidth?: number;
  maxHeight?: number;
}

export const FLOATING_MARGIN = 8;

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), Math.max(min, max));

export const viewportBounds = (): FloatingBounds => ({
  width: typeof window === "undefined" ? 1280 : Math.max(1, window.innerWidth),
  height: typeof window === "undefined" ? 720 : Math.max(1, window.innerHeight),
});

/** Keep an entire floating surface reachable after drag, resize, or rotation. */
export const clampFloatingRect = (
  rect: FloatingRect,
  bounds: FloatingBounds,
  limits: SizeLimits,
  margin = FLOATING_MARGIN,
): FloatingRect => {
  const availableWidth = Math.max(1, bounds.width - margin * 2);
  const availableHeight = Math.max(1, bounds.height - margin * 2);
  const width = clamp(
    rect.width,
    Math.min(limits.minWidth, availableWidth),
    Math.min(limits.maxWidth ?? availableWidth, availableWidth),
  );
  const height = clamp(
    rect.height,
    Math.min(limits.minHeight, availableHeight),
    Math.min(limits.maxHeight ?? availableHeight, availableHeight),
  );
  return {
    x: clamp(rect.x, margin, bounds.width - width - margin),
    y: clamp(rect.y, margin, bounds.height - height - margin),
    width,
    height,
  };
};

export const initialFloatingRect = (
  width: number,
  height: number,
  position: readonly [number, number] | null | undefined,
  bounds = viewportBounds(),
  limits: SizeLimits = { minWidth: 280, minHeight: 180 },
): FloatingRect =>
  clampFloatingRect(
    {
      x: position?.[0] ?? Math.round((bounds.width - width) / 2),
      y: position?.[1] ?? Math.round((bounds.height - height) / 2),
      width,
      height,
    },
    bounds,
    limits,
  );

export const moveFloatingRect = (
  start: FloatingRect,
  deltaX: number,
  deltaY: number,
  bounds = viewportBounds(),
  limits: SizeLimits = { minWidth: 280, minHeight: 180 },
): FloatingRect =>
  clampFloatingRect(
    { ...start, x: start.x + deltaX, y: start.y + deltaY },
    bounds,
    limits,
  );

export const resizeFloatingRect = (
  start: FloatingRect,
  deltaX: number,
  deltaY: number,
  bounds = viewportBounds(),
  limits: SizeLimits = { minWidth: 280, minHeight: 180 },
): FloatingRect =>
  clampFloatingRect(
    { ...start, width: start.width + deltaX, height: start.height + deltaY },
    bounds,
    limits,
  );
