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

const clampSweepRatio = (value: number | undefined): number => {
  if (!Number.isFinite(value)) {
    return 0.62;
  }
  return Math.min(0.8, Math.max(0.2, value as number));
};

const splitSweepContent = (content: Widget[], leftRatio: number): [Widget[], Widget[]] => {
  if (content.length <= 1) {
    return [content, []];
  }
  const splitAt = Math.max(1, Math.min(content.length - 1, Math.round(content.length * leftRatio)));
  return [content.slice(0, splitAt), content.slice(splitAt)];
};

export const LcarsSweepControl = ({ widget, renderWidget }: LcarsSweepControlProps) => {
  const verticalArm = armPercentForWidth(widget.width_sidebar);
  const leftRatio = clampSweepRatio(widget.left_width);
  const rightRatio = clampSweepRatio(1 - leftRatio);

  const headerChildren = widget.header_children ?? [];
  const railChildren = widget.column_inputs ?? widget.rail_children ?? [];

  let leftChildren = widget.left_children ?? [];
  let rightChildren = widget.right_children ?? [];
  if (!widget.left_children && !widget.right_children) {
    const content = widget.content_children ?? widget.children;
    [leftChildren, rightChildren] = splitSweepContent(content, leftRatio);
  }
  if (leftChildren.length === 0 && rightChildren.length > 0) {
    leftChildren = [rightChildren[0], ...leftChildren];
    rightChildren = rightChildren.slice(1);
  }

  return (
    <article
      className={clsx("lcars-sweep-control", {
        "lcars-sweep-reverse": widget.reverse,
      })}
      style={
        {
          "--lcars-sweep-sidebar-width": `${widget.width_sidebar}px`,
          "--lcars-sweep-left-fr": `${leftRatio}fr`,
          "--lcars-sweep-right-fr": `${rightRatio}fr`,
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
        <div className="lcars-sweep-rail-controls">
          {railChildren.map((child) => (
            <div className="lcars-sweep-rail-child lcars-sweep-column-child" key={child.id}>
              {renderWidget(child)}
            </div>
          ))}
        </div>
      </div>
      <div className={clsx("lcars-sweep-content", { "lcars-sweep-content-single": rightChildren.length === 0 })}>
        <div className="lcars-sweep-content-main lcars-sweep-content-left">
          {leftChildren.map((child) => (
            <div className="lcars-sweep-child" key={child.id}>
              {renderWidget(child)}
            </div>
          ))}
        </div>
        {rightChildren.length > 0 ? (
          <aside className="lcars-sweep-content-terminal lcars-sweep-content-right">
            {rightChildren.map((child) => (
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
