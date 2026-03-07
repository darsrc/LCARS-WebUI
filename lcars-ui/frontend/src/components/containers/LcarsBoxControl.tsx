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

const TELEMETRY_ZONE_WIDGET_TYPES: ReadonlySet<Widget["type"]> = new Set([
  "line_chart",
  "sparkline",
  "table",
  "log_viewer",
  "video_hls",
  "markdown",
  "lcars_sweep",
  "lcars_box",
  "lcars_bracket",
  "lcars_header",
]);

const READOUT_ZONE_WIDGET_TYPES: ReadonlySet<Widget["type"]> = new Set([
  "status_tile",
  "alert",
  "progress_bar",
  "gauge",
  "text",
]);

const CONTROL_ZONE_WIDGET_TYPES: ReadonlySet<Widget["type"]> = new Set([
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

export const LcarsBoxControl = ({ widget, renderWidget }: LcarsBoxControlProps) => {
  const topLabel = widget.title ?? widget.label ?? null;
  const bottomLabel = widget.subtitle ?? null;
  const leftArm = armPercentForWidth(widget.width_left);
  const rightArm = armPercentForWidth(widget.width_right);
  const telemetryChildren: Widget[] = [];
  const readoutChildren: Widget[] = [];
  const controlChildren: Widget[] = [];

  for (const child of widget.children) {
    if (CONTROL_ZONE_WIDGET_TYPES.has(child.type)) {
      controlChildren.push(child);
      continue;
    }
    if (READOUT_ZONE_WIDGET_TYPES.has(child.type)) {
      readoutChildren.push(child);
      continue;
    }
    if (TELEMETRY_ZONE_WIDGET_TYPES.has(child.type)) {
      telemetryChildren.push(child);
      continue;
    }
    telemetryChildren.push(child);
  }

  if (telemetryChildren.length === 0 && readoutChildren.length > 0) {
    telemetryChildren.push(readoutChildren.shift() as Widget);
  }
  if (telemetryChildren.length === 0 && controlChildren.length > 0) {
    telemetryChildren.push(controlChildren.shift() as Widget);
  }
  if (readoutChildren.length === 0 && telemetryChildren.length > 1) {
    readoutChildren.push(telemetryChildren.pop() as Widget);
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
        {telemetryChildren.length > 0 ? (
          <div className="lcars-box-content-telemetry">
            {telemetryChildren.map((child) => (
              <div className="lcars-box-child" key={child.id}>
                {renderWidget(child)}
              </div>
            ))}
          </div>
        ) : null}

        {readoutChildren.length > 0 || controlChildren.length > 0 ? (
          <div className="lcars-box-content-side">
            {readoutChildren.length > 0 ? (
              <div className="lcars-box-content-readout">
                {readoutChildren.map((child) => (
                  <div className="lcars-box-child" key={child.id}>
                    {renderWidget(child)}
                  </div>
                ))}
              </div>
            ) : null}
            {controlChildren.length > 0 ? (
              <div className="lcars-box-content-control">
                {controlChildren.map((child) => (
                  <div className="lcars-box-child" key={child.id}>
                    {renderWidget(child)}
                  </div>
                ))}
              </div>
            ) : null}
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
