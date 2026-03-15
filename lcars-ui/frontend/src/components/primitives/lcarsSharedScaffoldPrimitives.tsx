import type { CSSProperties } from "react";

import type { LcarsColor } from "../../types/contract";
import { LcarsBar } from "../shapes/LcarsBar";
import { LcarsPill } from "../shapes/LcarsPill";
import { LcarsSegmentedBar } from "../shapes/LcarsSegmentedBar";
import {
  LcarsSvgSegmentRun,
  LcarsSvgTextRows,
  anchoredBarRunFromRecipe,
  barRunFromCapsuleSpec,
  rectSegmentsFromAnchoredBarRecipe,
  resolveCapsuleLabelAnchor,
  segmentedBarRunFromRectSegments,
  type LcarsAnchoredBarRecipeSpec,
  type LcarsBarRunSegment,
  type LcarsCapsuleBarSpec,
  type LcarsRectSegmentSpec,
  type LcarsTextRowsBlock,
} from "./lcarsGeometryPrimitives";

export {
  LcarsSvgSegmentRun,
  LcarsSvgTextRows,
  anchoredBarRunFromRecipe,
  barRunFromCapsuleSpec,
  rectSegmentsFromAnchoredBarRecipe,
  resolveCapsuleLabelAnchor,
  segmentedBarRunFromRectSegments,
};
export type {
  LcarsAnchoredBarRecipeSpec,
  LcarsBarRunSegment,
  LcarsCapsuleBarSpec,
  LcarsRectSegmentSpec,
  LcarsTextRowsBlock,
};

export interface LcarsBarSpec {
  fill?: LcarsColor | null;
  label?: string | null;
  align?: LcarsBarRunSegment["align"];
  weight?: number;
  roundedStart?: boolean;
  roundedEnd?: boolean;
}

export interface LcarsPillSpec {
  fill?: LcarsColor | null;
  variant?: "full" | "left" | "right";
}

interface LcarsBarRunPrimitiveProps {
  segments: ReadonlyArray<LcarsBarRunSegment>;
  orientation?: "horizontal" | "vertical";
  className?: string;
  style?: CSSProperties;
  primitive?: "bar-run" | "capsule-bar" | "segment-run";
}

export const barRunFromBarSpec = ({
  fill,
  label,
  align = "right",
  weight = 1,
  roundedStart = false,
  roundedEnd = false,
}: LcarsBarSpec): LcarsBarRunSegment[] => {
  return [
    {
      color: fill,
      label,
      align,
      weight,
      roundedStart,
      roundedEnd,
    },
  ];
};

export const LcarsBarRunPrimitive = ({
  segments,
  orientation = "horizontal",
  className,
  style,
  primitive = "bar-run",
}: LcarsBarRunPrimitiveProps) => {
  if (segments.length === 0) {
    return null;
  }

  if (segments.length === 1) {
    const [segment] = segments;
    return (
      <LcarsBar
        align={segment.align}
        className={className}
        color={segment.color}
        data-lcars-shared-primitive={primitive}
        label={segment.label}
        orientation={orientation}
        roundedEnd={segment.roundedEnd}
        roundedStart={segment.roundedStart}
        style={style}
      />
    );
  }

  return (
    <LcarsSegmentedBar
      className={className}
      data-lcars-shared-primitive={primitive}
      orientation={orientation}
      segments={segments}
      style={style}
    />
  );
};

export const LcarsHtmlPill = ({
  spec,
  className,
  style,
}: {
  spec: LcarsPillSpec;
  className?: string;
  style?: CSSProperties;
}) => {
  return (
    <LcarsPill
      className={className}
      color={spec.fill}
      data-lcars-shared-primitive="pill"
      style={style}
      variant={spec.variant}
    />
  );
};

export const LcarsSvgPill = ({
  spec,
  className,
}: {
  spec: LcarsCapsuleBarSpec;
  className?: string;
}) => {
  const radius = spec.height / 2;
  const labelAnchor = resolveCapsuleLabelAnchor(spec, { x: spec.x, y: spec.y });

  return (
    <g className={className} data-lcars-shared-primitive="pill">
      <rect fill={spec.fill} height={spec.height} rx={radius} ry={radius} width={spec.width} x={spec.x} y={spec.y} />
      <text className={spec.labelClassName} textAnchor={labelAnchor.textAnchor} x={labelAnchor.x} y={labelAnchor.y}>
        {spec.label}
      </text>
    </g>
  );
};
