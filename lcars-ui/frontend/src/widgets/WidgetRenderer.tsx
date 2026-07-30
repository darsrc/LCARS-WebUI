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
  type MouseEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { marked } from "marked";
import DOMPurify from "dompurify";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type ColumnDef,
  type ColumnFiltersState,
  type PaginationState,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";

import type {
  ChartOptions,
  LcarsColor,
  MeterOptions,
  Series,
  SparklineOptions,
  TableCell as TableCellValue,
  TableDetail,
  TableRow,
  TableState,
  ValueFormat,
  Widget,
} from "../types/contract";
import type { WebUIPreferences } from "../runtime/preferences";
import { useAnimatedPresence, useReducedMotion, useValueFlicker } from "../lcars/motion";
import { FileUploadControl, type FileUploadHandler } from "./FileUploadControl";
import { HintAnchor } from "./HintAnchor";
import { PopupWindow } from "./PopupWindow";
import { WebUISettings } from "./WebUISettings";
import { computeRms, defaultVadConfig, SilenceTracker } from "./vad";
import { preNegatedComparator, resolveSortRule, sortNumber, type SortValue } from "./tableSort";

// Three.js is by a wide margin the heaviest thing the console can load, and
// most pages carry no scene at all — so it stays out of the main bundle and
// arrives only once a manifest actually asks for one.
const ThreeSceneCanvas = lazy(() => import("./ThreeSceneCanvas"));
// Likewise the graph editor: React Flow and every LCARS node component it
// draws are dead weight on a console that shows no graph.
const NodeCanvas = lazy(() => import("./nodecanvas/NodeCanvas"));

export type ActionStatus = "pending" | "ok" | "fail";

export type WidgetHandlers = {
  onAction: (actionId: string, value: unknown, widgetId?: string) => void;
  onInput: (id: string, value: string) => void;
  onFormSubmit: (id: string, data: Record<string, unknown>) => void;
  onAudioUpload?: (widget: Extract<Widget, { type: "mic_button" }>, audio: Blob) => Promise<void>;
  onFileUpload?: FileUploadHandler;
  logsByStream: Record<string, string[]>;
  actionStatus?: Record<string, ActionStatus>;
  uiStateByWidget?: Record<string, unknown>;
  onUiStateChange?: (widgetId: string, value: unknown) => void;
  webUIPreferences?: WebUIPreferences;
  onWebUIPreferencesChange?: (patch: Partial<WebUIPreferences>) => void;
  onWebUIPreferencesReset?: () => void;
};

const COLOR_VAR: Record<string, string> = {
  orange: "var(--okuda-orange)",
  "golden-tanoi": "var(--okuda-golden)",
  "pale-canary": "var(--okuda-canary)",
  "neon-carrot": "var(--okuda-sunflower)",
  "atomic-tangerine": "var(--okuda-orange)",
  blue: "var(--okuda-blue)",
  anakiwa: "var(--okuda-blue)",
  mariner: "var(--okuda-mariner)",
  "bahama-blue": "var(--okuda-mariner)",
  lilac: "var(--okuda-lilac)",
  hopbush: "var(--okuda-hopbush)",
  eggplant: "var(--okuda-lilac)",
  red: "var(--okuda-red)",
  yellow: "var(--okuda-sunflower)",
  white: "var(--okuda-white)",
};
const seriesColor = (color: LcarsColor | null | undefined, index: number): string => {
  if (typeof color === "string" && color.startsWith("#")) return color;
  if (typeof color === "string" && COLOR_VAR[color]) return COLOR_VAR[color];
  return ["var(--okuda-canary)", "var(--okuda-blue)", "var(--okuda-lilac)", "var(--okuda-hopbush)"][index % 4];
};

// Resolve a widget's declared color to a CSS value (named token or raw hex). In
// LCARS colour is role, so the DSL's color= must actually paint the widget — the
// renderer exposes it as --accent and the stylesheet falls back to a sane default.
export const accentVar = (color: LcarsColor | string | null | undefined): string | undefined => {
  if (typeof color !== "string" || color === "") return undefined;
  if (color.startsWith("#")) return color;
  return COLOR_VAR[color];
};
const accentStyle = (color: LcarsColor | string | null | undefined): CSSProperties | undefined => {
  const resolved = accentVar(color);
  return resolved ? ({ "--accent": resolved } as CSSProperties) : undefined;
};

const formatValue = (value: number, format?: ValueFormat | null): string => {
  if (!format) return String(value);
  const formatted = new Intl.NumberFormat(undefined, {
    maximumFractionDigits: format.precision ?? 12,
    minimumFractionDigits: format.precision ?? 0,
    useGrouping: format.thousands,
    notation: format.compact ? "compact" : "standard",
  }).format(value);
  return `${format.prefix}${formatted}${format.suffix}`;
};

const safeHref = (href: string): string | null => {
  const trimmed = href.trim();
  if (
    trimmed.startsWith("/") ||
    trimmed.startsWith("#") ||
    trimmed.startsWith("?") ||
    /^https?:\/\//i.test(trimmed) ||
    /^mailto:/i.test(trimmed) ||
    /^tel:/i.test(trimmed)
  ) {
    return trimmed;
  }
  return null;
};

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

// lightweight-charts and WebGL are canvas-based and cannot consume the CSS
// custom-property strings (`var(--okuda-xxx)`) that accentVar() returns for DOM
// styling — resolve them to their computed hex values for canvas use.
const resolveCssColor = (value: string): string => {
  if (value.startsWith("#")) return value;
  const match = /^var\((--[\w-]+)\)$/.exec(value);
  if (!match || typeof document === "undefined") return value;
  return getComputedStyle(document.documentElement).getPropertyValue(match[1]).trim() || value;
};

const MARKER_POSITION: Record<string, "aboveBar" | "belowBar" | "inBar"> = {
  above: "aboveBar",
  below: "belowBar",
  in: "inBar",
};
const MARKER_SHAPE: Record<string, "arrowUp" | "arrowDown" | "circle" | "square"> = {
  arrow_up: "arrowUp",
  arrow_down: "arrowDown",
  circle: "circle",
  square: "square",
};

const SHADER_VERTEX_SRC = `attribute vec2 a_position;
varying vec2 v_uv;
void main() {
  v_uv = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

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
  for (const child of widget.children) {
    const value = defaultFormChildValue(child);
    if (value !== undefined) {
      payload[child.id] = value;
    }
  }
  for (const [key, value] of new FormData(form).entries()) {
    if (typeof value === "string") {
      const child = childById.get(key);
      if (child?.type === "select" && child.settings?.multiple) {
        payload[key] = new FormData(form).getAll(key).map(String);
      } else if (child?.type === "toggle" || child?.type === "lcars_checkbox") {
        payload[key] = coerceFormChildValue(child, value);
      } else {
        payload[key] = widget.options?.coerce_values ? coerceFormChildValue(child, value) : value;
      }
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
    const filtered = query
      ? widget.options.filter((option) =>
          `${option.label} ${option.description ?? ""}`.toLowerCase().includes(query.toLowerCase()),
        )
      : widget.options;
    const grouped = filtered.reduce<Record<string, typeof filtered>>((groups, option) => {
      const key = option.group ?? "";
      (groups[key] ??= []).push(option);
      return groups;
    }, {});
    const renderOption = (opt: (typeof filtered)[number]) => (
      <option disabled={opt.disabled} key={opt.value} value={opt.value}>
        {opt.label}{opt.description ? ` - ${opt.description}` : ""}
      </option>
    );
    return (
      <div className="lcars-field lcars-field--choice" data-action-status={status ?? undefined}>
        {label ? <label htmlFor={widget.id}>{label}</label> : null}
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
        <select
          className="lcars-select"
          disabled={widget.disabled}
          id={widget.id}
          multiple={settings?.multiple}
          name={widget.id}
          onChange={(event) =>
            choose(
              settings?.multiple
                ? Array.from(event.target.selectedOptions, (option) => option.value)
                : event.target.value,
            )
          }
          value={value}
        >
          {settings?.placeholder && !settings.multiple ? <option value="">{settings.placeholder}</option> : null}
          {Object.entries(grouped).map(([group, options]) =>
            group ? <optgroup key={group} label={group}>{options.map(renderOption)}</optgroup> : options.map(renderOption),
          )}
        </select>
        <ActionStatusTag status={status} />
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

  useEffect(() => {
    setValue(widget.value);
  }, [widget.value]);

  const options = widget.options;
  const commit = () => handlers.onInput(widget.id, value);
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
      if (event.key === "Enter" && options?.commit === "enter" && (!options.multiline || event.ctrlKey || event.metaKey)) {
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

  useEffect(() => {
    setValue(String(widget.value));
  }, [widget.value]);

  const options = widget.options;
  const commit = () => handlers.onInput(widget.id, value);
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
        <input
          className="lcars-input"
          disabled={widget.disabled}
          id={widget.id}
          max={widget.max ?? undefined}
          min={widget.min ?? undefined}
          name={widget.id}
          onBlur={options?.commit && options.commit !== "blur" ? undefined : commit}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && (!options || options.commit === "enter")) commit();
          }}
          placeholder={widget.placeholder ?? ""}
          required={options?.required}
          step={options?.precision != null ? 10 ** -options.precision : widget.step}
          type="number"
          value={value}
        />
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
  return (
    <form
      className="lcars-panel lcars-form"
      data-layout={options?.layout}
      onSubmit={(event) => {
        event.preventDefault();
        handlers.onFormSubmit(widget.action_id, collectFormPayload(widget, event.currentTarget));
      }}
      style={options?.layout === "grid" ? ({ "--form-columns": options.columns } as CSSProperties) : undefined}
    >
      {label ? <div className={`lcars-panel-head${depth > 0 ? " lcars-panel-head--sub" : ""}`}><span>{label}</span></div> : null}
      <div className="lcars-panel-body lcars-form-fields">
        {widget.children.map((child) => (
          <WidgetRenderer key={`${child.id}-${resetEpoch}`} widget={child} depth={depth + 1} {...handlers} />
        ))}
      </div>
      <div className="lcars-form-actions">
        <button className="lcars-btn" type="submit">{widget.submit_label}</button>
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

function MicButtonControl({
  widget,
  label,
  handlers,
}: {
  widget: Extract<Widget, { type: "mic_button" }>;
  label: string;
  handlers: WidgetHandlers;
}) {
  if (widget.continuous) {
    return <ContinuousMicButtonControl widget={widget} label={label} handlers={handlers} />;
  }
  return <PushToTalkMicButtonControl widget={widget} label={label} handlers={handlers} />;
}

const microphoneConstraints = (widget: Extract<Widget, { type: "mic_button" }>): MediaTrackConstraints | boolean =>
  widget.options?.device_id ? { deviceId: { exact: widget.options.device_id } } : true;

const recorderOptions = (widget: Extract<Widget, { type: "mic_button" }>): MediaRecorderOptions | undefined => {
  const mimeType = widget.options?.mime_types.find((candidate) => MediaRecorder.isTypeSupported(candidate));
  return mimeType ? { mimeType } : undefined;
};

function PushToTalkMicButtonControl({
  widget,
  label,
  handlers,
}: {
  widget: Extract<Widget, { type: "mic_button" }>;
  label: string;
  handlers: WidgetHandlers;
}) {
  const [mode, setMode] = useState<"idle" | "recording" | "uploading" | "error">("idle");
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef(0);

  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
      }
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const finishRecording = () => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
  };

  const startRecording = async () => {
    if (!handlers.onAudioUpload || !navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      handlers.onAction(widget.action_id, null, widget.id);
      setMode("error");
      return;
    }

    try {
      chunksRef.current = [];
      const stream = await navigator.mediaDevices.getUserMedia({ audio: microphoneConstraints(widget) });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream, recorderOptions(widget));
      recorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };
      recorder.onstop = () => {
        const audio = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        const durationMs = Math.max(0, Math.round(performance.now() - startedAtRef.current));
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        if (
          durationMs < (widget.options?.min_duration_ms ?? 0) ||
          (widget.options?.max_bytes != null && audio.size > widget.options.max_bytes)
        ) {
          setMode("error");
          return;
        }
        setMode("uploading");
        void handlers.onAudioUpload?.(widget, audio)
          .then(() => {
            setMode("idle");
            handlers.onAction(
              widget.action_id,
              { bytes: audio.size, mime_type: audio.type || null, duration_ms: durationMs },
              widget.id,
            );
          })
          .catch(() => setMode("error"));
      };
      recorder.start();
      startedAtRef.current = performance.now();
      setMode("recording");
      timeoutRef.current = window.setTimeout(finishRecording, widget.timeout_ms);
    } catch {
      setMode("error");
    }
  };

  const modeLabel = mode === "recording" ? "RECORDING…" : mode === "uploading" ? "UPLOADING…" : mode === "error" ? "ERROR" : null;

  return (
    <button
      className="lcars-btn"
      data-action-status={mode === "error" ? "fail" : mode === "uploading" ? "pending" : undefined}
      data-on={mode === "recording"}
      disabled={widget.disabled}
      onClick={() => {
        if (mode === "recording") {
          finishRecording();
          return;
        }
        void startRecording();
      }}
      type="button"
    >
      <span>{modeLabel ?? (label || "Record")}</span>
    </button>
  );
}

type ContinuousMicState = "standby" | "listening" | "capturing" | "uploading" | "error";

function ContinuousMicButtonControl({
  widget,
  label,
  handlers,
}: {
  widget: Extract<Widget, { type: "mic_button" }>;
  label: string;
  handlers: WidgetHandlers;
}) {
  const [state, setState] = useState<ContinuousMicState>("standby");
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const rafRef = useRef<number | null>(null);
  const trackerRef = useRef<SilenceTracker | null>(null);
  const lastPollTimeRef = useRef<number>(0);
  const safetyCapTimeoutRef = useRef<number | null>(null);
  const discardCurrentRef = useRef<boolean>(false);
  const byteBufferRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const startedAtRef = useRef(0);

  const teardown = () => {
    if (rafRef.current !== null) {
      window.cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (safetyCapTimeoutRef.current !== null) {
      window.clearTimeout(safetyCapTimeoutRef.current);
      safetyCapTimeoutRef.current = null;
    }
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      discardCurrentRef.current = true;
      recorderRef.current.stop();
    }
    recorderRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      void audioContextRef.current.close();
    }
    audioContextRef.current = null;
    analyserRef.current = null;
    trackerRef.current = null;
  };

  useEffect(() => {
    return () => {
      teardown();
    };
  }, []);

  useEffect(() => {
    if (!widget.continuous) {
      teardown();
      setState("standby");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [widget.continuous]);

  const finishCapture = ({ discard }: { discard: boolean }) => {
    discardCurrentRef.current = discard;
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
  };

  const beginCapture = () => {
    const stream = streamRef.current;
    if (!stream || recorderRef.current?.state === "recording") return;
    chunksRef.current = [];
    discardCurrentRef.current = false;
    const recorder = new MediaRecorder(stream, recorderOptions(widget));
    recorderRef.current = recorder;
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunksRef.current.push(event.data);
    };
    recorder.onstop = () => {
      const shouldDiscard = discardCurrentRef.current;
      discardCurrentRef.current = false;
      if (safetyCapTimeoutRef.current !== null) {
        window.clearTimeout(safetyCapTimeoutRef.current);
        safetyCapTimeoutRef.current = null;
      }
      if (shouldDiscard) {
        setState("listening");
        return;
      }
      const audio = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
      const durationMs = Math.max(0, Math.round(performance.now() - startedAtRef.current));
      if (
        durationMs < (widget.options?.min_duration_ms ?? 0) ||
        (widget.options?.max_bytes != null && audio.size > widget.options.max_bytes)
      ) {
        setState("error");
        return;
      }
      setState("uploading");
      void handlers.onAudioUpload?.(widget, audio)
        .then(() => {
          handlers.onAction(
            widget.action_id,
            { bytes: audio.size, mime_type: audio.type || null, duration_ms: durationMs },
            widget.id,
          );
          setState("listening");
        })
        .catch(() => setState("error"));
    };
    recorder.start();
    startedAtRef.current = performance.now();
    setState("capturing");
    safetyCapTimeoutRef.current = window.setTimeout(() => {
      finishCapture({ discard: false });
    }, widget.timeout_ms);
  };

  const pollTick = (nowMs: number) => {
    const analyser = analyserRef.current;
    const tracker = trackerRef.current;
    if (!analyser || !tracker) return;

    if (!byteBufferRef.current || byteBufferRef.current.length !== analyser.fftSize) {
      byteBufferRef.current = new Uint8Array(analyser.fftSize);
    }
    analyser.getByteTimeDomainData(byteBufferRef.current);
    const rms = computeRms(byteBufferRef.current);

    const deltaMs = lastPollTimeRef.current === 0 ? 0 : nowMs - lastPollTimeRef.current;
    lastPollTimeRef.current = nowMs;

    const event = tracker.update(rms, deltaMs);
    if (event.kind === "speech-start") {
      beginCapture();
    } else if (event.kind === "speech-end") {
      finishCapture({ discard: false });
    } else if (event.kind === "noise-discarded") {
      finishCapture({ discard: true });
    }

    rafRef.current = window.requestAnimationFrame(pollTick);
  };

  const arm = async () => {
    if (
      !handlers.onAudioUpload ||
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === "undefined" ||
      typeof AudioContext === "undefined"
    ) {
      handlers.onAction(widget.action_id, null, widget.id);
      setState("error");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: microphoneConstraints(widget) });
      streamRef.current = stream;
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);
      analyserRef.current = analyser;
      const vadConfig = defaultVadConfig(widget.silence_ms);
      if (widget.options?.vad_threshold != null) vadConfig.threshold = widget.options.vad_threshold;
      if (widget.options?.min_duration_ms) vadConfig.minUtteranceMs = widget.options.min_duration_ms;
      trackerRef.current = new SilenceTracker(vadConfig);
      lastPollTimeRef.current = 0;
      setState("listening");
      rafRef.current = window.requestAnimationFrame(pollTick);
    } catch {
      setState("error");
    }
  };

  const modeLabel =
    state === "capturing"
      ? "CAPTURING…"
      : state === "uploading"
        ? "UPLOADING…"
        : state === "listening"
          ? "LISTENING…"
          : state === "error"
            ? "ERROR"
            : null;

  return (
    <button
      className="lcars-btn"
      data-action-status={state === "error" ? "fail" : state === "uploading" ? "pending" : undefined}
      data-on={state === "capturing"}
      data-listening={state === "listening"}
      disabled={widget.disabled}
      onClick={() => {
        if (state === "standby" || state === "error") {
          void arm();
          return;
        }
        teardown();
        setState("standby");
      }}
      type="button"
    >
      <span>{modeLabel ?? (label || "Record")}</span>
    </button>
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
          onRateChange={() => emitState("rate")}
          playsInline
          preload={options?.preload ?? "metadata"}
        />
        {options && options.playback_rates.length > 0 ? (
          <label className="lcars-video-rate">
            <span>RATE</span>
            <select
              aria-label="Playback rate"
              className="lcars-select"
              defaultValue="1"
              onChange={(event) => {
                if (videoRef.current) videoRef.current.playbackRate = Number(event.target.value);
              }}
            >
              {options.playback_rates.map((rate) => <option key={rate} value={rate}>{rate}x</option>)}
            </select>
          </label>
        ) : null}
        {options?.show_source !== false ? <div className="lcars-text-mono">{widget.src}</div> : null}
      </div>
    </section>
  );
}

function OhlcChart({
  widget,
  label,
  handlers,
}: {
  widget: Extract<Widget, { type: "candlestick" | "renko" }>;
  label: string;
  handlers: WidgetHandlers;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<{ chart: { remove: () => void } } | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let cancelled = false;
    let rangeTimer: number | undefined;
    void import("lightweight-charts").then(({
      createChart,
      CandlestickSeries,
      ColorType,
      createSeriesMarkers,
      HistogramSeries,
    }) => {
      if (cancelled || !containerRef.current) return;
      const upColor = resolveCssColor(accentVar(widget.up_color) ?? "var(--okuda-canary)");
      const downColor = resolveCssColor(accentVar(widget.down_color) ?? "var(--okuda-hopbush)");
      const chart = createChart(containerRef.current, {
        autoSize: true,
        layout: {
          background: { type: ColorType.Solid, color: "transparent" },
          textColor: resolveCssColor("var(--ink-label)"),
          fontFamily: "var(--mono)",
        },
        grid: {
          vertLines: { color: "rgba(152, 151, 252, 0.08)" },
          horzLines: { color: "rgba(152, 151, 252, 0.08)" },
        },
        timeScale: { borderColor: "rgba(152, 151, 252, 0.2)" },
        rightPriceScale: { borderColor: "rgba(152, 151, 252, 0.2)" },
      });
      const series = chart.addSeries(CandlestickSeries, {
        upColor,
        downColor,
        borderVisible: false,
        wickUpColor: upColor,
        wickDownColor: downColor,
        wickVisible: widget.type === "candlestick",
        priceFormat: widget.options?.price_precision == null
          ? undefined
          : { type: "price", precision: widget.options.price_precision, minMove: 10 ** -widget.options.price_precision },
      });
      chartRef.current = { chart };
      series.setData(
        widget.data.map((d) => ({ time: d.time, open: d.open, high: d.high, low: d.low, close: d.close })) as Parameters<
          typeof series.setData
        >[0],
      );
      const markers = createSeriesMarkers(series, []);
      markers.setMarkers(
        widget.markers.map((m) => ({
          time: m.time,
          position: MARKER_POSITION[m.position] ?? "aboveBar",
          shape: MARKER_SHAPE[m.shape] ?? "circle",
          color: resolveCssColor(accentVar(m.color) ?? "var(--okuda-canary)"),
          text: m.text ?? undefined,
        })) as Parameters<typeof markers.setMarkers>[0],
      );
      if (widget.options?.show_volume && widget.data.some((point) => point.volume != null)) {
        const volume = chart.addSeries(HistogramSeries, {
          priceFormat: { type: "volume" },
          priceScaleId: "",
        });
        volume.priceScale().applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });
        volume.setData(
          widget.data
            .filter((point) => point.volume != null)
            .map((point) => ({
              time: point.time,
              value: point.volume ?? 0,
              color: point.close >= point.open ? `${upColor}80` : `${downColor}80`,
            })) as Parameters<typeof volume.setData>[0],
        );
      }
      if (widget.options?.fit_content !== false) chart.timeScale().fitContent();
      const emit = (event: string, state: Record<string, unknown>) => {
        handlers.onUiStateChange?.(widget.id, { ...state, last_event: event });
        if (widget.options?.interaction?.mode === "server") {
          handlers.onAction(
            widget.options.interaction.action_id ?? widget.id,
            { kind: event, state: { ...state, last_event: event } },
            widget.id,
          );
        }
      };
      chart.subscribeClick((point) => {
        if (point.time != null) emit("select", { selected_time: point.time });
      });
      chart.timeScale().subscribeVisibleLogicalRangeChange((range) => {
        if (!range) return;
        window.clearTimeout(rangeTimer);
        rangeTimer = window.setTimeout(
          () => emit("range", { visible_from: range.from, visible_to: range.to }),
          150,
        );
      });
    });
    return () => {
      cancelled = true;
      window.clearTimeout(rangeTimer);
      chartRef.current?.chart.remove();
      chartRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    handlers.onAction,
    handlers.onUiStateChange,
    widget.data,
    widget.down_color,
    widget.id,
    widget.markers,
    widget.options,
    widget.type,
    widget.up_color,
  ]);

  const latest = widget.data[widget.data.length - 1];
  return (
    <div className="lcars-chart lcars-chart--ohlc">
      {label ? <div className="lcars-chart-title">{label}</div> : null}
      {widget.options?.legend && latest ? (
        <div className="lcars-financial-legend">
          <span>O {latest.open}</span><span>H {latest.high}</span><span>L {latest.low}</span><span>C {latest.close}</span>
          {widget.options.show_volume && latest.volume != null ? <span>V {latest.volume}</span> : null}
        </div>
      ) : null}
      <div className="lcars-chart-canvas" ref={containerRef} />
    </div>
  );
}

function ShaderCanvas({
  widget,
  label,
}: {
  widget: Extract<Widget, { type: "shader" }>;
  label: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl");
    if (!gl) {
      setError("WebGL is not available in this browser.");
      return;
    }
    setError(null);

    const uniformNames = Object.keys(widget.uniforms);
    const declarations = uniformNames.map((name) => {
      const v = widget.uniforms[name];
      const type = Array.isArray(v) ? `vec${v.length}` : "float";
      return `uniform ${type} ${name};`;
    });
    const fragmentSrc = [
      "precision mediump float;",
      "varying vec2 v_uv;",
      "uniform float u_time;",
      "uniform vec2 u_resolution;",
      ...declarations,
      widget.fragment_shader,
    ].join("\n");

    const compile = (type: number, src: string): WebGLShader => {
      const shader = gl.createShader(type);
      if (!shader) throw new Error("Failed to create shader");
      gl.shaderSource(shader, src);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        const log = gl.getShaderInfoLog(shader);
        gl.deleteShader(shader);
        throw new Error(log || "Shader compile error");
      }
      return shader;
    };

    let program: WebGLProgram | null = null;
    let vbo: WebGLBuffer | null = null;
    let raf = 0;
    let resizeObserver: ResizeObserver | undefined;

    try {
      const vertexShader = compile(gl.VERTEX_SHADER, SHADER_VERTEX_SRC);
      const fragmentShader = compile(gl.FRAGMENT_SHADER, fragmentSrc);
      program = gl.createProgram();
      if (!program) throw new Error("Failed to create program");
      gl.attachShader(program, vertexShader);
      gl.attachShader(program, fragmentShader);
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        throw new Error(gl.getProgramInfoLog(program) || "Program link error");
      }

      vbo = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);

      const positionLoc = gl.getAttribLocation(program, "a_position");
      const timeLoc = gl.getUniformLocation(program, "u_time");
      const resolutionLoc = gl.getUniformLocation(program, "u_resolution");
      const customLocs = uniformNames.map((name) => gl.getUniformLocation(program as WebGLProgram, name));

      const resize = () => {
        const dpr = window.devicePixelRatio || 1;
        const width = Math.max(1, Math.round(canvas.clientWidth * dpr));
        const height = Math.max(1, Math.round(canvas.clientHeight * dpr));
        if (canvas.width !== width || canvas.height !== height) {
          canvas.width = width;
          canvas.height = height;
          gl.viewport(0, 0, width, height);
        }
      };
      resize();
      resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(canvas);

      const start = performance.now();
      let lastFrame = 0;
      const reducedMotion =
        widget.options?.honor_reduced_motion &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const paused = widget.options?.paused || reducedMotion;
      const frameInterval = 1000 / (widget.options?.fps_limit ?? 60);
      const render = (now: number) => {
        if (!paused && now - lastFrame < frameInterval) {
          raf = requestAnimationFrame(render);
          return;
        }
        lastFrame = now;
        resize();
        gl.useProgram(program);
        gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
        gl.enableVertexAttribArray(positionLoc);
        gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);
        gl.uniform1f(timeLoc, (now - start) / 1000);
        gl.uniform2f(resolutionLoc, canvas.width, canvas.height);
        uniformNames.forEach((name, i) => {
          const loc = customLocs[i];
          const value = widget.uniforms[name];
          if (Array.isArray(value)) {
            if (value.length === 2) gl.uniform2fv(loc, value);
            else if (value.length === 3) gl.uniform3fv(loc, value);
            else gl.uniform4fv(loc, value);
          } else {
            gl.uniform1f(loc, value);
          }
        });
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        if (!paused) raf = requestAnimationFrame(render);
      };
      raf = requestAnimationFrame(render);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }

    return () => {
      cancelAnimationFrame(raf);
      resizeObserver?.disconnect();
      if (program) gl.deleteProgram(program);
      if (vbo) gl.deleteBuffer(vbo);
    };
  }, [widget.fragment_shader, widget.options, widget.uniforms]);

  return (
    <div className="lcars-chart lcars-chart--shader">
      {label ? <div className="lcars-chart-title">{label}</div> : null}
      <div className="lcars-chart-canvas" style={widget.aspect_ratio ? { aspectRatio: `${widget.aspect_ratio}` } : undefined}>
        <canvas ref={canvasRef} />
      </div>
      {error ? (
        <div className="lcars-shader-error">
          {widget.options?.fallback ?? `SHADER ERROR: ${error}`}
        </div>
      ) : null}
    </div>
  );
}

function Sparkline({
  series,
  fallback,
  minOverride,
  maxOverride,
  referenceValues = [],
  tooltip = false,
  curve = "linear",
  xLabels = [],
}: {
  series: Series[];
  fallback?: LcarsColor | null;
  minOverride?: number | null;
  maxOverride?: number | null;
  referenceValues?: Array<{ value: number; color?: LcarsColor | null; label?: string | null }>;
  tooltip?: boolean;
  curve?: "linear" | "step";
  xLabels?: string[];
}) {
  const values = series.flatMap((s) => s.data);
  if (values.length === 0) return null;
  // Scale to the data's own range (with a little headroom) so the trace fills the
  // scope instead of cowering against a forced zero baseline. A flat scope reads as
  // dead instrumentation; a breathing trace reads as live telemetry.
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const pad = (hi - lo || Math.abs(hi) || 1) * 0.12;
  const min = minOverride ?? lo - pad;
  const max = maxOverride ?? hi + pad;
  const span = max - min || 1;
  const W = 100;
  const H = 40;
  const y = (v: number) => H - ((v - min) / span) * H;
  return (
    <svg viewBox="0 0 100 40" preserveAspectRatio="none">
      {[0.25, 0.5, 0.75].map((g) => (
        <line
          key={g}
          x1="0"
          y1={H * g}
          x2="100"
          y2={H * g}
          stroke="var(--okuda-lilac)"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
          opacity="0.14"
        />
      ))}
      {referenceValues.map((reference, index) => (
        <line
          aria-label={reference.label ?? `Reference ${reference.value}`}
          key={`${reference.value}-${index}`}
          x1="0"
          x2={W}
          y1={y(reference.value)}
          y2={y(reference.value)}
          stroke={seriesColor(reference.color, index)}
          strokeDasharray="3 2"
          vectorEffect="non-scaling-stroke"
        />
      ))}
      {series.map((s, si) => {
        const n = s.data.length;
        const points = s.data.map((v, i) => ({ x: (i / Math.max(n - 1, 1)) * W, y: y(v), value: v }));
        const line = points.map((point) => `${point.x},${point.y}`).join(" ");
        const path = points.reduce(
          (value, point, index) =>
            index === 0
              ? `M ${point.x} ${point.y}`
              : `${value} H ${point.x} V ${point.y}`,
          "",
        );
        const color = seriesColor(s.color ?? fallback, si);
        return (
          <g key={s.name || si}>
            <polygon points={`0,${H} ${line} ${W},${H}`} fill={color} opacity="0.12" />
            {curve === "step" ? (
              <path d={path} fill="none" stroke={color} strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
            ) : (
              <polyline
                points={line}
                fill="none"
                stroke={color}
                strokeWidth="1.5"
                vectorEffect="non-scaling-stroke"
                strokeLinejoin="round"
              />
            )}
            {tooltip ? points.map((point, index) => (
              <circle fill="transparent" key={index} r="3" cx={point.x} cy={point.y}>
                <title>{`${s.name || "Series"} ${xLabels[index] ?? index}: ${point.value}`}</title>
              </circle>
            )) : null}
          </g>
        );
      })}
    </svg>
  );
}

function EnhancedLineChart({
  widget,
  label,
  handlers,
}: {
  widget: Extract<Widget, { type: "line_chart" }>;
  label: string;
  handlers: WidgetHandlers;
}) {
  const options: ChartOptions = widget.options!;
  const stored = handlers.uiStateByWidget?.[widget.id] as
    | { selected_series?: string[]; zoom?: number }
    | undefined;
  const [selected, setSelected] = useState<string[]>(
    stored?.selected_series ?? widget.series.map((series) => series.name),
  );
  const [zoom, setZoom] = useState(stored?.zoom ?? 1);
  const visible = widget.series
    .filter((series) => selected.includes(series.name))
    .map((series) => ({
      ...series,
      data: options.zoom ? series.data.slice(-Math.max(2, Math.ceil(series.data.length / zoom))) : series.data,
    }));
  const labels = options.zoom
    ? widget.x_labels.slice(-Math.max(2, Math.ceil(widget.x_labels.length / zoom)))
    : widget.x_labels;

  const update = (nextSelected: string[], nextZoom: number, event: string) => {
    setSelected(nextSelected);
    setZoom(nextZoom);
    const state = {
      visible_from: labels[0] ?? null,
      visible_to: labels[labels.length - 1] ?? null,
      selected_series: nextSelected,
      selected_time: null,
      last_event: event,
      zoom: nextZoom,
    };
    handlers.onUiStateChange?.(widget.id, state);
    if (options.interaction?.mode === "server") {
      handlers.onAction(options.interaction.action_id ?? widget.id, { kind: event, state }, widget.id);
    }
  };

  return (
    <div className="lcars-chart lcars-chart--enhanced">
      <div className="lcars-chart-heading">
        {label ? <div className="lcars-chart-title">{label}</div> : null}
        {options.zoom ? (
          <div className="lcars-chart-tools">
            <button
              aria-label="Zoom out"
              className="lcars-tool-button"
              disabled={zoom <= 1}
              onClick={() => update(selected, Math.max(1, zoom - 1), "zoom")}
              title="Zoom out"
              type="button"
            >−</button>
            <button
              aria-label="Zoom in"
              className="lcars-tool-button"
              disabled={visible[0]?.data.length === 2}
              onClick={() => update(selected, Math.min(8, zoom + 1), "zoom")}
              title="Zoom in"
              type="button"
            >+</button>
          </div>
        ) : null}
      </div>
      {options.legend ? (
        <div className="lcars-chart-legend">
          {widget.series.map((series, index) => {
            const active = selected.includes(series.name);
            return (
              <button
                aria-pressed={active}
                className="lcars-legend-item"
                disabled={widget.disabled}
                key={series.name}
                onClick={() =>
                  update(
                    active ? selected.filter((name) => name !== series.name) : [...selected, series.name],
                    zoom,
                    "series",
                  )
                }
                type="button"
              >
                <i style={{ background: seriesColor(series.color ?? widget.color, index) }} />
                {series.name}
              </button>
            );
          })}
        </div>
      ) : null}
      <div className="lcars-chart-plot">
        {options.y_axis.show && options.y_axis.label ? <span className="lcars-axis-y">{options.y_axis.label}</span> : null}
        <Sparkline
          curve={options.curve}
          fallback={widget.color}
          maxOverride={options.y_axis.max}
          minOverride={options.y_axis.min}
          referenceValues={options.reference_lines}
          series={visible}
          tooltip={options.tooltip}
          xLabels={labels}
        />
        {options.x_axis.show && options.x_axis.label ? <span className="lcars-axis-x">{options.x_axis.label}</span> : null}
      </div>
    </div>
  );
}

function EnhancedSparkline({
  widget,
}: {
  widget: Extract<Widget, { type: "sparkline" }>;
}) {
  const options: SparklineOptions = widget.options!;
  const firstSeries = widget.series[0];
  const latest = firstSeries?.data[firstSeries.data.length - 1];
  return (
    <div className="lcars-sparkline">
      <Sparkline
        fallback={widget.color}
        maxOverride={options.max}
        minOverride={options.min}
        referenceValues={options.reference_value == null ? [] : [{ value: options.reference_value }]}
        series={widget.series}
        tooltip={options.tooltip}
        xLabels={widget.x_labels}
      />
      {options.show_latest && latest != null ? <output>{latest}</output> : null}
    </div>
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

const tableCellValue = (cell: TableRow["cells"][number]): string | number | boolean | null => {
  if (typeof cell === "object" && cell !== null) {
    return cell.value ?? null;
  }
  return cell;
};

/** Every value in one column, rows and their children, for sort-kind sniffing. */
function* columnSampleValues(rows: TableRow[], columnIndex: number): Generator<SortValue> {
  for (const row of rows) {
    yield tableCellValue(row.cells[columnIndex] ?? null);
    if (row.children?.length) yield* columnSampleValues(row.children, columnIndex);
  }
}

const tableCellDisplay = (
  cell: TableRow["cells"][number],
  format?: ValueFormat | null,
): string => {
  if (typeof cell === "object" && cell !== null && cell.display != null) {
    return cell.display;
  }
  const value = tableCellValue(cell);
  if (typeof value === "number" && format) return formatValue(value, format);
  if (value === null) return "";
  return String(value);
};

type CopyStatus = "idle" | "ok" | "err";

/** Clipboard write with transient success/error feedback; graceful on failure. */
function useClipboard(): { status: CopyStatus; copy: (text: string) => Promise<void> } {
  const [status, setStatus] = useState<CopyStatus>("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const copy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard?.writeText(text);
      setStatus("ok");
    } catch {
      setStatus("err");
    }
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setStatus("idle"), 1600);
  }, []);
  useEffect(() => () => clearTimeout(timer.current), []);
  return { status, copy };
}

function CopyLiveRegion({ status }: { status: CopyStatus }) {
  return (
    <span aria-live="polite" className="lcars-visually-hidden">
      {status === "ok" ? "Copied to clipboard" : status === "err" ? "Copy failed" : ""}
    </span>
  );
}

/** A standalone COPY button that can sit beside a link or plain value. */
function CopyButton({ value, disabled }: { value: string; disabled?: boolean }) {
  const { status, copy } = useClipboard();
  const label = status === "ok" ? `Copied ${value}` : `Copy ${value}`;
  return (
    <>
      <button
        aria-label={label}
        className="lcars-table-copy"
        data-state={status}
        disabled={disabled}
        onClick={() => void copy(value)}
        title={status === "ok" ? "Copied" : `Copy ${value}`}
        type="button"
      >
        {status === "ok" ? "COPIED" : status === "err" ? "ERROR" : "COPY"}
      </button>
      <CopyLiveRegion status={status} />
    </>
  );
}

/** The cell body itself acts as the copy target (copy_on_click). */
function CopyText({ value, display, disabled }: { value: string; display: string; disabled?: boolean }) {
  const { status, copy } = useClipboard();
  return (
    <button
      aria-label={status === "ok" ? `Copied ${value}` : `Copy ${value}`}
      className="lcars-table-copytext"
      data-state={status}
      disabled={disabled}
      onClick={() => void copy(value)}
      title={`Copy ${value}`}
      type="button"
    >
      {display}
      <CopyLiveRegion status={status} />
    </button>
  );
}

function TableCellContent({
  cell,
  format,
  handlers,
  disabled,
}: {
  cell: TableRow["cells"][number];
  format?: ValueFormat | null;
  handlers: WidgetHandlers;
  disabled?: boolean;
}) {
  const display = tableCellDisplay(cell, format);
  if (typeof cell !== "object" || cell === null) return <>{display}</>;
  const typedCell = cell as TableCellValue;
  const href = typedCell.link ? safeHref(typedCell.link.href) : null;
  const copyValue = typedCell.copy_value ?? String(tableCellValue(cell) ?? display);
  let body: ReactNode;
  if (href) {
    body = (
      <a
        href={href}
        rel={typedCell.link?.rel ?? (typedCell.link?.target === "_blank" ? "noopener noreferrer" : undefined)}
        target={typedCell.link?.target}
      >
        {typedCell.link?.label ?? display}
      </a>
    );
  } else if (typedCell.copy_on_click) {
    body = <CopyText value={copyValue} display={display} disabled={disabled} />;
  } else {
    body = display;
  }
  return (
    <span className="lcars-table-cell-content" data-status={typedCell.status ?? undefined} title={display || undefined}>
      <span className="lcars-table-cell-value">{body}</span>
      {typedCell.action ? (
        <button
          className="lcars-table-action"
          disabled={disabled}
          onClick={() => handlers.onAction(typedCell.action?.action_id ?? "", typedCell.action?.value)}
          type="button"
        >
          {typedCell.action.label}
        </button>
      ) : null}
      {typedCell.copyable ? <CopyButton value={copyValue} disabled={disabled} /> : null}
    </span>
  );
}

/** Full-width expanded detail content: a restricted, schema-validated widget set. */
function TableDetailContent({ details, handlers }: { details: TableDetail[]; handlers: WidgetHandlers }) {
  return (
    <div className="lcars-table-detail-content">
      {details.map((detail, index) => {
        switch (detail.kind) {
          case "text":
            return (
              <p className="lcars-table-detail-text" data-tone={detail.tone ?? "default"} key={index}>
                {detail.text}
              </p>
            );
          case "status":
            return (
              <span className="lcars-table-cell-content" data-status={detail.status} key={index}>
                {detail.label}
              </span>
            );
          case "link": {
            const href = safeHref(detail.href);
            return href ? (
              <a
                href={href}
                key={index}
                rel={detail.rel ?? (detail.target === "_blank" ? "noopener noreferrer" : undefined)}
                target={detail.target}
              >
                {detail.label ?? detail.href}
              </a>
            ) : (
              <span key={index}>{detail.label ?? detail.href}</span>
            );
          }
          case "action":
            return (
              <button
                className="lcars-table-action"
                key={index}
                onClick={() => handlers.onAction(detail.action_id, detail.value)}
                type="button"
              >
                {detail.label}
              </button>
            );
          case "table":
            return (
              <table className="lcars-table lcars-table--nested" key={index}>
                <thead>
                  <tr>
                    {detail.headers.map((header, headerIndex) => (
                      <th key={headerIndex}>{header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {detail.rows.map((row) => (
                    <tr key={row.id}>
                      {row.cells.map((nested, cellIndex) => (
                        <td key={cellIndex}>
                          <TableCellContent cell={nested} handlers={handlers} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            );
          default:
            return null;
        }
      })}
    </div>
  );
}

const EXPAND_EXIT_MS = 300;

const sameStrings = (a: string[], b: string[]): boolean =>
  a.length === b.length && a.every((value, index) => value === b[index]);

function collectRowIds(rows: TableRow[], into: Set<string>): void {
  for (const row of rows) {
    into.add(row.id);
    if (row.children && row.children.length > 0) collectRowIds(row.children, into);
  }
}

function EnhancedTable({
  widget,
  handlers,
}: {
  widget: Extract<Widget, { type: "table" }>;
  handlers: WidgetHandlers;
}) {
  const options = widget.options!;
  const reduced = useReducedMotion();

  // ----- Where data operations run vs. whether state changes are emitted -----
  const serverData = options.data_mode === "server" || options.interaction?.mode === "server";
  const emit = options.emit_state_changes === true || serverData;
  const sortingRemoval =
    options.sort_cycle === "three-state" ||
    ((options.sort_cycle ?? "auto") === "auto" && !serverData);
  const actionId = options.interaction?.action_id ?? widget.id;
  const selectionMode = options.selection.mode;
  const selectionEnabled = selectionMode !== "none";

  // Every row id in the current dataset, for pruning stale selection/expansion.
  const rowIdSet = useMemo(() => {
    const ids = new Set<string>();
    collectRowIds(widget.rows, ids);
    return ids;
  }, [widget.rows]);

  const fromOptions = useCallback(
    (): TableState => ({
      sort: options.sort,
      filters: options.filters,
      page: options.pagination?.page ?? 1,
      page_size: options.pagination?.page_size ?? 25,
      selected_ids: options.selection.selected_ids.filter((id) => rowIdSet.has(id)),
      expanded_ids: options.expanded_ids.filter((id) => rowIdSet.has(id)),
      last_event: null,
    }),
    [options, rowIdSet],
  );

  // A fingerprint of the authoritative manifest baseline. When it changes, the
  // server has deliberately set state (e.g. selected/expanded a row) and we adopt
  // it; when it is unchanged, a plain data refresh must not erase user intent.
  const optionsKey = useMemo(
    () =>
      JSON.stringify({
        sort: options.sort,
        filters: options.filters,
        page: options.pagination?.page ?? 1,
        page_size: options.pagination?.page_size ?? 25,
        selected: options.selection.selected_ids,
        expanded: options.expanded_ids,
      }),
    [options],
  );

  const stored = handlers.uiStateByWidget?.[widget.id] as TableState | undefined;
  const [fallbackState, setFallbackState] = useState<TableState>(() => stored ?? fromOptions());
  const state = stored ?? fallbackState;

  // Keep the latest notifier without making it an effect dependency.
  const notifyRef = useRef(handlers.onUiStateChange);
  notifyRef.current = handlers.onUiStateChange;

  // Seeded to the mount-time key so a remount (page navigation) does not clobber
  // restored state; only a genuine later change adopts a new baseline.
  const baselineKey = useRef(optionsKey);
  useEffect(() => {
    const current = stored ?? fallbackState;
    if (baselineKey.current !== optionsKey) {
      baselineKey.current = optionsKey;
      const next = fromOptions();
      const changed =
        !sameStrings(next.selected_ids, current.selected_ids) ||
        !sameStrings(next.expanded_ids, current.expanded_ids) ||
        JSON.stringify(next.sort) !== JSON.stringify(current.sort) ||
        JSON.stringify(next.filters) !== JSON.stringify(current.filters) ||
        next.page !== current.page ||
        next.page_size !== current.page_size;
      if (changed) {
        setFallbackState(next);
        notifyRef.current?.(widget.id, next);
      }
      return;
    }
    // Same baseline: prune only ids that no longer exist in the dataset.
    const prunedSelected = current.selected_ids.filter((id) => rowIdSet.has(id));
    const prunedExpanded = current.expanded_ids.filter((id) => rowIdSet.has(id));
    if (
      prunedSelected.length !== current.selected_ids.length ||
      prunedExpanded.length !== current.expanded_ids.length
    ) {
      const next = { ...current, selected_ids: prunedSelected, expanded_ids: prunedExpanded };
      setFallbackState(next);
      notifyRef.current?.(widget.id, next);
    }
  }, [optionsKey, rowIdSet, stored, fallbackState, fromOptions, widget.id]);

  const commit = useCallback(
    (kind: string, next: TableState) => {
      const committed = { ...next, last_event: kind };
      setFallbackState(committed);
      notifyRef.current?.(widget.id, committed);
      if (emit) handlers.onAction(actionId, { kind, state: committed }, widget.id);
    },
    [emit, handlers, actionId, widget.id],
  );

  const sorting = useMemo<SortingState>(
    () => state.sort.map((item) => ({ id: item.key, desc: item.direction === "desc" })),
    [state.sort],
  );
  const columnFilters = useMemo<ColumnFiltersState>(
    () => state.filters.map((item) => ({ id: item.key, value: item.value })),
    [state.filters],
  );
  const pagination: PaginationState = {
    pageIndex: Math.max(0, state.page - 1),
    pageSize: state.page_size,
  };

  const configuredColumns = options.columns ?? widget.headers.map((label, index) => ({
    key: `col_${index}`,
    label,
    value_type: "auto" as const,
    sortable: false,
    first_sort_direction: "asc" as const,
    filter: "none" as const,
    align: "start" as const,
    value_format: null,
  }));

  // How each column compares: explicit sort_as / value_type, else sniffed from
  // the column's own values so "735MB" sorts below "1.6GB".
  const sortRules = useMemo(
    () => configuredColumns.map((column, columnIndex) =>
      resolveSortRule(column, columnSampleValues(widget.rows, columnIndex))),
    [configuredColumns, widget.rows],
  );

  const columns = useMemo<ColumnDef<TableRow>[]>(
    () => configuredColumns.map((column, columnIndex) => ({
      id: column.key,
      accessorFn: (row) => tableCellValue(row.cells[columnIndex] ?? null),
      header: column.label ?? column.key,
      enableSorting: column.sortable,
      enableColumnFilter: column.filter !== "none",
      sortDescFirst: column.first_sort_direction === "desc",
      sortingFn: (rowA, rowB, id) => {
        const rule = sortRules[columnIndex];
        const desc = state.sort.some((item) => item.key === id && item.direction === "desc");
        return preNegatedComparator(rule, desc)(
          rowA.getValue<SortValue>(id),
          rowB.getValue<SortValue>(id),
        );
      },
      filterFn: (row, id, filterValue) => {
        const raw = row.getValue<unknown>(id);
        const filter = state.filters.find((item) => item.key === id);
        if (!filter || filterValue === "" || filterValue == null) return true;
        if (filter.operator === "equals") return String(raw) === String(filterValue);
        if (["gt", "gte", "lt", "lte"].includes(filter.operator)) {
          // Numeric comparisons read the column's own scale, so "1.6GB" > "735MB".
          const rule = sortRules[columnIndex];
          const left = sortNumber(raw as SortValue, rule.kind) ?? Number(raw);
          const right = sortNumber(filterValue as SortValue, rule.kind) ?? Number(filterValue);
          if (!Number.isFinite(left) || !Number.isFinite(right)) return false;
          if (filter.operator === "gt") return left > right;
          if (filter.operator === "gte") return left >= right;
          if (filter.operator === "lt") return left < right;
          return left <= right;
        }
        return String(raw ?? "").toLocaleLowerCase().includes(String(filterValue).toLocaleLowerCase());
      },
      meta: { align: column.align, format: column.value_format },
    })),
    [configuredColumns, sortRules, state.filters, state.sort],
  );

  const table = useReactTable({
    columns,
    data: widget.rows,
    state: { sorting, columnFilters, pagination },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: serverData ? undefined : getSortedRowModel(),
    getFilteredRowModel: serverData ? undefined : getFilteredRowModel(),
    getPaginationRowModel: options.pagination && !serverData ? getPaginationRowModel() : undefined,
    getRowId: (row) => row.id,
    manualSorting: serverData,
    enableSortingRemoval: sortingRemoval,
    manualFiltering: serverData,
    manualPagination: serverData && options.pagination != null,
    pageCount:
      serverData && options.pagination?.total_rows != null
        ? Math.max(1, Math.ceil(options.pagination.total_rows / state.page_size))
        : undefined,
    onSortingChange: (updater) => {
      const nextSorting = typeof updater === "function" ? updater(sorting) : updater;
      commit("sort", {
        ...state,
        page: 1,
        sort: nextSorting.map((item) => ({ key: item.id, direction: item.desc ? "desc" : "asc" })),
      });
    },
    onColumnFiltersChange: (updater) => {
      const nextFilters = typeof updater === "function" ? updater(columnFilters) : updater;
      commit("filter", {
        ...state,
        page: 1,
        filters: nextFilters.map((item) => ({
          key: item.id,
          value: typeof item.value === "number" || typeof item.value === "boolean" ? item.value : String(item.value ?? ""),
          operator: state.filters.find((filter) => filter.key === item.id)?.operator ?? "contains",
        })),
      });
    },
    onPaginationChange: (updater) => {
      const next = typeof updater === "function" ? updater(pagination) : updater;
      commit("page", { ...state, page: next.pageIndex + 1, page_size: next.pageSize });
    },
  });

  // Ordered, sorted/filtered/paginated top-level rows; children rendered manually
  // so selection, expansion, detail rows and animation stay under our control.
  const orderedTop = table
    .getRowModel()
    .rows.filter((row) => row.depth === 0)
    .map((row) => row.original);
  const filteredTopIds = serverData
    ? widget.rows.map((row) => row.id)
    : table.getFilteredRowModel().rows.filter((row) => row.depth === 0).map((row) => row.id);

  // ----- selection + expansion held in state (client), emitted only when asked --
  const selectedSet = new Set(state.selected_ids);
  const expandedSet = new Set(state.expanded_ids);

  const toggleSelection = (id: string) => {
    if (!selectionEnabled) return;
    const has = selectedSet.has(id);
    const selected_ids =
      selectionMode === "single"
        ? has
          ? []
          : [id]
        : has
          ? state.selected_ids.filter((value) => value !== id)
          : [...state.selected_ids, id];
    commit("selection", { ...state, selected_ids });
  };

  const toggleAll = () => {
    const allSelected = filteredTopIds.length > 0 && filteredTopIds.every((id) => selectedSet.has(id));
    const selected_ids = allSelected
      ? state.selected_ids.filter((id) => !filteredTopIds.includes(id))
      : Array.from(new Set([...state.selected_ids, ...filteredTopIds]));
    commit("selection", { ...state, selected_ids });
  };

  const toggleExpansion = (id: string) => {
    const has = expandedSet.has(id);
    const expanded_ids = has
      ? state.expanded_ids.filter((value) => value !== id)
      : [...state.expanded_ids, id];
    commit("expansion", { ...state, expanded_ids });
  };

  // Re-emit the current expansion state (used by the inline error Retry control).
  const emitExpansion = () => {
    if (emit) handlers.onAction(actionId, { kind: "expansion", state }, widget.id);
  };

  const rowExpandable = (row: TableRow): boolean =>
    Boolean(
      (row.children && row.children.length > 0) ||
        (row.expanded_content && row.expanded_content.length > 0) ||
        row.loading ||
        row.error != null ||
        (options.expandable && emit),
    );

  // Keep an expansion's content mounted through its exit sweep on collapse.
  const motionMs = options.expansion_motion === "none" ? 0 : EXPAND_EXIT_MS;
  const presence = useAnimatedPresence(
    state.expanded_ids.filter((id) => rowIdSet.has(id)).map((id) => ({ id })),
    (entry) => entry.id,
    motionMs,
  );
  const exitingById = new Map(presence.map((entry) => [entry.key, entry.exiting]));

  const rowClickable = Boolean(options.row_click_select) && selectionEnabled;
  const onRowClick = (event: MouseEvent<HTMLTableRowElement>, id: string) => {
    if (!rowClickable || widget.disabled) return;
    if ((event.target as HTMLElement).closest("a, button, input, select, label")) return;
    toggleSelection(id);
  };

  const colSpan = configuredColumns.length + (selectionEnabled ? 1 : 0);

  const renderCells = (row: TableRow, depth: number): ReactNode =>
    configuredColumns.map((column, columnIndex) => (
      <td data-align={column.align} key={column.key} style={{ "--row-depth": depth } as CSSProperties}>
        {columnIndex === 0 && rowExpandable(row) ? (
          <button
            aria-label={`${expandedSet.has(row.id) ? "Collapse" : "Expand"} row ${row.id}`}
            className="lcars-table-icon"
            data-expanded={expandedSet.has(row.id) || undefined}
            disabled={widget.disabled}
            onClick={() => toggleExpansion(row.id)}
            title={expandedSet.has(row.id) ? "Collapse row" : "Expand row"}
            type="button"
          >
            <svg aria-hidden="true" height="12" viewBox="0 0 16 16" width="12">
              <path
                d="M6 3l5 5-5 5"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
              />
            </svg>
          </button>
        ) : null}
        <TableCellContent
          cell={row.cells[columnIndex] ?? null}
          disabled={widget.disabled}
          format={column.value_format}
          handlers={handlers}
        />
      </td>
    ));

  const renderTree = (rows: TableRow[], depth: number, parentExiting: boolean): ReactNode[] => {
    const nodes: ReactNode[] = [];
    for (const row of rows) {
      const selected = selectedSet.has(row.id);
      nodes.push(
        <tr
          className={depth > 0 ? "lcars-table-child-row" : undefined}
          data-clickable={rowClickable || undefined}
          data-depth={depth}
          data-exiting={(depth > 0 && parentExiting) || undefined}
          data-selected={selected || undefined}
          key={row.id}
          onClick={(event) => onRowClick(event, row.id)}
        >
          {selectionEnabled ? (
            <td className="lcars-table-select">
              <input
                aria-label={`Select row ${row.id}`}
                checked={selected}
                disabled={widget.disabled}
                onChange={() => toggleSelection(row.id)}
                type={selectionMode === "single" ? "radio" : "checkbox"}
              />
            </td>
          ) : null}
          {renderCells(row, depth)}
        </tr>,
      );
      if (exitingById.has(row.id)) {
        const exiting = parentExiting || (exitingById.get(row.id) ?? false);
        const hasDetail = Boolean(
          (row.expanded_content && row.expanded_content.length > 0) || row.loading || row.error,
        );
        if (hasDetail) {
          nodes.push(
            <tr className="lcars-table-detail-row" data-depth={depth + 1} key={`${row.id}__detail`}>
              <td colSpan={colSpan}>
                <div
                  className="lcars-table-expand-motion"
                  data-exiting={exiting || undefined}
                  data-reduced={reduced || undefined}
                >
                  {row.loading ? (
                    <div className="lcars-table-loading" role="status">
                      Loading…
                    </div>
                  ) : null}
                  {row.error ? (
                    <div className="lcars-table-error" role="alert">
                      <span>{row.error}</span>
                      <button className="lcars-table-action" onClick={emitExpansion} type="button">
                        Retry
                      </button>
                    </div>
                  ) : null}
                  {row.expanded_content && row.expanded_content.length > 0 ? (
                    <TableDetailContent details={row.expanded_content} handlers={handlers} />
                  ) : null}
                </div>
              </td>
            </tr>,
          );
        }
        if (row.children && row.children.length > 0) {
          nodes.push(...renderTree(row.children, depth + 1, exiting));
        }
      }
    }
    return nodes;
  };

  const bodyRows = renderTree(orderedTop, 0, false);
  return (
    <div
      className="lcars-table-wrap"
      data-density={options.density}
      data-sticky={options.sticky_header || undefined}
      style={accentStyle(widget.color)}
    >
      <table className="lcars-table lcars-table--enhanced">
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {selectionEnabled ? (
                <th aria-label="Selection" className="lcars-table-select-head">
                  {selectionMode === "multiple" ? (
                    <input
                      aria-label="Select all rows"
                      checked={filteredTopIds.length > 0 && filteredTopIds.every((id) => selectedSet.has(id))}
                      disabled={widget.disabled}
                      onChange={toggleAll}
                      type="checkbox"
                    />
                  ) : null}
                </th>
              ) : null}
              {headerGroup.headers.map((header) => {
                const sorted = header.column.getIsSorted();
                const definition = configuredColumns.find((column) => column.key === header.column.id);
                const filterValue = String(header.column.getFilterValue() ?? "");
                const filterValues = definition?.filter === "select"
                  ? Array.from(
                      new Set(
                        widget.rows.map((row) =>
                          tableCellDisplay(row.cells[header.index] ?? null),
                        ),
                      ),
                    )
                  : [];
                return (
                  <th
                    aria-sort={sorted === "asc" ? "ascending" : sorted === "desc" ? "descending" : "none"}
                    data-align={(header.column.columnDef.meta as { align?: string } | undefined)?.align}
                    key={header.id}
                  >
                    {header.column.getCanSort() ? (
                      <button
                        aria-label={`Sort by ${String(header.column.columnDef.header)}`}
                        className="lcars-table-sort"
                        disabled={widget.disabled}
                        onClick={header.column.getToggleSortingHandler()}
                        title={`Sort by ${String(header.column.columnDef.header)}`}
                        type="button"
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        <span aria-hidden="true">{sorted === "asc" ? " ↑" : sorted === "desc" ? " ↓" : ""}</span>
                      </button>
                    ) : (
                      flexRender(header.column.columnDef.header, header.getContext())
                    )}
                    {header.column.getCanFilter() && definition?.filter === "select" ? (
                      <select
                        aria-label={`Filter ${String(header.column.columnDef.header)}`}
                        className="lcars-table-filter"
                        disabled={widget.disabled}
                        onChange={(event) => header.column.setFilterValue(event.target.value)}
                        value={filterValue}
                      >
                        <option value="">All</option>
                        {filterValues.map((value) => <option key={value} value={value}>{value}</option>)}
                      </select>
                    ) : header.column.getCanFilter() ? (
                      <input
                        aria-label={`Filter ${String(header.column.columnDef.header)}`}
                        className="lcars-table-filter"
                        disabled={widget.disabled}
                        onChange={(event) => header.column.setFilterValue(event.target.value)}
                        type={definition?.filter === "number" ? "number" : "search"}
                        value={filterValue}
                      />
                    ) : null}
                  </th>
                );
              })}
            </tr>
          ))}
        </thead>
        <tbody>
          {orderedTop.length === 0 ? (
            <tr>
              <td className="lcars-table-empty" colSpan={colSpan}>
                {options.feedback?.message ?? "No data"}
              </td>
            </tr>
          ) : (
            bodyRows
          )}
        </tbody>
      </table>
      {options.pagination ? (
        <div className="lcars-table-pagination" aria-label="Table pagination">
          <button
            aria-label="Previous page"
            disabled={widget.disabled || !table.getCanPreviousPage()}
            onClick={() => table.previousPage()}
            title="Previous page"
            type="button"
          >
            &lt;
          </button>
          <span>
            {state.page} / {Math.max(1, table.getPageCount())}
          </span>
          <button
            aria-label="Next page"
            disabled={widget.disabled || !table.getCanNextPage()}
            onClick={() => table.nextPage()}
            title="Next page"
            type="button"
          >
            &gt;
          </button>
          <select
            aria-label="Rows per page"
            disabled={widget.disabled}
            onChange={(event) => table.setPageSize(Number(event.target.value))}
            value={state.page_size}
          >
            {[10, 25, 50, 100].map((size) => <option key={size} value={size}>{size}</option>)}
          </select>
        </div>
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
        <div className={`lcars-text-${widget.size}`} style={accentStyle(widget.color)}>
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
