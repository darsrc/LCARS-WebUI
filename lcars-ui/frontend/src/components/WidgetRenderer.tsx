import { useEffect, useMemo, useState, type CSSProperties } from "react";
import clsx from "clsx";
import DOMPurify from "dompurify";
import { marked } from "marked";

import { LineChartWidget } from "./charts/LineChartWidget";
import { SparklineWidget } from "./charts/SparklineWidget";
import { LcarsButtonControl } from "./controls/LcarsButtonControl";
import { LcarsGaugeControl } from "./controls/LcarsGaugeControl";
import { LcarsMetricControl } from "./controls/LcarsMetricControl";
import { LcarsProgressControl } from "./controls/LcarsProgressControl";
import { LcarsRadioControl } from "./controls/LcarsRadioControl";
import { LcarsSelectControl } from "./controls/LcarsSelectControl";
import { LcarsTableControl } from "./controls/LcarsTableControl";
import { LcarsTextInputControl } from "./controls/LcarsTextInputControl";
import { LcarsToggleControl } from "./controls/LcarsToggleControl";
import { LcarsBoxControl } from "./containers/LcarsBoxControl";
import { LcarsBracketControl } from "./containers/LcarsBracketControl";
import { LcarsHeaderControl } from "./containers/LcarsHeaderControl";
import { LcarsSweepControl } from "./containers/LcarsSweepControl";
import { MicButtonControl } from "./MicButtonControl";
import { useIsStrictMode } from "../context/VisualLanguageContext";
import { useTransientPulse } from "../hooks/useTransientPulse";
import { accentStyle, hiddenStyle, pillButtonClass, widgetCardClass } from "./widgetStyles";
import type {
  ButtonWidget,
  CheckboxWidget,
  FormChildWidget,
  FormWidget,
  GaugeWidget,
  NumberInputWidget,
  RadioToggleWidget,
  RadioWidget,
  SelectWidget,
  StatusTileWidget,
  ProgressBarWidget,
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

const styleForVisibility = (visible: boolean | undefined): CSSProperties | undefined => hiddenStyle(visible);

const withAccent = (
  color: Widget["color"] | undefined,
  visible: boolean | undefined,
  base?: CSSProperties,
): CSSProperties => {
  return {
    ...accentStyle(color),
    ...base,
    ...styleForVisibility(visible),
  };
};

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
    <label className={widgetCardClass(widget.color)} htmlFor={widget.id} style={withAccent(widget.color, widget.visible)}>
      <span className="widget-label">{widget.label ?? widget.id}</span>
      <input
        aria-label={widget.label ?? widget.id}
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
      return;
    }
    setValue(String(widget.value));
  };

  return (
    <label className={widgetCardClass(widget.color)} htmlFor={widget.id} style={withAccent(widget.color, widget.visible)}>
      <span className="widget-label">{widget.label ?? widget.id}</span>
      <input
        aria-label={widget.label ?? widget.id}
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
  widget: ToggleWidget | CheckboxWidget;
  onToggle: (checked: boolean) => void;
}) => {
  const [checked, setChecked] = useState(widget.checked);

  useEffect(() => {
    setChecked(widget.checked);
  }, [widget.checked]);

  return (
    <label
      className={clsx(widgetCardClass(widget.color), widget.type === "lcars_checkbox" ? "lcars-checkbox" : "lcars-toggle")}
      style={withAccent(widget.color, widget.visible)}
    >
      <span className="widget-label">{widget.label ?? widget.id}</span>
      <span className="lcars-toggle-control">
        <input
          aria-label={widget.label ?? widget.id}
          checked={checked}
          disabled={widget.disabled}
          onChange={(event) => {
            const next = event.target.checked;
            setChecked(next);
            onToggle(next);
          }}
          type="checkbox"
        />
        <span aria-hidden="true" className="lcars-toggle-track" />
        <span aria-hidden="true" className="lcars-toggle-thumb" />
      </span>
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
    <label className={widgetCardClass(widget.color)} style={withAccent(widget.color, widget.visible)}>
      <span className="widget-label">{widget.label ?? widget.id}</span>
      <select
        aria-label={widget.label ?? widget.id}
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

const RadioControl = ({
  widget,
  onSelect,
}: {
  widget: RadioWidget;
  onSelect: (value: string) => void;
}) => {
  const [value, setValue] = useState(widget.value);

  useEffect(() => {
    setValue(widget.value);
  }, [widget.value]);

  return (
    <div className={clsx(widgetCardClass(widget.color), "lcars-radio")} style={withAccent(widget.color, widget.visible)}>
      <span className="widget-label">{widget.label ?? widget.id}</span>
      <div className="lcars-radio-group">
        {widget.options.map((option) => (
          <label className="lcars-radio-option" key={option.value}>
            <input
              checked={value === option.value}
              disabled={widget.disabled}
              name={widget.id}
              onChange={() => {
                setValue(option.value);
                onSelect(option.value);
              }}
              type="radio"
              value={option.value}
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
};

const RadioToggleControl = ({
  widget,
  onSelect,
}: {
  widget: RadioToggleWidget;
  onSelect: (value: string) => void;
}) => {
  const [value, setValue] = useState(widget.value);

  useEffect(() => {
    setValue(widget.value);
  }, [widget.value]);

  return (
    <div className={clsx(widgetCardClass(widget.color), "lcars-radio-toggle")} style={withAccent(widget.color, widget.visible)}>
      <span className="widget-label">{widget.label ?? widget.id}</span>
      <div className="lcars-radio-toggle-group">
        {widget.options.map((option) => (
          <button
            className={clsx("lcars-radio-toggle-option", { active: value === option.value })}
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
    </div>
  );
};

const initialValueForChild = (child: FormChildWidget): unknown => {
  if (child.type === "text_input") {
    return child.value;
  }
  if (child.type === "number_input") {
    return child.value;
  }
  if (child.type === "toggle" || child.type === "lcars_checkbox") {
    return child.checked;
  }
  if (child.type === "select" || child.type === "lcars_radio" || child.type === "lcars_radio_toggle") {
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
  const isStrictMode = useIsStrictMode();

  if (child.type === "text_input") {
    if (isStrictMode) {
      return <LcarsTextInputControl onCommit={(value) => onValue(child.id, value)} widget={child} />;
    }
    return <TextInputControl onCommit={(value) => onValue(child.id, value)} widget={child} />;
  }
  if (child.type === "number_input") {
    if (isStrictMode) {
      return <LcarsTextInputControl onCommit={(value) => onValue(child.id, value)} widget={child} />;
    }
    return <NumberInputControl onCommit={(value) => onValue(child.id, value)} widget={child} />;
  }
  if (child.type === "toggle" || child.type === "lcars_checkbox") {
    if (isStrictMode) {
      return <LcarsToggleControl onToggle={(checked) => onValue(child.id, checked)} widget={child} />;
    }
    return <ToggleControl onToggle={(checked) => onValue(child.id, checked)} widget={child} />;
  }
  if (child.type === "select") {
    if (isStrictMode) {
      return <LcarsSelectControl onSelect={(value) => onValue(child.id, value)} widget={child} />;
    }
    return <SelectControl onSelect={(value) => onValue(child.id, value)} widget={child} />;
  }
  if (child.type === "lcars_radio") {
    if (isStrictMode) {
      return <LcarsRadioControl onSelect={(value) => onValue(child.id, value)} widget={child} />;
    }
    return <RadioControl onSelect={(value) => onValue(child.id, value)} widget={child} />;
  }
  if (child.type === "lcars_radio_toggle") {
    if (isStrictMode) {
      return <LcarsRadioControl onSelect={(value) => onValue(child.id, value)} widget={child} />;
    }
    return <RadioToggleControl onSelect={(value) => onValue(child.id, value)} widget={child} />;
  }

  return (
    <button
      className={pillButtonClass(child.color)}
      disabled={child.disabled}
      onClick={() => onValue(child.id, true)}
      style={accentStyle(child.color)}
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
      className={clsx(widgetCardClass(widget.color), "lcars-form")}
      onSubmit={(event) => {
        event.preventDefault();
        onFormSubmit(widget.action_id, values);
      }}
      style={withAccent(widget.color, widget.visible)}
    >
      <h3 className="lcars-form-header">{widget.label ?? widget.id}</h3>
      <div className="lcars-form-grid">
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
      <div className="lcars-form-footer">
        <button
          className={clsx("lcars-form-submit", pillButtonClass(widget.color))}
          disabled={widget.disabled}
          style={accentStyle(widget.color)}
          type="submit"
        >
          {widget.submit_label}
        </button>
      </div>
    </form>
  );
};

const gaugeState = (widget: GaugeWidget): "normal" | "warn" | "crit" => {
  if (widget.crit_threshold !== null && widget.crit_threshold !== undefined && widget.value >= widget.crit_threshold) {
    return "crit";
  }
  if (widget.warn_threshold !== null && widget.warn_threshold !== undefined && widget.value >= widget.warn_threshold) {
    return "warn";
  }
  return "normal";
};

const GaugeControl = ({ widget }: { widget: GaugeWidget }) => {
  const min = widget.min;
  const max = widget.max <= widget.min ? widget.min + 1 : widget.max;
  const clamped = Math.min(max, Math.max(min, widget.value));
  const pct = ((clamped - min) / (max - min)) * 100;
  const radius = 48;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - pct / 100);
  const state = gaugeState(widget);
  const isPulsing = useTransientPulse(widget.value);

  return (
    <article className={clsx(widgetCardClass(widget.color), { "lcars-pulse": isPulsing })} style={withAccent(widget.color, widget.visible)}>
      <span className="widget-label">{widget.label ?? widget.id}</span>
      <div className="lcars-gauge">
        <svg className="lcars-gauge-svg" viewBox="0 0 120 120">
          <circle className="lcars-gauge-track" cx="60" cy="60" r={radius} />
          <circle
            className={clsx("lcars-gauge-fill", {
              "state-warn": state === "warn",
              "state-crit": state === "crit",
            })}
            cx="60"
            cy="60"
            r={radius}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
          />
        </svg>
        <div className="lcars-gauge-value">
          <strong>{clamped.toFixed(1)}</strong>
          {widget.unit ? <span>{widget.unit}</span> : null}
        </div>
      </div>
    </article>
  );
};

const StatusTileControl = ({ widget }: { widget: StatusTileWidget }) => {
  const isPulsing = useTransientPulse(`${widget.value}:${widget.status}`);
  return (
    <article
      className={clsx(widgetCardClass(widget.color), "lcars-status-tile", `lcars-status-${widget.status}`, {
        "lcars-pulse": isPulsing,
      })}
      style={withAccent(widget.color, widget.visible)}
    >
      <span className="widget-label">{widget.label ?? widget.id}</span>
      <strong className="status-value">{widget.value}</strong>
      <span className="lcars-status-line">
        <span className="lcars-status-dot" />
        <span className="widget-meta">{widget.status}</span>
      </span>
    </article>
  );
};

const ProgressControl = ({ widget }: { widget: ProgressBarWidget }) => {
  const clamped = Math.min(100, Math.max(0, widget.value));
  const isPulsing = useTransientPulse(clamped);

  return (
    <article className={clsx(widgetCardClass(widget.color), { "lcars-pulse": isPulsing })} style={withAccent(widget.color, widget.visible)}>
      <span className="widget-label">{widget.label ?? widget.id}</span>
      <div
        aria-valuemax={100}
        aria-valuemin={0}
        aria-valuenow={clamped}
        className="lcars-progress-track"
        role="progressbar"
      >
        <div className="lcars-progress-fill" style={{ width: `${clamped}%` }} />
        {widget.show_label ? <span className="lcars-progress-label">{clamped.toFixed(0)}%</span> : null}
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
    <article className={widgetCardClass(widget.color)} style={withAccent(widget.color, widget.visible)}>
      {widget.label ? <span className="widget-label">{widget.label}</span> : null}
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
  const isStrictMode = useIsStrictMode();

  const renderNestedWidget = (nestedWidget: Widget) => (
    <WidgetRenderer
      key={nestedWidget.id}
      logsByStream={logsByStream}
      onAction={onAction}
      onAudioUpload={onAudioUpload}
      onFormSubmit={onFormSubmit}
      onInput={onInput}
      widget={nestedWidget}
    />
  );

  switch (widget.type) {
    case "text": {
      const textClass =
        widget.size === "h1"
          ? "lcars-text-h1"
          : widget.size === "h2"
            ? "lcars-text-h2"
            : widget.size === "mono"
              ? "lcars-text-mono"
              : "lcars-text-body";

      return (
        <article className={clsx(widgetCardClass(widget.color), "lcars-widget-text")} style={withAccent(widget.color, widget.visible)}>
          {widget.size === "h1" ? <h1 className={textClass}>{widget.content}</h1> : null}
          {widget.size === "h2" ? <h2 className={textClass}>{widget.content}</h2> : null}
          {widget.size === "body" ? <p className={textClass}>{widget.content}</p> : null}
          {widget.size === "mono" ? <code className={textClass}>{widget.content}</code> : null}
        </article>
      );
    }
    case "lcars_header":
      return <LcarsHeaderControl widget={widget} />;
    case "markdown":
      return <MarkdownControl widget={widget} />;
    case "status_tile":
      if (isStrictMode) {
        return <LcarsMetricControl widget={widget} />;
      }
      return <StatusTileControl widget={widget} />;
    case "alert":
      return (
        <article
          className={clsx(widgetCardClass(widget.color), "lcars-alert", `lcars-alert-${widget.severity}`, {
            "is-blinking": widget.blink,
          })}
          role="alert"
          style={withAccent(widget.color, widget.visible)}
        >
          <strong>{widget.severity} alert</strong>
          <p>{widget.message}</p>
        </article>
      );
    case "progress_bar":
      if (isStrictMode) {
        return <LcarsProgressControl widget={widget} />;
      }
      return <ProgressControl widget={widget} />;
    case "button":
      if (isStrictMode) {
        return <LcarsButtonControl onAction={onAction} widget={widget} />;
      }
      return (
        <div className={widgetCardClass(widget.color)} style={withAccent(widget.color, widget.visible)}>
          <button
            className={pillButtonClass(widget.color)}
            disabled={widget.disabled}
            onClick={() => onAction(widget.action_id, null)}
            style={accentStyle(widget.color)}
            type="button"
          >
            {widget.label ?? widget.id}
          </button>
        </div>
      );
    case "toggle":
    case "lcars_checkbox":
      if (isStrictMode) {
        return <LcarsToggleControl onToggle={(checked) => onAction(widget.action_id, checked)} widget={widget} />;
      }
      return <ToggleControl onToggle={(checked) => onAction(widget.action_id, checked)} widget={widget} />;
    case "select":
      if (isStrictMode) {
        return <LcarsSelectControl onSelect={(value) => onAction(widget.action_id, value)} widget={widget} />;
      }
      return <SelectControl onSelect={(value) => onAction(widget.action_id, value)} widget={widget} />;
    case "lcars_radio":
      if (isStrictMode) {
        return <LcarsRadioControl onSelect={(value) => onAction(widget.action_id, value)} widget={widget} />;
      }
      return <RadioControl onSelect={(value) => onAction(widget.action_id, value)} widget={widget} />;
    case "lcars_radio_toggle":
      if (isStrictMode) {
        return <LcarsRadioControl onSelect={(value) => onAction(widget.action_id, value)} widget={widget} />;
      }
      return <RadioToggleControl onSelect={(value) => onAction(widget.action_id, value)} widget={widget} />;
    case "text_input":
      if (isStrictMode) {
        return <LcarsTextInputControl onCommit={(value) => onInput(widget.id, String(value))} widget={widget} />;
      }
      return <TextInputControl onCommit={(value) => onInput(widget.id, value)} widget={widget} />;
    case "number_input":
      if (isStrictMode) {
        return <LcarsTextInputControl onCommit={(value) => onInput(widget.id, String(value))} widget={widget} />;
      }
      return <NumberInputControl onCommit={(value) => onInput(widget.id, String(value))} widget={widget} />;
    case "form":
      return <FormControl onFormSubmit={onFormSubmit} widget={widget} />;
    case "table":
      if (isStrictMode) {
        return <LcarsTableControl widget={widget} />;
      }
      return (
        <article className={widgetCardClass(widget.color)} style={withAccent(widget.color, widget.visible)}>
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
        <article className={widgetCardClass(widget.color)} style={withAccent(widget.color, widget.visible)}>
          <span className="widget-label">{widget.label ?? widget.id}</span>
          <LineChartWidget widget={widget} />
        </article>
      );
    case "sparkline":
      return (
        <article className={widgetCardClass(widget.color)} style={withAccent(widget.color, widget.visible)}>
          <span className="widget-label">{widget.label ?? widget.id}</span>
          <SparklineWidget widget={widget} />
        </article>
      );
    case "gauge":
      if (isStrictMode) {
        return <LcarsGaugeControl widget={widget} />;
      }
      return <GaugeControl widget={widget} />;
    case "log_viewer":
      return (
        <article className={widgetCardClass(widget.color)} style={withAccent(widget.color, widget.visible)}>
          <span className="widget-label">{widget.label ?? widget.id}</span>
          <pre className="lcars-log-window">{(logsByStream[widget.stream_id] ?? []).join("\n")}</pre>
        </article>
      );
    case "video_hls":
      return (
        <article className={widgetCardClass(widget.color)} style={withAccent(widget.color, widget.visible)}>
          <span className="widget-label">{widget.label ?? widget.id}</span>
          <video
            autoPlay={widget.autoplay}
            className="lcars-video-window"
            controls
            muted={widget.muted}
            src={widget.src}
          />
        </article>
      );
    case "mic_button":
      return (
        <MicButtonControl
          cardClass={widgetCardClass}
          onAudioUpload={onAudioUpload}
          style={withAccent(widget.color, widget.visible)}
          widget={widget}
        />
      );
    case "lcars_box":
      return <LcarsBoxControl renderWidget={renderNestedWidget} widget={widget} />;
    case "lcars_sweep":
      return <LcarsSweepControl renderWidget={renderNestedWidget} widget={widget} />;
    case "lcars_bracket":
      return <LcarsBracketControl renderWidget={renderNestedWidget} widget={widget} />;
    default:
      return (
        <article className={widgetCardClass(undefined)}>
          Unsupported widget: {(widget as { type: string }).type}
        </article>
      );
  }
};

export const isActionWidget = (
  widget: Widget,
): widget is ButtonWidget | ToggleWidget | CheckboxWidget | SelectWidget | RadioWidget | RadioToggleWidget =>
  widget.type === "button" ||
  widget.type === "toggle" ||
  widget.type === "lcars_checkbox" ||
  widget.type === "select" ||
  widget.type === "lcars_radio" ||
  widget.type === "lcars_radio_toggle";
