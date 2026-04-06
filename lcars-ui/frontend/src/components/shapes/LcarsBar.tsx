import type { ComponentPropsWithoutRef } from "react";
import clsx from "clsx";

import type { LcarsColor } from "../../types/contract";
import { accentStyle } from "../widgetStyles";

interface LcarsBarProps extends Omit<ComponentPropsWithoutRef<"div">, "color"> {
  color?: LcarsColor | null;
  orientation?: "horizontal" | "vertical";
  label?: string | null;
  align?: "left" | "right" | "center";
  roundedStart?: boolean;
  roundedEnd?: boolean;
  /** Override pill radius: "full" (999px), "half" (half bar height), number (px) */
  roundedRadius?: "full" | "half" | number;
}

export const LcarsBar = ({
  color,
  orientation = "horizontal",
  label,
  align = "right",
  roundedStart = false,
  roundedEnd = false,
  roundedRadius,
  className,
  style,
  ...divProps
}: LcarsBarProps) => {
  const radiusStyle: React.CSSProperties = {};
  if (roundedRadius !== undefined && (roundedStart || roundedEnd)) {
    const val =
      roundedRadius === "full"
        ? "999px"
        : roundedRadius === "half"
          ? "50%"
          : `${roundedRadius}px`;
    if (roundedStart) {
      radiusStyle.borderTopLeftRadius = val;
      radiusStyle.borderBottomLeftRadius = val;
    }
    if (roundedEnd) {
      radiusStyle.borderTopRightRadius = val;
      radiusStyle.borderBottomRightRadius = val;
    }
  }

  return (
    <div
      {...divProps}
      className={clsx(
        "lcars-bar",
        `lcars-bar-${orientation}`,
        {
          "lcars-bar-rounded-start": roundedStart && !roundedRadius,
          "lcars-bar-rounded-end": roundedEnd && !roundedRadius,
        },
        className,
      )}
      style={{ ...accentStyle(color), ...radiusStyle, ...style }}
    >
      {label ? <span className={clsx("lcars-bar-label", `align-${align}`)}>{label}</span> : null}
    </div>
  );
};
