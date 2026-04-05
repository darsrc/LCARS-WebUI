import { type CSSProperties } from "react";
import clsx from "clsx";
import DOMPurify from "dompurify";
import { marked } from "marked";

import { LineChartWidget } from "./charts/LineChartWidget";
import { SparklineWidget } from "./charts/SparklineWidget";
import { LcarsBoxControl } from "./containers/LcarsBoxControl";
import { LcarsBracketControl } from "./containers/LcarsBracketControl";
import { LcarsHeaderControl } from "./containers/LcarsHeaderControl";
import { LcarsSweepControl } from "./containers/LcarsSweepControl";
import { MicButtonControl } from "./MicButtonControl";
import { useTransientPulse } from "../hooks/useTransientPulse";
import { accentStyle, hiddenStyle, pillButtonClass, widgetCardClass } from "./widgetStyles";
import { resolveStrictSurfaceTitle } from "./primitives/lcarsStrictTitlePrimitives";
import type { Widget } from "../types/contract";

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
        <div className={clsx(widgetCardClass(widget.color), "lcars-strict-text")} style={withAccent(widget.color, widget.visible)}>
          {widget.size === "h1" ? <h1 className={textClass}>{widget.content}</h1> : null}
          {widget.size === "h2" ? <h2 className={textClass}>{widget.content}</h2> : null}
          {widget.size === "body" ? <p className={textClass}>{widget.content}</p> : null}
          {widget.size === "mono" ? <code className={textClass}>{widget.content}</code> : null}
        </div>
      );
    }
    case "lcars_header":
      return <LcarsHeaderControl widget={widget} />;
    case "markdown": {
      const rendered = marked.parse(widget.content);
      const html = typeof rendered === "string" ? rendered : "";
      const sanitized = DOMPurify.sanitize(html);
      return (
        <div className={clsx(widgetCardClass(widget.color), "lcars-strict-markdown")} style={withAccent(widget.color, widget.visible)} dangerouslySetInnerHTML={{ __html: sanitized }} />
      );
    }
    case "status_tile":
      return (
        <article className={clsx(widgetCardClass(widget.color), "lcars-status-tile", `lcars-status-${widget.status}`, {
          "lcars-pulse": useTransientPulse(`${widget.value}:${widget.status}`),
        })} style={withAccent(widget.color, widget.visible)}>
          <span className="widget-label">{widget.label ?? widget.id}</span>
          <strong className="status-value">{widget.value}</strong>
          <span className="lcars-status-line">
            <span className="lcars-status-dot" />
            <span className="widget-meta">{widget.status}</span>
          </span>
        </article>
      );
    case "alert":
      return (
        <article
          className={clsx(widgetCardClass(widget.color), `lcars-alert-${widget.severity}`, {
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
      const clamped = Math.min(100, Math.max(0, widget.value));
      return (
        <article
          className={clsx(widgetCardClass(widget.color), {
            "lcars-pulse": useTransientPulse(clamped),
          })}
          style={withAccent(widget.color, widget.visible)}
        >
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
    case "button":
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
      return (
        <label
          className={clsx(widgetCardClass(widget.color), widget.type === "lcars_checkbox" ? "lcars-checkbox" : "lcars-toggle")}
          style={withAccent(widget.color, widget.visible)}
        >
          <span className="widget-label">{widget.label ?? widget.id}</span>
          <span className="lcars-toggle-control">
            <input
              aria-label={widget.label ?? widget.id}
              checked={widget.checked}
              disabled={widget.disabled}
              onChange={(event) => {
                const next = event.target.checked;
                onAction(widget.action_id, next);
              }}
              type="checkbox"
            />
            <span aria-hidden="true" className="lcars-toggle-track" />
            <span aria-hidden="true" className="lcars-toggle-thumb" />
          </span>
        </label>
      );
    case "select":
      return (
        <div className={widgetCardClass(widget.color)} style={withAccent(widget.color, widget.visible)}>
          <span className="widget-label">{widget.label ?? widget.id}</span>
          <select
            aria-label={widget.label ?? widget.id}
            className="lcars-select"
            disabled={widget.disabled}
            onChange={(event) => {
              const next = event.target.value;
              onAction(widget.action_id, next);
            }}
            value={widget.value}
          >
            {widget.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      );
    case "lcars_radio":
      return (
        <div className={clsx(widgetCardClass(widget.color), "lcars-radio")} style={withAccent(widget.color, widget.visible)}>
          <span className="widget-label">{widget.label ?? widget.id}</span>
          <div className="lcars-radio-group">
            {widget.options.map((option) => (
              <label className="lcars-radio-option" key={option.value}>
                <input
                  checked={widget.value === option.value}
                  disabled={widget.disabled}
                  name={widget.id}
                  onChange={() => {
                    onAction(widget.action_id, option.value);
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
    case "lcars_radio_toggle":
      return (
        <div className={clsx(widgetCardClass(widget.color), "lcars-radio-toggle")} style={withAccent(widget.color, widget.visible)}>
          <span className="widget-label">{widget.label ?? widget.id}</span>
          <div className="lcars-radio-toggle-group">
            {widget.options.map((option) => (
              <button
                className={clsx("lcars-radio-toggle-option", { active: widget.value === option.value })}
                disabled={widget.disabled}
                key={option.value}
                onClick={() => {
                  onAction(widget.action_id, option.value);
                }}
                type="button"
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      );
    case "text_input":
      return (
        <label className={widgetCardClass(widget.color)} htmlFor={widget.id} style={withAccent(widget.color, widget.visible)}>
          <span className="widget-label">{widget.label ?? widget.id}</span>
          <input
            aria-label={widget.label ?? widget.id}
            className="lcars-input"
            disabled={widget.disabled}
            id={widget.id}
            onBlur={(event) => onInput(widget.id, event.target.value)}
            onChange={(event) => onInput(widget.id, event.target.value)}
            pattern={widget.regex ?? undefined}
            placeholder={widget.placeholder ?? ""}
            type={widget.password ? "password" : "text"}
            value={widget.value}
          />
        </label>
      );
    case "number_input":
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
            onBlur={(event) => onInput(widget.id, event.target.value)}
            onChange={(event) => onInput(widget.id, event.target.value)}
            placeholder={widget.placeholder ?? ""}
            step={widget.step}
            type="number"
            value={String(widget.value)}
          />
        </label>
      );
    case "form":
      return (
        <form
          className={clsx(widgetCardClass(widget.color), "lcars-form", {
            "lcars-form-strict": true,
          })}
          onSubmit={(event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget as HTMLFormElement);
            const values: Record<string, unknown> = {};
            formData.forEach((value, key) => {
              values[key] = value;
            });
            onFormSubmit(widget.action_id, values);
          }}
          style={withAccent(widget.color, widget.visible)}
        >
          {widget.children.map((child) => (
            <div key={child.id}>
              {child.label ? <span className="widget-label">{child.label}</span> : null}
              {renderNestedWidget(child)}
            </div>
          ))}
        </form>
      );
    case "table":
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
        <div className={clsx(widgetCardClass(widget.color), "lcars-strict-chart")} style={withAccent(widget.color, widget.visible)}>
          <LineChartWidget frameTitle={resolveStrictSurfaceTitle(widget)} widget={widget} />
        </div>
      );
    case "sparkline":
      return (
        <div className={clsx(widgetCardClass(widget.color), "lcars-strict-chart")} style={withAccent(widget.color, widget.visible)}>
          <SparklineWidget frameTitle={resolveStrictSurfaceTitle(widget)} widget={widget} />
        </div>
      );
    case "gauge": {
      const gw = widget as import("../types/contract").GaugeWidget;
      const range = gw.max - gw.min || 1;
      const pct = Math.min(1, Math.max(0, (gw.value - gw.min) / range));
      const circumference = 2 * Math.PI * 45;
      const offset = circumference * (1 - pct);
      const gaugeState =
        gw.crit_threshold != null && gw.value >= gw.crit_threshold
          ? "state-crit"
          : gw.warn_threshold != null && gw.value >= gw.warn_threshold
            ? "state-warn"
            : "";
      return (
        <div className={clsx(widgetCardClass(widget.color), "lcars-gauge")} style={withAccent(widget.color, widget.visible)}>
          <span className="widget-label">{gw.label ?? gw.id}</span>
          <svg className="lcars-gauge-svg" viewBox="0 0 100 100">
            <circle className="lcars-gauge-track" cx="50" cy="50" r="45" />
            <circle
              className={clsx("lcars-gauge-fill", gaugeState)}
              cx="50"
              cy="50"
              r="45"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
            />
          </svg>
          <div className="lcars-gauge-value">
            <strong>{gw.value}</strong>
            {gw.unit ? <span>{gw.unit}</span> : null}
          </div>
        </div>
      );
    }
    case "log_viewer":
      return (
        <div className={clsx(widgetCardClass(widget.color), "lcars-strict-log-viewer")} style={withAccent(widget.color, widget.visible)}>
          <pre className="lcars-log-window">{((logsByStream[widget.stream_id] ?? []).join("\n"))}</pre>
        </div>
      );
    case "video_hls":
      return (
        <div className={clsx(widgetCardClass(widget.color), "lcars-video-window")} style={withAccent(widget.color, widget.visible)}>
          <video
            autoPlay={widget.autoplay}
            className="lcars-video-window"
            controls
            muted={widget.muted}
            src={widget.src}
          />
        </div>
      );
    case "mic_button":
      return (
        <MicButtonControl
          widget={widget as import("../types/contract").MicButtonWidget}
          onAudioUpload={onAudioUpload}
          cardClass={widgetCardClass}
          style={withAccent(widget.color, widget.visible)}
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
        <div className={widgetCardClass(undefined)}>
          Unsupported widget: {(widget as { type: string }).type}
        </div>
      );
  }
};