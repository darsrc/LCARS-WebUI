# Widgets Reference

> **v4.0 Widget Set** - Every existing widget has typed, opt-in capabilities. Calls that
> do not pass `options=` (or `settings=` for choice widgets) retain their v3 wire payload
> and behavior.

LCARS UI supports 24 widget types plus 4 LCARS container widgets.

## v4 capability model

v4 expands widgets in place. It does not introduce replacement widget types.

- `options=` enables richer behavior for every widget except select/radio controls,
  which use `settings=` because `options` already names their choices.
- `disabled=`, `visible=`, and `zone=` are consistently available from the DSL.
- Display interactions default to browser-local state. Set
  `InteractionOptions(mode="server")` to receive typed state during the action rerun.
- Local sort, filter, paging, expansion, dismissal, and collapse state survives page
  navigation and manifest refreshes for the current browser session.
- Pydantic remains the contract source. `make contracts-update` regenerates JSON Schema,
  TypeScript declarations, and the standalone Ajv validator.

### Capability map

| Widget calls | Typed capabilities |
|---|---|
| `text` | `TextOptions`: semantic element, wrapping, line clamp, selection, copy, safe link |
| `markdown` | `MarkdownOptions`: link target, max height, copy buttons for code |
| `metric` | `MetricOptions`: secondary value, trend, numeric formatting |
| `alert` | `AlertOptions`: dismiss, action, live-region policy, local/server state |
| `progress`, `gauge` | `MeterOptions`: range, unit, formatting, segments, ticks, thresholds, indeterminate |
| `header` | `HeaderOptions`: subtitle, anchor, actions |
| `button` | `ButtonOptions`: payload, confirmation, debounce, busy label |
| `toggle`, `checkbox` | `ToggleOptions`: explicit on/off labels |
| `select`, `radio`, `radio_toggle` | `ChoiceOptions`: search, multi-select, placeholder; typed option groups and disabled choices |
| `text_input` | `TextInputOptions`: multiline, input type, commit policy, debounce, validation |
| `number_input` | `NumberInputOptions`: precision, prefix/suffix, commit policy, required |
| `form` | `FormOptions`: stack/row/grid layout, reset, cancel, value coercion |
| `table` | `TableOptions`: typed columns/cells, sort, filters, pagination, selection, child rows, sticky header |
| `chart` | `ChartOptions`: axes, legend, tooltips, line mode, references, zoom, local/server state |
| `sparkline` | `SparklineOptions`: tooltip, latest value, range, reference value |
| `candlestick`, `renko` | `FinancialChartOptions`: volume, legend, tooltip, fit, precision, local/server state |
| `shader` | `ShaderOptions`: pause, frame limit, reduced-motion policy, fallback |
| `log` | `LogOptions`: wrap, line numbers, timestamps, search, levels, toolbar, pause, local/server state |
| `video_hls` | `VideoOptions`: controls, looping, preload, rates, source visibility, local/server state |
| `mic_button` | `MicOptions`: device, MIME preference, VAD threshold, duration and byte limits |
| `box`, `sweep`, `bracket`, recipes | `ContainerOptions`: density, overflow, collapse, local/server state |

All option and state classes are exported from `lcars_ui`.

## Sortable tables

Enhanced tables use typed raw values for correct numeric/date sorting while retaining
separate display text, links, actions, and status styling.

```python
import lcars_ui as lcars

rows = [
    lcars.TableRow(
        id="repo-a",
        cells=[
            lcars.TableCell(
                value="org/repo-a",
                link=lcars.LinkSpec(href="https://huggingface.co/org/repo-a"),
            ),
            4_200_000,
            91,
        ],
        children=[
            lcars.TableRow(id="repo-a-files", cells=["model.safetensors", 4_100_000, None]),
        ],
    ),
]

state = lcars.table(
    rows,
    title="Search Results",
    id="results",
    options=lcars.TableOptions(
        columns=[
            lcars.TableColumn(key="repo", label="Repository", sortable=True, filter="text"),
            lcars.TableColumn(
                key="size",
                label="Size",
                value_type="number",
                sortable=True,
                align="end",
                value_format=lcars.ValueFormat(compact=True, suffix="B"),
            ),
            lcars.TableColumn(key="fit", label="Fit", value_type="number", sortable=True),
        ],
        expandable=True,
        sticky_header=True,
        pagination=lcars.TablePagination(page_size=25),
        selection=lcars.TableSelection(mode="multiple"),
        interaction=lcars.InteractionOptions(mode="server"),
    ),
)

if state and state.last_event == "sort":
    lcars.notify(f"Sort changed: {state.sort}")
```

Without `TableOptions`, `table()` still emits the original headers/rows payload and the
legacy static renderer.

## Interaction state

`table`, `chart`, `candlestick`, `renko`, `log`, and `video_hls` return their typed state
when server interaction is enabled. Dismissible alerts return `AlertState`. Container
context values expose `scope.state` as `ContainerState`.

```python
server = lcars.InteractionOptions(mode="server")

alert_state = lcars.alert(
    "Diagnostic complete",
    level="success",
    id="diagnostic-alert",
    options=lcars.AlertOptions(dismissible=True, interaction=server),
)

with lcars.data_panel(
    "Diagnostics",
    id="diagnostics",
    options=lcars.ContainerOptions(collapsible=True, interaction=server),
) as panel:
    lcars.text("All channels nominal")

if alert_state and alert_state.dismissed:
    lcars.append_log("audit", "Alert dismissed")
if panel.state.collapsed:
    lcars.append_log("audit", "Diagnostics collapsed")
```

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
| `mic_button(upload_url, continuous=False, silence_ms=900)` | Push-to-talk mic, or hands-free with continuous=True (auto voice detection) | — |

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
