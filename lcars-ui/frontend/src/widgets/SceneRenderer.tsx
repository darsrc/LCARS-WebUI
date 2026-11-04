import { useId, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { chooseLayout } from "../compose/scene/choose";
import {
  DEFAULT_SCENE_TOKENS,
  type Field,
  type ResolvedScene,
  type Rect,
} from "../compose/scene/types";
import type { SceneWidget } from "../types/contract";
import { SceneAccessView } from "./SceneAccessView";
import { WidgetRenderer, type WidgetHandlers } from "./WidgetRenderer";

function rectStyle(rect: Rect): CSSProperties {
  return { left: rect.x, top: rect.y, width: rect.w, height: rect.h };
}

/** Render a scene as measured spatial regions with a linear alternative. */
export function SceneRenderer({
  widget,
  depth,
  handlers,
}: {
  widget: SceneWidget;
  depth: number;
  handlers: WidgetHandlers;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const regionRefs = useRef(new Map<string, HTMLElement>());
  const cacheRef = useRef(new Map<string, number>());
  const previousRef = useRef<ResolvedScene | undefined>(undefined);
  const previousFocusRef = useRef<string | null>(null);
  const headingPrefix = useId();
  const modeId = widget.mode ?? widget.initial_mode;
  const [focus, setFocus] = useState<{ modeId: string; regionId: string } | null>(null);
  const focusedRegionId = focus?.modeId === modeId ? focus.regionId : null;
  const [linear, setLinear] = useState(false);
  const [field, setField] = useState<Field>({ w: 0, h: 0 });
  const [resolved, setResolved] = useState<ResolvedScene | null>(null);
  const [contentRevision, setContentRevision] = useState(0);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const update = (width: number, height: number) => {
      const next = {
        w: width || root.clientWidth || window.innerWidth,
        h: height || root.clientHeight || window.innerHeight,
      };
      setField((current) => (current.w === next.w && current.h === next.h ? current : next));
    };
    update(root.clientWidth, root.clientHeight);
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) update(entry.contentRect.width, entry.contentRect.height);
    });
    observer.observe(root);
    return () => observer.disconnect();
  }, []);

  useLayoutEffect(() => {
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver((entries) => {
      let invalidated = false;
      for (const entry of entries) {
        const regionId = (entry.target as HTMLElement).dataset.measureRegion;
        if (!regionId) continue;
        for (const key of cacheRef.current.keys()) {
          if (key.startsWith(`${regionId}\u0000`)) {
            cacheRef.current.delete(key);
            invalidated = true;
          }
        }
      }
      if (invalidated) setContentRevision((revision) => revision + 1);
    });
    for (const region of regionRefs.current.values()) {
      const content = region.querySelector<HTMLElement>("[data-measure-region]");
      if (content) observer.observe(content);
    }
    return () => observer.disconnect();
  }, [widget.regions]);

  useLayoutEffect(() => {
    setFocus((current) => (current && current.modeId !== modeId ? null : current));
  }, [modeId]);

  useLayoutEffect(() => {
    if (!field.w || !field.h) return;
    const currentMode = widget.modes.find((mode) => mode.id === modeId);
    if (!currentMode) return;
    const syntheticMode = focusedRegionId
      ? {
          ...currentMode,
          focal: [focusedRegionId],
          required: [
            focusedRegionId,
            ...currentMode.required.filter((id) => id !== focusedRegionId),
            ...currentMode.focal.filter(
              (id) => id !== focusedRegionId && !currentMode.required.includes(id),
            ),
          ],
          optional: currentMode.optional?.filter((id) => id !== focusedRegionId),
          families: ["focus"],
        }
      : currentMode;
    const scene = focusedRegionId
      ? {
          ...widget,
          modes: widget.modes.map((mode) => (mode.id === modeId ? syntheticMode : mode)),
        }
      : widget;
    const measurer = {
      height(regionId: string, width: number) {
        const key = `${regionId}\u0000${Math.round(width / 16)}`;
        const cached = cacheRef.current.get(key);
        if (cached !== undefined) return cached;
        const region = regionRefs.current.get(regionId);
        if (!region) return 0;
        const previousStyle = region.getAttribute("style");
        const wasHidden = region.hidden;
        region.hidden = false;
        region.style.width = `${width}px`;
        region.style.height = "auto";
        region.style.position = "absolute";
        region.style.visibility = "hidden";
        const height = region.scrollHeight;
        if (previousStyle === null) region.removeAttribute("style");
        else region.setAttribute("style", previousStyle);
        region.hidden = wasHidden;
        cacheRef.current.set(key, height);
        return height;
      },
    };
    const previous = previousRef.current;
    const compatiblePrevious = previousFocusRef.current === focusedRegionId ? previous : undefined;
    previousFocusRef.current = focusedRegionId;
    const result = chooseLayout(
      scene,
      modeId,
      field,
      measurer,
      DEFAULT_SCENE_TOKENS,
      compatiblePrevious,
    );
    previousRef.current = result ?? undefined;
    setResolved(result);
  }, [widget, modeId, field, focusedRegionId, contentRevision]);

  const showLinear = linear || (!resolved && field.w > 0 && field.h > 0);
  return (
    <div
      ref={rootRef}
      className="lcars-scene"
      data-scene-id={widget.id}
      data-scene-mode={modeId}
      data-scene-family={resolved?.family}
      data-scene-orientation={resolved?.orientation}
      data-scene-explanation={resolved?.explanation}
      data-scene-revision={resolved?.revision}
    >
      <button
        type="button"
        className="lcars-scene-linear-toggle"
        onClick={() => setLinear(!linear)}
      >
        {linear ? "SPATIAL VIEW" : "LINEAR VIEW"}
      </button>
      {showLinear && (
        <div className="lcars-scene-linear">
          {!resolved && <p>Spatial layout does not fit this field; showing linear view.</p>}
          <SceneAccessView widget={widget} depth={depth} handlers={handlers} />
        </div>
      )}
      <svg
        className="lcars-scene-geometry"
        aria-hidden="true"
        style={showLinear ? { display: "none" } : undefined}
      >
        {resolved?.paths.map((path) => (
          <path
            key={path.id}
            d={path.d}
            className={`lcars-scene-path--${path.kind} --tone-${path.tone}`}
          />
        ))}
      </svg>
      {widget.regions.map((region, index) => {
        const placement = resolved?.placements.find(
          (item) => item.regionId === region.id && item.visibility === "full",
        );
        const headingId = `${headingPrefix}-${index}`;
        return (
          <section
            key={region.id}
            ref={(element) => {
              if (element) regionRefs.current.set(region.id, element);
              else regionRefs.current.delete(region.id);
            }}
            className="lcars-scene-region"
            data-region-id={region.id}
            data-region-role={region.role ?? "instrument"}
            aria-labelledby={headingId}
            hidden={showLinear || !placement}
            style={
              placement
                ? { ...rectStyle(placement.rect), overflow: placement.scroll ? "auto" : undefined }
                : undefined
            }
          >
            <div data-measure-region={region.id}>
              <h3 id={headingId}>{region.label}</h3>
              {region.children?.map((child) => (
                <WidgetRenderer key={child.id} widget={child} depth={depth + 1} {...handlers} />
              ))}
            </div>
          </section>
        );
      })}
      {!showLinear &&
        resolved?.terminals.map((terminal) =>
          terminal.kind === "context" ? (
            <div
              key={terminal.id}
              role="status"
              className="lcars-scene-terminal"
              style={rectStyle(terminal.rect)}
            >
              {terminal.label}
            </div>
          ) : (
            <button
              key={terminal.id}
              type="button"
              className="lcars-scene-terminal"
              style={rectStyle(terminal.rect)}
              disabled={terminal.kind === "return"}
              title={terminal.kind === "return" ? "Return wiring arrives in M3" : undefined}
              onClick={() => terminal.regionId && setFocus({ modeId, regionId: terminal.regionId })}
            >
              {terminal.label}
            </button>
          ),
        )}
      {!showLinear && focusedRegionId && (
        <button type="button" className="lcars-scene-back" onClick={() => setFocus(null)}>
          BACK
        </button>
      )}
    </div>
  );
}
