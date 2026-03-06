import { useEffect, useState, type CSSProperties } from "react";
import clsx from "clsx";

import type { CheckboxWidget, ToggleWidget } from "../../types/contract";
import { accentStyle, hiddenStyle, widgetCardClass } from "../widgetStyles";

type ToggleLikeWidget = ToggleWidget | CheckboxWidget;

interface LcarsToggleControlProps {
  widget: ToggleLikeWidget;
  onToggle: (checked: boolean) => void;
}

const withAccent = (widget: ToggleLikeWidget): CSSProperties => {
  return {
    ...accentStyle(widget.color),
    ...hiddenStyle(widget.visible),
  };
};

export const LcarsToggleControl = ({ widget, onToggle }: LcarsToggleControlProps) => {
  const [checked, setChecked] = useState(widget.checked);
  const label = widget.label ?? widget.id;
  const isCheckbox = widget.type === "lcars_checkbox";

  useEffect(() => {
    setChecked(widget.checked);
  }, [widget.checked]);

  return (
    <article className={widgetCardClass(widget.color)} style={withAccent(widget)}>
      <div className={clsx("lcars-control-toggle", { "lcars-control-toggle-checkbox": isCheckbox })}>
        <input
          aria-label={label}
          checked={checked}
          className="lcars-control-native-checkbox"
          disabled={widget.disabled}
          onChange={(event) => {
            const next = event.target.checked;
            setChecked(next);
            onToggle(next);
          }}
          type="checkbox"
        />
        {isCheckbox ? (
          <div aria-hidden="true" className={clsx("lcars-control-checkbox-surface", { active: checked })}>
            <span>{label}</span>
          </div>
        ) : (
          <div aria-hidden="true" className="lcars-control-toggle-surface">
            <span className={clsx("lcars-toggle-segment", { active: checked })}>ON</span>
            <span className={clsx("lcars-toggle-segment", { active: !checked })}>OFF</span>
          </div>
        )}
      </div>
    </article>
  );
};
