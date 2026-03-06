import { type CSSProperties } from "react";

import type { TableWidget } from "../../types/contract";
import { accentStyle, hiddenStyle, widgetCardClass } from "../widgetStyles";
import { LcarsSegmentedBar } from "../shapes/LcarsSegmentedBar";

interface LcarsTableControlProps {
  widget: TableWidget;
}

const withAccent = (widget: TableWidget): CSSProperties => {
  return {
    ...accentStyle(widget.color),
    ...hiddenStyle(widget.visible),
  };
};

export const LcarsTableControl = ({ widget }: LcarsTableControlProps) => {
  return (
    <article className={widgetCardClass(widget.color)} style={withAccent(widget)}>
      <div className="lcars-control-table">
        <div aria-hidden="true" className="lcars-control-table-rail" />
        <div className="lcars-control-table-surface">
          <LcarsSegmentedBar
            className="lcars-control-table-header"
            segments={widget.headers.map((header) => ({ color: widget.color, label: header }))}
          />
          <table className="lcars-table lcars-control-table-grid">
            <tbody>
              {widget.rows.map((rowItem) => (
                <tr key={rowItem.id}>
                  {rowItem.cells.map((cell, index) => (
                    <td key={`${rowItem.id}-${index + 1}`}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </article>
  );
};
