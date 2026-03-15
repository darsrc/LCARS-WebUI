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
