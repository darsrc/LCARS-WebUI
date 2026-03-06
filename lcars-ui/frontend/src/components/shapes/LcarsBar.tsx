import type { CSSProperties } from "react";
import clsx from "clsx";

import type { LcarsColor } from "../../types/contract";
import { accentStyle } from "../widgetStyles";

interface LcarsBarProps {
  color?: LcarsColor | null;
  orientation?: "horizontal" | "vertical";
  label?: string | null;
  align?: "left" | "right" | "center";
  roundedStart?: boolean;
  roundedEnd?: boolean;
  className?: string;
  style?: CSSProperties;
}

export const LcarsBar = ({
  color,
  orientation = "horizontal",
  label,
  align = "right",
  roundedStart = false,
  roundedEnd = false,
  className,
  style,
}: LcarsBarProps) => {
  return (
    <div
      className={clsx(
        "lcars-bar",
        `lcars-bar-${orientation}`,
        {
          "lcars-bar-rounded-start": roundedStart,
          "lcars-bar-rounded-end": roundedEnd,
        },
        className,
      )}
      style={{ ...accentStyle(color), ...style }}
    >
      {label ? <span className={clsx("lcars-bar-label", `align-${align}`)}>{label}</span> : null}
    </div>
  );
};
