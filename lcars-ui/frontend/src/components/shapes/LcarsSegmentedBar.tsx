import type { CSSProperties } from "react";
import clsx from "clsx";

import type { LcarsBarRunSegment } from "../primitives/lcarsGeometryPrimitives";
import { resolveColorToken } from "../../theme/colorTokens";

export type LcarsSegment = LcarsBarRunSegment;

type LcarsSegmentStyle = CSSProperties & Record<`--${string}`, string | number | undefined>;

interface LcarsSegmentedBarProps {
  segments: ReadonlyArray<LcarsBarRunSegment>;
  orientation?: "horizontal" | "vertical";
  className?: string;
  style?: CSSProperties;
}

const segmentBorderRadius = (
  orientation: "horizontal" | "vertical",
  roundedStart?: boolean,
  roundedEnd?: boolean,
): string | undefined => {
  if (!roundedStart && !roundedEnd) {
    return undefined;
  }
  const radius = "var(--lcars-pill-radius)";
  if (orientation === "vertical") {
    return `${roundedStart ? radius : "0"} ${roundedStart ? radius : "0"} ${roundedEnd ? radius : "0"} ${roundedEnd ? radius : "0"}`;
  }
  return `${roundedStart ? radius : "0"} ${roundedEnd ? radius : "0"} ${roundedEnd ? radius : "0"} ${roundedStart ? radius : "0"}`;
};

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
      {segments.map((segment, index) => {
        const segmentStyle: LcarsSegmentStyle = {
          "--lcars-segment-color": resolveColorToken(segment.color),
        };
        if (segment.weight != null && segment.weight !== 1) {
          segmentStyle["--lcars-segment-flex-grow"] = segment.weight;
        }
        if (segment.roundedStart || segment.roundedEnd) {
          segmentStyle.borderRadius = segmentBorderRadius(
            orientation,
            segment.roundedStart,
            segment.roundedEnd,
          );
        }
        if (segment.align === "left") {
          segmentStyle.justifyContent = "flex-start";
        } else if (segment.align === "center") {
          segmentStyle.justifyContent = "center";
        }
        return (
          <div
            className="lcars-bar-segment"
            key={`${segment.label ?? "segment"}-${index + 1}`}
            style={segmentStyle}
          >
            {segment.label ? (
              <span
                className="lcars-bar-segment-label"
                style={
                  segment.align && segment.align !== "right"
                    ? { textAlign: segment.align }
                    : undefined
                }
              >
                {segment.label}
              </span>
            ) : null}
          </div>
        );
      })}
    </div>
  );
};
