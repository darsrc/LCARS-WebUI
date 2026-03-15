import type { CSSProperties } from "react";

import type { LcarsColor } from "../../types/contract";

export interface LcarsRectSegmentSpec {
  x: number;
  y: number;
  width: number;
  height: number;
  fill: LcarsColor;
  rx?: number;
  ry?: number;
}

export interface LcarsTextRowsBlock {
  rows: string[];
  x: number;
  y: number;
  lineHeight: number;
  letterSpacing?: string;
  className?: string;
  textAnchor?: "start" | "middle" | "end";
}

export interface LcarsBarRunSegment {
  color?: LcarsColor | null;
  label?: string | null;
  align?: "left" | "right" | "center";
  weight?: number;
  roundedStart?: boolean;
  roundedEnd?: boolean;
}

export interface LcarsAnchoredBarRecipeSpec {
  fill: LcarsColor;
  height: number;
  widths: ReadonlyArray<number>;
  gap?: number;
  label?: string | null;
  labelAlign?: LcarsBarRunSegment["align"];
  labelSegmentIndex?: number;
  roundedStart?: boolean;
  roundedEnd?: boolean;
}

export interface LcarsCapsuleBarSpec {
  x: number;
  y: number;
  width: number;
  height: number;
  fill: LcarsColor;
  label: string;
  labelClassName?: string;
  labelOffsetX?: number;
  labelOffsetY?: number;
  textAnchor?: "start" | "middle" | "end";
}

interface ResolvedCapsuleLabelAnchor {
  x: number;
  y: number;
  textAnchor: "start" | "middle" | "end";
}

interface SegmentRunLabelOptions {
  label?: string | null;
  labelAlign?: LcarsBarRunSegment["align"];
  labelSegmentIndex?: number;
}

export const segmentedBarRunFromRectSegments = (
  segments: ReadonlyArray<LcarsRectSegmentSpec>,
  { label, labelAlign = "right", labelSegmentIndex }: SegmentRunLabelOptions = {},
): LcarsBarRunSegment[] => {
  if (segments.length === 0) {
    return [];
  }

  const fallbackLabelIndex = segments.reduce(
    (selectedIndex, segment, index, run) => (segment.width > run[selectedIndex].width ? index : selectedIndex),
    0,
  );
  const resolvedLabelIndex = label ? labelSegmentIndex ?? fallbackLabelIndex : -1;

  return segments.map((segment, index) => ({
    color: segment.fill,
    label: index === resolvedLabelIndex ? label : undefined,
    align: index === resolvedLabelIndex ? labelAlign : undefined,
    weight: Math.max(segment.width, 1),
    roundedStart: index === 0 && Boolean(segment.rx ?? segment.ry),
    roundedEnd: index === segments.length - 1 && Boolean(segment.rx ?? segment.ry),
  }));
};

export const rectSegmentsFromAnchoredBarRecipe = (
  recipe: LcarsAnchoredBarRecipeSpec,
): LcarsRectSegmentSpec[] => {
  const gap = recipe.gap ?? 12;
  let x = 0;
  return recipe.widths.map((width, index) => {
    const segment: LcarsRectSegmentSpec = {
      x,
      y: 0,
      width,
      height: recipe.height,
      fill: recipe.fill,
    };
    if (recipe.roundedStart && index === 0) {
      segment.rx = recipe.height / 2;
      segment.ry = recipe.height / 2;
    }
    if (recipe.roundedEnd && index === recipe.widths.length - 1) {
      segment.rx = recipe.height / 2;
      segment.ry = recipe.height / 2;
    }
    x += width + gap;
    return segment;
  });
};

export const anchoredBarRunFromRecipe = (
  recipe: LcarsAnchoredBarRecipeSpec,
): LcarsBarRunSegment[] => {
  return segmentedBarRunFromRectSegments(rectSegmentsFromAnchoredBarRecipe(recipe), {
    label: recipe.label,
    labelAlign: recipe.labelAlign,
    labelSegmentIndex: recipe.labelSegmentIndex,
  });
};

export const resolveCapsuleLabelAnchor = (
  spec: LcarsCapsuleBarSpec,
  origin: { x: number; y: number },
): ResolvedCapsuleLabelAnchor => {
  const textAnchor = spec.textAnchor ?? "start";
  const x =
    textAnchor === "end"
      ? origin.x + spec.width - (spec.labelOffsetX ?? 14)
      : textAnchor === "middle"
        ? origin.x + spec.width / 2
        : origin.x + (spec.labelOffsetX ?? 16);
  const y = origin.y + spec.height / 2 + (spec.labelOffsetY ?? 6);

  return {
    x,
    y,
    textAnchor,
  };
};

export const barRunFromCapsuleSpec = (spec: LcarsCapsuleBarSpec): LcarsBarRunSegment[] => {
  return anchoredBarRunFromRecipe({
    fill: spec.fill,
    height: spec.height,
    widths: [spec.width],
    label: spec.label,
    labelAlign:
      spec.textAnchor === "middle"
        ? "center"
        : spec.textAnchor === "end"
          ? "right"
          : "left",
    labelSegmentIndex: 0,
    roundedStart: true,
    roundedEnd: true,
  });
};

export const LcarsSvgSegmentRun = ({
  className,
  segments,
}: {
  className?: string;
  segments: ReadonlyArray<LcarsRectSegmentSpec>;
}) => {
  return (
    <>
      {segments.map((segment, index) => (
        <rect
          className={className}
          fill={segment.fill}
          height={segment.height}
          key={`${segment.x}-${segment.y}-${index}`}
          rx={segment.rx}
          ry={segment.ry}
          width={segment.width}
          x={segment.x}
          y={segment.y}
        />
      ))}
    </>
  );
};

export const LcarsSvgTextRows = ({ blocks }: { blocks: ReadonlyArray<LcarsTextRowsBlock> }) => {
  return (
    <>
      {blocks.map((block, blockIndex) => (
        <g className={block.className} key={`block-${blockIndex}`}>
          {block.rows.map((row, rowIndex) => {
            const style: CSSProperties | undefined = block.letterSpacing
              ? { letterSpacing: block.letterSpacing }
              : undefined;
            return (
              <text
                key={`${blockIndex}-${rowIndex}`}
                style={style}
                textAnchor={block.textAnchor}
                x={block.x}
                y={block.y + block.lineHeight * rowIndex}
              >
                {row}
              </text>
            );
          })}
        </g>
      ))}
    </>
  );
};
