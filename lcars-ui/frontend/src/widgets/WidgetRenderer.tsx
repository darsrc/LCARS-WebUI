/*
 * The instruments — one rendering per widget the contract speaks, all sharing
 * the token language so the set reads as one calm system. Data sits on black
 * with a colored accent edge; controls are endcapped pills; structure-bearing
 * container widgets become framed fields that compose their children.
 */
import { useEffect, useRef, useState } from "react";
import { marked } from "marked";
import DOMPurify from "dompurify";

import type { LcarsColor, Series, Widget } from "../types/contract";

export type ActionStatus = "pending" | "ok" | "fail";

export type WidgetHandlers = {
  onAction: (actionId: string, value: unknown, widgetId?: string) => void;
  onInput: (id: string, value: string) => void;
  onFormSubmit: (id: string, data: Record<string, unknown>) => void;
  onAudioUpload?: (widget: Extract<Widget, { type: "mic_button" }>, audio: Blob) => Promise<void>;
  logsByStream: Record<string, string[]>;
  actionStatus?: Record<string, ActionStatus>;
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
      payload[key] = coerceFormChildValue(childById.get(key), value);
    }
  }
  return payload;
};

function ActionStatusTag({ status }: { status?: ActionStatus }) {
  if (!status) {
    return null;
  }
  const label = status === "pending" ? "SENDING" : status === "ok" ? "OK" : "FAIL";
  return <span className="lcars-action-status">{label}</span>;
}

function ButtonControl({
  disabled,
  label,
  onClick,
  status,
}: {
  disabled?: boolean;
  label: string;
  onClick: () => void;
  status?: ActionStatus;
}) {
  const [pulse, setPulse] = useState(0);
  return (
    <button
      className="lcars-btn"
      data-action-status={status ?? undefined}
      data-pulse={pulse}
      disabled={disabled}
      onClick={() => {
        setPulse((value) => value + 1);
        onClick();
      }}
      type="button"
    >
      <span>{label}</span>
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

  return (
    <>
      <button
        aria-pressed={checked}
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
        <span>{label}</span>
        <span className="lcars-control-value">{checked ? "ON" : "OFF"}</span>
        <ActionStatusTag status={status} />
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
  const status = handlers.actionStatus?.[widget.action_id];

  useEffect(() => {
    setValue(widget.value);
  }, [widget.value]);

  const choose = (next: string) => {
    setValue(next);
    handlers.onAction(widget.action_id, next, widget.id);
  };

  if (widget.type === "select") {
    return (
      <div className="lcars-field" data-action-status={status ?? undefined}>
        {label ? <label htmlFor={widget.id}>{label}</label> : null}
        <select
          className="lcars-select"
          disabled={widget.disabled}
          id={widget.id}
          name={widget.id}
          onChange={(e) => choose(e.target.value)}
          value={value}
        >
          {widget.options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
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
              disabled={widget.disabled}
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
      <input name={widget.id} type="hidden" value={value} />
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

  const commit = () => handlers.onInput(widget.id, value);
  return (
    <div className="lcars-field">
      {label ? <label htmlFor={widget.id}>{label}</label> : null}
      <input
        className="lcars-input"
        disabled={widget.disabled}
        id={widget.id}
        name={widget.id}
        onBlur={commit}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            commit();
          }
        }}
        placeholder={widget.placeholder ?? ""}
        type={widget.password ? "password" : "text"}
        value={value}
      />
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

  const commit = () => handlers.onInput(widget.id, value);
  return (
    <div className="lcars-field">
      {label ? <label htmlFor={widget.id}>{label}</label> : null}
      <input
        className="lcars-input"
        disabled={widget.disabled}
        id={widget.id}
        max={widget.max ?? undefined}
        min={widget.min ?? undefined}
        name={widget.id}
        onBlur={commit}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            commit();
          }
        }}
        placeholder={widget.placeholder ?? ""}
        step={widget.step}
        type="number"
        value={value}
      />
    </div>
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
  const [mode, setMode] = useState<"idle" | "recording" | "uploading" | "error">("idle");
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const chunksRef = useRef<Blob[]>([]);

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
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };
      recorder.onstop = () => {
        const audio = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        setMode("uploading");
        void handlers.onAudioUpload?.(widget, audio)
          .then(() => {
            setMode("idle");
            handlers.onAction(widget.action_id, { bytes: audio.size }, widget.id);
          })
          .catch(() => setMode("error"));
      };
      recorder.start();
      setMode("recording");
      timeoutRef.current = window.setTimeout(finishRecording, widget.timeout_ms);
    } catch {
      setMode("error");
    }
  };

  const statusLabel = mode === "recording" ? "RECORDING" : mode === "uploading" ? "UPLOADING" : mode === "error" ? "ERROR" : "";

  return (
    <button
      className="lcars-btn"
      data-action-status={mode === "error" ? "fail" : mode === "uploading" ? "pending" : undefined}
      data-on={mode === "recording"}
      onClick={() => {
        if (mode === "recording") {
          finishRecording();
          return;
        }
        void startRecording();
      }}
      type="button"
    >
      <span>{label || "Record"}</span>
      {statusLabel ? <span className="lcars-action-status">{statusLabel}</span> : null}
    </button>
  );
}

function VideoHlsControl({
  widget,
  label,
  depth,
}: {
  widget: Extract<Widget, { type: "video_hls" }>;
  label: string;
  depth: number;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

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
  }, [widget.src]);

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
          controls
          muted={widget.muted}
          playsInline
        />
        <div className="lcars-text-mono">{widget.src}</div>
      </div>
    </section>
  );
}

function Sparkline({ series, fallback }: { series: Series[]; fallback?: LcarsColor | null }) {
  const values = series.flatMap((s) => s.data);
  if (values.length === 0) return null;
  // Scale to the data's own range (with a little headroom) so the trace fills the
  // scope instead of cowering against a forced zero baseline. A flat scope reads as
  // dead instrumentation; a breathing trace reads as live telemetry.
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const pad = (hi - lo || Math.abs(hi) || 1) * 0.12;
  const min = lo - pad;
  const max = hi + pad;
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
      {series.map((s, si) => {
        const n = s.data.length;
        const line = s.data.map((v, i) => `${(i / Math.max(n - 1, 1)) * W},${y(v)}`).join(" ");
        const color = seriesColor(s.color ?? fallback, si);
        return (
          <g key={s.name || si}>
            <polygon points={`0,${H} ${line} ${W},${H}`} fill={color} opacity="0.12" />
            <polyline
              points={line}
              fill="none"
              stroke={color}
              strokeWidth="1.5"
              vectorEffect="non-scaling-stroke"
              strokeLinejoin="round"
            />
          </g>
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

export function WidgetRenderer({
  widget,
  depth = 0,
  ...handlers
}: { widget: Widget; depth?: number } & WidgetHandlers) {
  const { onAction, onFormSubmit, logsByStream } = handlers;
  const label = widget.label ?? widget.strict_title ?? "";
  // Nested container heads step down to a quieter sub-band so depth reads as
  // hierarchy — an LCARS panel does not stack identical bars on top of itself.
  const subHead = depth > 0 ? " lcars-panel-head--sub" : "";

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
        <ButtonControl
          disabled={widget.disabled}
          label={label || "Execute"}
          onClick={() => onAction(widget.action_id, null, widget.id)}
          status={handlers.actionStatus?.[widget.action_id]}
        />
      );

    case "mic_button":
      return <MicButtonControl handlers={handlers} label={label} widget={widget} />;

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
      return (
        <form
          className="lcars-panel"
          onSubmit={(e) => {
            e.preventDefault();
            onFormSubmit(widget.action_id, collectFormPayload(widget, e.currentTarget));
          }}
        >
          {label ? <div className={`lcars-panel-head${subHead}`}><span>{label}</span></div> : null}
          <div className="lcars-panel-body">
            {widget.children.map((child) => (
              <WidgetRenderer key={child.id} widget={child} depth={depth + 1} {...handlers} />
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
          <Sparkline series={widget.series} fallback={widget.color} />
        </div>
      );

    case "video_hls":
      return <VideoHlsControl depth={depth} label={label} widget={widget} />;

    case "lcars_header":
      return (
        <div className={`lcars-panel-head${subHead}`}>
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
            <div className={`lcars-panel-head${subHead}`}>
              <span>{title}</span>
              {"subtitle" in widget && widget.subtitle ? <span className="lcars-tag">{widget.subtitle}</span> : null}
            </div>
          ) : null}
          <div className="lcars-panel-body">
            {main.length > 0 && inputs.length > 0 ? (
              <div className="lcars-panel-cols">
                <div className="lcars-panel-col">
                  {main.map((child) => (
                    <WidgetRenderer key={child.id} widget={child} depth={depth + 1} {...handlers} />
                  ))}
                </div>
                <div className="lcars-panel-col">
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
