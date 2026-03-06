import type { CSSProperties } from "react";
import clsx from "clsx";

import type { LcarsColor } from "../../types/contract";
import { resolveColorToken } from "../../theme/colorTokens";

export interface LcarsSegment {
  color?: LcarsColor | null;
  label?: string | null;
}

interface LcarsSegmentedBarProps {
  segments: LcarsSegment[];
  orientation?: "horizontal" | "vertical";
  className?: string;
  style?: CSSProperties;
}

export const LcarsSegmentedBar = ({
  segments,
  orientation = "horizontal",
  className,
  style,
}: LcarsSegmentedBarProps) => {
  return (
    <div
      className={clsx("lcars-segmented-bar", `lcars-segmented-bar-${orientation}`, className)}
      style={style}
    >
      {segments.map((segment, index) => (
        <div
          className="lcars-bar-segment"
          key={`${segment.label ?? "segment"}-${index + 1}`}
          style={
            {
              "--lcars-segment-color": resolveColorToken(segment.color),
            } as CSSProperties
          }
        >
          {segment.label ? <span className="lcars-bar-segment-label">{segment.label}</span> : null}
        </div>
      ))}
    </div>
  );
};
