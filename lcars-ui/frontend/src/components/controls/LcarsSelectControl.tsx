import { useEffect, useMemo, useState, type CSSProperties } from "react";
import clsx from "clsx";

import type { SelectOption, SelectWidget } from "../../types/contract";
import { accentStyle, hiddenStyle, widgetCardClass } from "../widgetStyles";

interface LcarsSelectControlProps {
  widget: SelectWidget;
  onSelect: (value: string) => void;
}

const withAccent = (widget: SelectWidget): CSSProperties => {
  return {
    ...accentStyle(widget.color),
    ...hiddenStyle(widget.visible),
  };
};

const findIndex = (options: SelectOption[], value: string): number => {
  const idx = options.findIndex((option) => option.value === value);
  return idx >= 0 ? idx : 0;
};

export const LcarsSelectControl = ({ widget, onSelect }: LcarsSelectControlProps) => {
  const [value, setValue] = useState(widget.value);
  const compactMode = widget.options.length > 4;

  useEffect(() => {
    setValue(widget.value);
  }, [widget.value]);

  const currentOption = useMemo(() => {
    return widget.options.find((option) => option.value === value) ?? widget.options[0];
  }, [widget.options, value]);

  const cycle = (direction: 1 | -1) => {
    if (widget.options.length === 0) {
      return;
    }
    const currentIndex = findIndex(widget.options, value);
    const nextIndex =
      (currentIndex + direction + widget.options.length) % widget.options.length;
    const nextValue = widget.options[nextIndex].value;
    setValue(nextValue);
    onSelect(nextValue);
  };

  return (
    <article className={widgetCardClass(widget.color)} style={withAccent(widget)}>
      <div className="lcars-control-select">
        <select
          aria-label={widget.label ?? widget.id}
          className="lcars-control-native-select"
          disabled={widget.disabled}
          onChange={(event) => {
            const next = event.target.value;
            setValue(next);
            onSelect(next);
          }}
          value={value}
        >
          {widget.options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        {compactMode ? (
          <div aria-hidden="true" className="lcars-control-select-compact">
            <button
              className="lcars-select-cycle"
              disabled={widget.disabled}
              onClick={() => cycle(-1)}
              type="button"
            >
              ◀
            </button>
            <div className="lcars-select-current">{currentOption?.label ?? value}</div>
            <button
              className="lcars-select-cycle"
              disabled={widget.disabled}
              onClick={() => cycle(1)}
              type="button"
            >
              ▶
            </button>
          </div>
        ) : (
          <div aria-hidden="true" className="lcars-control-select-stack">
            {widget.options.map((option) => (
              <button
                className={clsx("lcars-select-bar", { active: option.value === value })}
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
        )}
      </div>
    </article>
  );
};
