import clsx from "clsx";

import type { LcarsColor } from "../../types/contract";
import { accentClass } from "../widgetStyles";

export type ElbowCorner = "top-left" | "top-right" | "bottom-left" | "bottom-right";

interface LcarsElbowProps {
  corner: ElbowCorner;
  color?: LcarsColor | null;
  className?: string;
}

/**
 * WHY: a dedicated elbow component keeps shell markup readable and gives CSS one
 * consistent hook for all four orientations.
 */
export const LcarsElbow = ({ corner, color, className }: LcarsElbowProps) => {
  return (
    <div
      aria-hidden="true"
      className={clsx("lcars-elbow", `lcars-elbow-${corner}`, accentClass(color), className)}
    />
  );
};
