import clsx from "clsx";

import type { LcarsHeaderWidget } from "../../types/contract";
import { LcarsBarRunPrimitive } from "../primitives/lcarsSharedScaffoldPrimitives";
import { buildHeaderCapsuleSegments } from "../primitives/lcarsStrictTitlePrimitives";

interface LcarsHeaderControlProps {
  widget: LcarsHeaderWidget;
}

export const LcarsHeaderControl = ({ widget }: LcarsHeaderControlProps) => {
  const segments = buildHeaderCapsuleSegments({
    text: widget.text,
    color: widget.color,
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
