import type { ReactNode } from "react";
import clsx from "clsx";

import type { LcarsBracketWidget, Widget } from "../../types/contract";
import { LcarsBar } from "../shapes/LcarsBar";

interface LcarsBracketControlProps {
  widget: LcarsBracketWidget;
  renderWidget: (widget: Widget) => ReactNode;
}

const MAIN_ZONE_TYPES = new Set([
  "lcars_box",
  "lcars_sweep",
  "lcars_bracket",
  "table",
  "line_chart",
  "sparkline",
  "log_viewer",
  "video_hls",
]);

export const LcarsBracketControl = ({ widget, renderWidget }: LcarsBracketControlProps) => {
  const showLeft = widget.orientation === "left" || widget.orientation === "both";
  const showRight = widget.orientation === "right" || widget.orientation === "both";
  const mainChildren = widget.children.filter((child) => MAIN_ZONE_TYPES.has(child.type));
  const stackedChildren = widget.children.filter((child) => !MAIN_ZONE_TYPES.has(child.type));

  return (
    <article className={clsx("lcars-bracket-control", `lcars-bracket-${widget.orientation}`)}>
      {showLeft ? <LcarsBar className="lcars-bracket-rail" color={widget.color} orientation="vertical" /> : null}
      <div className="lcars-bracket-content">
        {mainChildren.length > 0 ? (
          <div className="lcars-bracket-main">
            {mainChildren.map((child) => (
              <div className="lcars-bracket-child" key={child.id}>
                {renderWidget(child)}
              </div>
            ))}
          </div>
        ) : null}
        {stackedChildren.length > 0 ? (
          <div className="lcars-bracket-stack">
            {stackedChildren.map((child) => (
              <div className="lcars-bracket-child" key={child.id}>
                {renderWidget(child)}
              </div>
            ))}
          </div>
        ) : null}
      </div>
      {showRight ? <LcarsBar className="lcars-bracket-rail" color={widget.color} orientation="vertical" /> : null}
    </article>
  );
};
