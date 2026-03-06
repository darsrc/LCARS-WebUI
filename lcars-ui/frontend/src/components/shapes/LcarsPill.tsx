import type { CSSProperties } from "react";
import clsx from "clsx";

import type { LcarsColor } from "../../types/contract";
import { accentStyle } from "../widgetStyles";

interface LcarsPillProps {
  color?: LcarsColor | null;
  variant?: "full" | "left" | "right";
  className?: string;
  style?: CSSProperties;
}

export const LcarsPill = ({ color, variant = "full", className, style }: LcarsPillProps) => {
  return (
    <div
      aria-hidden="true"
      className={clsx("lcars-pill", `lcars-pill-${variant}`, className)}
      style={{ ...accentStyle(color), ...style }}
    />
  );
};

interface LcarsHalfPillProps {
  color?: LcarsColor | null;
  side: "left" | "right";
  className?: string;
  style?: CSSProperties;
}

export const LcarsHalfPill = ({ color, side, className, style }: LcarsHalfPillProps) => {
  return <LcarsPill className={className} color={color} style={style} variant={side} />;
};
