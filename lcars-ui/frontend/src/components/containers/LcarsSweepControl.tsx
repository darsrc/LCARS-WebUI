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

const SWEEP_TERMINAL_WIDGET_TYPES: ReadonlySet<Widget["type"]> = new Set([
  "button",
  "toggle",
  "lcars_checkbox",
  "select",
  "lcars_radio",
  "lcars_radio_toggle",
  "text_input",
  "number_input",
  "form",
  "mic_button",
]);

const SWEEP_HEADER_WIDGET_TYPES: ReadonlySet<Widget["type"]> = new Set([
  "lcars_header",
  "text",
]);

const armPercentForWidth = (widthPx: number): number => {
  if (widthPx <= 0) {
    return 24;
  }
  return Math.min(80, Math.max(14, (GEOMETRY_TOKENS.barHeight / widthPx) * 100));
};

export const LcarsSweepControl = ({ widget, renderWidget }: LcarsSweepControlProps) => {
  const verticalArm = armPercentForWidth(widget.width_sidebar);
  const hasExplicitRegions =
    Array.isArray(widget.header_children) ||
    Array.isArray(widget.rail_children) ||
    Array.isArray(widget.content_children);

  let headerChildren = widget.header_children ?? [];
  let railChildren = widget.rail_children ?? [];
  let contentChildren = widget.content_children ?? widget.children;

  if (!hasExplicitRegions) {
    const inferredHeader: Widget[] = [];
    const inferredRail: Widget[] = [];
    const inferredContent: Widget[] = [];

    for (const child of widget.children) {
      if (SWEEP_HEADER_WIDGET_TYPES.has(child.type) && inferredHeader.length < 2) {
        inferredHeader.push(child);
        continue;
      }
      if (SWEEP_TERMINAL_WIDGET_TYPES.has(child.type) && inferredRail.length < 3) {
        inferredRail.push(child);
        continue;
      }
      inferredContent.push(child);
    }

    if (inferredContent.length === 0 && inferredRail.length > 1) {
      inferredContent.push(inferredRail.pop() as Widget);
    }

    headerChildren = inferredHeader;
    railChildren = inferredRail;
    contentChildren = inferredContent.length > 0 ? inferredContent : widget.children;
  }

  const mainContentChildren: Widget[] = [];
  const terminalContentChildren: Widget[] = [];

  for (const child of contentChildren) {
    if (SWEEP_TERMINAL_WIDGET_TYPES.has(child.type)) {
      terminalContentChildren.push(child);
      continue;
    }
    mainContentChildren.push(child);
  }

  if (mainContentChildren.length === 0 && terminalContentChildren.length > 0) {
    mainContentChildren.push(terminalContentChildren.shift() as Widget);
  }

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
      <div className={clsx("lcars-sweep-content", { "lcars-sweep-content-single": terminalContentChildren.length === 0 })}>
        <div className="lcars-sweep-content-main">
          {mainContentChildren.map((child) => (
            <div className="lcars-sweep-child" key={child.id}>
              {renderWidget(child)}
            </div>
          ))}
        </div>
        {terminalContentChildren.length > 0 ? (
          <aside className="lcars-sweep-content-terminal">
            {terminalContentChildren.map((child) => (
              <div className="lcars-sweep-content-terminal-child" key={child.id}>
                {renderWidget(child)}
              </div>
            ))}
          </aside>
        ) : null}
      </div>
    </article>
  );
};
