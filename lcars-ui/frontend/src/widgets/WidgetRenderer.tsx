/*
 * The instruments — one rendering per widget the contract speaks, all sharing
 * the token language so the set reads as one calm system. Data sits on black
 * with a colored accent edge; controls are endcapped pills; structure-bearing
 * container widgets become framed fields that compose their children.
 */
import {
  createElement,
  lazy,
  Suspense,
  type ChangeEvent,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { marked } from "marked";
import DOMPurify from "dompurify";
import type {
  MeterOptions,
  Page,
  Widget,
} from "../types/contract";
import { planLayout } from "../compose/layout";
import { packMosaic } from "../compose/mosaic";
import { rowTemplate } from "../compose/rows";
import { useViewportProfile } from "../compose/viewport";
import { useValueFlicker } from "../lcars/motion";
import { FileUploadControl } from "./FileUploadControl";
import { HintAnchor } from "./HintAnchor";
import { PopupWindow } from "./PopupWindow";
import {
  accentStyle,
  AUTO_SEGMENT_OPTION_LIMIT,
  formatValue,
  safeHref,
  tableCellDisplay,
  type ActionStatus,
  type WidgetHandlers,
} from "./rendererShared";
import { SurfaceControl } from "./SurfaceControl";
import { WebUISettings } from "./WebUISettings";
import { EnhancedTable } from "./TableWidget";
import { MicButtonControl } from "./MicButtonControl";
import {
  EnhancedLineChart,
  EnhancedSparkline,
  OhlcChart,
  ShaderCanvas,
  Sparkline,
} from "./ChartWidgets";
import {
  SupportPanelControl,
  TriStateControl,
} from "./WebWidgets";

// Three.js is by a wide margin the heaviest thing the console can load, and
// most pages carry no scene at all — so it stays out of the main bundle and
// arrives only once a manifest actually asks for one.
const ThreeSceneCanvas = lazy(() => import("./ThreeSceneCanvas"));
// Likewise the graph editor: React Flow and every LCARS node component it
// draws are dead weight on a console that shows no graph.
const NodeCanvas = lazy(() => import("./nodecanvas/NodeCanvas"));
const GraphWorkspace = lazy(() => import("./workspace/GraphWorkspace"));

export { accentVar } from "./rendererShared";
export type { ActionStatus, WidgetHandlers } from "./rendererShared";

const widgetOptions = (widget: Widget): { description?: string | null; feedback?: { state: string; message?: string | null } | null } | null => {
  const raw = widget as unknown as Record<string, unknown>;
  const candidate = raw.options ?? raw.settings;
  return candidate && typeof candidate === "object"
    ? (candidate as { description?: string | null; feedback?: { state: string; message?: string | null } | null })
    : null;
};

function WidgetFeedbackState({ widget }: { widget: Widget }) {
  const feedback = widgetOptions(widget)?.feedback;
  if (!feedback || feedback.state === "ready") return null;
  const message =
    feedback.message ??
    (feedback.state === "loading"
      ? "Loading"
      : feedback.state === "empty"
        ? "No data"
        : "Unable to display data");
  return (
    <div
      aria-live={feedback.state === "error" ? "assertive" : "polite"}
      className="lcars-widget-feedback"
      data-state={feedback.state}
      role={feedback.state === "error" ? "alert" : "status"}
    >
      {message}
    </div>
  );
}

const CHILD_KEYS = [
  "header_children",
  "column_inputs",
  "left_children",
  "right_children",
  "rail_children",
  "content_children",
  "main_children",
  "side_children",
  "left_inputs",
  "right_inputs",
  "children",
] as const;

const MAIN_CHILD_KEYS = [
  "header_children",
  "left_children",
  "right_children",
  "rail_children",
  "content_children",
  "main_children",
  "side_children",
  "children",
] as const;

const INPUT_CHILD_KEYS = ["column_inputs", "left_inputs", "right_inputs"] as const;

const gatherChildrenFromKeys = (widget: Widget, keys: readonly string[]): Widget[] => {
  const seen = new Set<string>();
  const out: Widget[] = [];
  for (const key of keys) {
    const arr = (widget as unknown as Record<string, unknown>)[key];
    if (Array.isArray(arr)) {
      for (const child of arr as Widget[]) {
        if (child && typeof child.id === "string" && !seen.has(child.id)) {
          seen.add(child.id);
          out.push(child);
        }
      }
    }
  }
  return out;
};

const gatherChildren = (widget: Widget): Widget[] => gatherChildrenFromKeys(widget, CHILD_KEYS);

const defaultFormChildValue = (widget: Widget): unknown | undefined => {
  switch (widget.type) {
    case "toggle":
    case "lcars_checkbox":
      return widget.checked;
    case "select":
    case "lcars_radio":
    case "lcars_radio_toggle":
    case "text_input":
    case "number_input":
      return widget.value;
    default:
      return undefined;
  }
};

const coerceFormChildValue = (widget: Widget | undefined, value: string): unknown => {
  if (widget?.type === "toggle" || widget?.type === "lcars_checkbox") {
    return value === "true" || value === "on";
  }
  if (widget?.type === "number_input") {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? value : parsed;
  }
  return value;
};

const collectFormPayload = (widget: Extract<Widget, { type: "form" }>, form: HTMLFormElement): Record<string, unknown> => {
  const payload: Record<string, unknown> = {};
  const childById = new Map(widget.children.map((child) => [child.id, child]));
  const formData = new FormData(form);
  for (const child of widget.children) {
    const value = defaultFormChildValue(child);
    if (value !== undefined) {
      payload[child.id] = value;
    }
  }
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string") {
      const child = childById.get(key);
      if (child?.type === "select" && child.settings?.multiple) {
        payload[key] = formData.getAll(key).map(String);
      } else if (child?.type === "toggle" || child?.type === "lcars_checkbox") {
        payload[key] = coerceFormChildValue(child, value);
      } else {
        payload[key] = widget.options?.coerce_values ? coerceFormChildValue(child, value) : value;
      }
    }
  }
  for (const child of widget.children) {
    if (child.type === "select" && child.settings?.multiple) {
      payload[child.id] = formData.getAll(child.id).map(String);
    }
  }
  return payload;
};

// Generic "stick to bottom" behavior for any scrollable element whose content
// grows live (currently just the log viewer, but written so any future
// scrollable, server-updated text region can opt in the same way): follow new
// content only while the reader is already at the bottom; scrolling up to
// read history suspends following until they scroll back down themselves.
function useStickToBottom<T extends HTMLElement>(enabled: boolean, dependency: unknown) {
  const ref = useRef<T>(null);
  const stuckRef = useRef(true);

  const handleScroll = () => {
    const el = ref.current;
    if (!el) return;
    stuckRef.current = el.scrollHeight - el.scrollTop - el.clientHeight <= 24;
  };

  useEffect(() => {
    if (!enabled) return;
    const el = ref.current;
    if (!el || !stuckRef.current) return;
    el.scrollTop = el.scrollHeight;
  }, [dependency, enabled]);

  return { ref, handleScroll };
}

function LogViewerControl({
  widget,
  lines,
}: {
  widget: Extract<Widget, { type: "log_viewer" }>;
  lines: string[];
}) {
  const { ref, handleScroll } = useStickToBottom<HTMLDivElement>(widget.auto_scroll, lines);
  return (
    <div className="lcars-log" ref={ref} onScroll={handleScroll}>
      {lines.length === 0 ? <p>// awaiting stream {widget.stream_id}</p> : lines.map((line, i) => <p key={i}>{line}</p>)}
    </div>
  );
}

function EnhancedLogViewer({
  widget,
  lines,
  handlers,
}: {
  widget: Extract<Widget, { type: "log_viewer" }>;
  lines: string[];
  handlers: WidgetHandlers;
}) {
  const options = widget.options!;
  const stored = handlers.uiStateByWidget?.[widget.id] as
    | { search?: string; levels?: string[]; paused?: boolean; following?: boolean }
    | undefined;
  const [search, setSearch] = useState(stored?.search ?? "");
  const [levels, setLevels] = useState<string[]>(stored?.levels ?? options.levels);
  const [paused, setPaused] = useState(stored?.paused ?? options.paused);
  const [following, setFollowing] = useState(stored?.following ?? widget.auto_scroll);
  const snapshot = useRef(lines);
  if (!paused) snapshot.current = lines;
  const visibleLines = snapshot.current.filter((line) => {
    const matchesSearch = !search || line.toLowerCase().includes(search.toLowerCase());
    const matchesLevel =
      levels.length === 0 || levels.some((level) => line.toLowerCase().includes(level.toLowerCase()));
    return matchesSearch && matchesLevel;
  });
  const { ref, handleScroll } = useStickToBottom<HTMLDivElement>(following && !paused, visibleLines);

  const updateState = (
    patch: Partial<{ search: string; levels: string[]; paused: boolean; following: boolean }>,
    event: string,
  ) => {
    const state = { search, levels, paused, following, ...patch, last_event: event };
    if (patch.search !== undefined) setSearch(patch.search);
    if (patch.levels !== undefined) setLevels(patch.levels);
    if (patch.paused !== undefined) setPaused(patch.paused);
    if (patch.following !== undefined) setFollowing(patch.following);
    handlers.onUiStateChange?.(widget.id, state);
    if (options.interaction?.mode === "server") {
      handlers.onAction(
        options.interaction.action_id ?? widget.id,
        { kind: event, state },
        widget.id,
      );
    }
  };

  const download = () => {
    const blob = new Blob([visibleLines.join("\n")], { type: "text/plain;charset=utf-8" });
    const href = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = href;
    anchor.download = `${widget.stream_id}.log`;
    anchor.click();
    URL.revokeObjectURL(href);
  };

  return (
    <section className="lcars-log-shell">
      {options.toolbar || options.search ? (
        <div className="lcars-log-toolbar">
          {options.search ? (
            <input
              aria-label="Search log"
              className="lcars-input"
              disabled={widget.disabled}
              onChange={(event) => updateState({ search: event.target.value }, "search")}
              placeholder="Search stream"
              type="search"
              value={search}
            />
          ) : null}
          {options.levels.map((level) => {
            const enabled = levels.includes(level);
            return (
              <button
                aria-pressed={enabled}
                className="lcars-tool-button"
                data-on={enabled}
                disabled={widget.disabled}
                key={level}
                onClick={() =>
                  updateState(
                    { levels: enabled ? levels.filter((value) => value !== level) : [...levels, level] },
                    "levels",
                  )
                }
                type="button"
              >
                {level}
              </button>
            );
          })}
          {options.toolbar ? (
            <>
              <button
                aria-label={paused ? "Resume log" : "Pause log"}
                aria-pressed={paused}
                className="lcars-tool-button"
                disabled={widget.disabled}
                onClick={() => updateState({ paused: !paused }, paused ? "resume" : "pause")}
                title={paused ? "Resume log" : "Pause log"}
                type="button"
              >
                {paused ? "PLAY" : "PAUSE"}
              </button>
              <button
                aria-label="Copy visible log"
                className="lcars-tool-button"
                disabled={widget.disabled}
                onClick={() => void navigator.clipboard?.writeText(visibleLines.join("\n"))}
                title="Copy visible log"
                type="button"
              >
                COPY
              </button>
              <button
                aria-label="Download visible log"
                className="lcars-tool-button"
                disabled={widget.disabled}
                onClick={download}
                title="Download visible log"
                type="button"
              >
                SAVE
              </button>
            </>
          ) : null}
        </div>
      ) : null}
      <div
        className="lcars-log"
        data-line-numbers={options.line_numbers}
        data-wrap={options.wrap}
        onScroll={() => {
          handleScroll();
          const element = ref.current;
          if (!element) return;
          const next = element.scrollHeight - element.scrollTop - element.clientHeight <= 24;
          if (next !== following) updateState({ following: next }, "scroll");
        }}
        ref={ref}
      >
        {visibleLines.length === 0 ? (
          <p>// no matching entries in {widget.stream_id}</p>
        ) : visibleLines.map((line, index) => (
          <p data-line={index + 1} key={`${index}-${line}`}>
            {options.timestamps ? <time>{new Date().toLocaleTimeString()} </time> : null}
            {line}
          </p>
        ))}
      </div>
    </section>
  );
}

function ActionStatusTag(_: { status?: ActionStatus }) {
  // State is shown through CSS data-action-status color changes on the button,
  // not a text label — LCARS communicates state through color, not words.
  return null;
}

function ButtonControl({
  disabled,
  label,
  onClick,
  confirm,
  debounceMs = 0,
  busyLabel,
  status,
  style,
}: {
  disabled?: boolean;
  label: string;
  onClick: () => void;
  confirm?: string | null;
  debounceMs?: number;
  busyLabel?: string | null;
  status?: ActionStatus;
  style?: CSSProperties;
}) {
  const [pulse, setPulse] = useState(0);
  const lastClick = useRef(0);
  return (
    <button
      className="lcars-btn"
      data-action-status={status ?? undefined}
      data-pulse={pulse}
      disabled={disabled || status === "pending"}
      onClick={() => {
        const now = Date.now();
        if (now - lastClick.current < debounceMs) return;
        if (confirm && !window.confirm(confirm)) return;
        lastClick.current = now;
        setPulse((value) => value + 1);
        onClick();
      }}
      style={style}
      type="button"
    >
      <span>{status === "pending" && busyLabel ? busyLabel : label}</span>
      <ActionStatusTag status={status} />
    </button>
  );
}

function AtomGlyphControl({ glyph }: { glyph: NonNullable<Extract<Widget, { type: "button" }>["glyph"]> }) {
  const center = 24;
  const electronPoints = Array.from({ length: glyph.electrons }, (_, index) => {
    const ring = index % glyph.rings;
    const radius = 7 + ring * (13 / Math.max(1, glyph.rings - 1));
    const angle = ((index / Math.max(1, glyph.electrons)) * 360 + glyph.rotation + ring * 29) * Math.PI / 180;
    return { x: center + Math.cos(angle) * radius, y: center + Math.sin(angle) * radius };
  });
  return (
    <svg aria-hidden="true" className="lcars-atom-glyph" viewBox="0 0 48 48">
      {Array.from({ length: glyph.rings }, (_, index) => (
        <ellipse
          cx={center}
          cy={center}
          key={`ring-${index}`}
          rx={glyph.rings === 1 ? 18 : 8 + index * (12 / Math.max(1, glyph.rings - 1))}
          ry={glyph.rings === 1 ? 18 : 20}
          transform={`rotate(${glyph.rotation + index * (180 / glyph.rings)} 24 24)`}
        />
      ))}
      {Array.from({ length: glyph.spokes }, (_, index) => {
        const angle = (index / glyph.spokes) * Math.PI * 2;
        return <line key={`spoke-${index}`} x1="24" y1="24" x2={24 + Math.cos(angle) * 20} y2={24 + Math.sin(angle) * 20} />;
      })}
      <circle className="lcars-atom-core" cx="24" cy="24" r="3.5" />
      {electronPoints.map((point, index) => <circle cx={point.x} cy={point.y} key={`electron-${index}`} r="1.7" />)}
    </svg>
  );
}

function DataTileButton({
  widget,
  label,
  handlers,
}: {
  widget: Extract<Widget, { type: "button" }>;
  label: string;
  handlers: WidgetHandlers;
}) {
  const status = handlers.actionStatus?.[widget.action_id];
  return (
    <button
      className="lcars-data-tile"
      data-action-status={status ?? undefined}
      data-density={widget.density ?? "normal"}
      data-terminal={widget.terminal ?? "both"}
      disabled={widget.disabled || status === "pending"}
      onClick={() => handlers.onAction(widget.action_id, widget.options?.payload ?? null, widget.id)}
      style={accentStyle(widget.color)}
      type="button"
    >
      {widget.glyph ? <AtomGlyphControl glyph={widget.glyph} /> : null}
      <span className="lcars-data-tile-data">
        {widget.symbol ? <strong className="lcars-data-tile-symbol">{widget.symbol}</strong> : null}
        <span className="lcars-data-tile-copy">
          <span>{label || "Execute"}</span>
          {widget.detail ? <small>{widget.detail}</small> : null}
        </span>
      </span>
    </button>
  );
}

function AuthoredCompositionControl({
  widget,
  depth,
  handlers,
}: {
  widget: Extract<Widget, { type: "authored_composition" }>;
  depth: number;
  handlers: WidgetHandlers;
}) {
  const host = useRef<HTMLDivElement>(null);
  const [availableWidth, setAvailableWidth] = useState<number | null>(null);
  const adaptiveProfile = useViewportProfile(host);
  useEffect(() => {
    const element = host.current;
    if (!element) return;
    const updateWidth = () => setAvailableWidth(element.clientWidth);
    updateWidth();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(updateWidth);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const narrow = availableWidth !== null && availableWidth < widget.min_width;
  const adaptivePage = useMemo<Page>(() => ({
    archetype: "auto",
    fillers: false,
    id: `${widget.id}-adaptive`,
    rows: [{
      columns: [{
        id: `${widget.id}-adaptive-column`,
        widgets: widget.children
          .filter((area) => !area.decorative)
          .flatMap((area) => area.children),
        width: "1fr",
      }],
      height: "auto",
      id: `${widget.id}-adaptive-row`,
    }],
    sizing: "fill",
    title: "Adaptive composition",
  }), [widget.children, widget.id]);
  const adaptiveMosaic = useMemo(() => packMosaic(
    planLayout(adaptivePage).panels,
    adaptiveProfile,
    { defaultSizing: "fill", fillers: false, seed: adaptivePage.id },
  ), [adaptivePage, adaptiveProfile]);
  if (narrow && widget.narrow === "adaptive") {
    return (
      <div
        className="lcars-authored-adaptive lcars-deck lcars-deck--mosaic"
        data-density={adaptiveProfile.density}
        data-overflows={adaptiveMosaic.overflows || undefined}
        ref={host}
        style={{
          "--cols": adaptiveMosaic.cols,
          "--row-unit": `${adaptiveMosaic.rowUnit}px`,
          gridTemplateRows: rowTemplate(adaptiveMosaic.rowHeights),
        } as CSSProperties}
      >
        {adaptiveMosaic.cells.map((cell) => (
          <div
            className="lcars-mcell"
            data-widget={cell.widget.id}
            data-zone={cell.zone}
            key={cell.widget.id}
            style={{
              gridColumn: `${cell.col + 1} / span ${cell.colSpan}`,
              gridRow: `${cell.row + 1} / span ${cell.rowSpan}`,
            }}
          >
            <WidgetRenderer depth={depth + 1} widget={cell.widget} {...handlers} />
          </div>
        ))}
      </div>
    );
  }

  const scale = narrow && widget.narrow === "scale" && availableWidth !== null
    ? availableWidth / widget.min_width
    : 1;
  const stageWidth = narrow ? widget.min_width : undefined;
  const stageStyle = {
    "--authored-columns": widget.columns.join(" "),
    "--authored-rows": widget.rows.join(" "),
    "--authored-column-gap": widget.column_gap,
    "--authored-row-gap": widget.row_gap,
    "--authored-min-width": `${widget.min_width}px`,
    aspectRatio: `${widget.design_width} / ${widget.design_height}`,
    width: stageWidth ? `${stageWidth}px` : undefined,
    transform: scale < 1 ? `scale(${scale})` : undefined,
  } as CSSProperties;
  const viewportStyle = scale < 1
    ? { height: `${(widget.min_width * widget.design_height / widget.design_width) * scale}px` }
    : undefined;

  return (
    <div className="lcars-authored-viewport" data-narrow={widget.narrow} ref={host} style={viewportStyle}>
      <div className="lcars-authored-stage" style={stageStyle}>
        {widget.children.map((area) => (
          <div
            className="lcars-authored-area"
            data-decorative={area.decorative || undefined}
            data-area={area.id}
            key={area.id}
            style={{
              alignSelf: area.align,
              gridColumn: `${area.column} / span ${area.column_span}`,
              gridRow: `${area.row} / span ${area.row_span}`,
              justifySelf: area.justify,
              zIndex: area.layer,
            }}
          >
            {area.children.map((child) => (
              <WidgetRenderer depth={depth + 1} key={child.id} widget={child} {...handlers} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function ToggleControl({
  widget,
  label,
  handlers,
}: {
  widget: Extract<Widget, { type: "toggle" | "lcars_checkbox" }>;
  label: string;
  handlers: WidgetHandlers;
}) {
  const [checked, setChecked] = useState(widget.checked);
  const status = handlers.actionStatus?.[widget.action_id];

  useEffect(() => {
    setChecked(widget.checked);
  }, [widget.checked]);

  const stateLabel = checked ? widget.options?.on_label : widget.options?.off_label;
  const accessibility =
    widget.type === "lcars_checkbox"
      ? { "aria-checked": checked, role: "checkbox" }
      : { "aria-pressed": checked };
  return (
    <>
      <button
        {...accessibility}
        className="lcars-btn"
        data-action-status={status ?? undefined}
        data-on={checked}
        disabled={widget.disabled}
        onClick={() => {
          const next = !checked;
          setChecked(next);
          handlers.onAction(widget.action_id, next, widget.id);
        }}
        type="button"
      >
        <span>{label}{stateLabel ? `: ${stateLabel}` : ""}</span>
      </button>
      <input name={widget.id} type="hidden" value={checked ? "true" : "false"} />
    </>
  );
}

function ChoiceControl({
  widget,
  label,
  handlers,
}: {
  widget: Extract<Widget, { type: "select" | "lcars_radio" | "lcars_radio_toggle" }>;
  label: string;
  handlers: WidgetHandlers;
}) {
  const [value, setValue] = useState(widget.value);
  const [query, setQuery] = useState("");
  const status = handlers.actionStatus?.[widget.action_id];

  useEffect(() => {
    setValue(widget.value);
  }, [widget.value]);

  const choose = (next: string | string[]) => {
    setValue(next);
    handlers.onAction(widget.action_id, next, widget.id);
  };

  if (widget.type === "select") {
    const settings = widget.settings;
    const filtered = filterChoiceOptions(widget.options, query);
    const grouped = groupChoiceOptions(filtered);
    const multiple = settings?.multiple ?? false;
    const selectedValues = Array.isArray(value) ? value : value ? [value] : [];
    const requestedPresentation = settings?.presentation ?? "auto";
    const presentation = requestedPresentation === "auto"
      ? widget.options.length <= AUTO_SEGMENT_OPTION_LIMIT ? "segments" : "stack"
      : requestedPresentation;
    const hasSelection = selectedValues.length > 0;
    const chooseOption = (optionValue: string) => {
      if (!multiple) {
        choose(optionValue);
        return;
      }
      choose(selectedValues.includes(optionValue)
        ? selectedValues.filter((selectedValue) => selectedValue !== optionValue)
        : [...selectedValues, optionValue]);
    };

    return (
      <div className="lcars-field lcars-field--choice lcars-field--stacked" data-action-status={status ?? undefined}>
        {label ? <label id={`${widget.id}-label`}>{label}</label> : null}
        {settings?.searchable ? (
          <input
            aria-label={`Filter ${label || "options"}`}
            className="lcars-input lcars-choice-search"
            disabled={widget.disabled}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={settings.placeholder ?? "Filter options"}
            type="search"
            value={query}
          />
        ) : null}
        {settings?.placeholder && !settings.searchable && !hasSelection ? (
          <span className="lcars-choice-placeholder">{settings.placeholder}</span>
        ) : null}
        <div
          aria-labelledby={label ? `${widget.id}-label` : undefined}
          className={presentation === "segments" ? "lcars-segments" : "lcars-option-stack"}
          role={multiple ? "group" : "radiogroup"}
        >
          {Object.entries(grouped).map(([group, options]) =>
            <div className="lcars-choice-group" key={group || "ungrouped"}>
              {group ? <span className="lcars-choice-group-heading">{group}</span> : null}
              {options.map((opt) => (
                <ChoiceOptionControl
                  disabled={Boolean(widget.disabled || opt.disabled)}
                  key={opt.value}
                  multiple={multiple}
                  onChoose={() => chooseOption(opt.value)}
                  option={opt}
                  presentation={presentation}
                  selected={selectedValues.includes(opt.value)}
                />
              ))}
            </div>,
          )}
          {filtered.length === 0 ? <span className="lcars-choice-empty">No matching options</span> : null}
        </div>
        <ActionStatusTag status={status} />
        {multiple
          ? selectedValues.map((selectedValue, index) => (
              <input key={`${selectedValue}-${index}`} name={widget.id} type="hidden" value={selectedValue} />
            ))
          : <input name={widget.id} type="hidden" value={selectedValues[0] ?? ""} />}
      </div>
    );
  }

  return (
    <div className="lcars-field lcars-field--stacked" data-action-status={status ?? undefined}>
      {label ? <label id={`${widget.id}-label`}>{label}</label> : null}
      <div
        aria-labelledby={label ? `${widget.id}-label` : undefined}
        className={`lcars-segments ${widget.type === "lcars_radio_toggle" ? "lcars-segments--toggle" : ""}`}
        role="radiogroup"
      >
        {widget.options.map((opt) => {
          const selected = opt.value === value;
          return (
            <button
              aria-checked={selected}
              className="lcars-segment"
              data-on={selected}
              disabled={widget.disabled || opt.disabled}
              key={opt.value}
              onClick={() => choose(opt.value)}
              role="radio"
              type="button"
            >
              {opt.label}
            </button>
          );
        })}
        <ActionStatusTag status={status} />
      </div>
      <input name={widget.id} type="hidden" value={Array.isArray(value) ? value.join(",") : value} />
    </div>
  );
}

type SelectWidget = Extract<Widget, { type: "select" }>;
type SelectOption = SelectWidget["options"][number];
type ChoicePresentation = "segments" | "stack";

function filterChoiceOptions(options: SelectWidget["options"], query: string): SelectWidget["options"] {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return options;
  return options.filter((option) =>
    `${option.label} ${option.description ?? ""}`.toLowerCase().includes(normalizedQuery),
  );
}

function groupChoiceOptions(options: SelectWidget["options"]): Record<string, SelectWidget["options"]> {
  return options.reduce<Record<string, SelectWidget["options"]>>((groups, option) => {
    const key = option.group ?? "";
    (groups[key] ??= []).push(option);
    return groups;
  }, {});
}

function ChoiceOptionControl({
  disabled,
  multiple,
  onChoose,
  option,
  presentation,
  selected,
}: {
  disabled: boolean;
  multiple: boolean;
  onChoose: () => void;
  option: SelectOption;
  presentation: ChoicePresentation;
  selected: boolean;
}) {
  const className = presentation === "segments"
    ? multiple ? "lcars-tool-button lcars-choice-option" : "lcars-segment lcars-choice-option"
    : `lcars-option-stack__option lcars-choice-option${multiple ? " lcars-tool-button" : ""}`;
  const accessibility = multiple
    ? { "aria-pressed": selected }
    : { "aria-checked": selected, role: "radio" as const };
  return (
    <button
      {...accessibility}
      aria-label={option.label}
      className={className}
      data-on={selected}
      disabled={disabled}
      onClick={onChoose}
      type="button"
    >
      <strong>{option.label}</strong>
      {option.description ? <span>{option.description}</span> : null}
    </button>
  );
}

function TextInputControl({
  widget,
  label,
  handlers,
}: {
  widget: Extract<Widget, { type: "text_input" }>;
  label: string;
  handlers: WidgetHandlers;
}) {
  const [value, setValue] = useState(widget.value);
  const lastCommittedValue = useRef(widget.value);

  useEffect(() => {
    setValue(widget.value);
    lastCommittedValue.current = widget.value;
  }, [widget.value]);

  const options = widget.options;
  const commit = () => {
    if (value === lastCommittedValue.current) return;
    lastCommittedValue.current = value;
    handlers.onInput(widget.id, value);
  };
  useEffect(() => {
    if (options?.commit !== "change" || value === widget.value) return;
    const timer = window.setTimeout(commit, options.debounce_ms);
    return () => window.clearTimeout(timer);
    // `commit` intentionally tracks the current input value.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options?.commit, options?.debounce_ms, value, widget.value]);
  const inputProps = {
    "aria-describedby": options?.description ? `${widget.id}-description` : undefined,
    autoComplete: widget.autocomplete ? "on" : "off",
    className: "lcars-input",
    disabled: widget.disabled,
    id: widget.id,
    maxLength: options?.validation?.max_length ?? undefined,
    minLength: options?.validation?.min_length ?? undefined,
    name: widget.id,
    onBlur: options?.commit && options.commit !== "blur" ? undefined : commit,
    onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setValue(event.target.value),
    onKeyDown: (event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      if (event.key !== "Enter") return;
      const modifiedEnter = event.ctrlKey || event.metaKey;
      if (options?.multiline && !modifiedEnter) return;

      // Native single-line fields submit their enclosing form on Enter. For a
      // multiline composer, make Ctrl/Cmd+Enter provide the same deliberate
      // submit gesture while leaving plain Enter available for a new line.
      if (event.currentTarget.form) {
        if (options?.multiline) {
          event.preventDefault();
          event.currentTarget.form.requestSubmit();
        }
        return;
      }

      // A standalone text field should still behave like an operator command
      // line without requiring authors to discover commit="enter" first.
      if (options?.commit !== "change") {
        event.preventDefault();
        commit();
      }
    },
    pattern: options?.validation?.pattern ?? widget.regex ?? undefined,
    placeholder: widget.placeholder ?? "",
    required: options?.validation?.required,
    value,
    ...(!widget.autocomplete ? { autoCorrect: "off", autoCapitalize: "off", spellCheck: false } : {}),
  };
  return (
    <div className="lcars-field lcars-field--input">
      {label ? <label htmlFor={widget.id}>{label}</label> : null}
      {options?.multiline ? (
        <textarea {...inputProps} rows={options.rows} />
      ) : (
        <input {...inputProps} type={widget.password ? "password" : options?.input_type ?? "text"} />
      )}
      {options?.description ? <small id={`${widget.id}-description`}>{options.description}</small> : null}
    </div>
  );
}

function NumberInputControl({
  widget,
  label,
  handlers,
}: {
  widget: Extract<Widget, { type: "number_input" }>;
  label: string;
  handlers: WidgetHandlers;
}) {
  const [value, setValue] = useState(String(widget.value));
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setValue(String(widget.value));
  }, [widget.value]);

  const options = widget.options;
  const step = options?.precision != null ? 10 ** -options.precision : widget.step;
  const numericValue = value.trim() === "" ? null : Number(value);
  const isNumericValue = numericValue != null && Number.isFinite(numericValue);
  const decreaseDisabled = Boolean(
    widget.disabled || (isNumericValue && widget.min != null && numericValue <= widget.min),
  );
  const increaseDisabled = Boolean(
    widget.disabled || (isNumericValue && widget.max != null && numericValue >= widget.max),
  );
  const commit = () => handlers.onInput(widget.id, value);
  const applyStep = (direction: -1 | 1) => {
    const startingValue = isNumericValue ? numericValue : widget.value;
    const steppedValue = startingValue + direction * step;
    const boundedValue = Math.min(
      widget.max ?? Number.POSITIVE_INFINITY,
      Math.max(widget.min ?? Number.NEGATIVE_INFINITY, steppedValue),
    );
    const normalizedValue = options?.precision != null
      ? Number(boundedValue.toFixed(options.precision))
      : Number(boundedValue.toPrecision(15));
    setValue(String(normalizedValue));
    inputRef.current?.focus();
  };
  useEffect(() => {
    if (options?.commit !== "change" || value === String(widget.value)) return;
    const timer = window.setTimeout(commit, options.debounce_ms);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options?.commit, options?.debounce_ms, value, widget.value]);
  return (
    <div className="lcars-field lcars-field--input">
      {label ? <label htmlFor={widget.id}>{label}</label> : null}
      <span className="lcars-number-control">
        {options?.prefix ? <span>{options.prefix}</span> : null}
        <button
          aria-label={`Decrease ${label || widget.id}`}
          className="lcars-number-step"
          disabled={decreaseDisabled}
          onClick={() => applyStep(-1)}
          onMouseDown={(event) => event.preventDefault()}
          type="button"
        >
          &minus;
        </button>
        <input
          className="lcars-input"
          disabled={widget.disabled}
          id={widget.id}
          inputMode="decimal"
          max={widget.max ?? undefined}
          min={widget.min ?? undefined}
          name={widget.id}
          onBlur={options?.commit && options.commit !== "blur" ? undefined : commit}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && (!options || options.commit === "enter")) commit();
          }}
          placeholder={widget.placeholder ?? ""}
          ref={inputRef}
          required={options?.required}
          step={step}
          type="text"
          value={value}
        />
        <button
          aria-label={`Increase ${label || widget.id}`}
          className="lcars-number-step"
          disabled={increaseDisabled}
          onClick={() => applyStep(1)}
          onMouseDown={(event) => event.preventDefault()}
          type="button"
        >
          +
        </button>
        {options?.suffix ? <span>{options.suffix}</span> : null}
      </span>
      {options?.description ? <small>{options.description}</small> : null}
    </div>
  );
}

function FormControl({
  widget,
  label,
  depth,
  handlers,
}: {
  widget: Extract<Widget, { type: "form" }>;
  label: string;
  depth: number;
  handlers: WidgetHandlers;
}) {
  const [resetEpoch, setResetEpoch] = useState(0);
  const options = widget.options;
  const composer = options?.variant === "composer";
  const submitStatus = handlers.actionStatus?.[widget.action_id];
  return (
    <form
      aria-label={composer ? (widget.children[0]?.label ?? label ?? "Command") : undefined}
      className={`lcars-panel lcars-form${composer ? " lcars-command-form" : ""}`}
      data-layout={options?.layout}
      data-variant={options?.variant}
      onSubmit={(event) => {
        event.preventDefault();
        handlers.onFormSubmit(widget.action_id, collectFormPayload(widget, event.currentTarget));
        if (options?.clear_on_submit) setResetEpoch((value) => value + 1);
      }}
      style={options?.layout === "grid" ? ({ "--form-columns": options.columns } as CSSProperties) : undefined}
    >
      {!composer && label ? <div className={`lcars-panel-head${depth > 0 ? " lcars-panel-head--sub" : ""}`}><span>{label}</span></div> : null}
      <div className="lcars-panel-body lcars-form-fields">
        {widget.children.map((child) => (
          <WidgetRenderer key={`${child.id}-${resetEpoch}`} widget={child} depth={depth + 1} {...handlers} />
        ))}
      </div>
      <div className="lcars-form-actions">
        <button
          className="lcars-btn"
          data-action-status={submitStatus}
          disabled={widget.disabled || submitStatus === "pending"}
          type="submit"
        >
          {widget.submit_label}
        </button>
        {options?.actions?.map((action) => (
          <button
            className="lcars-btn lcars-btn--secondary"
            data-action-status={handlers.actionStatus?.[action.action_id]}
            disabled={widget.disabled || handlers.actionStatus?.[action.action_id] === "pending"}
            key={action.action_id}
            onClick={() => handlers.onAction(action.action_id, action.value)}
            type="button"
          >
            {action.label}
          </button>
        ))}
        {options?.reset_label ? (
          <button
            className="lcars-btn lcars-btn--secondary"
            onClick={() => setResetEpoch((value) => value + 1)}
            type="reset"
          >
            {options.reset_label}
          </button>
        ) : null}
        {options?.cancel_action ? (
          <button
            className="lcars-btn lcars-btn--secondary"
            onClick={() =>
              handlers.onAction(options.cancel_action?.action_id ?? "", options.cancel_action?.value, widget.id)
            }
            type="button"
          >
            {options.cancel_action.label}
          </button>
        ) : null}
      </div>
    </form>
  );
}

function VideoHlsControl({
  widget,
  label,
  depth,
  handlers,
}: {
  widget: Extract<Widget, { type: "video_hls" }>;
  label: string;
  depth: number;
  handlers: WidgetHandlers;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [playbackRate, setPlaybackRate] = useState(1);
  const options = widget.options;

  const emitState = (event: string) => {
    const video = videoRef.current;
    if (!video || !options) return;
    const state = {
      playing: !video.paused,
      current_time: video.currentTime,
      playback_rate: video.playbackRate,
      quality: null,
      last_event: event,
    };
    handlers.onUiStateChange?.(widget.id, state);
    if (options.interaction?.mode === "server") {
      handlers.onAction(
        options.interaction.action_id ?? widget.id,
        { kind: event, state },
        widget.id,
      );
    }
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) {
      return;
    }
    const src = widget.src;
    const isHls = /\.m3u8(\?|$)/i.test(src);
    if (!isHls) {
      video.src = src;
      return;
    }
    // Prefer hls.js where it works (Chrome/Firefox/Edge — Chromium reports a false
    // "maybe" for native HLS that it can't actually decode), and fall back to native
    // HLS on Safari/iOS where hls.js is unsupported. Loaded lazily so the player code
    // only ships when a feed is actually on screen.
    let destroy: (() => void) | undefined;
    let cancelled = false;
    void import("hls.js")
      .then(({ default: Hls }) => {
        if (cancelled || !videoRef.current) {
          return;
        }
        if (Hls.isSupported()) {
          const hls = new Hls();
          hls.loadSource(src);
          hls.attachMedia(videoRef.current);
          if (widget.autoplay) {
            // The autoplay attribute races hls.js's async media attach, so kick
            // playback off once the manifest is parsed (muted, per autoplay policy).
            hls.on(Hls.Events.MANIFEST_PARSED, () => {
              videoRef.current?.play().catch(() => undefined);
            });
          }
          destroy = () => hls.destroy();
        } else {
          videoRef.current.src = src;
        }
      })
      .catch(() => {
        if (videoRef.current) {
          videoRef.current.src = src;
        }
      });
    return () => {
      cancelled = true;
      destroy?.();
    };
  }, [widget.autoplay, widget.src]);

  return (
    <section className="lcars-panel">
      <div className={`lcars-panel-head${depth > 0 ? " lcars-panel-head--sub" : ""}`}>
        <span>{label || "Feed"}</span>
        <span className="lcars-tag">HLS</span>
      </div>
      <div className="lcars-panel-body">
        <video
          ref={videoRef}
          autoPlay={widget.autoplay}
          className="lcars-video"
          controls={options?.controls ?? true}
          loop={options?.loop}
          muted={widget.muted}
          onEnded={() => emitState("ended")}
          onPause={() => emitState("pause")}
          onPlay={() => emitState("play")}
          onRateChange={(event) => {
            setPlaybackRate(event.currentTarget.playbackRate);
            emitState("rate");
          }}
          playsInline
          preload={options?.preload ?? "metadata"}
        />
        {options && options.playback_rates.length > 0 ? (
          <div className="lcars-video-rate">
            <span>RATE</span>
            <div aria-label="Playback rate" className="lcars-segments" role="radiogroup">
              {options.playback_rates.map((rate) => {
                const selected = rate === playbackRate;
                return (
                  <button
                    aria-checked={selected}
                    className="lcars-segment"
                    data-on={selected}
                    key={rate}
                    onClick={() => {
                      setPlaybackRate(rate);
                      if (videoRef.current) videoRef.current.playbackRate = rate;
                    }}
                    role="radio"
                    type="button"
                  >
                    {rate}x
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
        {options?.show_source !== false ? <div className="lcars-text-mono">{widget.src}</div> : null}
      </div>
    </section>
  );
}

function Meter({
  label,
  value,
  min,
  max,
  status,
  unit,
  accent,
  options,
}: {
  label?: string;
  value: number;
  min: number;
  max: number;
  status?: string;
  unit?: string | null;
  accent?: CSSProperties;
  options?: MeterOptions | null;
}) {
  const effectiveMin = options?.min ?? min;
  const effectiveMax = options?.max ?? max;
  const effectiveUnit = options?.unit ?? unit;
  const pct = Math.max(0, Math.min(100, ((value - effectiveMin) / (effectiveMax - effectiveMin || 1)) * 100));
  const display = options?.value_format
    ? formatValue(value, options.value_format)
    : effectiveUnit
      ? `${value}${effectiveUnit === "%" ? "%" : ` ${effectiveUnit}`}`
      : `${Math.round(pct)}%`;
  const effectiveStatus =
    status ??
    (options?.crit_threshold != null && value >= options.crit_threshold
      ? "crit"
      : options?.warn_threshold != null && value >= options.warn_threshold
        ? "warn"
        : undefined);
  const changed = useValueFlicker(value);
  return (
    <div
      aria-label={label}
      aria-valuemax={effectiveMax}
      aria-valuemin={effectiveMin}
      aria-valuenow={options?.indeterminate ? undefined : value}
      className="lcars-meter"
      data-indeterminate={options?.indeterminate || undefined}
      data-status={effectiveStatus}
      role="meter"
      style={accent}
    >
      <div className="lcars-meter-track" style={options ? { "--segments": options.segments } as CSSProperties : undefined}>
        <div className="lcars-meter-fill" style={{ width: options?.indeterminate ? "34%" : `${pct}%` }} />
        {options ? (
          <span aria-hidden="true" className="lcars-meter-segments">
            {Array.from({ length: options.segments }, (_, index) => <i key={index} />)}
          </span>
        ) : null}
      </div>
      {options?.ticks ? (
        <div aria-hidden="true" className="lcars-meter-ticks">
          <span>{effectiveMin}</span><span>{effectiveMax}</span>
        </div>
      ) : null}
      <div className="lcars-meter-row">
        <span>{label}</span>
        <b data-changed={changed || undefined}>{options?.indeterminate ? "ACTIVE" : display}</b>
      </div>
    </div>
  );
}

function StatusTile({
  label,
  widget,
}: {
  label: string;
  widget: Extract<Widget, { type: "status_tile" }>;
}) {
  const changed = useValueFlicker(widget.value);
  const trend = widget.options?.trend;
  const numericValue = Number(widget.value);
  const displayValue =
    widget.options?.value_format && Number.isFinite(numericValue)
      ? formatValue(numericValue, widget.options.value_format)
      : widget.value;
  return (
    <div className="lcars-tile" data-status={widget.status} style={accentStyle(widget.color)}>
      <span className="lcars-tile-dot" />
      <span className="lcars-tile-label">{label || widget.status}</span>
      <span className="lcars-tile-values">
        <span className="lcars-tile-value" data-changed={changed || undefined}>
          {displayValue}
          {trend ? <span aria-label={`Trend ${trend}`} className="lcars-tile-trend" data-trend={trend}>{trend === "up" ? "↑" : trend === "down" ? "↓" : "="}</span> : null}
        </span>
        {widget.options?.secondary_value ? <small>{widget.options.secondary_value}</small> : null}
      </span>
    </div>
  );
}

function EnhancedText({ widget }: { widget: Extract<Widget, { type: "text" }> }) {
  const options = widget.options!;
  const style: CSSProperties = {
    ...accentStyle(widget.color),
    whiteSpace: options.wrap === "pre" ? "pre-wrap" : options.wrap === "nowrap" ? "nowrap" : undefined,
    userSelect: options.selectable ? undefined : "none",
    ...(options.max_lines
      ? {
          display: "-webkit-box",
          WebkitBoxOrient: "vertical",
          WebkitLineClamp: options.max_lines,
          overflow: "hidden",
        }
      : {}),
  };
  let content: ReactNode = widget.content;
  const href = options.link ? safeHref(options.link.href) : null;
  if (href) {
    content = (
      <a
        href={href}
        rel={options.link?.rel ?? (options.link?.target === "_blank" ? "noopener noreferrer" : undefined)}
        target={options.link?.target}
      >
        {options.link?.label ?? widget.content}
      </a>
    );
  }
  if (options.copyable) {
    content = (
      <>
        {content}
        <button
          aria-label="Copy text"
          className="lcars-copy"
          onClick={() => void navigator.clipboard?.writeText(widget.content)}
          title="Copy text"
          type="button"
        >
          COPY
        </button>
      </>
    );
  }
  return createElement(
    options.semantic,
    { className: `lcars-text-${widget.size} lcars-text--enhanced`, style },
    content,
  );
}

function EnhancedMarkdown({ widget }: { widget: Extract<Widget, { type: "markdown" }> }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const html = useMemo(
    () => DOMPurify.sanitize(marked.parse(widget.content, { async: false }) as string),
    [widget.content],
  );
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    for (const anchor of root.querySelectorAll("a")) {
      anchor.target = widget.options?.link_target ?? "_self";
      if (anchor.target === "_blank") anchor.rel = "noopener noreferrer";
    }
    if (!widget.options?.copy_code) return;
    const cleanups: Array<() => void> = [];
    for (const block of root.querySelectorAll("pre")) {
      if (block.querySelector(".lcars-copy")) continue;
      const button = document.createElement("button");
      button.className = "lcars-copy";
      button.type = "button";
      button.textContent = "COPY";
      button.title = "Copy code";
      button.setAttribute("aria-label", "Copy code");
      const handler = () => void navigator.clipboard?.writeText(block.querySelector("code")?.textContent ?? "");
      button.addEventListener("click", handler);
      block.append(button);
      cleanups.push(() => button.removeEventListener("click", handler));
    }
    return () => cleanups.forEach((cleanup) => cleanup());
  }, [widget.options?.copy_code, widget.options?.link_target, html]);
  return (
    <div
      className="lcars-md lcars-md--enhanced"
      dangerouslySetInnerHTML={{ __html: html }}
      ref={ref}
      style={widget.options?.max_height ? { maxHeight: widget.options.max_height, overflow: "auto" } : undefined}
    />
  );
}

function EnhancedAlert({
  widget,
  handlers,
}: {
  widget: Extract<Widget, { type: "alert" }>;
  handlers: WidgetHandlers;
}) {
  const stored = handlers.uiStateByWidget?.[widget.id] as { dismissed?: boolean } | undefined;
  const [dismissed, setDismissed] = useState(stored?.dismissed ?? false);
  if (dismissed) return null;
  const dismiss = () => {
    setDismissed(true);
    handlers.onUiStateChange?.(widget.id, { dismissed: true });
    if (widget.options?.interaction?.mode === "server") {
      handlers.onAction(
        widget.options.interaction.action_id ?? widget.id,
        { kind: "dismiss", state: { dismissed: true } },
        widget.id,
      );
    }
  };
  return (
    <div
      aria-live={widget.options?.live}
      className="lcars-alert"
      data-blink={widget.blink}
      data-sev={widget.severity}
      role={widget.severity === "red" ? "alert" : "status"}
    >
      <span>{widget.message}</span>
      {widget.options?.action ? (
        <button
          className="lcars-alert-action"
          disabled={widget.disabled}
          onClick={() => handlers.onAction(widget.options?.action?.action_id ?? "", widget.options?.action?.value)}
          type="button"
        >
          {widget.options.action.label}
        </button>
      ) : null}
      {widget.options?.dismissible ? (
        <button aria-label="Dismiss alert" className="lcars-alert-dismiss" disabled={widget.disabled} onClick={dismiss} title="Dismiss" type="button">
          ×
        </button>
      ) : null}
    </div>
  );
}

type ContainerWidget = Extract<Widget, { type: "lcars_box" | "lcars_sweep" | "lcars_bracket" }>;

function EnhancedContainer({
  widget,
  title,
  depth,
  handlers,
}: {
  widget: ContainerWidget;
  title: string;
  depth: number;
  handlers: WidgetHandlers;
}) {
  const options = widget.options!;
  const stored = handlers.uiStateByWidget?.[widget.id] as { collapsed?: boolean } | undefined;
  const [collapsed, setCollapsed] = useState(stored?.collapsed ?? options.initial_collapsed);
  const main = gatherChildrenFromKeys(widget, MAIN_CHILD_KEYS);
  const mainIds = new Set(main.map((child) => child.id));
  const inputs = gatherChildrenFromKeys(widget, INPUT_CHILD_KEYS).filter((child) => !mainIds.has(child.id));
  const kids = main.length > 0 || inputs.length > 0 ? [...main, ...inputs] : gatherChildren(widget);
  if (kids.length === 0) return null;

  const orientation = widget.type === "lcars_bracket" ? widget.orientation : undefined;
  const reverse = widget.type === "lcars_sweep" ? widget.reverse : false;
  const leftWidth = widget.type === "lcars_sweep" ? widget.left_width : null;
  const splitRatio = typeof leftWidth === "number" && leftWidth > 0 && leftWidth < 1 ? leftWidth : null;
  const colsStyle: CSSProperties | undefined = reverse ? { flexDirection: "row-reverse" } : undefined;
  const toggle = () => {
    const next = !collapsed;
    const state = { collapsed: next, last_event: "toggle" };
    setCollapsed(next);
    handlers.onUiStateChange?.(widget.id, state);
    if (options.interaction?.mode === "server") {
      handlers.onAction(
        options.interaction.action_id ?? widget.id,
        { kind: "toggle", state },
        widget.id,
      );
    }
  };

  return (
    <section
      className="lcars-panel lcars-panel--enhanced"
      data-density={options.density}
      data-orientation={orientation}
      style={accentStyle(widget.color)}
    >
      {title ? (
        <div className={`lcars-panel-head${depth > 0 ? " lcars-panel-head--sub" : ""}`}>
          {options.collapsible ? (
            <button
              aria-expanded={!collapsed}
              className="lcars-panel-toggle"
              disabled={widget.disabled}
              onClick={toggle}
              type="button"
            >
              <span>{collapsed ? "›" : "⌄"}</span>{title}
            </button>
          ) : <span>{title}</span>}
          {"subtitle" in widget && widget.subtitle ? <span className="lcars-tag">{widget.subtitle}</span> : null}
        </div>
      ) : null}
      {!collapsed ? (
        <div className="lcars-panel-body" style={{ overflow: options.overflow }}>
          {main.length > 0 && inputs.length > 0 ? (
            <div className="lcars-panel-cols" style={colsStyle}>
              <div className="lcars-panel-col" style={splitRatio ? { flex: `${splitRatio} 1 0` } : undefined}>
                {main.map((child) => (
                  <WidgetRenderer key={child.id} widget={child} depth={depth + 1} {...handlers} />
                ))}
              </div>
              <div className="lcars-panel-col" style={splitRatio ? { flex: `${1 - splitRatio} 1 0` } : undefined}>
                {inputs.map((child) => (
                  <WidgetRenderer key={child.id} widget={child} depth={depth + 1} {...handlers} />
                ))}
              </div>
            </div>
          ) : kids.map((child) => (
            <WidgetRenderer key={child.id} widget={child} depth={depth + 1} {...handlers} />
          ))}
        </div>
      ) : null}
    </section>
  );
}

function EnhancedHeader({
  widget,
  depth,
  handlers,
}: {
  widget: Extract<Widget, { type: "lcars_header" }>;
  depth: number;
  handlers: WidgetHandlers;
}) {
  const options = widget.options!;
  return createElement(
    widget.size,
    {
      className: `lcars-panel-head${depth > 0 ? " lcars-panel-head--sub" : ""} lcars-panel-head--enhanced`,
      id: options.anchor ?? undefined,
      style: accentStyle(widget.color),
    },
    <span className="lcars-header-copy">
      <span>{widget.text}</span>
      {options.subtitle ? <small>{options.subtitle}</small> : null}
    </span>,
    options.actions.length > 0 ? (
      <span className="lcars-header-actions">
        {options.actions.map((action) => (
          <button
            className="lcars-tool-button"
            disabled={widget.disabled}
            key={action.action_id}
            onClick={() => handlers.onAction(action.action_id, action.value, widget.id)}
            type="button"
          >
            {action.label}
          </button>
        ))}
      </span>
    ) : null,
  );
}

/**
 * Renders a widget, plus its hint when it has one.
 *
 * This is the only place that sees every widget type, so it is where the common
 * `hint` field is honored. Hint bodies render back through here recursively, so
 * a hint can hold anything a page can — text, a chart, a video.
 */
export function WidgetRenderer({
  widget,
  depth = 0,
  ...handlers
}: { widget: Widget; depth?: number } & WidgetHandlers) {
  const body = <WidgetBody depth={depth} widget={widget} {...handlers} />;
  if (!widget.hint) return body;
  return (
    <HintAnchor depth={depth} handlers={handlers} widget={widget}>
      {body}
    </HintAnchor>
  );
}

function WidgetBody({
  widget,
  depth = 0,
  ...handlers
}: { widget: Widget; depth?: number } & WidgetHandlers) {
  const { onAction, logsByStream } = handlers;
  const label = widget.label ?? widget.strict_title ?? "";
  // Nested container heads step down to a quieter sub-band so depth reads as
  // hierarchy — an LCARS panel does not stack identical bars on top of itself.
  const subHead = depth > 0 ? " lcars-panel-head--sub" : "";
  const feedback = widgetOptions(widget)?.feedback;
  if (feedback && feedback.state !== "ready") {
    return <WidgetFeedbackState widget={widget} />;
  }

  switch (widget.type) {
    case "text":
      if (widget.options) {
        return <EnhancedText widget={widget} />;
      }
      return (
        <div
          className={`lcars-text-${widget.size}`}
          data-align={widget.align ?? "start"}
          style={accentStyle(widget.color)}
        >
          {widget.content}
        </div>
      );

    case "markdown":
      if (widget.options) {
        return <EnhancedMarkdown widget={widget} />;
      }
      return (
        <div
          className="lcars-md"
          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(marked.parse(widget.content, { async: false }) as string) }}
        />
      );

    case "status_tile":
      return <StatusTile label={label} widget={widget} />;

    case "alert":
      if (widget.options) {
        return <EnhancedAlert handlers={handlers} widget={widget} />;
      }
      return (
        <div className="lcars-alert" data-sev={widget.severity} data-blink={widget.blink}>
          {widget.message}
        </div>
      );

    case "progress_bar":
      return (
        <Meter
          accent={accentStyle(widget.color)}
          label={widget.show_label ? label : undefined}
          value={widget.value}
          min={0}
          max={100}
          options={widget.options}
        />
      );

    case "gauge":
      return (
        <Meter
          accent={accentStyle(widget.color)}
          label={label}
          value={widget.value}
          min={widget.min}
          max={widget.max}
          unit={widget.unit}
          options={widget.options}
          status={
            widget.crit_threshold != null && widget.value >= widget.crit_threshold
              ? "crit"
              : widget.warn_threshold != null && widget.value >= widget.warn_threshold
                ? "warn"
                : undefined
          }
        />
      );

    case "button":
      if (widget.presentation === "data_tile") {
        return <DataTileButton handlers={handlers} label={label} widget={widget} />;
      }
      return (
        <ButtonControl
          disabled={widget.disabled}
          label={label || "Execute"}
          onClick={() => onAction(widget.action_id, widget.options?.payload ?? null, widget.id)}
          busyLabel={widget.options?.busy_label}
          confirm={widget.options?.confirm}
          debounceMs={widget.options?.debounce_ms}
          status={handlers.actionStatus?.[widget.action_id]}
          style={accentStyle(widget.color)}
        />
      );

    case "mic_button":
      return <MicButtonControl handlers={handlers} label={label} widget={widget} />;

    case "file_upload":
      return <FileUploadControl onUpload={handlers.onFileUpload} widget={widget} />;

    case "toggle":
    case "lcars_checkbox":
      return <ToggleControl handlers={handlers} label={label} widget={widget} />;

    case "select":
    case "lcars_radio":
    case "lcars_radio_toggle":
      return <ChoiceControl handlers={handlers} label={label} widget={widget} />;

    case "text_input":
      return <TextInputControl handlers={handlers} label={label} widget={widget} />;

    case "number_input":
      return <NumberInputControl handlers={handlers} label={label} widget={widget} />;

    case "form":
      return <FormControl depth={depth} handlers={handlers} label={label} widget={widget} />;

    case "table":
      if (widget.options) {
        return <EnhancedTable handlers={handlers} widget={widget} />;
      }
      return (
        <table className="lcars-table" style={accentStyle(widget.color)}>
          <thead>
            <tr>
              {widget.headers.map((h) => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {widget.rows.map((row) => (
              <tr key={row.id}>
                {row.cells.map((cell, ci) => (
                  <td key={ci}>{tableCellDisplay(cell)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      );

    case "log_viewer": {
      const lines = logsByStream[widget.stream_id] ?? [];
      if (widget.options) {
        return <EnhancedLogViewer handlers={handlers} lines={lines} widget={widget} />;
      }
      return <LogViewerControl lines={lines} widget={widget} />;
    }

    case "line_chart":
      if (widget.options) {
        return <EnhancedLineChart handlers={handlers} label={label} widget={widget} />;
      }
      return (
        <div className="lcars-chart">
          {label ? <div className="lcars-chart-title">{label}</div> : null}
          <Sparkline series={widget.series} fallback={widget.color} />
        </div>
      );

    case "sparkline":
      if (widget.options) {
        return <EnhancedSparkline widget={widget} />;
      }
      return (
        <div className="lcars-chart">
          {label ? <div className="lcars-chart-title">{label}</div> : null}
          <Sparkline series={widget.series} fallback={widget.color} />
        </div>
      );

    case "candlestick":
    case "renko":
      return <OhlcChart handlers={handlers} label={label} widget={widget} />;

    case "shader":
      return <ShaderCanvas label={label} widget={widget} />;

    case "three_scene":
      return (
        <Suspense fallback={<div className="lcars-chart lcars-chart--three lcars-immersive" />}>
          <ThreeSceneCanvas handlers={handlers} label={label} widget={widget} />
        </Suspense>
      );

    case "node_canvas":
      return (
        <Suspense fallback={<div className="lcars-gcanvas lcars-immersive" />}>
          <NodeCanvas handlers={handlers} label={label} widget={widget} />
        </Suspense>
      );

    case "graph_workspace":
      return (
        <Suspense fallback={<div className="lcars-workspace lcars-immersive" />}>
          <GraphWorkspace handlers={handlers} label={label} widget={widget} />
        </Suspense>
      );

    case "video_hls":
      return <VideoHlsControl depth={depth} handlers={handlers} label={label} widget={widget} />;

    case "lcars_header":
      if (widget.options) {
        return <EnhancedHeader depth={depth} handlers={handlers} widget={widget} />;
      }
      return (
        <div className={`lcars-panel-head${subHead}`} style={accentStyle(widget.color)}>
          <span>{widget.text}</span>
        </div>
      );

    case "lcars_bar":
      return (
        <div
          className="lcars-structural-bar"
          data-align={widget.align}
          data-caps={widget.caps}
          data-label-mode={widget.label_mode}
          style={{ ...accentStyle(widget.color), height: widget.thickness }}
        >
          {widget.text ? <span>{widget.text}</span> : null}
        </div>
      );

    case "authored_composition":
      return <AuthoredCompositionControl depth={depth} handlers={handlers} widget={widget} />;

    case "surface":
      return <SurfaceControl depth={depth} handlers={handlers} widget={widget} />;

    case "surface_region":
      return (
        <>
          {widget.children.map((child) => (
            <WidgetRenderer depth={depth + 1} key={child.id} widget={child} {...handlers} />
          ))}
        </>
      );

    case "composition_area":
      return (
        <>{widget.children.map((child) => (
          <WidgetRenderer depth={depth + 1} key={child.id} widget={child} {...handlers} />
        ))}</>
      );

    case "webui_settings":
      return (
        <WebUISettings
          onChange={handlers.onWebUIPreferencesChange}
          onReset={handlers.onWebUIPreferencesReset}
          preferences={
            handlers.webUIPreferences ?? {
              theme: "galaxy",
              soundEnabled: true,
              motion: "system",
              uppercase: true,
              lcarsFontText: false,
            }
          }
        />
      );

    case "support_panel":
      return <SupportPanelControl depth={depth} handlers={handlers} Renderer={WidgetRenderer} widget={widget} />;

    case "tri_state":
      return <TriStateControl handlers={handlers} widget={widget} />;

    case "popup":
      return (
        <PopupWindow
          accent={accentStyle(widget.color) ?? {}}
          onAction={handlers.onAction}
          onUiStateChange={handlers.onUiStateChange}
          storedState={handlers.uiStateByWidget?.[widget.id]}
          widget={widget}
        >
          {widget.children.map((child) => (
            <WidgetRenderer depth={depth + 1} key={child.id} widget={child} {...handlers} />
          ))}
        </PopupWindow>
      );

    case "lcars_box":
    case "lcars_sweep":
    case "lcars_bracket": {
      const title = ("title" in widget && widget.title) || label || "";
      if (widget.options) {
        return <EnhancedContainer depth={depth} handlers={handlers} title={title} widget={widget} />;
      }
      const main = gatherChildrenFromKeys(widget, MAIN_CHILD_KEYS);
      const mainIds = new Set(main.map((child) => child.id));
      const inputs = gatherChildrenFromKeys(widget, INPUT_CHILD_KEYS).filter((child) => !mainIds.has(child.id));
      const kids = main.length > 0 || inputs.length > 0 ? [...main, ...inputs] : gatherChildren(widget);
      // An empty framed field is a void — the spec forbids it. If a container
      // carries no children, it has no function, so it does not exist.
      if (kids.length === 0) {
        return null;
      }
      // Bracket orientation places the colored spine left/right/both; sweep reverse
      // flips the content/input columns and left_width sets their split ratio.
      const orientation = widget.type === "lcars_bracket" ? widget.orientation : undefined;
      const reverse = widget.type === "lcars_sweep" ? widget.reverse : false;
      const leftW = widget.type === "lcars_sweep" ? widget.left_width : null;
      const splitRatio = typeof leftW === "number" && leftW > 0 && leftW < 1 ? leftW : null;
      const colsStyle: CSSProperties | undefined = reverse ? { flexDirection: "row-reverse" } : undefined;
      return (
        <section className="lcars-panel" data-orientation={orientation} style={accentStyle(widget.color)}>
          {title ? (
            <div className={`lcars-panel-head${subHead}`}>
              <span>{title}</span>
              {"subtitle" in widget && widget.subtitle ? <span className="lcars-tag">{widget.subtitle}</span> : null}
            </div>
          ) : null}
          <div className="lcars-panel-body">
            {main.length > 0 && inputs.length > 0 ? (
              <div className="lcars-panel-cols" style={colsStyle}>
                <div className="lcars-panel-col" style={splitRatio ? { flex: `${splitRatio} 1 0` } : undefined}>
                  {main.map((child) => (
                    <WidgetRenderer key={child.id} widget={child} depth={depth + 1} {...handlers} />
                  ))}
                </div>
                <div className="lcars-panel-col" style={splitRatio ? { flex: `${1 - splitRatio} 1 0` } : undefined}>
                  {inputs.map((child) => (
                    <WidgetRenderer key={child.id} widget={child} depth={depth + 1} {...handlers} />
                  ))}
                </div>
              </div>
            ) : (
              kids.map((child) => <WidgetRenderer key={child.id} widget={child} depth={depth + 1} {...handlers} />)
            )}
          </div>
        </section>
      );
    }

    default:
      return null;
  }
}
