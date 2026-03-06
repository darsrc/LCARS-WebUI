import type { CSSProperties, ReactNode } from "react";
import clsx from "clsx";

import { LcarsElbow } from "../shell/LcarsElbow";
import { LcarsBar } from "../shapes/LcarsBar";
import type { LcarsSweepWidget, Widget } from "../../types/contract";

interface LcarsSweepControlProps {
  widget: LcarsSweepWidget;
  renderWidget: (widget: Widget) => ReactNode;
}

export const LcarsSweepControl = ({ widget, renderWidget }: LcarsSweepControlProps) => {
  return (
    <article
      className={clsx("lcars-sweep-control", { "lcars-sweep-reverse": widget.reverse })}
      style={
        {
          "--lcars-sweep-sidebar-width": `${widget.width_sidebar}px`,
        } as CSSProperties
      }
    >
      <div className="lcars-sweep-top-corner">
        <LcarsElbow color={widget.color} corner={widget.reverse ? "bottom-left" : "top-left"} />
      </div>
      <div className="lcars-sweep-top-bar">
        <LcarsBar color={widget.color} label={widget.title ?? widget.label ?? null} roundedEnd />
      </div>
      <div className="lcars-sweep-bottom-corner">
        <LcarsElbow color={widget.color} corner={widget.reverse ? "top-left" : "bottom-left"} />
      </div>
      <div className="lcars-sweep-sidebar">
        <LcarsBar color={widget.color} orientation="vertical" roundedEnd />
      </div>
      <div className="lcars-sweep-content">
        {widget.children.map((child) => (
          <div className="lcars-sweep-child" key={child.id}>
            {renderWidget(child)}
          </div>
        ))}
      </div>
    </article>
  );
};
