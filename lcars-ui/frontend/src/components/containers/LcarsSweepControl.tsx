import type { CSSProperties, ReactNode } from "react";
import clsx from "clsx";

import { LcarsElbow } from "../shell/LcarsElbow";
import { LcarsBar } from "../shapes/LcarsBar";
import type { LcarsSweepWidget, Widget } from "../../types/contract";

interface LcarsSweepControlProps {
  widget: LcarsSweepWidget;
  renderWidget: (widget: Widget) => ReactNode;
}

const SIDEBAR_BAR_SIZE_PX = 30;

const armPercentForWidth = (widthPx: number): number => {
  if (widthPx <= 0) {
    return 24;
  }
  return Math.min(80, Math.max(14, (SIDEBAR_BAR_SIZE_PX / widthPx) * 100));
};

export const LcarsSweepControl = ({ widget, renderWidget }: LcarsSweepControlProps) => {
  const verticalArm = armPercentForWidth(widget.width_sidebar);

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
        <LcarsElbow
          armHorizontal={62}
          armVertical={verticalArm}
          color={widget.color}
          corner={widget.reverse ? "bottom-left" : "top-left"}
          innerRadius={26}
        />
      </div>
      <div className="lcars-sweep-top-bar">
        <LcarsBar color={widget.color} label={widget.title ?? widget.label ?? null} roundedEnd />
      </div>
      <div className="lcars-sweep-bottom-corner">
        <LcarsElbow
          armHorizontal={62}
          armVertical={verticalArm}
          color={widget.color}
          corner={widget.reverse ? "top-left" : "bottom-left"}
          innerRadius={26}
        />
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
