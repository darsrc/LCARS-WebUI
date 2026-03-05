import { useEffect, useRef, useState } from "react";

import type {
  ButtonWidget,
  FormChildWidget,
  FormWidget,
  MicButtonWidget,
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
  onAudioUpload: (widget: MicButtonWidget, file: File) => Promise<void>;
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

const applyVisibility = (visible: boolean | undefined): React.CSSProperties | undefined =>
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
        id={widget.id}
        disabled={widget.disabled}
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
    return (
      <TextInputControl
        onCommit={(value) => onValue(child.id, value)}
        widget={child}
      />
    );
  }
  if (child.type === "toggle") {
    return (
      <ToggleControl
        onToggle={(checked) => onValue(child.id, checked)}
        widget={child}
      />
    );
  }
  if (child.type === "select") {
    return (
      <SelectControl
        onSelect={(value) => onValue(child.id, value)}
        widget={child}
      />
    );
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

const MicButtonControl = ({
  widget,
  onAudioUpload,
}: {
  widget: MicButtonWidget;
  onAudioUpload: (widget: MicButtonWidget, file: File) => Promise<void>;
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<string>("Idle");
  return (
    <div className={cardClass(widget.color)} style={applyVisibility(widget.visible)}>
      <span className="widget-label">{widget.label ?? widget.id}</span>
      <div className="mic-controls">
        <button
          className="lcars-button"
          disabled={widget.disabled}
          onClick={() => inputRef.current?.click()}
          type="button"
        >
          Upload Audio
        </button>
        <span className="widget-meta">{status}</span>
      </div>
      <input
        accept="audio/*"
        hidden
        onChange={async (event) => {
          const file = event.target.files?.[0];
          if (!file) {
            return;
          }
          setStatus("Uploading...");
          try {
            await onAudioUpload(widget, file);
            setStatus("Queued");
          } catch {
            setStatus("Upload failed");
          } finally {
            event.target.value = "";
          }
        }}
        ref={inputRef}
        type="file"
      />
    </div>
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
              {widget.rows.map((row) => (
                <tr key={row.id}>
                  {row.cells.map((cell, index) => (
                    <td key={`${row.id}-${index + 1}`}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </article>
      );
    case "line_chart":
    case "sparkline":
      return (
        <article className={cardClass(widget.color)}>
          <span className="widget-label">{widget.label ?? widget.id}</span>
          {widget.series.map((series) => (
            <div className="series" key={series.name}>
              <strong>{series.name}</strong>
              <ul className="series-points">
                {series.data.map((point, idx) => (
                  <li key={`${series.name}-${idx + 1}`}>
                    {widget.x_labels[idx] ?? idx + 1}:{point}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </article>
      );
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
      return <MicButtonControl onAudioUpload={onAudioUpload} widget={widget} />;
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
