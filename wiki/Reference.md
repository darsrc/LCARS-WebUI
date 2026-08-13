# Reference

Compact reference for the public `lcars_ui` 5.0.0 API. Signatures omit common widget
arguments when that makes the entry easier to scan; see [Common arguments](#common-arguments).

```python
import lcars_ui as lcars
```

## Lifecycle

```python
lcars.config(
    name,
    *,
    theme="galaxy",
    subtitle=None,
    header_color="orange",
    sound_enabled=True,
    lang="en-US",
    force_uppercase=True,
    label_uppercase=True,
    lcars_font_headers=True,
    lcars_font_labels=True,
    lcars_font_text=False,
    settings_page=True,
    visual_language="strict",
    strict_renderer="legacy",
)

lcars.run(
    ui_fn,
    *,
    host="127.0.0.1",
    port=8000,
    open_browser=True,
    assets_dir=None,
)

@lcars.live(interval=5.0)
def tick() -> None: ...
```

`assets_dir` is mounted read-only at `/lcars/assets/` for application-owned assets such
as `three_scene` modules. Only one live callback is supported; register it inside the
`__main__` guard.

## Navigation and pages

```python
lcars.nav(label, *, page=None, color=None, segments=None)

with lcars.page(
    title,
    *,
    id=None,
    layout="auto",
    chrome="console",
    fillers=True,
    sizing="fill",
): ...
```

- Layouts: `auto`, `console`, `telemetry`, `grid`, `menu`, `authored`.
- Chrome: `console`, `none` (most useful with `layout="authored"`).
- Sizing: `fill`, `content`.
- `nav(page=...)` targets a matching `page(id=...)`.

## Common arguments

Most widgets and LCARS containers accept some or all of:

```python
id=None
color=None
hint=None
zone=None
span=None
weight=None
aspect=None
group=None
sizing=None
disabled=False
visible=True
options=None
```

- Zones: `primary`, `side`, `readout`, `dock`, `rail`, `full`.
- Aspect: `wide`, `tall`, `square`, `flex`.
- Span: `(column_count, row_count)`.
- Weight: integer `1..12`.
- Sizing: `fill`, `content`.
- `hint` accepts text or a `Hint` model.

## Containers and layout helpers

```python
with lcars.data_panel(title="Data", *, color="blue", ...): ...
with lcars.control_panel(title="Controls", *, color="orange", ...): ...
with lcars.console(title, *, color="orange", ...) as panel: ...
with lcars.padd(title, *, color="orange", ...) as panel: ...
with lcars.diagnostic(title, *, color="blue", ...) as panel: ...

with lcars.box(
    title=None, *, subtitle=None, corners=None, sides=None,
    color="orange", width_left=150, width_right=150, ...
) as panel: ...

with lcars.sweep(
    title=None, *, subtitle=None, color="orange", reverse=False,
    width_sidebar=150, left_width=0.62, ...
) as panel: ...

with lcars.bracket(*, color="orange", orientation="both", ...): ...

with lcars.popup(
    title, *, open=True, modal=True, dismissible=True,
    draggable=True, resizable=True, width=560, height=360,
    position=None, close_action_id=None, color="orange", id=None,
): ...
```

`box`, `diagnostic`, and `data_panel` expose `main()`, `side()`, `left_inputs()`, and
`right_inputs()`. `sweep`, `console`, and `padd` expose `header()`, `column_inputs()`,
`left()`, and `right()`.

```python
with lcars.row(*, height="auto"): ...
with lcars.col(width="1fr"): ...
lcars.columns(["2fr", "1fr"])
with lcars.section(label, *, color=None): ...
with lcars.input_column(*, side="left"): ...       # left | right
with lcars.raw(*, reason=None): ...
```

## Rich hints

```python
with lcars.hint(
    target=None,
    *,
    text=None,
    title=None,
    trigger=None,
    placement="auto",
    delay_ms=250,
    hide_delay_ms=120,
    max_width=None,
    dismissible=True,
): ...
```

Triggers: `hover`, `focus`, `click`, `press`, `always`, `manual`. Placements: `auto`,
`top`, `bottom`, `left`, `right`. An omitted target means the most recently declared
widget.

## Text and status widgets

```python
lcars.header(text_value, *, size="h2", ...)
lcars.text(content, *, size="body", ...)
lcars.markdown(content, ...)
lcars.metric(label, value, *, status="ok", ...)
state = lcars.alert(message, *, level="yellow", blink=False, ...)
lcars.progress(label, value, *, show_label=True, ...)
lcars.gauge(
    label, value, *, min=0.0, max=100.0, unit=None,
    warn_threshold=None, crit_threshold=None, ...
)
```

- Header sizes: `h1` through `h6`.
- Text sizes: `h1`, `h2`, `body`, `mono`.
- Metric statuses: `ok`, `warn`, `crit`.
- Alert levels: `red`, `yellow`, `info`, `success`.

## Charts and data widgets

```python
state = lcars.chart(data, *, title=None, ...)
lcars.sparkline(data, *, title=None, ...)
state = lcars.candlestick(
    data, *, title=None, markers=None, up_color=None, down_color=None, ...
)
state = lcars.renko(
    data, brick_size, *, title=None, markers=None, up_color=None, down_color=None, ...
)
lcars.shader(
    fragment_shader, *, title=None, uniforms=None, aspect_ratio=None, ...
)
state = lcars.table(data, *, title=None, ...)
state = lcars.log(
    stream_id, *, max_lines=1000, title=None, auto_scroll=True, ...
)
```

Chart/sparkline data accepts numeric sequences, mappings of named sequences, and
supported pandas objects. Candlestick data uses `time`, `open`, `high`, `low`, `close`,
and optional `volume`. Renko accepts prices or close/price records and requires a
positive brick size.

Table data accepts dictionaries, lists/tuples, flat values, DataFrames, or `TableRow`
models. Important enhanced-table types exported by `lcars_ui`:

```python
TableOptions
TableColumn
TableSort
TableFilter
TablePagination
TableSelection
TableState
TableRow
TableCell
LinkSpec
TableDetailText
TableDetailStatus
TableDetailLink
TableDetailAction
TableDetailTable
```

## Media and workspaces

```python
state = lcars.video_hls(
    src, *, title=None, autoplay=False, muted=False, ...
)

state = lcars.three_scene(
    module, *, title=None, props=None, aspect_ratio=None, ...
)

state = lcars.node_canvas(
    document, *, title=None, execution=None, ...
)

state = lcars.graph_workspace(
    workspace, *, title=None, options=None, ...
)

result = lcars.mic_button(
    action_id, *, title=None, upload_url="/lcars/upload/audio",
    timeout_ms=5000, continuous=False, silence_ms=900, ...
)

files = lcars.file_upload(
    label="Upload Files", *, action_id=None,
    upload_url="/lcars/upload/files", accept=None, multiple=True,
    max_files=10, max_bytes=25_000_000, ...
)
```

`three_scene` modules resolve from `run(..., assets_dir=...)`. `node_canvas` accepts a
`GraphDocument` or dictionary. `file_upload` returns `list[UploadedFile]` during its
action rerun; uploads are not persisted by the library.

Graph models exported by `lcars_ui` include:

```python
GraphDocument       # version=1 legacy; version=2 layered reader
GraphLayer          # id, label/token, color, pattern, marker, defaults
GraphLayerState     # visible and emphasized reader state
NodeTemplate
GraphPort
GraphNode
GraphEdge           # optional layer, label, relation, accessible_label
GraphViewport
GraphExecutionState
NodeCanvasOptions
NodeCanvasState
```

Version-2 documents require every edge to reference a declared `GraphLayer`. Patterns
are `solid`, `dashed`, `dotted`, or `double`; markers are `arrow_closed`,
`arrow_open`, or `none`. Layer visibility/emphasis is emitted in
`NodeCanvasState.layer_state` and never removes graph data. Version 2 accepts parallel
connections and self-loops subject to port capacity. Editable v2 connections open an
explicit chooser over the declared layers before commit.

`GraphWorkspaceDocument` separates `canonical`, `proposal`, `reader`, and `receipt`.
Its exported supporting models include `GraphRevision`, `CanonicalPlane`,
`ProposalPlane`, `ProposalChange`, `WorkspaceRecord`, record/tree schemas, validation
findings/rules, actions, projections, reader state, commands, responses, and receipts.
`GraphWorkspaceOptions` controls autosave, fan windows, virtual row height, titles, and
server interaction.

## Input widgets and forms

```python
clicked = lcars.button(label, ...)
checked = lcars.toggle(label, *, value=False, ...)
checked = lcars.checkbox(label, *, value=False, ...)
choice = lcars.select(label, options, *, value=None, settings=None, ...)
choice = lcars.radio(label, options, *, value=None, settings=None, ...)
choice = lcars.radio_toggle(label, options, *, value=None, settings=None, ...)
value = lcars.text_input(
    label, *, value="", placeholder="", password=False, autocomplete=True, ...
)
value = lcars.number_input(
    label, *, value=0.0, min=None, max=None, step=1.0, placeholder=None, ...
)

with lcars.form(
    label, action_id, *, submit_label="Submit", color=None, id=None, options=None, ...
): ...
```

Choice entries may be strings, `SelectOption` objects, or dictionaries. Multi-select is
enabled through `ChoiceOptions(multiple=True)` and returns `list[str]`.

## Knowledge-graph 4.5 widgets

```python
with lcars.support_panel(title, *, node, ...):
    lcars.environments(data)
    lcars.atom_legend()

clicked_id = lcars.frontier(data, *, layer_filter=None, ...)

with lcars.assertion_card(data, ...):
    lcars.context_tags()

lcars.anchor_card(data, ...)
escalate = lcars.tri_state(data, *, on_escalate=None, ...)
lcars.constraint_band(data, ...)

with lcars.gap_panel(data, ...):
    lcars.contender_list()

chosen_id = lcars.commitment_selector(data, ...)
```

- `layer_filter`: list of `JUSTIFICATION`, `DOMAIN`, `PREREQUISITE`, `PROVENANCE`.
- `on_escalate`: `EXACT` or `None`.
- Return IDs are validated against the widget's supplied data.
- Data model exports: `SupportData`, `FrontierData`, `AssertionData`, `AnchorData`,
  `TriStateData`, `ConstraintData`, `GapData`, `CommitmentData`.

## Option and state classes

All are importable from `lcars_ui`:

| Widget family | Options |
| --- | --- |
| Text | `TextOptions`, `MarkdownOptions`, `HeaderOptions` |
| Status | `MetricOptions`, `AlertOptions`, `MeterOptions` |
| Inputs | `ButtonOptions`, `ToggleOptions`, `ChoiceOptions`, `TextInputOptions`, `NumberInputOptions`, `FormOptions` |
| Data | `TableOptions`, `ChartOptions`, `SparklineOptions`, `FinancialChartOptions` |
| Media | `ShaderOptions`, `LogOptions`, `VideoOptions`, `MicOptions` |
| Workspaces | `ThreeSceneOptions`, `NodeCanvasOptions`, `GraphWorkspaceOptions` |
| Containers | `ContainerOptions` |

Shared interaction configuration uses `InteractionOptions`. Returned state types include
`AlertState`, `ContainerState`, `TableState`, `ChartState`, `LogState`, `VideoState`,
`ThreeSceneState`, `NodeCanvasState`, and `GraphWorkspaceState`.

## Effects

```python
lcars.update(widget_id, **fields)
lcars.show_hint(widget_id)
lcars.hide_hint(widget_id)
lcars.notify(
    message, *, level="info", title=None, duration_ms=None,
    dismissible=True, movable=True,
)
lcars.append_log(stream_id, *lines)
lcars.set_alert_condition(level)
lcars.set_theme(theme)
```

- Notification levels: `info`, `success`, `warning`, `error`.
- Alert conditions: `normal`, `yellow`, `red`.
- Themes: `galaxy`, `tng`, `nemesis`.

## Server routes

| Route | Method | Scope when auth is enabled |
| --- | --- | --- |
| `/lcars/manifest` | GET | `lcars.read` |
| `/lcars/schema` | GET | `lcars.read` |
| `/lcars/ws` | WebSocket | `lcars.stream`; upstream events also require `lcars.write` |
| `/lcars/events` | GET | `lcars.read` |
| `/lcars/action/{widget_id}` | POST | `lcars.write` |
| `/lcars/input/{widget_id}` | POST | `lcars.write` |
| `/lcars/form/{widget_id}` | POST | `lcars.write` |
| `/lcars/upload/audio` | POST | `lcars.write` |
| `/lcars/upload/files` | POST | `lcars.write` |
| `/lcars/assets/...` | GET | Application asset mount. |

---

**See also:** [Widgets](Widgets) ·
[Actions and State](Actions-and-State) · [Deployment](Deployment)
