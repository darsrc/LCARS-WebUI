import { useId } from "react";
import type { SceneWidget } from "../types/contract";
import { WidgetRenderer, type WidgetHandlers } from "./WidgetRenderer";

export function SceneAccessView({ widget, depth, handlers }: {
  widget: SceneWidget;
  depth: number;
  handlers: WidgetHandlers;
}) {
  const headingPrefix = useId();
  const modeId = widget.mode ?? widget.initial_mode;
  const mode = widget.modes.find((item) => item.id === modeId);
  const regions = new Map(widget.regions.map((region) => [region.id, region]));
  const orderedIds = mode ? [...new Set([...mode.focal, ...mode.required, ...(mode.optional ?? [])])] : [];
  const label = mode?.label ?? modeId;

  return (
    <section className="lcars-scene-access" aria-label={label} data-scene-id={widget.id} data-scene-mode={modeId}>
      <h2>{label}</h2>
      {orderedIds.map((id, index) => {
        const region = regions.get(id);
        if (!region) return null;
        const headingId = `${headingPrefix}-${index}`;
        const relations = (widget.relations ?? []).filter((relation) => relation.source === id || relation.target === id);
        return (
          <section key={id} aria-labelledby={headingId} data-region-id={id} data-region-role={region.role ?? "instrument"}>
            <h3 id={headingId}>{region.label}</h3>
            {region.children?.map((child) => (
              <WidgetRenderer key={child.id} widget={child} depth={depth + 1} {...handlers} />
            ))}
            {relations.length > 0 && <ul>{relations.map((relation) => (
              <li key={relation.id}>{regions.get(relation.source)?.label ?? relation.source} {relation.label ?? relation.kind.replace(/_/g, " ")} {regions.get(relation.target)?.label ?? relation.target}</li>
            ))}</ul>}
          </section>
        );
      })}
    </section>
  );
}
