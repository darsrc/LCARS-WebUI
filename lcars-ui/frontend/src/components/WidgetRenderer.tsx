import { useEffect, useMemo, useState, type CSSProperties } from "react";
import DOMPurify from "dompurify";
import { marked } from "marked";

import { LineChartWidget } from "./charts/LineChartWidget";
import { SparklineWidget } from "./charts/SparklineWidget";
import { MicButtonControl } from "./MicButtonControl";
import type {
  ButtonWidget,
  FormChildWidget,
  FormWidget,
  GaugeWidget,
  NumberInputWidget,
  SelectWidget,
  TextInputWidget,
  ToggleWidget,
  Widget,
} from "../types/contract";

interface WidgetRendererProps {
  widget: Widget;
  logsByStream: Record<string, string[]>;
  onAction: (actionId: string, value: unknown) => void;
  onInput: (id: string, value: string) => void;
  onFormSubmit: (id: string, data: Record<string, unknown>) => void;
  onAudioUpload: (widget: { upload_url: string; action_id: string }, file: File) => Promise<void>;
}

const colorClass = (color?: string | null): string => {
  switch (color) {
    case "orange":
      return "widget-orange";
    case "red":
      return "widget-red";
    case "blue":
      return "widget-blue";
    case "purple":
      return "widget-purple";
    case "white":
      return "widget-white";
    case "yellow":
      return "widget-yellow";
    default:
      return "widget-default";
  }
};

const cardClass = (color?: string | null): string => `lcars-card ${colorClass(color)}`;

const applyVisibility = (visible: boolean | undefined): CSSProperties | undefined =>
  visible === false ? { display: "none" } : undefined;

const TextInputControl = ({
  widget,
  onCommit,
}: {
  widget: TextInputWidget;
  onCommit: (value: string) => void;
}) => {
  const [value, setValue] = useState(widget.value);
  useEffect(() => {
    setValue(widget.value);
  }, [widget.value]);
  return (
    <label className={cardClass(widget.color)} style={applyVisibility(widget.visible)}>
      <span className="widget-label">{widget.label ?? widget.id}</span>
      <input
        className="lcars-input"
        disabled={widget.disabled}
        id={widget.id}
        onBlur={() => onCommit(value)}
        onChange={(event) => setValue(event.target.value)}
        pattern={widget.regex ?? undefined}
        placeholder={widget.placeholder ?? ""}
        type={widget.password ? "password" : "text"}
        value={value}
      />
    </label>
  );
};

const NumberInputControl = ({
  widget,
  onCommit,
}: {
  widget: NumberInputWidget;
  onCommit: (value: number) => void;
}) => {
  const [value, setValue] = useState(String(widget.value));

  useEffect(() => {
    setValue(String(widget.value));
  }, [widget.value]);

  const commit = (): void => {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      onCommit(parsed);
      setValue(String(parsed));
    } else {
      setValue(String(widget.value));
    }
  };

  return (
    <label className={cardClass(widget.color)} style={applyVisibility(widget.visible)}>
      <span className="widget-label">{widget.label ?? widget.id}</span>
      <input
        className="lcars-input"
        disabled={widget.disabled}
        id={widget.id}
        max={widget.max ?? undefined}
        min={widget.min ?? undefined}
        onBlur={commit}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            commit();
          }
        }}
        placeholder={widget.placeholder ?? ""}
        step={widget.step}
        type="number"
        value={value}
      />
    </label>
  );
};

const ToggleControl = ({
  widget,
  onToggle,
}: {
  widget: ToggleWidget;
  onToggle: (checked: boolean) => void;
}) => {
  const [checked, setChecked] = useState(widget.checked);
  useEffect(() => {
    setChecked(widget.checked);
  }, [widget.checked]);
  return (
    <label className={`${cardClass(widget.color)} lcars-toggle`} style={applyVisibility(widget.visible)}>
      <span className="widget-label">{widget.label ?? widget.id}</span>
      <input
        checked={checked}
        disabled={widget.disabled}
        onChange={(event) => {
          const next = event.target.checked;
          setChecked(next);
          onToggle(next);
        }}
        type="checkbox"
      />
    </label>
  );
};

const SelectControl = ({
  widget,
  onSelect,
}: {
  widget: SelectWidget;
  onSelect: (value: string) => void;
}) => {
  const [value, setValue] = useState(widget.value);
  useEffect(() => {
    setValue(widget.value);
  }, [widget.value]);
  return (
    <label className={cardClass(widget.color)} style={applyVisibility(widget.visible)}>
      <span className="widget-label">{widget.label ?? widget.id}</span>
      <select
        className="lcars-select"
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
    </label>
  );
};

const initialValueForChild = (child: FormChildWidget): unknown => {
  if (child.type === "text_input") {
    return child.value;
  }
  if (child.type === "number_input") {
    return child.value;
  }
  if (child.type === "toggle") {
    return child.checked;
  }
  if (child.type === "select") {
    return child.value;
  }
  return null;
};

const FormChildControl = ({
  child,
  onValue,
}: {
  child: FormChildWidget;
  onValue: (id: string, value: unknown) => void;
}) => {
  if (child.type === "text_input") {
    return <TextInputControl onCommit={(value) => onValue(child.id, value)} widget={child} />;
  }
  if (child.type === "number_input") {
    return <NumberInputControl onCommit={(value) => onValue(child.id, value)} widget={child} />;
  }
  if (child.type === "toggle") {
    return <ToggleControl onToggle={(checked) => onValue(child.id, checked)} widget={child} />;
  }
  if (child.type === "select") {
    return <SelectControl onSelect={(value) => onValue(child.id, value)} widget={child} />;
  }
  return (
    <button
      className={`${cardClass(child.color)} lcars-button`}
      disabled={child.disabled}
      onClick={() => onValue(child.id, true)}
      type="button"
    >
      {child.label ?? child.id}
    </button>
  );
};

const FormControl = ({
  widget,
  onFormSubmit,
}: {
  widget: FormWidget;
  onFormSubmit: (id: string, data: Record<string, unknown>) => void;
}) => {
  const [values, setValues] = useState<Record<string, unknown>>(
    Object.fromEntries(widget.children.map((child) => [child.id, initialValueForChild(child)])),
  );
  useEffect(() => {
    setValues(Object.fromEntries(widget.children.map((child) => [child.id, initialValueForChild(child)])));
  }, [widget.children]);
  return (
    <form
      className={cardClass(widget.color)}
      onSubmit={(event) => {
        event.preventDefault();
        onFormSubmit(widget.action_id, values);
      }}
    >
      <h3>{widget.label ?? widget.id}</h3>
      <div className="form-grid">
        {widget.children.map((child) => (
          <FormChildControl
            child={child}
            key={child.id}
            onValue={(id, value) =>
              setValues((current) => ({
                ...current,
                [id]: value,
              }))
            }
          />
        ))}
      </div>
      <button className="lcars-button" disabled={widget.disabled} type="submit">
        {widget.submit_label}
      </button>
    </form>
  );
};

const gaugeColor = (widget: GaugeWidget): string => {
  const value = widget.value;
  if (widget.crit_threshold !== null && widget.crit_threshold !== undefined && value >= widget.crit_threshold) {
    return "#dc514c";
  }
  if (widget.warn_threshold !== null && widget.warn_threshold !== undefined && value >= widget.warn_threshold) {
    return "#f7d060";
  }
  if (widget.color === "red") {
    return "#dc514c";
  }
  if (widget.color === "blue") {
    return "#65a9ff";
  }
  if (widget.color === "purple") {
    return "#ad8bff";
  }
  if (widget.color === "white") {
    return "#f2f4f8";
  }
  if (widget.color === "yellow") {
    return "#f7d060";
  }
  return "#f09a2f";
};

const GaugeControl = ({ widget }: { widget: GaugeWidget }) => {
  const min = widget.min;
  const max = widget.max <= widget.min ? widget.min + 1 : widget.max;
  const clamped = Math.min(max, Math.max(min, widget.value));
  const pct = ((clamped - min) / (max - min)) * 100;
  const radius = 48;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - pct / 100);
  const color = gaugeColor(widget);

  return (
    <article className={cardClass(widget.color)}>
      <span className="widget-label">{widget.label ?? widget.id}</span>
      <div className="gauge-wrap">
        <svg className="gauge-svg" viewBox="0 0 120 120">
          <circle className="gauge-track" cx="60" cy="60" r={radius} />
          <circle
            className="gauge-fill"
            cx="60"
            cy="60"
            r={radius}
            stroke={color}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
          />
        </svg>
        <div className="gauge-value">
          <strong>{clamped.toFixed(1)}</strong>
          {widget.unit ? <span>{widget.unit}</span> : null}
        </div>
      </div>
    </article>
  );
};

const MarkdownControl = ({ widget }: { widget: Extract<Widget, { type: "markdown" }> }) => {
  const rendered = useMemo(() => {
    const parsed = marked.parse(widget.content);
    const html = typeof parsed === "string" ? parsed : "";
    return DOMPurify.sanitize(html);
  }, [widget.content]);

  return (
    <article className={cardClass(widget.color)}>
      <div className="markdown-body" dangerouslySetInnerHTML={{ __html: rendered }} />
    </article>
  );
};

export const WidgetRenderer = ({
  widget,
  logsByStream,
  onAction,
  onInput,
  onFormSubmit,
  onAudioUpload,
}: WidgetRendererProps) => {
  if (widget.visible === false) {
    return null;
  }

  switch (widget.type) {
    case "text":
      return (
        <article className={cardClass(widget.color)}>
          {widget.size === "h1" ? <h1>{widget.content}</h1> : null}
          {widget.size === "h2" ? <h2>{widget.content}</h2> : null}
          {widget.size === "body" ? <p>{widget.content}</p> : null}
          {widget.size === "mono" ? <code>{widget.content}</code> : null}
        </article>
      );
    case "markdown":
      return <MarkdownControl widget={widget} />;
    case "status_tile":
      return (
        <article className={`${cardClass(widget.color)} status-${widget.status}`}>
          <span className="widget-label">{widget.label ?? widget.id}</span>
          <strong className="status-value">{widget.value}</strong>
          <span className="widget-meta">{widget.status.toUpperCase()}</span>
        </article>
      );
    case "alert":
      return (
        <article className={`${cardClass(widget.color)} ${widget.blink ? "is-blinking" : ""}`}>
          <strong>{widget.severity.toUpperCase()} ALERT</strong>
          <p>{widget.message}</p>
        </article>
      );
    case "progress_bar": {
      const clamped = Math.min(100, Math.max(0, widget.value));
      return (
        <article className={cardClass(widget.color)}>
          <span className="widget-label">{widget.label ?? widget.id}</span>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${clamped}%` }} />
            {widget.show_label ? <span className="progress-text">{clamped.toFixed(0)}%</span> : null}
          </div>
        </article>
      );
    }
    case "button":
      return (
        <button
          className={`${cardClass(widget.color)} lcars-button`}
          disabled={widget.disabled}
          onClick={() => onAction(widget.action_id, null)}
          type="button"
        >
          {widget.label ?? widget.id}
        </button>
      );
    case "toggle":
      return <ToggleControl onToggle={(checked) => onAction(widget.action_id, checked)} widget={widget} />;
    case "select":
      return <SelectControl onSelect={(value) => onAction(widget.action_id, value)} widget={widget} />;
    case "text_input":
      return <TextInputControl onCommit={(value) => onInput(widget.id, value)} widget={widget} />;
    case "number_input":
      return <NumberInputControl onCommit={(value) => onInput(widget.id, String(value))} widget={widget} />;
    case "form":
      return <FormControl onFormSubmit={onFormSubmit} widget={widget} />;
    case "table":
      return (
        <article className={cardClass(widget.color)}>
          <span className="widget-label">{widget.label ?? widget.id}</span>
          <table className="lcars-table">
            <thead>
              <tr>
                {widget.headers.map((header) => (
                  <th key={header}>{header}</th>
                ))}
              </tr>
            </thead>
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
        </article>
      );
    case "line_chart":
      return (
        <article className={cardClass(widget.color)}>
          <span className="widget-label">{widget.label ?? widget.id}</span>
          <LineChartWidget widget={widget} />
        </article>
      );
    case "sparkline":
      return (
        <article className={cardClass(widget.color)}>
          <span className="widget-label">{widget.label ?? widget.id}</span>
          <SparklineWidget widget={widget} />
        </article>
      );
    case "gauge":
      return <GaugeControl widget={widget} />;
    case "log_viewer":
      return (
        <article className={cardClass(widget.color)}>
          <span className="widget-label">{widget.label ?? widget.id}</span>
          <pre className="log-window">{(logsByStream[widget.stream_id] ?? []).join("\n")}</pre>
        </article>
      );
    case "video_hls":
      return (
        <article className={cardClass(widget.color)}>
          <span className="widget-label">{widget.label ?? widget.id}</span>
          <video
            autoPlay={widget.autoplay}
            className="video-window"
            controls
            muted={widget.muted}
            src={widget.src}
          />
        </article>
      );
    case "mic_button":
      return (
        <MicButtonControl
          cardClass={cardClass}
          onAudioUpload={onAudioUpload}
          style={applyVisibility(widget.visible)}
          widget={widget}
        />
      );
    default:
      return (
        <article className="lcars-card widget-default">
          Unsupported widget: {(widget as { type: string }).type}
        </article>
      );
  }
};

export const isActionWidget = (widget: Widget): widget is ButtonWidget | ToggleWidget | SelectWidget =>
  widget.type === "button" || widget.type === "toggle" || widget.type === "select";
