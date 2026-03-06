import { useMemo, type CSSProperties } from "react";
import clsx from "clsx";

import type { GaugeWidget, LcarsColor } from "../../types/contract";
import { useTransientPulse } from "../../hooks/useTransientPulse";
import { accentStyle, hiddenStyle, widgetCardClass } from "../widgetStyles";
import { LcarsSegmentedBar } from "../shapes/LcarsSegmentedBar";

interface LcarsGaugeControlProps {
  widget: GaugeWidget;
}

const withAccent = (widget: GaugeWidget): CSSProperties => {
  return {
    ...accentStyle(widget.color),
    ...hiddenStyle(widget.visible),
  };
};

const clampPercent = (widget: GaugeWidget): number => {
  const min = widget.min;
  const max = widget.max <= widget.min ? widget.min + 1 : widget.max;
  const clamped = Math.min(max, Math.max(min, widget.value));
  return ((clamped - min) / (max - min)) * 100;
};

const fillColor = (widget: GaugeWidget): LcarsColor => {
  if (widget.crit_threshold !== null && widget.crit_threshold !== undefined && widget.value >= widget.crit_threshold) {
    return "rust";
  }
  if (widget.warn_threshold !== null && widget.warn_threshold !== undefined && widget.value >= widget.warn_threshold) {
    return "orange-peel";
  }
  return widget.color ?? "anakiwa";
};

export const LcarsGaugeControl = ({ widget }: LcarsGaugeControlProps) => {
  const pct = clampPercent(widget);
  const activeSegments = Math.round((pct / 100) * 20);
  const isPulsing = useTransientPulse(widget.value);
  const segments = useMemo(
    () =>
      Array.from({ length: 20 }, (_, index) => ({
        color: index < activeSegments ? fillColor(widget) : "#151a28",
        label: index === 19 ? `${pct.toFixed(0)}%` : null,
      })),
    [activeSegments, pct, widget],
  );

  return (
    <article
      className={clsx(widgetCardClass(widget.color), "lcars-control-gauge", {
        "lcars-pulse": isPulsing,
      })}
      style={withAccent(widget)}
    >
      <div className="lcars-control-gauge-label">{widget.label ?? widget.id}</div>
      <div className="lcars-control-gauge-row">
        <LcarsSegmentedBar className="lcars-control-gauge-bar" segments={segments} />
        <div className="lcars-control-gauge-value">
          <strong>{widget.value.toFixed(1)}</strong>
          {widget.unit ? <span>{widget.unit}</span> : null}
        </div>
      </div>
    </article>
  );
};
