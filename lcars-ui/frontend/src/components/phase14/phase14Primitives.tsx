import type { ReactNode } from "react";

import {
  resolveCapsuleLabelAnchor,
  type LcarsCapsuleBarSpec,
} from "../primitives/lcarsGeometryPrimitives";

export type Phase14PillSpec = LcarsCapsuleBarSpec & {
  x: number;
  y: number;
};

export interface Phase14MatrixCellSpec {
  x: number;
  y: number;
  width: number;
  height: number;
  fill: string;
  symbol: string;
  title: string;
  subtitle: string;
  badgeVariant?: "simple" | "orbit" | "burst";
}

interface Phase14SceneSurfaceProps {
  targetId: string;
  familyId: string;
  className: string;
  viewBox: string;
  children: ReactNode;
}

export const Phase14SceneSurface = ({
  targetId,
  familyId,
  className,
  viewBox,
  children,
}: Phase14SceneSurfaceProps) => {
  return (
    <section
      aria-label={`Phase 14 ${targetId}`}
      className={`phase14-canonical-scene ${className}`}
      data-phase14-scene-root="true"
      data-phase14-family-recipe={familyId}
      data-phase14-target-id={targetId}
    >
      <svg
        aria-hidden="true"
        className="phase14-canonical-svg"
        shapeRendering="crispEdges"
        textRendering="geometricPrecision"
        viewBox={viewBox}
      >
        {children}
      </svg>
    </section>
  );
};

export const Phase14Pill = ({ spec }: { spec: Phase14PillSpec }) => {
  const rx = spec.height / 2;
  const labelAnchor = resolveCapsuleLabelAnchor(spec, { x: spec.x, y: spec.y });
  return (
    <g className="phase14-pill">
      <rect fill={spec.fill} height={spec.height} rx={rx} ry={rx} width={spec.width} x={spec.x} y={spec.y} />
      <text className={spec.labelClassName} textAnchor={labelAnchor.textAnchor} x={labelAnchor.x} y={labelAnchor.y}>
        {spec.label}
      </text>
    </g>
  );
};

const MatrixBadge = ({
  cx,
  cy,
  variant,
}: {
  cx: number;
  cy: number;
  variant: Phase14MatrixCellSpec["badgeVariant"];
}) => {
  if (variant === "burst") {
    return (
      <g className="phase14-matrix-badge">
        <circle cx={cx} cy={cy} r="11" />
        <circle cx={cx} cy={cy} r="3.5" />
        {[0, 45, 90, 135].map((rotation) => (
          <line
            key={rotation}
            transform={`rotate(${rotation} ${cx} ${cy})`}
            x1={cx - 12}
            x2={cx + 12}
            y1={cy}
            y2={cy}
          />
        ))}
      </g>
    );
  }
  if (variant === "orbit") {
    return (
      <g className="phase14-matrix-badge">
        <circle cx={cx} cy={cy} r="10" />
        <ellipse cx={cx} cy={cy} rx="12" ry="5" transform={`rotate(-28 ${cx} ${cy})`} />
        <ellipse cx={cx} cy={cy} rx="12" ry="5" transform={`rotate(28 ${cx} ${cy})`} />
        <circle cx={cx + 5} cy={cy - 3} r="1.8" />
      </g>
    );
  }
  return (
    <g className="phase14-matrix-badge">
      <circle cx={cx} cy={cy} r="10" />
      <line x1={cx - 5} x2={cx + 5} y1={cy - 5} y2={cy + 5} />
    </g>
  );
};

export const Phase14MatrixCell = ({ spec }: { spec: Phase14MatrixCellSpec }) => {
  const radius = spec.height / 2;
  const badgeCx = spec.x + 26;
  const badgeCy = spec.y + spec.height / 2;
  return (
    <g className="phase14-matrix-cell" data-phase14-primitive="matrix_cell">
      <rect fill={spec.fill} height={spec.height} rx={radius} ry={radius} width={spec.width} x={spec.x} y={spec.y} />
      <MatrixBadge cx={badgeCx} cy={badgeCy} variant={spec.badgeVariant ?? "simple"} />
      <text className="phase14-matrix-symbol" x={spec.x + spec.width - 18} y={spec.y + 16}>
        {spec.symbol}
      </text>
      <text className="phase14-matrix-title" x={spec.x + spec.width - 10} y={spec.y + 28}>
        {spec.title}
      </text>
      <text className="phase14-matrix-subtitle" x={spec.x + spec.width - 10} y={spec.y + 37}>
        {spec.subtitle}
      </text>
    </g>
  );
};
