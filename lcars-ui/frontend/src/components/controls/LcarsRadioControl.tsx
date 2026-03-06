import { useEffect, useState, type CSSProperties } from "react";
import clsx from "clsx";

import type { RadioToggleWidget, RadioWidget } from "../../types/contract";
import { accentStyle, hiddenStyle, widgetCardClass } from "../widgetStyles";

type RadioLikeWidget = RadioWidget | RadioToggleWidget;

interface LcarsRadioControlProps {
  widget: RadioLikeWidget;
  onSelect: (value: string) => void;
}

const withAccent = (widget: RadioLikeWidget): CSSProperties => {
  return {
    ...accentStyle(widget.color),
    ...hiddenStyle(widget.visible),
  };
};

export const LcarsRadioControl = ({ widget, onSelect }: LcarsRadioControlProps) => {
  const [value, setValue] = useState(widget.value);
  const isToggle = widget.type === "lcars_radio_toggle";

  useEffect(() => {
    setValue(widget.value);
  }, [widget.value]);

  return (
    <article className={widgetCardClass(widget.color)} style={withAccent(widget)}>
      <fieldset className="lcars-control-radio" disabled={widget.disabled}>
        <legend className="sr-only">{widget.label ?? widget.id}</legend>
        <div className="lcars-control-native-radio-group">
          {widget.options.map((option) => (
            <label key={option.value}>
              <input
                checked={value === option.value}
                name={widget.id}
                onChange={() => {
                  setValue(option.value);
                  onSelect(option.value);
                }}
                type="radio"
                value={option.value}
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>

        <div
          aria-hidden="true"
          className={clsx("lcars-control-radio-surface", {
            "lcars-control-radio-toggle-surface": isToggle,
          })}
        >
          {widget.options.map((option, index) => (
            <button
              className={clsx("lcars-radio-bar", { active: value === option.value })}
              data-edge={isToggle ? (index === 0 ? "start" : index === widget.options.length - 1 ? "end" : "mid") : "stack"}
              disabled={widget.disabled}
              key={option.value}
              onClick={() => {
                setValue(option.value);
                onSelect(option.value);
              }}
              type="button"
            >
              {option.label}
            </button>
          ))}
        </div>
      </fieldset>
    </article>
  );
};
