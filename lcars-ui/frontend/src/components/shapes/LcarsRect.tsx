import type { CSSProperties } from "react";
import clsx from "clsx";

import type { LcarsColor } from "../../types/contract";
import { accentStyle } from "../widgetStyles";

interface LcarsRectProps {
  color?: LcarsColor | null;
  className?: string;
  style?: CSSProperties;
}

export const LcarsRect = ({ color, className, style }: LcarsRectProps) => {
  return (
    <div
      aria-hidden="true"
      className={clsx("lcars-rect", className)}
      style={{ ...accentStyle(color), ...style }}
    />
  );
};
