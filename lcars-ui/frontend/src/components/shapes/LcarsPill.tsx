import type { ComponentPropsWithoutRef } from "react";
import clsx from "clsx";

import type { LcarsColor } from "../../types/contract";
import { accentStyle } from "../widgetStyles";

interface LcarsPillProps extends Omit<ComponentPropsWithoutRef<"div">, "color"> {
  color?: LcarsColor | null;
  variant?: "full" | "left" | "right";
}

export const LcarsPill = ({ color, variant = "full", className, style, ...divProps }: LcarsPillProps) => {
  return (
    <div
      {...divProps}
      aria-hidden="true"
      className={clsx("lcars-pill", `lcars-pill-${variant}`, className)}
      style={{ ...accentStyle(color), ...style }}
    />
  );
};

interface LcarsHalfPillProps extends Omit<ComponentPropsWithoutRef<"div">, "color"> {
  color?: LcarsColor | null;
  side: "left" | "right";
}

export const LcarsHalfPill = ({ color, side, className, style, ...divProps }: LcarsHalfPillProps) => {
  return <LcarsPill {...divProps} className={className} color={color} style={style} variant={side} />;
};
