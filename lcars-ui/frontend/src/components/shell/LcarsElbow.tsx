import clsx from "clsx";
import type { CSSProperties } from "react";

import type { LcarsColor } from "../../types/contract";
import { accentStyle } from "../widgetStyles";

export type ElbowCorner = "top-left" | "top-right" | "bottom-left" | "bottom-right";

interface LcarsElbowProps {
  corner: ElbowCorner;
  color?: LcarsColor | null;
  className?: string;
  style?: CSSProperties;
}

const ELBOW_PATH = "M0 50 A50 50 0 0 1 50 0 L50 22 A28 28 0 0 0 22 50 Z";

const CORNER_ROTATION: Record<ElbowCorner, number> = {
  "top-left": 0,
  "top-right": 90,
  "bottom-right": 180,
  "bottom-left": 270,
};

export const LcarsElbow = ({ corner, color, className, style }: LcarsElbowProps) => {
  return (
    <div aria-hidden="true" className={clsx("lcars-elbow", `lcars-elbow-${corner}`, className)} style={{ ...accentStyle(color), ...style }}>
      <svg className="lcars-elbow-svg" role="presentation" viewBox="0 0 100 100">
        <path
          className="lcars-elbow-fill"
          d={ELBOW_PATH}
          transform={`rotate(${CORNER_ROTATION[corner]} 50 50)`}
        />
      </svg>
    </div>
  );
};
