# Widgets Reference

> **v3.0 Widget Set** — This document reflects the current stable widget set including v3 chart and shader additions.

LCARS UI supports 23 widget types plus 4 LCARS container widgets.

## Supported Widgets

### Primitives (5)
| Widget | Description | Returns |
|--------|-------------|---------|
| `text(content, size)` | Plain text block | — |
| `markdown(content)` | Rendered markdown | — |
| `metric(label, value, status)` | Status tile with color dot | — |
| `alert(message, level, blink)` | Banner alert (yellow/red) | — |
| `progress(label, value)` | Segmented progress bar 0–100 | — |

### Data Display (7)
| Widget | Description | Returns |
|--------|-------------|---------|
| `chart(data, title)` | Line chart (list or dict) | — |
| `sparkline(data, title)` | Mini sparkline | — |
| `candlestick(data, title, markers)` | Zoomable OHLC candlestick chart | — |
| `renko(data, brick_size, title)` | Renko brick chart (computed server-side) | — |
| `shader(fragment_shader, title)` | Animated WebGL fragment-shader viewport | — |
| `gauge(label, value, min, max)` | Segmented LCARS gauge readout | — |
| `table(data, title)` | Data table (list of dicts) | — |

### Inputs (9)
| Widget | Description | Returns |
|--------|-------------|---------|
| `button(label)` | Clickable button | `True` on click |
| `toggle(label, value)` | On/off switch | `bool` |
| `checkbox(label, value)` | LCARS checkbox | `bool` |
| `select(label, options)` | Dropdown selector | `str` |
| `radio(label, options)` | Radio group | `str` |
| `radio_toggle(label, options)` | Segmented radio toggle | `str` |
| `text_input(label)` | Text field | `str` |
| `number_input(label, value)` | Numeric field | `float` |
| `form(label, action_id)` | Form container | context |

### Media (3)
| Widget | Description | Returns |
|--------|-------------|---------|
| `log(stream_id)` | Live log window | — |
| `video_hls(src)` | HLS video playback | — |
| `mic_button(upload_url)` | Push-to-talk mic | — |

### Containers (4)
| Widget | Description | Returns |
|--------|-------------|---------|
| `lcars_box` | Composable LCARS container | context |
| `lcars_sweep` | LCARS sweep container | context |
| `lcars_bracket` | LCARS bracket grouping | context |
| `lcars_header` | LCARS section header | — |

## Primitive/Data Widgets

- `text(content, size="body", color=None, id=None)`
- `markdown(content, color=None, id=None)`
- `metric(label, value, status="ok", color=None, id=None)`
- `alert(message, level="yellow", blink=False, id=None)`
- `progress(label, value, color=None, show_label=True, id=None)`
- `chart(data, title=None, color=None, id=None)`
- `sparkline(data, title=None, id=None)`
- `candlestick(data, *, title=None, markers=None, up_color=None, down_color=None, color=None, id=None)`
- `renko(data, brick_size, *, title=None, markers=None, up_color=None, down_color=None, color=None, id=None)`
- `shader(fragment_shader, *, title=None, uniforms=None, aspect_ratio=None, color=None, id=None)`
- `gauge(label, value, min=0.0, max=100.0, unit=None, color=None, warn_threshold=None, crit_threshold=None, id=None)`
- `table(data, title=None, id=None)`
- `log(stream_id, max_lines=1000, title=None, id=None)`

## Input Widgets

- `button(label, color=None, id=None) -> bool`
- `toggle(label, value=False, color=None, id=None) -> bool`
- `checkbox(label, value=False, color=None, id=None) -> bool`
- `radio(label, options, value=None, color=None, id=None) -> str`
- `radio_toggle(label, options, value=None, color=None, id=None) -> str`
- `select(label, options, value=None, color=None, id=None) -> str`
- `text_input(label, placeholder="", password=False, id=None) -> str`
- `number_input(label, value=0.0, min=None, max=None, step=1.0, placeholder=None, id=None) -> float`
- `with form(label, action_id, submit_label="Submit", color=None, id=None): ...`

## Container Widgets

- `lcars_box`
- `lcars_sweep`
- `lcars_bracket`
- `lcars_header`

## Strict vs Classic Rendering (Phase 13)

Manifest widget types are unchanged, but strict mode uses dedicated LCARS-native renderers:

- `button` -> `LcarsButtonControl` (bar geometry)
- `toggle` / `lcars_checkbox` -> `LcarsToggleControl`
- `select` -> `LcarsSelectControl` (stack/cycle bars)
- `lcars_radio` / `lcars_radio_toggle` -> `LcarsRadioControl`
- `text_input` / `number_input` -> `LcarsTextInputControl`
- `table` -> `LcarsTableControl`
- `status_tile` -> `LcarsMetricControl`
- `gauge` -> `LcarsGaugeControl` (segmented horizontal readout)
- `progress_bar` -> `LcarsProgressControl` (segmented fill)

Classic mode preserves legacy renderer behavior.

## Chart Widgets (v3)

### candlestick

Renders a live, zoomable OHLC candlestick chart powered by `lightweight-charts` (TradingView).

`data` accepts a `list[dict]` with keys `time`, `open`, `high`, `low`, `close` (optional `volume`) or a pandas
`DataFrame` with those columns and a `DatetimeIndex`. If `time` is omitted it defaults to the bar index (0, 1, 2...).

Trade markers can be attached to any bar:
```python
lcars.candlestick(
    ohlc_list,
    title="ES Futures",
    markers=[
        {"time": "2024-01-02", "position": "below", "shape": "arrow_up", "color": "anakiwa", "text": "BUY"},
        {"time": "2024-01-06", "position": "above", "shape": "arrow_down", "color": "hopbush", "text": "SELL"},
    ],
    up_color="anakiwa",
    down_color="hopbush",
)
```

Marker fields: `time` (must match a bar), `position` (`"above"/"below"/"in"`), `shape` (`"arrow_up"/"arrow_down"/"circle"/"square"`), `color`, `text`.

### renko

Computes and renders Renko bricks server-side from a flat price series.

`data` accepts `list[float]`, `list[dict]` with a `"close"` or `"price"` key, or a pandas `Series`.
`brick_size` (positive float) is the price movement per brick.

```python
lcars.renko(price_series, brick_size=250.0, title="Equity Renko", up_color="pale-canary")
```

Bricks are rendered without wicks (Renko convention). Markers work the same as `candlestick`.

### shader

Renders an animated WebGL fragment-shader viewport in the browser. The fragment shader runs on the GPU
with these built-in uniforms:
- `u_time` — float, seconds since widget mount
- `u_resolution` — vec2, canvas size in physical pixels
- `v_uv` — varying vec2 in [0, 1], UV coordinates from the vertex shader

Additional custom uniforms are passed via the `uniforms` dict:
- `float` value → `uniform float name;`
- `list[float]` of length 2/3/4 → `uniform vec2/vec3/vec4 name;`

```python
WARP_GLOW = """
void main() {
  vec2 uv = (v_uv - 0.5) * vec2(u_resolution.x / u_resolution.y, 1.0);
  float r = length(uv);
  float pulse = 0.5 + 0.5 * sin(u_time * 2.0 - r * 10.0);
  float core = smoothstep(0.9, 0.0, r) * pulse;
  gl_FragColor = vec4(u_color * (0.15 + core), 1.0);
}
"""
lcars.shader(WARP_GLOW, title="Warp Core", uniforms={"u_color": [0.973, 0.6, 0.0]}, aspect_ratio=2.0)
```

`aspect_ratio` (optional) locks the canvas height to `width / aspect_ratio`. Compile errors render as
an inline error banner rather than crashing the page.

## Update Pattern

Use `lcars.update(widget_id, **fields)` for real-time updates:

```python
lcars.update("prog_repair", value=67.0)
lcars.update("gauge_shields", value=91.2)
lcars.update("md_report", content="## Updated")
```
