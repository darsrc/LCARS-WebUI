import clsx from "clsx";
import type { CSSProperties } from "react";

import type { LcarsColor } from "../../types/contract";
import { GEOMETRY_TOKENS } from "../../theme/geometryTokens";
import { accentStyle } from "../widgetStyles";

export type ElbowCorner = "top-left" | "top-right" | "bottom-left" | "bottom-right";
export type ElbowVariant = "shell" | "sweep" | "box" | "default";

interface LcarsElbowProps {
  corner: ElbowCorner;
  color?: LcarsColor | null;
  variant?: ElbowVariant;
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

const variantDefaults = (variant: ElbowVariant) => {
  switch (variant) {
    case "shell":
      return {
        armHorizontal: GEOMETRY_TOKENS.shellElbowArmH,
        armVertical: GEOMETRY_TOKENS.shellElbowArmV,
        innerRadius: GEOMETRY_TOKENS.shellElbowInnerRadius,
      };
    case "sweep":
      return {
        armHorizontal: GEOMETRY_TOKENS.sweepElbowArmH,
        armVertical: GEOMETRY_TOKENS.sweepElbowArmV,
        innerRadius: GEOMETRY_TOKENS.sweepElbowInnerRadius,
      };
    case "box":
      return {
        armHorizontal: GEOMETRY_TOKENS.elbowArmHorizontal,
        armVertical: GEOMETRY_TOKENS.elbowArmVertical,
        innerRadius: GEOMETRY_TOKENS.elbowInnerRadius,
      };
    default:
      return {
        armHorizontal: GEOMETRY_TOKENS.elbowArmHorizontal,
        armVertical: GEOMETRY_TOKENS.elbowArmVertical,
        innerRadius: GEOMETRY_TOKENS.elbowInnerRadius,
      };
  }
};

export const LcarsElbow = ({
  corner,
  color,
  variant = "default",
  armHorizontal,
  armVertical,
  innerRadius,
  className,
  style,
}: LcarsElbowProps) => {
  const defaults = variantDefaults(variant);
  const h = armHorizontal ?? defaults.armHorizontal;
  const v = armVertical ?? defaults.armVertical;
  const r = innerRadius ?? defaults.innerRadius;

  const path = elbowPath(h, v, r);

  return (
    <div
      aria-hidden="true"
      className={clsx("lcars-elbow", `lcars-elbow-${corner}`, `lcars-elbow-${variant}`, className)}
      style={{ ...accentStyle(color), ...style }}
    >
      <svg className="lcars-elbow-svg" preserveAspectRatio="none" role="presentation" viewBox="0 0 100 100">
        <path
          className="lcars-elbow-fill"
          d={path}
          transform={`rotate(${CORNER_ROTATION[corner]} 50 50)`}
        />
      </svg>
    </div>
  );
};
