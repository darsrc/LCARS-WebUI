import { type CSSProperties } from "react";

import type { ButtonWidget } from "../../types/contract";
import { accentStyle, hiddenStyle, widgetCardClass } from "../widgetStyles";

interface LcarsButtonControlProps {
  widget: ButtonWidget;
  onAction: (actionId: string, value: unknown) => void;
}

const withAccent = (widget: ButtonWidget): CSSProperties => {
  return {
    ...accentStyle(widget.color),
    ...hiddenStyle(widget.visible),
  };
};

export const LcarsButtonControl = ({ widget, onAction }: LcarsButtonControlProps) => {
  const label = widget.label ?? widget.id;
  return (
    <article className={widgetCardClass(widget.color)} data-widget-id={widget.id} style={withAccent(widget)}>
      <div className="lcars-control-button">
        <button
          aria-label={label}
          className="lcars-control-native-button"
          disabled={widget.disabled}
          onClick={() => onAction(widget.action_id, null)}
          type="button"
        >
          {label}
        </button>
        <div aria-hidden="true" className="lcars-control-button-surface">
          <span>{label}</span>
        </div>
      </div>
    </article>
  );
};
