import { useMemo, type CSSProperties } from "react";
import clsx from "clsx";

import type { ProgressBarWidget } from "../../types/contract";
import { useTransientPulse } from "../../hooks/useTransientPulse";
import { accentStyle, hiddenStyle, widgetCardClass } from "../widgetStyles";
import { LcarsFramedSurface } from "../primitives/lcarsChartFramePrimitives";
import { LcarsSegmentedBar } from "../shapes/LcarsSegmentedBar";

interface LcarsProgressControlProps {
  widget: ProgressBarWidget;
}

const withAccent = (widget: ProgressBarWidget): CSSProperties => {
  return {
    ...accentStyle(widget.color),
    ...hiddenStyle(widget.visible),
  };
};

export const LcarsProgressControl = ({ widget }: LcarsProgressControlProps) => {
  const clamped = Math.min(100, Math.max(0, widget.value));
  const filledSegments = Math.round((clamped / 100) * 10);
  const isPulsing = useTransientPulse(clamped);
  const segments = useMemo(
    () =>
      Array.from({ length: 10 }, (_, index) => ({
        color: index < filledSegments ? widget.color ?? "orange" : "#151a28",
        label: null,
      })),
    [filledSegments, widget.color],
  );

  return (
    <article
      className={clsx(widgetCardClass(widget.color), "lcars-control-progress", {
        "lcars-pulse": isPulsing,
      })}
      style={withAccent(widget)}
    >
      <LcarsFramedSurface
        bodyClassName="lcars-readout-frame-body lcars-control-progress-frame-body"
        className="lcars-readout-frame lcars-control-progress-frame"
        primitive="readout-frame"
        spec={{
          bodyPadding: "0.55rem 0.75rem 0.45rem",
          title: {
            label: widget.label ?? widget.id,
            anchor: "frame-start",
            className: "lcars-readout-frame-title",
          },
          titleReserve: "1.35rem",
        }}
      >
        <div className="lcars-control-progress-row">
          <LcarsSegmentedBar className="lcars-control-progress-bar" segments={segments} />
          {widget.show_label ? <span className="lcars-control-progress-value">{clamped.toFixed(0)}%</span> : null}
        </div>
      </LcarsFramedSurface>
    </article>
  );
};
