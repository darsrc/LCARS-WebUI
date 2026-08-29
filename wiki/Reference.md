# Reference

Compact reference for the public `lcars_ui` API — signatures, accepted values, and
routes at a glance. Signatures omit common widget arguments when that makes the entry
easier to scan; see [Common arguments](#common-arguments). For exhaustive per-widget
detail (every option model, every field an action's `ctx.value` carries), see
[docs/widgets.md](https://github.com/darsrc/LCARS-WebUI/blob/main/lcars-ui/docs/widgets.md)
and [docs/dsl.md](https://github.com/darsrc/LCARS-WebUI/blob/main/lcars-ui/docs/dsl.md).

```python
from lcars_ui import ActionContext, App, ui
from lcars_ui import advanced       # composition, Surface Engine, workspaces, specialist media
import lcars_ui                     # data models, effects, and other package-root exports
```

## Lifecycle

```python
app = App()

app.config(
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
)

@app.page(title, *, path="/", nav=True, id=None, layout="auto", chrome="console",
          fillers=True, sizing="fill")
def page_fn() -> None: ...

@app.action(widget_id)
def handler(ctx: ActionContext[T]) -> None: ...

@app.live(interval=5.0, audience="all")
def live_fn() -> None: ...

@app.session_start
def on_session_start(ctx: ActionContext[None]) -> None: ...

app.provide(ServiceType, factory, scope="app")   # or scope="session"

app.serve(host="127.0.0.1", port=8000, open_browser=False, assets_dir=None)
app.build_manifest()      # -> Manifest, no server
app.test_client()         # -> TestClient, see docs/quickstart.md
```

`assets_dir` is mounted read-only at `/lcars/assets/` for application-owned assets such
as `three_scene` modules. `settings_page=True` (the default) adds a renderer-owned
Options page and navigation item; pass `False` to remove it. `@app.live(...)` can be
registered more than once — each job runs as its own independent task — but register
them inside the `if __name__ == "__main__":` guard so importing the module doesn't also
start them.

## Pages

- `path=` is retained as routing metadata for future routing work; today's manifest
  still identifies pages by `id`.
- `nav=True` (the default) adds the page to the sidebar, labeled with `title` — there is
  no separate navigation call.
- Layouts: `auto`, `console`, `telemetry`, `grid`, `menu`, `authored`.
- Chrome: `console`, `none` (most useful with `layout="authored"`).
- Sizing: `fill`, `content`.

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

- Zones: `primary`, `side`, `dock`, `full`.
- Aspect: `wide`, `tall`, `square`, `flex`.
- Span: `(column_count, row_count)`.
- Weight: integer `1..12`.
- Sizing: `fill`, `content`.
- `hint` accepts text or a `Hint` model (see [Rich hints](#rich-hints)).
- `id` must be unique across the **whole application** — every page combined — within
  one manifest build (see [Concepts](Concepts#ids-are-the-operational-contract)).

## Color tokens

Every widget that renders visually accepts `color=`, either a hex code (`"#f89800"`) —
always renders exactly that color — or a named LCARS token, which renders as that
token's themed accent and shifts with the active theme. Only these 15 names resolve to a
themed accent (from `COLOR_VAR` in `frontend/src/widgets/rendererShared.ts`):

| Token | Reads as |
| --- | --- |
| `orange` | primary Okuda orange (the default accent) |
| `golden-tanoi` | warm gold |
| `pale-canary` | pale yellow |
| `neon-carrot` | sunflower/amber |
| `atomic-tangerine` | orange (alias of `orange`) |
| `blue` | Okuda periwinkle-blue |
| `anakiwa` | Okuda periwinkle-blue (alias of `blue`) |
| `mariner` | deep blue-violet |
| `bahama-blue` | deep blue-violet (alias of `mariner`) |
| `lilac` | Okuda lilac |
| `hopbush` | dusty rose/salmon |
| `eggplant` | Okuda lilac (alias of `lilac`) |
| `red` | alert red |
| `yellow` | sunflower/amber (alias of `neon-carrot`) |
| `white` | near-white |

Other schema-legal names (`purple`, `indigo`, `husk`, `rust`, `tamarillo`, and other
Okuda-era names) validate and will not raise, but do not currently resolve to a themed
accent — a widget given one renders with its default role color, with no visible tint.
See [Troubleshooting](Troubleshooting#a-color-value-validates-but-renders-untinted).

## Themes

`app.config(..., theme=...)` and `ctx.set_theme(...)` / `lcars_ui.set_theme(...)` accept:

`"galaxy"` (default, TNG/DS9), `"nemesis"`, `"tng"`, `"outpost"`, `"cardassian"`,
`"klingon"`, `"romulan"`, `"ferengi"`, `"gruvbox"` — nine values. Every named `color=`
token shifts hue with the active theme.

## Containers and layout helpers

```python
with ui.data_panel(title="Data", *, color="blue", ...): ...
with ui.control_panel(title="Controls", *, color="orange", ...): ...
with advanced.console(title, *, color="orange", ...) as panel: ...
with advanced.padd(title, *, color="orange", ...) as panel: ...
with advanced.diagnostic(title, *, color="blue", ...) as panel: ...

with ui.box(
    title=None, *, subtitle=None, corners=None, sides=None,
    color="orange", width_left=150, width_right=150, ...
) as panel: ...

with advanced.sweep(
    title=None, *, subtitle=None, color="orange", reverse=False,
    width_sidebar=150, left_width=0.62, ...
) as panel: ...

with advanced.bracket(*, color="orange", orientation="both", ...): ...

with advanced.popup(
    title, *, open=True, modal=True, dismissible=True,
    draggable=True, resizable=True, width=560, height=360,
    position=None, close_action_id=None, color="orange", id=None,
): ...
```

`box`, `diagnostic`, and `data_panel` expose `main()`, `side()`, `left_inputs()`, and
`right_inputs()`. `sweep`, `console`, and `padd` expose `header()`, `column_inputs()`,
`left()`, and `right()`.

```python
with ui.row(*, height="auto"): ...
with ui.col(width="1fr"): ...
ui.columns(["2fr", "1fr"])
with ui.section(label, *, color=None): ...
with advanced.input_column(*, side="left"): ...       # left | right
with advanced.raw(*, reason=None): ...
```

## Authored composition and Surface Engine (`advanced`)

```python
with advanced.composition(
    *, columns, rows, design_size=(1920, 1080), min_width=960,
    narrow="scroll", column_gap="0px", row_gap="0px", id="authored-composition",
) as stage: ...
    with stage.area(area_id, *, row, column, row_span=1, column_span=1, ...): ...

advanced.px(value)
advanced.fr(value=1)
advanced.auto()
advanced.minmax(minimum, maximum)

with advanced.surface(
    *, design_size=(1920, 1080), min_width=960, narrow="scroll",
    narrow_design_size=None, id="surface",
) as surface: ...

advanced.edge_anchor(target, edge, *, offset=0)   # edge: left | right | top | bottom
```

See [Layouts](Layouts) and [Surface Engine](Surface-Engine) for worked examples, and
[docs/surface.md](https://github.com/darsrc/LCARS-WebUI/blob/main/lcars-ui/docs/surface.md)
for the exhaustive geometry reference.

## Rich hints

```python
with ui.hint(
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
widget. A hint has no `id=` of its own — `ctx.show_hint(widget_id)` /
`ctx.hide_hint(widget_id)` (handler-only) address it by its **target's** id.

## Text and status widgets (`ui`)

```python
ui.header(text_value, *, size="h2", ...)
ui.text(content, *, size="body", align="start", ...)
ui.markdown(content, ...)
ui.metric(label, value, *, status="ok", ...)
ui.alert(message, *, level="yellow", blink=False, ...)
ui.progress(label, value, *, show_label=True, ...)
ui.gauge(
    label, value, *, min=0.0, max=100.0, unit=None,
    warn_threshold=None, crit_threshold=None, ...
)
```

- Header sizes: `h1` through `h6`.
- Text sizes: `display`, `h1`, `h2`, `body`, `label`, `micro`, `mono`.
- Metric statuses: `ok`, `warn`, `crit`.
- Alert levels: `red`, `yellow`, `info`, `success`.

## Charts and data widgets

```python
ui.chart(data, *, title=None, ...)                    # -> LineChart
ui.sparkline(data, *, title=None, ...)                 # -> Sparkline
advanced.candlestick(
    data, *, title=None, markers=None, up_color=None, down_color=None, ...
)                                                       # -> Candlestick
advanced.renko(
    data, brick_size, *, title=None, markers=None, up_color=None, down_color=None, ...
)                                                       # -> Renko
advanced.shader(
    fragment_shader, *, title=None, uniforms=None, aspect_ratio=None, ...
)                                                       # -> Shader
ui.table(data, *, title=None, ...)                     # -> Table
ui.log(
    stream_id, *, max_lines=1000, title=None, auto_scroll=True, ...
)                                                       # -> LogViewer
```

Every one of these returns the typed widget object it just declared, not interaction
state — see [Concepts](Concepts#declarations-namespaces-and-return-values).

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

## Media and workspaces (`advanced`)

```python
advanced.video_hls(src, *, title=None, autoplay=False, muted=False, ...)
advanced.three_scene(module, *, title=None, props=None, aspect_ratio=None, ...)
advanced.node_canvas(document, *, title=None, execution=None, ...)
advanced.graph_workspace(workspace, *, title=None, options=None, ...)
advanced.mic_button(
    action_id, *, title=None, upload_url="/lcars/upload/audio",
    timeout_ms=5000, continuous=False, silence_ms=900, ...
)
ui.file_upload(
    label="Upload Files", *, action_id=None,
    upload_url="/lcars/upload/files", accept=None, multiple=True,
    max_files=10, max_bytes=25_000_000, ...
)
```

`three_scene` modules resolve from `app.serve(..., assets_dir=...)`. `node_canvas`
accepts a `GraphDocument` or dictionary. `file_upload`'s registered action delivers
`list[UploadedFile]` on `ctx.value`; uploads are not persisted by the library.

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

## Input widgets and forms (`ui`)

Every input widget declares in place, like every other widget — none of these return a
click flag or the current value. To react to what one did, register
`@app.action(widget_id)` and read `ctx.value`; the table below shows what each carries.

```python
ui.button(label, ...)                                          # ctx.value: None
ui.toggle(label, *, value=False, ...)                           # ctx.value: bool
ui.checkbox(label, *, value=False, ...)                         # ctx.value: bool
ui.select(label, options, *, value=None, settings=None, ...)    # ctx.value: str | list[str]
ui.radio(label, options, *, value=None, settings=None, ...)     # ctx.value: str
ui.radio_toggle(label, options, *, value=None, settings=None, ...)  # ctx.value: str
ui.text_input(
    label, *, value="", placeholder="", password=False, autocomplete=True, ...
)                                                                 # ctx.value: str
ui.command_input(
    label="Command", *, action_id=None, submit_label="Send", placeholder="Enter command…",
    actions=None, multiline=False, clear_on_submit=True, ...
)                                                                 # ctx.value: str
ui.number_input(
    label, *, value=0.0, min=None, max=None, step=1.0, placeholder=None, ...
)                                                                 # ctx.value: float

with ui.form(
    label, action_id, *, submit_label="Submit", color=None, id=None, options=None, ...
): ...                                                            # ctx.value: dict[str, Any]
```

Choice entries may be strings, `SelectOption` objects, or dictionaries. Multi-select is
enabled through `ChoiceOptions(multiple=True)` and delivers `list[str]` on `ctx.value`.

Pass a Pydantic model in place of `form()`'s label to generate and validate the fields —
`ctx.value` is then a real model instance, not a `dict`. See
[Widgets](Widgets#model-backed-forms).

## Knowledge-graph widgets

Version 4.5 added eight semantic instruments; an audit found six had exactly one
downstream consumer and removed them in the v7 trim. Two remain, both in `advanced`:

```python
with advanced.support_panel(
    title, *, node, data=None, show_environments=True, show_legend=False, ...
):
    ...

advanced.tri_state(data, *, on_escalate=None, ...)

@app.action(widget_id)
def on_escalate(ctx: ActionContext[str]) -> None:
    if ctx.value == "EXACT":
        ...
```

- `support_panel`'s `show_environments`/`show_legend` are display toggles, not separate
  mutator calls (the old `environments()`/`atom_legend()` helpers are gone).
- `tri_state`'s `on_escalate="EXACT"` marks the widget as escalatable; clicking it fires
  an ordinary action on the widget's own `id`, delivering `ctx.value == "EXACT"` — it
  does not return a flag itself, exactly like every other widget in v7.
- `tri_state` fields are `query`, `target` (the subject of the query), `scope` (the
  context it was evaluated under), `result` (`YES`/`NO`/`UNKNOWN`), `mode`
  (`FAST`/`EXACT`), `reason`.
- Data model exports: `SupportData`, `SupportCompleteness`, `TriStateData`.

Removed in the v7 trim (all had exactly one downstream consumer): `frontier`,
`assertion_card`, `context_tags`, `anchor_card`, `constraint_band`, `gap_panel`,
`contender_list`, `commitment_selector`. See the
[knowledge-graph audit](https://github.com/darsrc/LCARS-WebUI/blob/main/lcars-ui/docs/knowledge-graph-audit.md).

## Option and state classes

All are importable from `lcars_ui` (the package root):

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

Inside an `@app.action`/`@app.session_start` handler, call these as methods on `ctx`
(`ctx.update(...)`, `ctx.notify(...)`, etc.) — private to the triggering session by
default. Outside a handler (an `@app.live` job), call the same names as plain functions
imported from `lcars_ui`:

```python
lcars_ui.update(widget_id, *, audience=None, **fields)
lcars_ui.notify(
    message, *, level="info", title=None, duration_ms=None,
    dismissible=True, movable=True, audience=None,
)
lcars_ui.append_log(stream_id, *lines, audience=None)
lcars_ui.set_alert_condition(level, *, audience=None)
lcars_ui.set_theme(theme, *, audience=None)
```

`ctx.show_hint(widget_id)` / `ctx.hide_hint(widget_id)` are handler-only (no plain
root-level function).

- Notification levels: `info`, `success`, `warning`, `error`.
- Alert conditions: `normal`, `yellow`, `red`.
- Themes: see [Themes](#themes) above.
- Every effect defaults to `audience="session"` (private) except `set_theme` and
  `set_alert_condition`, which default to `audience="all"`.

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

## Testing

```python
with app.test_client() as client:
    session = client.session()
    session.pages                                   # list[str] of page ids, in order
    session.widget(widget_id)                        # current rendered BaseWidget
    session.action(widget_id, value=None)             # -> list[Envelope]
    session.submit(form_id, {...})                    # -> list[Envelope]
    session.logs(stream_id)                           # list[str], arrival order
    session.effects                                   # all Envelopes so far
    session.effects_since(mark, type=None)             # mark = len(session.effects)
```

Handler exceptions are re-raised by `action()`/`submit()` so a test fails at the call
that caused them. See [docs/quickstart.md](https://github.com/darsrc/LCARS-WebUI/blob/main/lcars-ui/docs/quickstart.md#5-test-your-app).

## CLI

```bash
lcars new NAME [--dir PATH] [--port PORT]
lcars dev [TARGET] [--host HOST] [--port PORT] [--no-reload] [--open]
lcars check [TARGET]
lcars run [TARGET] [--host HOST] [--port PORT]
lcars migrate PATH [PATH ...] [--json]
```

`lcars check` imports the application, runs every declared page, and validates the
manifest — nothing is served. It exits `2` if the application could not be found or
imported, `1` if manifest construction fails, `0` otherwise. See
[Troubleshooting](Troubleshooting#lcars-check-fails) and
[docs/migration.md](https://github.com/darsrc/LCARS-WebUI/blob/main/lcars-ui/docs/migration.md).

---

**See also:** [Widgets](Widgets) ·
[Actions and State](Actions-and-State) · [Deployment](Deployment)
