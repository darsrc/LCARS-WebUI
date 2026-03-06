import { useEffect, useState, type CSSProperties } from "react";

import type { NumberInputWidget, TextInputWidget } from "../../types/contract";
import { accentStyle, hiddenStyle, widgetCardClass } from "../widgetStyles";

type InputWidget = TextInputWidget | NumberInputWidget;

interface LcarsTextInputControlProps {
  widget: InputWidget;
  onCommit: (value: string | number) => void;
}

const withAccent = (widget: InputWidget): CSSProperties => {
  return {
    ...accentStyle(widget.color),
    ...hiddenStyle(widget.visible),
  };
};

export const LcarsTextInputControl = ({ widget, onCommit }: LcarsTextInputControlProps) => {
  const [value, setValue] = useState(String(widget.value));

  useEffect(() => {
    setValue(String(widget.value));
  }, [widget.value]);

  const commit = () => {
    if (widget.type === "number_input") {
      const parsed = Number(value);
      if (!Number.isFinite(parsed)) {
        setValue(String(widget.value));
        return;
      }
      let next = parsed;
      if (widget.min !== null && widget.min !== undefined && next < widget.min) {
        next = widget.min;
      }
      if (widget.max !== null && widget.max !== undefined && next > widget.max) {
        next = widget.max;
      }
      setValue(String(next));
      onCommit(next);
      return;
    }
    onCommit(value);
  };

  return (
    <article className={widgetCardClass(widget.color)} style={withAccent(widget)}>
      <label className="lcars-control-text-input" htmlFor={widget.id}>
        <span className="lcars-input-label-bar">{widget.label ?? widget.id}</span>
        <span className="lcars-input-shell">
          <span aria-hidden="true" className="lcars-input-left-rail" />
          <input
            aria-label={widget.label ?? widget.id}
            className="lcars-input lcars-control-input-field"
            disabled={widget.disabled}
            id={widget.id}
            max={widget.type === "number_input" ? (widget.max ?? undefined) : undefined}
            min={widget.type === "number_input" ? (widget.min ?? undefined) : undefined}
            onBlur={commit}
            onChange={(event) => setValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                commit();
              }
            }}
            pattern={widget.type === "text_input" ? (widget.regex ?? undefined) : undefined}
            placeholder={widget.placeholder ?? ""}
            step={widget.type === "number_input" ? widget.step : undefined}
            type={widget.type === "text_input" ? (widget.password ? "password" : "text") : "number"}
            value={value}
          />
        </span>
      </label>
    </article>
  );
};
