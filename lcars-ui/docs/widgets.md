# Widgets Reference

> **v4.0 Widget Set** - Every existing widget has typed, opt-in capabilities. Calls that
> do not pass `options=` (or `settings=` for choice widgets) retain their v3 wire payload
> and behavior.

LCARS UI supports the established widget set plus file upload, floating pop-up,
and renderer-owned WebUI settings surfaces.

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
| `table` | `TableOptions`: typed columns/cells, sort, filters, pagination, selection, child rows, expanded content, copyable cells, sticky header, client/server data mode, emitted state events |
| `chart` | `ChartOptions`: axes, legend, tooltips, line mode, references, zoom, local/server state |
| `sparkline` | `SparklineOptions`: tooltip, latest value, range, reference value |
| `candlestick`, `renko` | `FinancialChartOptions`: volume, legend, tooltip, fit, precision, local/server state |
| `shader` | `ShaderOptions`: pause, frame limit, reduced-motion policy, fallback |
| `log` | `LogOptions`: wrap, line numbers, timestamps, search, levels, toolbar, pause, local/server state |
| `video_hls` | `VideoOptions`: controls, looping, preload, rates, source visibility, local/server state |
| `mic_button` | `MicOptions`: device, MIME preference, VAD threshold, duration and byte limits |
| `file_upload` | Multipart drag/drop input with type, count, and byte limits |
| `popup` | Movable/resizable modal or modeless overlay with recursive widget content |
| `webui_settings` | Local theme, motion, sound, case, and body-type preferences |
| `three_scene` | `ThreeSceneOptions`: camera, orbit controls, pause, frame limit, reduced-motion policy, DPR cap, fallback, local/server state |
| `node_canvas` | `NodeCanvasOptions`: editable, zoom range, grid snapping, minimap, palette, import/export, history limit, run/queue/cancel toolbar, local/server state |
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

### Smart sorting

Cells are often already-formatted strings — `735.0MB`, `1.6GB`, `12.5%`, `350ms`,
`v1.10.0`. Sorting those as text puts `1.6GB` below `735.0MB`. Client-side sorting
therefore sniffs each column from its own values and compares by magnitude. Detected
kinds: `number`, `bytes`, `percent`, `duration`, `currency`, `datetime`, `version`,
`boolean`, and `natural` (embedded numbers, e.g. `pid 9` before `pid 10`) as the
fallback. A kind wins when it parses at least 80% of the column's non-empty cells, so a
stray `n/a` doesn't derail it, and cells it can't parse sort after the ones it can.

Passing raw typed values with a separate `display` is still the most precise option; the
sniffer is what makes pre-formatted data sort correctly with no extra work.

Override it per column when the data needs a specific rule:

```python
lcars.TableColumn(key="ram", label="RAM", sortable=True, sort_as="bytes")
lcars.TableColumn(key="started", label="Started", sortable=True, sort_as="datetime")
lcars.TableColumn(
    key="state",
    label="State",
    sortable=True,
    sort_order=["running", "sleeping", "stopped"],  # categorical, unlisted values last
    sort_nulls="first",                              # empty cells first in both directions
)
```

- `sort_as` — `auto` (default, sniffed), `text`, `natural`, `number`, `bytes`, `percent`,
  `duration`, `currency`, `datetime`, `version`, `boolean`. An explicit `value_type`
  (`number`/`date`/`boolean`/`text`) also pins the comparison; `sort_as` wins over both.
- `sort_order` — explicit ranking for categorical columns; values not listed sort after
  the listed ones, then naturally among themselves.
- `sort_nulls` — `last` (default) or `first`. Empty cells stay pinned there when the
  direction flips, so they never crowd out the rows you sorted for.

Numeric filters (`gt`/`gte`/`lt`/`lte`) use the same column scale, so filtering a byte
column with `1.5GB` compares against real byte counts. Sorting is only inferred for
client-side data; with `data_mode="server"` your code owns the ordering.

## Client operations with emitted events

`data_mode` chooses where sort/filter/pagination run, independently of whether Python is
notified. Set `data_mode="client"` (the default) with `emit_state_changes=True` to keep
all data operations local while still receiving a typed `{"kind", "state"}` action on
every selection, expansion, sort, filter or page change. `interaction.mode="server"`
remains a shorthand for `data_mode="server"` + `emit_state_changes=True`.

Sortable server-controlled tables automatically use a two-state header cycle:
ascending → descending → ascending. This keeps the sort arrow and avoids a
transient empty sort request on every third click. Set `sort_cycle="three-state"`
to retain the clear-on-third-click behavior, or `sort_cycle="two-state"` to
enforce two states in client mode as well. A later manifest update can still
clear sorting programmatically in either mode.

```python
state = lcars.table(rows, id="repos", options=lcars.TableOptions(
    data_mode="client",
    emit_state_changes=True,
    selection=lcars.TableSelection(mode="single"),
    row_click_select=True,
    interaction=lcars.InteractionOptions(action_id="repos"),
))
```

## Copyable cells, expanded content, and lazy expansion

- `TableCell(copyable=True, copy_value=...)` adds a COPY button (coexists with a link);
  `copy_on_click=True` makes the cell body the copy target and cannot combine with a link
  or action.
- `TableRow.expanded_content` renders a restricted display union (`TableDetailText`,
  `TableDetailStatus`, `TableDetailLink`, `TableDetailAction`, `TableDetailTable`)
  full-width beneath the row, alongside any ordinary `children`.
- With `emit_state_changes=True`, expanding a row emits an expansion action; set
  `TableRow.loading=True` for a loading affordance or `TableRow.error="…"` for an inline
  error with a Retry that re-emits the action. Expand/collapse animation honours
  `prefers-reduced-motion` and can be disabled with `expansion_motion="none"`.

The manifest is authoritative: later option changes can programmatically select or expand
rows, plain data refreshes preserve in-progress user interaction, and ids removed from the
dataset are pruned from selection/expansion. Selection is keyed by `TableRow.id`, so
highlighting is stable across sorting, filtering, pagination and navigation.

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

### Media & immersive (5)
| Widget | Description | Returns |
|--------|-------------|---------|
| `log(stream_id)` | Live log window | — |
| `video_hls(src)` | HLS video playback | — |
| `three_scene(module)` | Managed Three.js viewport | `ThreeSceneState` |
| `node_canvas(document)` | Typed node-graph editor | `NodeCanvasState` |
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

### three_scene

A managed Three.js viewport driven by a project scene module. This is the one widget whose behaviour
is written in JavaScript rather than Python: real 3D needs geometry construction, loaders and
imports, which do not survive being passed through the manifest as a source string the way `shader`'s
GLSL does.

Point `assets_dir` at a directory when starting the app; it is served read-only at `/lcars/assets/`
and `module` is resolved relative to it.

```python
lcars.three_scene(
    "scenes/warp_core.js",
    title="Core Assembly",
    props={"level": 0.85},
    options=lcars.ThreeSceneOptions(
        camera=lcars.ThreeSceneCamera(position=(4, 3, 6)),
        controls=lcars.ThreeSceneControls(auto_rotate=True),
    ),
)

lcars.run(ui, assets_dir="examples/kitchen_sink/assets")
```

The module default-exports `setup(context)`, synchronously or `async`. LCARS owns the canvas,
renderer, camera, OrbitControls, resizing, the frame loop, visibility pausing and teardown; the
module owns only what is in the scene.

`context` carries `THREE`, `GLTFLoader`, `scene`, `camera`, `renderer`, `controls`, `canvas`,
`props`, `assetUrl(path)`, `invalidate()` and `emit(kind, payload)`. The returned controller may
implement `update(delta, elapsed)`, `resize(w, h)`, `updateProps(props)` and `dispose()`.

```js
export default function setup({ THREE, scene, props }) {
  const mesh = new THREE.Mesh(
    new THREE.TorusGeometry(1, 0.2, 12, 48),
    new THREE.MeshStandardMaterial({ color: props.accent ?? "#f89800" }),
  );
  scene.add(mesh);
  return { update: (delta) => { mesh.rotation.y += delta; } };
}
```

A module must not start its own render loop or mount document-level UI — LCARS drives the frame loop
and disposes the scene graph, so a scene that stays inside this contract cannot leak. `props` changes
reach `updateProps` without the scene being rebuilt.

Camera state is emitted only when an orbit/pan/zoom gesture *ends*, never per frame. With
`options.interaction.mode="server"` the call returns a `ThreeSceneState` (camera pose, `last_event`,
and any custom `emit` payload).

Missing modules, bad exports, initialization failures, frame errors, absent WebGL2 and context loss
all resolve to an in-panel message rather than taking the console down.

Three.js loads as a lazy chunk, so pages without a scene pay nothing for it.

### node_canvas

A typed, editable node-graph editor. The library is engine-agnostic and never executes a workflow:
`run`, `queue` and `cancel` emit the current graph and the application does the work.

```python
document = lcars.GraphDocument(
    templates=[
        lcars.NodeTemplate(
            id="filter",
            label="Filter",
            category="Process",
            color="anakiwa",
            inputs=[lcars.GraphPort(id="input", type="stream")],
            outputs=[lcars.GraphPort(id="output", type="stream")],
            fields=[lcars.GraphField(id="cutoff", kind="number", default=42.0)],
        ),
    ],
    nodes=[lcars.GraphNode(id="f1", template="filter", position=(120, 40))],
)

state = lcars.node_canvas(
    document,
    title="Sensor Pipeline",
    execution=lcars.GraphExecutionState(status="running"),
    options=lcars.NodeCanvasOptions(
        show_run=True,
        interaction=lcars.InteractionOptions(mode="server", action_id="graph-changed"),
    ),
)
```

**Format.** `lcars-node-graph` version 1. Templates are declared once and referenced by nodes.
Ports connect output→input when their types match or either is `"any"`. An input accepts one
connection unless it declares a larger `capacity`; an output fans out without limit unless it
declares one. Duplicate, dangling and type-incompatible edges are rejected on both sides.

**Execution status is separate from the document.** `GraphExecutionState` carries overall and
per-node `idle|queued|running|success|error|cancelled` plus progress and messages. Keeping it out of
the editable document is what lets status stream in continuously without clobbering an edit in the
user's hands.

**State arrives at transaction boundaries** — a drag ending, a connection completing, a field
committing, a command finishing — not while the pointer moves. Text and number fields commit on blur
or Enter; booleans and selects commit on change.

**Reconciliation.** Each incoming document is compared against the *last incoming* one, never against
local state. If Python repeats itself (a rerender, or an execution-status update) local edits stand;
if it sends something different that is a deliberate change and it replaces the working graph, along
with the history that described the old one.

**Editing.** Add/delete/move/multi-select, typed field editing, connect/disconnect, pan/zoom, a
contained minimap, optional grid snapping, copy/paste/duplicate, bounded undo/redo, align and
distribute, group frames, comments, edge reroutes (double-click a wire), a searchable template
palette, and native JSON import/export. An invalid import leaves the current graph untouched and
explains why in-panel. Dragging a group title moves its member nodes and internal reroutes as one
unit; crossing-wire waypoints remain anchored outside the group. `FIT` recentres the complete graph.
Input ports are rings, output ports are solid terminals, and every wire ends in a direction arrow.
The document viewport is restored on first paint. Shortcuts (Ctrl/Cmd + C/V/D/G/Z/Y) are scoped to
the focused canvas.

Set `options.editable=False` for a read-only view. The editor loads as a lazy chunk.

## The Web knowledge widgets

Version 4.5 adds eight semantic instruments for The Web v0.3 and v0.3.1 payloads. The
models validate the protocol distinctions directly: support alternatives stay separate,
`environments=[]` remains unsupported, `[{"atoms": []}]` remains support-independent,
and null constraint positions remain uncommitted claims.

```python
with lcars.support_panel("Support", node="n07"):
    lcars.environments(support_data)
    lcars.atom_legend()

clicked = lcars.frontier(frontier_data, layer_filter=["JUSTIFICATION"])

with lcars.assertion_card(assertion_data):
    lcars.context_tags()

lcars.anchor_card(anchor_data)
lcars.tri_state(result_data, on_escalate="EXACT")
lcars.constraint_band(constraint_data)

with lcars.gap_panel(gap_data):
    lcars.contender_list()

chosen = lcars.commitment_selector(commitment_data)
```

`frontier()` and `commitment_selector()` return an id only on the rerun caused by a valid
selection. `tri_state()` returns `True` when its optional EXACT escalation is requested.
UNKNOWN is rendered as a neutral semantic result rather than warning or alert chrome.

`constraint_band()` code-renders `INTERVAL`; the other registered representations render an
explicit unrendered state so the client never invents geometry it does not understand.

## Update Pattern

Use `lcars.update(widget_id, **fields)` for real-time updates:

```python
lcars.update("prog_repair", value=67.0)
lcars.update("gauge_shields", value=91.2)
lcars.update("md_report", content="## Updated")
```
