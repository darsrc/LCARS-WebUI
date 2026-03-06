import clsx from "clsx";

import type { LcarsHeaderWidget } from "../../types/contract";
import { LcarsBar } from "../shapes/LcarsBar";

interface LcarsHeaderControlProps {
  widget: LcarsHeaderWidget;
}

export const LcarsHeaderControl = ({ widget }: LcarsHeaderControlProps) => {
  return (
    <article className={clsx("lcars-header-control", `lcars-header-control-${widget.size}`)}>
      <LcarsBar
        align="right"
        className="lcars-header-control-bar"
        color={widget.color}
        label={widget.text}
        roundedEnd
        roundedStart
      />
    </article>
  );
};
