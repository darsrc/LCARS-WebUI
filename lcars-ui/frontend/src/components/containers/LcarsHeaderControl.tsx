import clsx from "clsx";

import type { LcarsHeaderWidget } from "../../types/contract";
import { LcarsBarRunPrimitive, barRunFromCapsuleSpec } from "../primitives/lcarsSharedScaffoldPrimitives";

interface LcarsHeaderControlProps {
  widget: LcarsHeaderWidget;
}

export const LcarsHeaderControl = ({ widget }: LcarsHeaderControlProps) => {
  const segments = barRunFromCapsuleSpec({
    x: 0,
    y: 0,
    width: 1,
    height: 32,
    fill: widget.color,
    label: widget.text,
    textAnchor: "end",
  });

  return (
    <article className={clsx("lcars-header-control", `lcars-header-control-${widget.size}`)}>
      <LcarsBarRunPrimitive
        className="lcars-header-control-bar"
        primitive="capsule-bar"
        segments={segments}
      />
    </article>
  );
};
