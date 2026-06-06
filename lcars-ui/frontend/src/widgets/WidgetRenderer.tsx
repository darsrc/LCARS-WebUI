/*
 * The instruments — one rendering per widget the contract speaks, all sharing
 * the token language so the set reads as one calm system. Data sits on black
 * with a colored accent edge; controls are endcapped pills; structure-bearing
 * container widgets become framed fields that compose their children.
 */
import { marked } from "marked";
import DOMPurify from "dompurify";

import type { LcarsColor, Series, Widget } from "../types/contract";

export type WidgetHandlers = {
  onAction: (actionId: string, value: unknown) => void;
  onInput: (id: string, value: string) => void;
  onFormSubmit: (id: string, data: Record<string, unknown>) => void;
  logsByStream: Record<string, string[]>;
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

function Sparkline({ series }: { series: Series[] }) {
  const values = series.flatMap((s) => s.data);
  if (values.length === 0) return null;
  const max = Math.max(...values);
  const min = Math.min(...values, 0);
  const span = max - min || 1;
  const W = 100;
  const H = 38;
  return (
    <svg viewBox="0 0 100 40" preserveAspectRatio="none">
      <line x1="0" y1="39.5" x2="100" y2="39.5" stroke="var(--okuda-lilac)" strokeWidth="1" vectorEffect="non-scaling-stroke" opacity="0.5" />
      {series.map((s, si) => {
        const n = s.data.length;
        const points = s.data
          .map((v, i) => `${(i / Math.max(n - 1, 1)) * W},${H - ((v - min) / span) * H}`)
          .join(" ");
        return (
          <polyline
            key={s.name || si}
            points={points}
            fill="none"
            stroke={seriesColor(s.color, si)}
            strokeWidth="1.5"
            vectorEffect="non-scaling-stroke"
            strokeLinejoin="round"
          />
        );
      })}
    </svg>
  );
}

function Meter({
  label,
  value,
  min,
  max,
  status,
  unit,
}: {
  label?: string;
  value: number;
  min: number;
  max: number;
  status?: string;
  unit?: string | null;
}) {
  const pct = Math.max(0, Math.min(100, ((value - min) / (max - min || 1)) * 100));
  const display = unit ? `${value}${unit === "%" ? "%" : ` ${unit}`}` : `${Math.round(pct)}%`;
  return (
    <div className="lcars-meter" data-status={status}>
      <div className="lcars-meter-track">
        <div className="lcars-meter-fill" style={{ width: `${pct}%` }} />
      </div>
      <div className="lcars-meter-row">
        <span>{label}</span>
        <b>{display}</b>
      </div>
    </div>
  );
}

export function WidgetRenderer({ widget, ...handlers }: { widget: Widget } & WidgetHandlers) {
  const { onAction, onInput, onFormSubmit, logsByStream } = handlers;
  const label = widget.label ?? widget.strict_title ?? "";

  switch (widget.type) {
    case "text":
      return <div className={`lcars-text-${widget.size}`}>{widget.content}</div>;

    case "markdown":
      return (
        <div
          className="lcars-md"
          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(marked.parse(widget.content, { async: false }) as string) }}
        />
      );

    case "status_tile":
      return (
        <div className="lcars-tile" data-status={widget.status}>
          <span className="lcars-tile-dot" />
          <span className="lcars-tile-label">{label || widget.status}</span>
          <span className="lcars-tile-value">{widget.value}</span>
        </div>
      );

    case "alert":
      return (
        <div className="lcars-alert" data-sev={widget.severity} data-blink={widget.blink}>
          {widget.message}
        </div>
      );

    case "progress_bar":
      return <Meter label={label} value={widget.value} min={0} max={100} />;

    case "gauge":
      return (
        <Meter
          label={label}
          value={widget.value}
          min={widget.min}
          max={widget.max}
          unit={widget.unit}
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
        <button className="lcars-btn" disabled={widget.disabled} onClick={() => onAction(widget.action_id, null)} type="button">
          {label || "Execute"}
        </button>
      );

    case "mic_button":
      return (
        <button className="lcars-btn" onClick={() => onAction(widget.action_id, null)} type="button">
          {label || "Record"}
        </button>
      );

    case "toggle":
    case "lcars_checkbox":
      return (
        <button
          className="lcars-btn"
          data-on={widget.checked}
          disabled={widget.disabled}
          onClick={() => onAction(widget.action_id, !widget.checked)}
          type="button"
        >
          {label} · {widget.checked ? "ON" : "OFF"}
        </button>
      );

    case "select":
    case "lcars_radio":
    case "lcars_radio_toggle":
      return (
        <div className="lcars-field">
          {label ? <label>{label}</label> : null}
          <select className="lcars-select" value={widget.value} onChange={(e) => onAction(widget.action_id, e.target.value)}>
            {widget.options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      );

    case "text_input":
      return (
        <div className="lcars-field">
          {label ? <label>{label}</label> : null}
          <input
            className="lcars-input"
            type={widget.password ? "password" : "text"}
            defaultValue={widget.value}
            placeholder={widget.placeholder ?? ""}
            onBlur={(e) => onInput(widget.id, e.target.value)}
          />
        </div>
      );

    case "number_input":
      return (
        <div className="lcars-field">
          {label ? <label>{label}</label> : null}
          <input
            className="lcars-input"
            type="number"
            defaultValue={widget.value}
            min={widget.min ?? undefined}
            max={widget.max ?? undefined}
            step={widget.step}
            onBlur={(e) => onInput(widget.id, e.target.value)}
          />
        </div>
      );

    case "form":
      return (
        <form
          className="lcars-panel"
          onSubmit={(e) => {
            e.preventDefault();
            onFormSubmit(widget.action_id, {});
          }}
        >
          {label ? <div className="lcars-panel-head"><span>{label}</span></div> : null}
          <div className="lcars-panel-body">
            {widget.children.map((child) => (
              <WidgetRenderer key={child.id} widget={child} {...handlers} />
            ))}
            <button className="lcars-btn" type="submit">
              {widget.submit_label}
            </button>
          </div>
        </form>
      );

    case "table":
      return (
        <table className="lcars-table">
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
                  <td key={ci}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      );

    case "log_viewer": {
      const lines = logsByStream[widget.stream_id] ?? [];
      return (
        <div className="lcars-log">
          {lines.length === 0 ? <p>// awaiting stream {widget.stream_id}</p> : lines.map((line, i) => <p key={i}>{line}</p>)}
        </div>
      );
    }

    case "line_chart":
    case "sparkline":
      return (
        <div className="lcars-chart">
          {label ? <div className="lcars-chart-title">{label}</div> : null}
          <Sparkline series={widget.series} />
        </div>
      );

    case "video_hls":
      return (
        <div className="lcars-panel">
          <div className="lcars-panel-head"><span>{label || "Feed"}</span><span className="lcars-tag">HLS</span></div>
          <div className="lcars-panel-body"><div className="lcars-text-mono">{widget.src}</div></div>
        </div>
      );

    case "lcars_header":
      return (
        <div className="lcars-panel-head">
          <span>{widget.text}</span>
        </div>
      );

    case "lcars_box":
    case "lcars_sweep":
    case "lcars_bracket": {
      const title = ("title" in widget && widget.title) || label || "";
      const main = gatherChildrenFromKeys(widget, MAIN_CHILD_KEYS);
      const mainIds = new Set(main.map((child) => child.id));
      const inputs = gatherChildrenFromKeys(widget, INPUT_CHILD_KEYS).filter((child) => !mainIds.has(child.id));
      const kids = main.length > 0 || inputs.length > 0 ? [...main, ...inputs] : gatherChildren(widget);
      // An empty framed field is a void — the spec forbids it. If a container
      // carries no children, it has no function, so it does not exist.
      if (kids.length === 0) {
        return null;
      }
      return (
        <section className="lcars-panel">
          {title ? (
            <div className="lcars-panel-head">
              <span>{title}</span>
              {"subtitle" in widget && widget.subtitle ? <span className="lcars-tag">{widget.subtitle}</span> : null}
            </div>
          ) : null}
          <div className="lcars-panel-body">
            {main.length > 0 && inputs.length > 0 ? (
              <div className="lcars-panel-cols">
                <div className="lcars-panel-col">
                  {main.map((child) => (
                    <WidgetRenderer key={child.id} widget={child} {...handlers} />
                  ))}
                </div>
                <div className="lcars-panel-col">
                  {inputs.map((child) => (
                    <WidgetRenderer key={child.id} widget={child} {...handlers} />
                  ))}
                </div>
              </div>
            ) : (
              kids.map((child) => <WidgetRenderer key={child.id} widget={child} {...handlers} />)
            )}
          </div>
        </section>
      );
    }

    default:
      return null;
  }
}
