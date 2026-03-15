import type { CSSProperties, ReactNode } from "react";

import type { LcarsBoxWidget, LcarsColor, Widget } from "../../types/contract";
import { GEOMETRY_TOKENS } from "../../theme/geometryTokens";
import {
  LcarsBarRunPrimitive,
  LcarsHtmlPill,
  barRunFromBarSpec,
} from "../primitives/lcarsSharedScaffoldPrimitives";
import { LcarsElbow } from "../shell/LcarsElbow";
import { resolveBoxContentRegions } from "./strictContainerPlacement";

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

const armPercentForWidth = (widthPx: number): number => {
  if (widthPx <= 0) {
    return 24;
  }
  return Math.min(80, Math.max(14, (GEOMETRY_TOKENS.barHeight / widthPx) * 100));
};

export const LcarsBoxControl = ({ widget, renderWidget }: LcarsBoxControlProps) => {
  const topLabel = widget.title ?? widget.label ?? null;
  const bottomLabel = widget.subtitle ?? null;
  const leftArm = armPercentForWidth(widget.width_left);
  const rightArm = armPercentForWidth(widget.width_right);
  const { mainChildren, sideChildren } = resolveBoxContentRegions(widget);
  const hasSideContent = sideChildren.length > 0;

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
          <LcarsHtmlPill spec={{ fill: cornerColor(widget, 0), variant: "right" }} />
        )}
      </div>
      <div className="lcars-box-top">
        {has(widget.sides, 1) ? (
          <LcarsBarRunPrimitive
            className="lcars-box-top-bar"
            primitive="bar-run"
            segments={barRunFromBarSpec({
              fill: sideColor(widget, 0),
              label: topLabel,
            })}
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
          <LcarsHtmlPill spec={{ fill: cornerColor(widget, 1), variant: "left" }} />
        )}
      </div>

      <div className="lcars-box-left">
        {has(widget.sides, 4) ? (
          <LcarsBarRunPrimitive
            className="lcars-box-side-bar"
            orientation="vertical"
            primitive="bar-run"
            segments={barRunFromBarSpec({
              fill: sideColor(widget, 3),
            })}
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

      <div className={`lcars-box-content${hasSideContent ? "" : " lcars-box-content-single"}`}>
        {mainChildren.length > 0 ? (
          <div className="lcars-box-content-main">
            {mainChildren.map((child) => (
              <div className="lcars-box-child" key={child.id}>
                {renderWidget(child)}
              </div>
            ))}
          </div>
        ) : null}

        {hasSideContent ? (
          <div className="lcars-box-content-side">
            {sideChildren.map((child) => (
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
          <LcarsBarRunPrimitive
            className="lcars-box-side-bar"
            orientation="vertical"
            primitive="bar-run"
            segments={barRunFromBarSpec({
              fill: sideColor(widget, 1),
            })}
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
          <LcarsHtmlPill spec={{ fill: cornerColor(widget, 3), variant: "right" }} />
        )}
      </div>
      <div className="lcars-box-bottom">
        {has(widget.sides, 3) ? (
          <LcarsBarRunPrimitive
            className="lcars-box-bottom-bar"
            primitive="bar-run"
            segments={barRunFromBarSpec({
              fill: sideColor(widget, 2),
              label: bottomLabel,
            })}
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
          <LcarsHtmlPill spec={{ fill: cornerColor(widget, 2), variant: "left" }} />
        )}
      </div>
    </article>
  );
};
