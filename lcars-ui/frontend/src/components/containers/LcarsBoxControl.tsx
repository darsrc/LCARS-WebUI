import type { CSSProperties, ReactNode } from "react";

import type { LcarsBoxWidget, LcarsColor, Widget } from "../../types/contract";
import { GEOMETRY_TOKENS } from "../../theme/geometryTokens";
import { LcarsElbow } from "../shell/LcarsElbow";
import { LcarsHalfPill } from "../shapes/LcarsPill";
import { LcarsSegmentedBar, type LcarsSegment } from "../shapes/LcarsSegmentedBar";

interface LcarsBoxControlProps {
  widget: LcarsBoxWidget;
  renderWidget: (widget: Widget) => ReactNode;
}

const cornerColor = (widget: LcarsBoxWidget, index: 0 | 1 | 2 | 3): LcarsColor => {
  return widget.corner_colors?.[index] ?? widget.color;
};

const sideColor = (widget: LcarsBoxWidget, index: 0 | 1 | 2 | 3): LcarsColor => {
  return widget.side_colors?.[index] ?? widget.color;
};

const has = (values: number[], needle: number): boolean => values.includes(needle);

const sideSegment = (color: LcarsColor, label?: string | null): LcarsSegment[] => [{ color, label }];

const armPercentForWidth = (widthPx: number): number => {
  if (widthPx <= 0) {
    return 24;
  }
  return Math.min(80, Math.max(14, (GEOMETRY_TOKENS.barHeight / widthPx) * 100));
};

const STACK_ZONE_WIDGET_TYPES = new Set([
  "status_tile",
  "alert",
  "progress_bar",
  "gauge",
  "text",
  "markdown",
]);

export const LcarsBoxControl = ({ widget, renderWidget }: LcarsBoxControlProps) => {
  const topLabel = widget.title ?? widget.label ?? null;
  const bottomLabel = widget.subtitle ?? null;
  const leftArm = armPercentForWidth(widget.width_left);
  const rightArm = armPercentForWidth(widget.width_right);
  const stackChildren: Widget[] = [];
  const primaryChildren: Widget[] = [];

  for (const child of widget.children) {
    if (STACK_ZONE_WIDGET_TYPES.has(child.type)) {
      stackChildren.push(child);
      continue;
    }
    primaryChildren.push(child);
  }

  return (
    <article
      className="lcars-box-control"
      style={
        {
          "--lcars-box-left-width": `${widget.width_left}px`,
          "--lcars-box-right-width": `${widget.width_right}px`,
        } as CSSProperties
      }
    >
      <div className="lcars-box-corner lcars-box-corner-tl">
        {has(widget.corners, 1) ? (
          <LcarsElbow
            armHorizontal={GEOMETRY_TOKENS.elbowArmHorizontal}
            armVertical={leftArm}
            color={cornerColor(widget, 0)}
            corner="top-left"
            innerRadius={GEOMETRY_TOKENS.elbowInnerRadius}
          />
        ) : (
          <LcarsHalfPill color={cornerColor(widget, 0)} side="right" />
        )}
      </div>
      <div className="lcars-box-top">
        {has(widget.sides, 1) ? (
          <LcarsSegmentedBar
            className="lcars-box-top-bar"
            segments={sideSegment(sideColor(widget, 0), topLabel)}
          />
        ) : null}
      </div>
      <div className="lcars-box-corner lcars-box-corner-tr">
        {has(widget.corners, 2) ? (
          <LcarsElbow
            armHorizontal={GEOMETRY_TOKENS.elbowArmHorizontal}
            armVertical={rightArm}
            color={cornerColor(widget, 1)}
            corner="top-right"
            innerRadius={GEOMETRY_TOKENS.elbowInnerRadius}
          />
        ) : (
          <LcarsHalfPill color={cornerColor(widget, 1)} side="left" />
        )}
      </div>

      <div className="lcars-box-left">
        {has(widget.sides, 4) ? (
          <LcarsSegmentedBar
            className="lcars-box-side-bar"
            orientation="vertical"
            segments={sideSegment(sideColor(widget, 3))}
          />
        ) : null}
        <div className="lcars-box-input-stack">
          {(widget.left_inputs ?? []).map((inputWidget) => (
            <div className="lcars-box-input-item" key={inputWidget.id}>
              {renderWidget(inputWidget)}
            </div>
          ))}
        </div>
      </div>

      <div className="lcars-box-content">
        {primaryChildren.length > 0 ? (
          <div className="lcars-box-content-main">
            {primaryChildren.map((child) => (
              <div className="lcars-box-child" key={child.id}>
                {renderWidget(child)}
              </div>
            ))}
          </div>
        ) : null}
        {stackChildren.length > 0 ? (
          <div className="lcars-box-content-stack">
            {stackChildren.map((child) => (
              <div className="lcars-box-child" key={child.id}>
                {renderWidget(child)}
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <div className="lcars-box-right">
        <div className="lcars-box-input-stack">
          {(widget.right_inputs ?? []).map((inputWidget) => (
            <div className="lcars-box-input-item" key={inputWidget.id}>
              {renderWidget(inputWidget)}
            </div>
          ))}
        </div>
        {has(widget.sides, 2) ? (
          <LcarsSegmentedBar
            className="lcars-box-side-bar"
            orientation="vertical"
            segments={sideSegment(sideColor(widget, 1))}
          />
        ) : null}
      </div>

      <div className="lcars-box-corner lcars-box-corner-bl">
        {has(widget.corners, 4) ? (
          <LcarsElbow
            armHorizontal={GEOMETRY_TOKENS.elbowArmHorizontal}
            armVertical={leftArm}
            color={cornerColor(widget, 3)}
            corner="bottom-left"
            innerRadius={GEOMETRY_TOKENS.elbowInnerRadius}
          />
        ) : (
          <LcarsHalfPill color={cornerColor(widget, 3)} side="right" />
        )}
      </div>
      <div className="lcars-box-bottom">
        {has(widget.sides, 3) ? (
          <LcarsSegmentedBar
            className="lcars-box-bottom-bar"
            segments={sideSegment(sideColor(widget, 2), bottomLabel)}
          />
        ) : null}
      </div>
      <div className="lcars-box-corner lcars-box-corner-br">
        {has(widget.corners, 3) ? (
          <LcarsElbow
            armHorizontal={GEOMETRY_TOKENS.elbowArmHorizontal}
            armVertical={rightArm}
            color={cornerColor(widget, 2)}
            corner="bottom-right"
            innerRadius={GEOMETRY_TOKENS.elbowInnerRadius}
          />
        ) : (
          <LcarsHalfPill color={cornerColor(widget, 2)} side="left" />
        )}
      </div>
    </article>
  );
};
