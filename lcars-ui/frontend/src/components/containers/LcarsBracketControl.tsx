import type { ReactNode } from "react";
import clsx from "clsx";

import type { LcarsBracketWidget, Widget } from "../../types/contract";
import { LcarsBar } from "../shapes/LcarsBar";

interface LcarsBracketControlProps {
  widget: LcarsBracketWidget;
  renderWidget: (widget: Widget) => ReactNode;
}

export const LcarsBracketControl = ({ widget, renderWidget }: LcarsBracketControlProps) => {
  const showLeft = widget.orientation === "left" || widget.orientation === "both";
  const showRight = widget.orientation === "right" || widget.orientation === "both";

  return (
    <article className={clsx("lcars-bracket-control", `lcars-bracket-${widget.orientation}`)}>
      {showLeft ? <LcarsBar className="lcars-bracket-rail" color={widget.color} orientation="vertical" /> : null}
      <div className="lcars-bracket-content">
        {widget.children.map((child) => (
          <div className="lcars-bracket-child" key={child.id}>
            {renderWidget(child)}
          </div>
        ))}
      </div>
      {showRight ? <LcarsBar className="lcars-bracket-rail" color={widget.color} orientation="vertical" /> : null}
    </article>
  );
};
