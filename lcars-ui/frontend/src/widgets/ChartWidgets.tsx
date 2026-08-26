import { useEffect, useRef, useState } from "react";

import type { ChartOptions, LcarsColor, Series, SparklineOptions, Widget } from "../types/contract";
import { accentVar, seriesColor, type WidgetHandlers } from "./rendererShared";

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

export function OhlcChart({
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

export function ShaderCanvas({
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

export function Sparkline({
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

export function EnhancedLineChart({
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

export function EnhancedSparkline({
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


