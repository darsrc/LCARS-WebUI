import type { CSSProperties, ReactNode } from "react";
import clsx from "clsx";

import { LcarsElbow } from "../shell/LcarsElbow";
import { LcarsBar } from "../shapes/LcarsBar";
import type { LcarsSweepWidget, Widget } from "../../types/contract";
import { GEOMETRY_TOKENS } from "../../theme/geometryTokens";

interface LcarsSweepControlProps {
  widget: LcarsSweepWidget;
  renderWidget: (widget: Widget) => ReactNode;
}

const armPercentForWidth = (widthPx: number): number => {
  if (widthPx <= 0) {
    return 24;
  }
  return Math.min(80, Math.max(14, (GEOMETRY_TOKENS.barHeight / widthPx) * 100));
};

export const LcarsSweepControl = ({ widget, renderWidget }: LcarsSweepControlProps) => {
  const verticalArm = armPercentForWidth(widget.width_sidebar);
  const headerChildren = widget.header_children ?? [];
  const railChildren = widget.rail_children ?? [];
  const contentChildren = widget.content_children ?? widget.children;

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
          armHorizontal={GEOMETRY_TOKENS.elbowArmHorizontal}
          armVertical={verticalArm}
          color={widget.color}
          corner={widget.reverse ? "bottom-left" : "top-left"}
          innerRadius={GEOMETRY_TOKENS.elbowInnerRadius}
        />
      </div>
      <div className="lcars-sweep-top-bar">
        <div className="lcars-sweep-header-region">
          <LcarsBar color={widget.color} label={widget.title ?? widget.label ?? null} roundedEnd />
          {headerChildren.length > 0 ? (
            <div className="lcars-sweep-header-stack">
              {headerChildren.map((child) => (
                <div className="lcars-sweep-header-child" key={child.id}>
                  {renderWidget(child)}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>
      <div className="lcars-sweep-bottom-corner">
        <LcarsElbow
          armHorizontal={GEOMETRY_TOKENS.elbowArmHorizontal}
          armVertical={verticalArm}
          color={widget.color}
          corner={widget.reverse ? "top-left" : "bottom-left"}
          innerRadius={GEOMETRY_TOKENS.elbowInnerRadius}
        />
      </div>
      <div className="lcars-sweep-sidebar">
        <LcarsBar color={widget.color} orientation="vertical" roundedEnd />
        {railChildren.length > 0 ? (
          <div className="lcars-sweep-rail-controls">
            {railChildren.map((child) => (
              <div className="lcars-sweep-rail-child" key={child.id}>
                {renderWidget(child)}
              </div>
            ))}
          </div>
        ) : null}
      </div>
      <div className="lcars-sweep-content">
        {contentChildren.map((child) => (
          <div className="lcars-sweep-child" key={child.id}>
            {renderWidget(child)}
          </div>
        ))}
      </div>
    </article>
  );
};
