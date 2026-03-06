import clsx from "clsx";
import type { CSSProperties } from "react";

import type { LcarsColor } from "../../types/contract";
import { GEOMETRY_TOKENS } from "../../theme/geometryTokens";
import { accentStyle } from "../widgetStyles";

export type ElbowCorner = "top-left" | "top-right" | "bottom-left" | "bottom-right";

interface LcarsElbowProps {
  corner: ElbowCorner;
  color?: LcarsColor | null;
  armHorizontal?: number;
  armVertical?: number;
  innerRadius?: number;
  className?: string;
  style?: CSSProperties;
}

const clamp = (value: number, min: number, max: number): number => {
  return Math.min(max, Math.max(min, value));
};

const elbowPath = (armHorizontal: number, armVertical: number, innerRadius: number): string => {
  const h = clamp(armHorizontal, 8, 92);
  const v = clamp(armVertical, 8, 92);
  const maxRadius = Math.min(100 - h, 100 - v);
  const r = clamp(innerRadius, 0, maxRadius);
  const elbowJoinX = v + r;
  const elbowJoinY = h + r;

  if (r <= 0) {
    return `M0 0 H100 V${h} H${v} V100 H0 Z`;
  }

  return `M0 0 H100 V${h} H${elbowJoinX} A${r} ${r} 0 0 0 ${v} ${elbowJoinY} V100 H0 Z`;
};

const CORNER_ROTATION: Record<ElbowCorner, number> = {
  "top-left": 0,
  "top-right": 90,
  "bottom-right": 180,
  "bottom-left": 270,
};

export const LcarsElbow = ({
  corner,
  color,
  armHorizontal = GEOMETRY_TOKENS.elbowArmHorizontal,
  armVertical = GEOMETRY_TOKENS.elbowArmVertical,
  innerRadius = GEOMETRY_TOKENS.elbowInnerRadius,
  className,
  style,
}: LcarsElbowProps) => {
  const path = elbowPath(armHorizontal, armVertical, innerRadius);

  return (
    <div aria-hidden="true" className={clsx("lcars-elbow", `lcars-elbow-${corner}`, className)} style={{ ...accentStyle(color), ...style }}>
      <svg className="lcars-elbow-svg" role="presentation" viewBox="0 0 100 100">
        <path
          className="lcars-elbow-fill"
          d={path}
          transform={`rotate(${CORNER_ROTATION[corner]} 50 50)`}
        />
      </svg>
    </div>
  );
};
