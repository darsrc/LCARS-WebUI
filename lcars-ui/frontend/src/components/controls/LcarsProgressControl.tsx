import { useMemo, type CSSProperties } from "react";
import clsx from "clsx";

import type { ProgressBarWidget } from "../../types/contract";
import { useTransientPulse } from "../../hooks/useTransientPulse";
import { accentStyle, hiddenStyle, widgetCardClass } from "../widgetStyles";
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
      <div className="lcars-control-progress-label">{widget.label ?? widget.id}</div>
      <div className="lcars-control-progress-row">
        <LcarsSegmentedBar className="lcars-control-progress-bar" segments={segments} />
        {widget.show_label ? <span className="lcars-control-progress-value">{clamped.toFixed(0)}%</span> : null}
      </div>
    </article>
  );
};
