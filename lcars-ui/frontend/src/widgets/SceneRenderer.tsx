import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { decideCommit, isStructuralChange, type CommitReason } from "../compose/scene/schedule";
import { useSceneLocks } from "./useSceneLocks";
import { applyPins } from "../compose/scene/pins";
import { loadScenePreferences, saveScenePreferences } from "./scenePreferences";
import { chooseLayout } from "../compose/scene/choose";
import {
  DEFAULT_SCENE_TOKENS,
  type Field,
  type ResolvedScene,
  type Rect,
} from "../compose/scene/types";
import type { SceneWidget } from "../types/contract";
import { deriveSlots, readingOrder } from "../compose/scene/slots";
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
  const committedRef = useRef<ResolvedScene | null>(null);
  const structuralCommitAt = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<{ modeId: string; field: Field } | null>(null);
  const terminalActionRef = useRef(false);
  const previousFocusRef = useRef<string | null>(null);
  const headingPrefix = useId();
  const panelId = useId();
  const layoutToggleRef = useRef<HTMLButtonElement>(null);
  const modeId = widget.mode ?? widget.initial_mode;
  const [focusStack, setFocusStack] = useState<
    { modeId: string; regionId: string; openerTerminalId: string }[]
  >([]);
  const activeStack = focusStack.filter((entry) => entry.modeId === modeId);
  const focusedRegionId = activeStack[activeStack.length - 1]?.regionId ?? null;
  const focusReturnRef = useRef<string | null>(null);
  const [linear, setLinear] = useState(() => {
    try {
      return new URLSearchParams(window.location.hash.slice(1)).get("scene-view") === "linear";
    } catch {
      return false;
    }
  });
  const [layoutUnavailable, setLayoutUnavailable] = useState(false);
  const [field, setField] = useState<Field>({ w: 0, h: 0 });
  const [resolved, setResolved] = useState<ResolvedScene | null>(null);
  const [contentRevision, setContentRevision] = useState(0);
  const [preferences, setPreferences] = useState(() => loadScenePreferences(widget.id));
  const [layoutOpen, setLayoutOpen] = useState(false);
  const stableLayout = preferences.stable;
  const pins = preferences.pins;
  const preferencesSceneRef = useRef(widget.id);
  useLayoutEffect(() => {
    if (preferencesSceneRef.current !== widget.id) {
      preferencesSceneRef.current = widget.id;
      setPreferences(loadScenePreferences(widget.id));
    }
  }, [widget.id]);
  const updatePreferences = (next: typeof preferences) => {
    terminalActionRef.current = true;
    setPreferences(next);
    saveScenePreferences(widget.id, next);
  };
  const [pending, setPending] = useState<{
    next: ResolvedScene;
    why: string;
    reason: CommitReason;
  } | null>(null);
  const [retryVersion, setRetryVersion] = useState(0);
  const locks = useSceneLocks(rootRef);
  const commit = useCallback((next: ResolvedScene) => {
    const current = committedRef.current;
    if (!current || isStructuralChange(current, next)) structuralCommitAt.current = Date.now();
    committedRef.current = next;
    previousRef.current = next;
    setResolved(next);
    setPending(null);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
  }, []);
  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

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
    setFocusStack((current) => (current.some((entry) => entry.modeId !== modeId) ? [] : current));
  }, [modeId]);

  useLayoutEffect(() => {
    if (!field.w || !field.h) return;
    const pinnedScene = applyPins(widget, new Set(pins));
    const currentMode = pinnedScene.modes.find((mode) => mode.id === modeId);
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
          ...pinnedScene,
          modes: pinnedScene.modes.map((mode) => (mode.id === modeId ? syntheticMode : mode)),
        }
      : pinnedScene;
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
    const next = chooseLayout(
      scene,
      modeId,
      field,
      measurer,
      DEFAULT_SCENE_TOKENS,
      compatiblePrevious,
      handlers.scenePages,
    );
    const previousInput = inputRef.current;
    let reason: CommitReason = "content";
    if (terminalActionRef.current) reason = "user";
    else if (previousInput && previousInput.modeId !== modeId)
      reason = widget.mode_reason === "server" ? "server" : "user";
    else if (
      previousInput &&
      (previousInput.field.w !== field.w || previousInput.field.h !== field.h)
    )
      reason = "field";
    else if (pending) reason = pending.reason;
    inputRef.current = { modeId, field };
    terminalActionRef.current = false;
    setLayoutUnavailable(!next);
    if (!next) return;
    const decision = decideCommit({
      current: committedRef.current,
      next,
      reason,
      lockedRegionIds: locks.lockedRegionIds(),
      stableLayout,
      now: Date.now(),
      lastActivityAt: locks.lastActivityAt(),
      lastStructuralCommitAt: structuralCommitAt.current,
      quietWindowMs: widget.policy?.quiet_window_ms ?? 750,
      minBackgroundIntervalMs: widget.policy?.min_background_interval_ms ?? 5000,
    });
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    if (decision.action === "commit") {
      previousFocusRef.current = focusedRegionId;
      commit(next);
    } else {
      setPending({ next, why: decision.why, reason });
      if (decision.retryAt !== null)
        timerRef.current = setTimeout(
          () => setRetryVersion((value) => value + 1),
          Math.max(0, decision.retryAt - Date.now()),
        );
    }
    // Pending and lock accessors are read when an actual recompute is requested.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    widget,
    handlers.scenePages,
    modeId,
    field,
    focusedRegionId,
    contentRevision,
    locks.version,
    retryVersion,
    stableLayout,
    pins,
    commit,
  ]);

  useLayoutEffect(() => {
    if (!focusReturnRef.current || !resolved) return;
    const terminals =
      rootRef.current?.querySelectorAll<HTMLButtonElement>("[data-terminal-id]") ?? [];
    const terminal = Array.from(terminals).find(
      (item) => item.dataset.terminalId === focusReturnRef.current,
    );
    if (terminal) {
      terminal.focus();
      focusReturnRef.current = null;
    }
  }, [resolved]);
  const showLinear = linear || layoutUnavailable;
  const mode = widget.modes.find((item) => item.id === modeId);
  const orderedIds = mode ? readingOrder(deriveSlots(widget, modeId)) : [];
  const otherIds = widget.regions
    .map((region) => region.id)
    .filter((id) => !orderedIds.includes(id));
  const regionOrder = [...orderedIds, ...otherIds];
  const previousSubjectId = activeStack[activeStack.length - 2]?.regionId;
  const previousLabel =
    widget.regions.find((region) => region.id === previousSubjectId)?.label ??
    mode?.label ??
    modeId;
  const toggleLinear = () => {
    const nextLinear = !showLinear;
    setLinear(nextLinear);
    try {
      const url = new URL(window.location.href);
      const hash = new URLSearchParams(url.hash.slice(1));
      if (nextLinear) hash.set("scene-view", "linear");
      else hash.delete("scene-view");
      url.hash = hash.toString();
      window.history.replaceState(window.history.state, "", url);
    } catch {
      // Presentation remains available if browser history is unavailable.
    }
  };
  return (
    <div
      ref={rootRef}
      onKeyDown={(event) => {
        if (layoutOpen && event.key === "Escape") {
          event.stopPropagation();
          setLayoutOpen(false);
          layoutToggleRef.current?.focus();
        }
      }}
      className="lcars-scene"
      data-scene-view={showLinear ? "linear" : "spatial"}
      data-scene-subject={focusedRegionId ?? undefined}
      data-scene-id={widget.id}
      data-scene-mode={resolved?.modeId ?? modeId}
      data-scene-pending={pending ? "true" : undefined}
      data-scene-family={resolved?.family}
      data-scene-orientation={
        resolved?.orientation ?? (field.w >= field.h ? "landscape" : "portrait")
      }
      data-scene-explanation={
        resolved?.explanation ?? "Spatial layout unavailable; showing linear view"
      }
      data-scene-revision={resolved?.revision}
    >
      <div aria-live="polite">
        {pending && (
          <button
            type="button"
            className="lcars-scene-pending"
            onClick={() => commit(pending.next)}
          >
            LAYOUT PENDING · APPLY
          </button>
        )}
      </div>
      <button type="button" className="lcars-scene-linear-toggle" onClick={toggleLinear}>
        {showLinear ? "SPATIAL VIEW" : "LINEAR VIEW"}
      </button>
      <button
        ref={layoutToggleRef}
        type="button"
        className="lcars-scene-layout-toggle"
        aria-expanded={layoutOpen}
        aria-controls={panelId}
        onClick={() => setLayoutOpen(!layoutOpen)}
      >
        LAYOUT
      </button>
      {layoutOpen && (
        <div
          id={panelId}
          role="region"
          aria-label="Layout controls"
          className="lcars-scene-layout-panel"
        >
          <p>WHY: {resolved?.explanation ?? "Spatial layout unavailable; showing linear view"}</p>
          {pending && <p>PENDING: {pending.why}</p>}
          <button
            type="button"
            aria-pressed={stableLayout}
            onClick={() => updatePreferences({ ...preferences, stable: !stableLayout })}
          >
            STABLE LAYOUT
          </button>
          {widget.modes
            .find((mode) => mode.id === modeId)
            ?.optional?.map((regionId) => {
              const region = widget.regions.find((item) => item.id === regionId);
              if (!region) return null;
              const pinned = pins.includes(regionId);
              return (
                <button
                  key={regionId}
                  type="button"
                  aria-pressed={pinned}
                  onClick={() =>
                    updatePreferences({
                      ...preferences,
                      pins: pinned ? pins.filter((id) => id !== regionId) : [...pins, regionId],
                    })
                  }
                >
                  {region.label}
                </button>
              );
            })}
          <button type="button" onClick={() => updatePreferences({ pins: [], stable: false })}>
            RESET
          </button>
        </div>
      )}
      {showLinear && handlers.scenePages && handlers.scenePages.length >= 2 && (
        <nav aria-label="Pages" className="lcars-scene-pages">
          {handlers.scenePages.map((page) => (
            <button
              key={page.id}
              type="button"
              className="lcars-scene-terminal --tone-frame"
              data-terminal-kind="page"
              aria-current={page.current ? "page" : undefined}
              onClick={() => {
                if (!page.current) handlers.onSelectPage?.(page.id);
              }}
            >
              {page.label}
            </button>
          ))}
        </nav>
      )}
      {showLinear && <h2 className="lcars-scene-mode-heading">{mode?.label ?? modeId}</h2>}
      {showLinear && layoutUnavailable && (
        <p className="lcars-scene-status" role="status">
          Spatial layout does not fit this field; showing linear view.
        </p>
      )}
      {showLinear && otherIds.length > 0 && (
        <h2 className="lcars-scene-other-heading" style={{ order: orderedIds.length + 1 }}>
          OTHER REGIONS
        </h2>
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
        const relationId = `${headingId}-relations`;
        const relations = (widget.relations ?? []).filter(
          (relation) => relation.source === region.id || relation.target === region.id,
        );
        const relationText = relations
          .map((relation) => {
            const source =
              widget.regions.find((item) => item.id === relation.source)?.label ?? relation.source;
            const target =
              widget.regions.find((item) => item.id === relation.target)?.label ?? relation.target;
            return `${source} ${relation.label ?? relation.kind.replace(/_/g, " ")} ${target}`;
          })
          .join(". ");
        const growing = ["instrument", "data", "viewer"].includes(region.role ?? "instrument");
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
            aria-describedby={relations.length ? relationId : undefined}
            hidden={!showLinear && !placement}
            style={
              showLinear
                ? { order: regionOrder.indexOf(region.id) + (otherIds.includes(region.id) ? 2 : 1) }
                : placement
                  ? {
                      ...rectStyle(placement.rect),
                      overflow: placement.scroll ? "auto" : undefined,
                    }
                  : undefined
            }
          >
            <h3 id={headingId}>{region.label}</h3>
            {relations.length > 0 && (
              <p className="lcars-scene-relations" id={relationId}>
                {relationText}
              </p>
            )}
            <div
              className={`lcars-scene-content${growing ? " lcars-scene-content--fill" : ""}`}
              data-measure-region={region.id}
            >
              {region.children?.map((child) => (
                <WidgetRenderer key={child.id} widget={child} depth={depth + 1} {...handlers} />
              ))}
            </div>
          </section>
        );
      })}
      {!showLinear &&
        resolved?.terminals.map((terminal) => {
          const kind: string = terminal.kind;
          const tone =
            kind === "folded-region" || kind === "bridge-label"
              ? "relation"
              : kind === "return"
                ? "commands"
                : "frame";
          const className = `lcars-scene-terminal --tone-${tone}`;
          return kind !== "folded-region" && kind !== "return" && kind !== "page" ? (
            <div key={terminal.id} className={className} style={rectStyle(terminal.rect)}>
              {terminal.label}
            </div>
          ) : (
            <button
              key={terminal.id}
              type="button"
              className={className}
              data-terminal-id={terminal.id}
              data-terminal-kind={kind === "page" ? "page" : undefined}
              aria-current={kind === "page" && terminal.current ? "page" : undefined}
              style={rectStyle(terminal.rect)}
              onClick={() => {
                if (terminal.kind === "page") {
                  if (!terminal.current && terminal.pageId)
                    handlers.onSelectPage?.(terminal.pageId);
                } else if (terminal.kind === "return")
                  handlers.onAction(`${widget.id}.return`, null, widget.id);
                else if (terminal.regionId) {
                  terminalActionRef.current = true;
                  const regionId = terminal.regionId;
                  setFocusStack((current) => [
                    ...current.filter((entry) => entry.modeId === modeId),
                    { modeId, regionId, openerTerminalId: terminal.id },
                  ]);
                }
              }}
            >
              {terminal.label}
            </button>
          );
        })}
      {!showLinear && focusedRegionId && (
        <button
          type="button"
          className="lcars-scene-back"
          aria-label={`Back to ${previousLabel}`}
          onClick={() => {
            terminalActionRef.current = true;
            focusReturnRef.current = activeStack[activeStack.length - 1]?.openerTerminalId ?? null;
            setFocusStack(activeStack.slice(0, -1));
          }}
        >
          BACK
        </button>
      )}
    </div>
  );
}
