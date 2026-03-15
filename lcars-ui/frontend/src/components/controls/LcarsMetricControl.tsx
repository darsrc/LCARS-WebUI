import { type CSSProperties } from "react";
import clsx from "clsx";

import type { LcarsColor, StatusTileWidget } from "../../types/contract";
import { useTransientPulse } from "../../hooks/useTransientPulse";
import { accentStyle, hiddenStyle, widgetCardClass } from "../widgetStyles";
import { LcarsFramedSurface } from "../primitives/lcarsChartFramePrimitives";
import { LcarsSegmentedBar } from "../shapes/LcarsSegmentedBar";

interface LcarsMetricControlProps {
  widget: StatusTileWidget;
}

const withAccent = (widget: StatusTileWidget): CSSProperties => {
  return {
    ...accentStyle(widget.color),
    ...hiddenStyle(widget.visible),
  };
};

const statusColor = (status: StatusTileWidget["status"]): LcarsColor => {
  if (status === "crit") {
    return "rust";
  }
  if (status === "warn") {
    return "orange-peel";
  }
  return "anakiwa";
};

export const LcarsMetricControl = ({ widget }: LcarsMetricControlProps) => {
  const isPulsing = useTransientPulse(`${widget.value}:${widget.status}`);
  return (
    <article
      className={clsx(widgetCardClass(widget.color), "lcars-control-metric", {
        "lcars-pulse": isPulsing,
      })}
      style={withAccent(widget)}
    >
      <LcarsFramedSurface
        bodyClassName="lcars-readout-frame-body lcars-control-metric-frame-body"
        className="lcars-readout-frame lcars-control-metric-frame"
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
        <strong className="lcars-control-metric-value">{widget.value}</strong>
        <LcarsSegmentedBar
          className="lcars-control-metric-status"
          segments={[{ color: statusColor(widget.status), label: widget.status }]}
        />
      </LcarsFramedSurface>
    </article>
  );
};
