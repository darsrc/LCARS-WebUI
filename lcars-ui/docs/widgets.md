# Widget Reference

Widgets live in two modules, imported alongside `App`:

```python
import lcars_ui
from lcars_ui import ActionContext, App, advanced, ui
```

Typed option/data classes referenced below (`lcars_ui.TableOptions`,
`lcars_ui.GraphDocument`, and so on) come from that plain `lcars_ui` import — import
individual names instead if you prefer.

- **`ui`** — ordinary widgets: panels, text, readouts, the common controls, tables,
  charts, forms. This is what most pages need.
- **`advanced`** — specialist surfaces: authored/Surface Engine layouts, graph
  workspaces, `three_scene`, `shader`, `mic_button`, `video_hls`, and the surviving
  knowledge-graph widgets (`support_panel`, `tri_state`).

Every widget function **declares** its widget inside an `@app.page(...)` function and
returns the declared widget object (or, for containers, a context manager). It does not
report clicks, current values, or anything else that happened later — there is no rerun
in v7. To react to something a widget did, register a handler with `@app.action(widget_id)`
and read the event from `ctx.value`; see [quickstart.md](quickstart.md) if that sentence
is new to you, and [migration.md](migration.md) if you are porting a v6
(`if lcars.button(...):`-shaped) application.

Most widget calls accept:

- `id=` — stable identity; required on anything you reference from an action handler,
  another widget's `hint=`, or `update()`.
- `color=` — see [Colors](#colors) below.
- `hint=` — a short tooltip, or a target for a richer `ui.hint()` block.
- `zone=`, `span=`, `weight=`, `aspect=`, `group=`, `sizing=` — adaptive layout hints; see
  [layout & composition](dsl.md#adaptive-layout-archetypes--zones).
- `visible=` and, for interactive widgets, `disabled=`.
- `options=` for typed capabilities (choice widgets use `settings=` instead, since their
  positional `options` argument already means "the choices").

## Colors

Two kinds of `color=` value work:

- **A hex code** — `"#f89800"` or `"#f80"` — always renders exactly that color.
- **A named LCARS token** — shifts with the active theme. These names are guaranteed to
  render as a distinct accent in every bundled theme:

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

That table is the whole list — it is exactly the key set of `COLOR_VAR` in
`frontend/src/widgets/rendererShared.ts`. The larger set of Okuda-era names earlier
releases accepted (`purple`, `indigo`, `husk`, `rust`, `tamarillo`, `bourbon`, `cosmic`,
and others) is **rejected** by the v2 manifest schema: none of them resolved to a themed
accent, so a widget given one rendered with no visible tint at all. The rejection names
the token and lists what is accepted, and `lcars migrate` reports the same thing
statically as a `removed_color_token` finding.

`app.config(..., theme=...)` accepts `"galaxy"` (default), `"nemesis"`, `"tng"`,
`"outpost"`, `"cardassian"`, `"klingon"`, `"romulan"`, `"ferengi"`, or `"gruvbox"`; every
named token above shifts hue with it. `ctx.set_theme(...)` (or, outside a handler,
`lcars_ui.set_theme(...)`) changes it at runtime.

## Typed capability model

Widgets have opt-in typed capabilities beyond their positional arguments. A call that
does not pass `options=` (or `settings=` for choice widgets) gets a plain payload and
default rendering; passing one unlocks richer behavior without changing widget type.

- `disabled=`, `visible=`, and the layout hints are always available from the DSL.
- Display interactions (sort, filter, page, expand, collapse, dismiss) default to
  **browser-local** state that survives navigation and manifest refreshes for the
  current session, but never reaches Python. Pass
  `InteractionOptions(mode="server")` (nested inside the widget's own `options=`) to have
  the interaction post an action to your handler instead — see
  [Server interaction state](#server-interaction-state).
- Pydantic remains the contract source; `make contracts-update` regenerates the JSON
  Schema, TypeScript declarations, and the standalone Ajv validator when a widget model
  changes.

| Widget calls | Typed capabilities |
|---|---|
| `ui.text` | `TextOptions`: semantic element, wrapping, line clamp, selection, copy, safe link |
| `ui.markdown` | `MarkdownOptions`: link target, max height, copy buttons for code |
| `ui.metric` | `MetricOptions`: secondary value, trend, numeric formatting |
| `ui.alert` | `AlertOptions`: dismiss, action, live-region policy, local/server state |
| `ui.progress`, `ui.gauge` | `MeterOptions`: range, unit, formatting, segments, ticks, thresholds, indeterminate |
| `ui.header` | `HeaderOptions`: subtitle, anchor, actions |
| `ui.button` | `ButtonOptions`: payload, confirmation, debounce, busy label |
| `ui.toggle`, `ui.checkbox` | `ToggleOptions`: explicit on/off labels |
| `ui.select`, `ui.radio`, `ui.radio_toggle` | `ChoiceOptions` (via `settings=`): search, multi-select, placeholder; typed option groups and disabled choices |
| `ui.text_input` | `TextInputOptions`: multiline, input type, commit policy, debounce, validation |
| `ui.number_input` | `NumberInputOptions`: precision, prefix/suffix, commit policy, required |
| `ui.form` | `FormOptions`: stack/row/grid layout, reset, cancel, value coercion |
| `ui.table` | `TableOptions`: typed columns/cells, sort, filters, pagination, selection, child rows, expanded content, copyable cells, sticky header, client/server data mode, emitted state events |
| `ui.chart` | `ChartOptions`: axes, legend, tooltips, line mode, references, zoom, local/server state |
| `ui.sparkline` | `SparklineOptions`: tooltip, latest value, range, reference value |
| `advanced.candlestick`, `advanced.renko` | `FinancialChartOptions`: volume, legend, tooltip, fit, precision, local/server state |
| `advanced.shader` | `ShaderOptions`: pause, frame limit, reduced-motion policy, fallback |
| `ui.log` | `LogOptions`: wrap, line numbers, timestamps, search, levels, toolbar, pause, local/server state |
| `advanced.video_hls` | `VideoOptions`: controls, looping, preload, rates, source visibility, local/server state |
| `advanced.mic_button` | `MicOptions`: device, MIME preference, VAD threshold, duration and byte limits |
| `ui.file_upload` | Multipart drag/drop input with type, count, and byte limits |
| `advanced.popup` | Movable/resizable modal or modeless overlay with recursive widget content |
| `advanced.three_scene` | `ThreeSceneOptions`: camera, orbit controls, pause, frame limit, reduced-motion policy, DPR cap, fallback, local/server state |
| `advanced.node_canvas` | `NodeCanvasOptions`: editable, zoom range, grid snapping, minimap, palette, import/export, history limit, run/queue/cancel toolbar, local/server state |
| `advanced.graph_workspace` | `GraphWorkspaceOptions`: proposal transactions, density navigation, virtualization, submission |
| `ui.box`, `advanced.sweep`, `advanced.bracket`, container recipes | `ContainerOptions`: density, overflow, collapse, local/server state |

All option and state classes are exported from `lcars_ui` (e.g. `lcars_ui.TableOptions`).

## Catalog

### Text and status (`ui`)

| Function | Description |
|--------|-------------|
| `ui.header(text, size="h2")` | LCARS heading with optional subtitle, anchor, actions |
| `ui.text(content, size="body")` | Plain text (`display`, `h1`, `h2`, `body`, `label`, `micro`, `mono`) |
| `ui.markdown(content)` | Rendered Markdown with safe links |
| `ui.metric(label, value, status="ok")` | Status tile; `ok`, `warn`, or `crit` |
| `ui.alert(message, level="yellow", blink=False)` | Alert banner (`red`/`yellow`/`info`/`success`) |
| `ui.progress(label, value)` | Segmented progress meter, 0–100 |
| `ui.gauge(label, value, min=0, max=100, unit=None)` | Segmented gauge with thresholds |

```python
ui.header("Propulsion", size="h2", color="pale-canary")
ui.metric("Warp Core", "98%", status="ok", id="warp-core")
ui.progress("Shield Recharge", 72.0, color="anakiwa")
ui.gauge("Deflector Load", 64, unit="%", warn_threshold=75, crit_threshold=90)
ui.alert("Coolant pressure elevated", level="yellow")
```

Notification levels are separate from `alert()` levels — `notify()` (an effect, called
from `ctx.notify(...)` or, in a live job, `lcars_ui.notify(...)`) accepts `info`,
`success`, `warning`, and `error`.

### Charts and data (`ui`, plus `advanced` for financial charts)

| Function | Description |
|--------|-------------|
| `ui.chart(data, title=None)` | Line chart (list, mapping of series, or DataFrame) |
| `ui.sparkline(data, title=None)` | Compact trend plot |
| `advanced.candlestick(data, title=None, markers=None)` | Zoomable OHLC chart |
| `advanced.renko(data, brick_size, title=None)` | Server-computed Renko brick chart |
| `advanced.shader(fragment_shader, uniforms=None)` | Animated WebGL fragment-shader viewport |
| `ui.table(data, title=None)` | Simple or fully interactive typed table |
| `ui.log(stream_id, title=None)` | Streaming log viewer; append with `append_log` |

`chart` and `sparkline` accept a numeric list, a mapping of series names to numeric
lists, or supported pandas data. `candlestick` accepts OHLC dictionaries (or a matching
DataFrame); `renko` accepts prices, `close`/`price` dictionaries, or a pandas Series.

```python
ui.chart({"EPS A": [18, 21, 26, 34], "EPS B": [12, 17, 24, 29]}, title="EPS Flow")

advanced.candlestick(
    ohlc_rows,
    title="ES Futures",
    markers=[{
        "time": "2026-08-08", "position": "below", "shape": "arrow_up",
        "color": "anakiwa", "text": "BUY",
    }],
    up_color="anakiwa",
    down_color="hopbush",
)
```

Marker positions are `above`, `below`, `in`; shapes are `arrow_up`, `arrow_down`,
`circle`, `square`. `renko` requires a positive `brick_size` and renders without wicks
(Renko convention).

### Inputs and forms (`ui`)

| Function | What it declares |
|--------|-------------|
| `ui.button(label)` | Clickable button |
| `ui.toggle(label, value=False)` | On/off switch |
| `ui.checkbox(label, value=False)` | LCARS checkbox |
| `ui.select(label, options, value=None)` | Segment bank or option stack (never a native dropdown) |
| `ui.radio(label, options, value=None)` | Radio group |
| `ui.radio_toggle(label, options, value=None)` | Segmented radio toggle |
| `ui.text_input(label, value="")` | Text field |
| `ui.command_input(label="Command")` | Chat/command composer; Enter submits |
| `ui.number_input(label, value=0)` | Numeric field with stepper |
| `ui.file_upload(label, ...)` | Drag/drop multipart upload |
| `ui.form(label_or_model, action_id)` | Groups child inputs into one submission |

Each declares its starting value; what happens when a person changes it is entirely the
job of an `@app.action(widget_id)` handler reading `ctx.value`:

```python
@app.page("Ops", id="ops")
def ops() -> None:
    ui.select("Mode", ["Cruise", "Alert"], value="Cruise", id="mode")
    ui.number_input("Gain", value=5, min=0, max=10, id="gain")
    ui.button("Apply", id="apply")

@app.action("apply")
def apply_settings(ctx: ActionContext[None]) -> None:
    ctx.notify("Applied.")
```

`ui.button` fires its action with `ctx.value is None`; standalone `toggle`/`checkbox`
widgets fire with the new `bool`; `select`/`radio`/`radio_toggle` fire with the new `str`
(or `list[str]` for a multi-select); standalone `text_input` fires with the new `str`;
and standalone `number_input` fires with the new `float`. `command_input` is a form, so
its payload shape is described below.

Forms submit a group of child inputs as one action:

```python
with ui.form("Warp Setup", action_id="warp-submit", submit_label="Commit", id="warp-form"):
    ui.number_input("Warp Factor", value=5.0, id="warp-factor")
    ui.toggle("Dampeners", value=True, id="dampeners")

@app.action("warp-submit")
def warp_submit(ctx: ActionContext[dict]) -> None:
    ctx.notify(f"Warp factor {ctx.value['warp-factor']}")
```

For a hand-built form, `ctx.value` is the submitted dictionary keyed only by each child
widget's `id` (`warp-factor` and `dampeners` above), not its label or a derived plain field
name. Values are the submitted form values; no model parsing occurs.

Pass a Pydantic model in place of the label and the fields are generated from it instead.
A valid submission arrives as that model instance. Generated fields have ids of the form
`{form_id}-{field_name}`, with underscores in the field name changed to hyphens. The
browser submits those widget ids; the server and `session.submit()` also accept plain
model field names for convenience. If a payload supplies both forms of a key, the
generated widget id takes precedence.

Model validation happens before dispatch. On failure the handler is not invoked:
field-specific Pydantic messages appear as error feedback beside the generated control,
while model-level and cross-field messages appear on the form. Choice-control feedback
is stored in its `settings`; other generated fields and the form use `options`. A later
valid submission clears prior feedback. See
[Model-backed forms](quickstart.md#7-model-backed-forms) for an executed example.

An action handler cannot bind child or model field names as parameters. Its first
parameter receives `ActionContext`; any later annotated parameters are dependency-injected
services registered with `app.provide(...)`. Read `ctx.value["warp-factor"]` for a
hand-built form, or `ctx.value.gain` for a model-backed form.

For a chat prompt or command line, use `command_input` rather than composing `text_input`
+ `button` by hand — it keeps the field, send control, and optional secondary actions in
one wide LCARS instrument. A single-line composer submits with Enter and clears by
default; multiline mode (`multiline=True`) reserves plain Enter for a newline and submits
with Ctrl+Enter (Command+Enter on macOS):

```python
ui.command_input(
    "Message",
    action_id="send-message",
    placeholder="Transmit a message…",
    actions=[lcars_ui.ActionSpec(label="New Session", action_id="new-session")],
    id="composer",
)

@app.action("send-message")
def on_message(ctx: ActionContext[dict[str, object]]) -> None:
    ctx.append_log("conversation", f"YOU: {ctx.value['composer-value']}")
```

`command_input` is a one-field form, not a standalone text input. With `id="composer"`,
its `ctx.value` is `{"composer-value": "the submitted text"}`. Its generated action id
is `composer-submit` when `action_id` is omitted; declaring `action_id` explicitly, as
above, makes the handler relationship obvious.

### File uploads

```python
@app.page("Import", id="import")
def import_page() -> None:
    ui.file_upload(
        "Training Data",
        accept=[".json", "application/json"],
        max_files=4,
        max_bytes=10_000_000,
        id="training-data",
    )

@app.action("training-data")
def on_upload(ctx: ActionContext[dict]) -> None:
    for f in ctx.value["files"]:
        ingest(f["name"], f["data"])          # f["data"] is raw bytes
    ctx.notify(f"{len(ctx.value['files'])} file(s) received.", level="success")
```

`ctx.value` is `{"files": [...]}`, each entry a dict with `name` (sanitized client
filename), `size`, `content_type`, and `data` (the raw bytes). The default endpoint is
`POST /lcars/upload/files`; it applies the server-wide `LCARS_MAX_FILE_UPLOAD_BYTES`
aggregate limit and sends bytes only to your handler — the browser only ever sees
metadata. Consume or persist each file's bytes inside the handler; nothing is retained
afterward (the ASGI multipart implementation may spool larger parts to disk temporarily
while parsing, but LCARS itself does not keep them).

## Server interaction state

`table`, `chart`, `candlestick`, `renko`, `log`, `video_hls`, and collapsible containers
can post a typed event to Python instead of (or alongside) resolving sort/filter/paging
locally in the browser. Nest `InteractionOptions(mode="server")` inside the widget's
`options=`, and register an `@app.action` handler for the same widget id (or the
`action_id` you gave the interaction). The action's `ctx.value` arrives as
`{"kind": "<event>", "state": {...}}`:

```python
@app.page("Results", id="results-page")
def results() -> None:
    ui.table(
        rows,
        id="results",
        options=lcars_ui.TableOptions(
            columns=[
                lcars_ui.TableColumn(key="name", sortable=True),
                lcars_ui.TableColumn(key="load", sortable=True, value_type="number"),
            ],
            interaction=lcars_ui.InteractionOptions(mode="server"),
        ),
    )

@app.action("results")
def on_results_interaction(ctx: ActionContext[dict]) -> None:
    if ctx.value["kind"] == "sort":
        rows_sorted = apply_sort(rows, ctx.value["state"]["sort"])
        ctx.update("results", rows=rows_sorted)
```

This example — the page, the handler, and dispatching a `sort` event through
`app.test_client()` — was executed while writing this guide.

For an enhanced table specifically, `data_mode` chooses *where* sort/filter/pagination
run, independently of whether Python is notified at all:
`data_mode="client"` (the default) with `emit_state_changes=True` keeps all data
operations in the browser while still emitting the typed event above on every
selection/expansion/sort/filter/page change — useful when Python wants to *observe*
interaction without owning the data operations themselves. The legacy
`InteractionOptions(mode="server")` shorthand is equivalent to
`data_mode="server", emit_state_changes=True`.

Dismissible alerts (`AlertOptions(dismissible=True, interaction=...)`) and collapsible
containers (`ContainerOptions(collapsible=True, interaction=...)`) use the same
mechanism: register the widget's own id (or its own `interaction.action_id`) as an
`@app.action`, and read `ctx.value["kind"]` (`"dismiss"`, `"collapse"`, ...) and
`ctx.value["state"]`.

## Enhanced tables

Without `TableOptions`, a `list[dict]` creates a simple table whose headers come from the
first dictionary's keys. Typed rows separate raw values from presentation, links,
copying, and expanded detail:

```python
rows = [
    lcars_ui.TableRow(
        id="repo-a",
        cells=[
            lcars_ui.TableCell(
                value="org/repo-a",
                link=lcars_ui.LinkSpec(href="https://huggingface.co/org/repo-a"),
            ),
            4_200_000,
            91,
        ],
        children=[
            lcars_ui.TableRow(id="repo-a-files", cells=["model.safetensors", 4_100_000, None]),
        ],
    ),
]

ui.table(
    rows,
    title="Search Results",
    id="results",
    options=lcars_ui.TableOptions(
        columns=[
            lcars_ui.TableColumn(key="repo", label="Repository", sortable=True, filter="text"),
            lcars_ui.TableColumn(
                key="size", label="Size", value_type="number", sortable=True, align="end",
                value_format=lcars_ui.ValueFormat(compact=True, suffix="B"),
            ),
            lcars_ui.TableColumn(key="fit", label="Fit", value_type="number", sortable=True),
        ],
        expandable=True,
        sticky_header=True,
        pagination=lcars_ui.TablePagination(page_size=25),
        selection=lcars_ui.TableSelection(mode="multiple"),
    ),
)
```

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
lcars_ui.TableColumn(key="ram", label="RAM", sortable=True, sort_as="bytes")
lcars_ui.TableColumn(key="started", label="Started", sortable=True, sort_as="datetime")
lcars_ui.TableColumn(
    key="state", label="State", sortable=True,
    sort_order=["running", "sleeping", "stopped"],  # categorical, unlisted values last
    sort_nulls="first",                              # empty cells first in both directions
)
```

- `sort_as` — `auto` (default, sniffed), `text`, `natural`, `number`, `bytes`, `percent`,
  `duration`, `currency`, `datetime`, `version`, `boolean`. An explicit `value_type`
  (`number`/`date`/`boolean`/`text`) also pins the comparison; `sort_as` wins over both.
- `sort_order` — explicit ranking for categorical columns; values not listed sort after
  the listed ones, then naturally among themselves.
- `sort_nulls` — `last` (default) or `first`.

Numeric filters (`gt`/`gte`/`lt`/`lte`) use the same column scale, so filtering a byte
column with `1.5GB` compares against real byte counts. Sorting is only inferred for
client-side data; with `data_mode="server"` your code owns the ordering.

Sortable server-controlled tables automatically use a two-state header cycle (ascending →
descending → ascending); set `sort_cycle="three-state"` to retain a clear-on-third-click
state, or `sort_cycle="two-state"` to enforce two states in client mode as well.

### Copyable cells, expanded content, and lazy expansion

- `TableCell(copyable=True, copy_value=...)` adds a COPY button (coexists with a link);
  `copy_on_click=True` makes the cell body the copy target and cannot combine with a link
  or action.
- `TableRow.expanded_content` renders a restricted display union (`TableDetailText`,
  `TableDetailStatus`, `TableDetailLink`, `TableDetailAction`, `TableDetailTable`)
  full-width beneath the row, alongside any ordinary `children`.
- With `emit_state_changes=True`, expanding a row emits an expansion event (see
  [Server interaction state](#server-interaction-state)); set `TableRow.loading=True` for
  a loading affordance or `TableRow.error="…"` for an inline error with a Retry that
  re-emits the event.

The manifest is authoritative: `ctx.update("results", rows=...)` from a handler can
programmatically select or expand rows, plain data refreshes preserve in-progress user
interaction, and ids removed from the dataset are pruned from selection/expansion.
Selection is keyed by `TableRow.id`, so highlighting is stable across sorting, filtering,
pagination, and navigation.

## Media and interactive workspaces

### HLS video (`advanced`)

```python
advanced.video_hls("/media/telemetry.m3u8", title="Visual Feed", autoplay=False)
```

`VideoOptions` controls looping, preload, playback rates, source display, and
client/server state.

### Shader viewport (`advanced`)

Every shader receives built-in uniforms: `u_time` (seconds since mount), `u_resolution`
(canvas size in physical pixels), `v_uv` (UV coordinates in `[0, 1]`). Custom uniforms
come from the `uniforms` dict — a `float` becomes `uniform float name;`, a `list[float]`
of length 2/3/4 becomes `uniform vec2/vec3/vec4 name;`.

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
advanced.shader(WARP_GLOW, title="Warp Core", uniforms={"u_color": [0.973, 0.6, 0.0]}, aspect_ratio=2.0)
```

`aspect_ratio` (optional) locks the canvas height to `width / aspect_ratio`. Compile
errors render as an inline error banner rather than crashing the page. `ShaderOptions`
covers pause, frame limiting, reduced motion, and fallback content.

### Managed Three.js scene (`advanced`)

This is the one widget whose behavior is written in JavaScript, not Python — real 3D
needs geometry construction, loaders, and imports, which don't survive being passed
through the manifest as a source string the way `shader`'s GLSL does.

```python
advanced.three_scene(
    "scenes/warp_core.js",
    title="Core Assembly",
    props={"level": 0.85},
    options=lcars_ui.ThreeSceneOptions(
        camera=lcars_ui.ThreeSceneCamera(position=(4, 3, 6)),
        controls=lcars_ui.ThreeSceneControls(auto_rotate=True),
    ),
    id="core",
)
```

The module default-exports `setup(context)`, synchronously or `async`:

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

LCARS owns the canvas, renderer, camera, `OrbitControls`, resizing, the frame loop,
visibility pausing, and teardown; the module owns only what is in the scene. `context`
also carries `GLTFLoader`, `renderer`, `controls`, `canvas`, `assetUrl(path)`,
`invalidate()`, and `emit(kind, payload)`. The returned controller may implement
`update(delta, elapsed)`, `resize(w, h)`, `updateProps(props)`, and `dispose()`.

A scene module is resolved relative to a read-only directory mounted at
`/lcars/assets/`. Pass it straight to `app.serve()`:

```python
app.serve(port=8077, assets_dir="examples/kitchen_sink/assets")
```

To deploy behind an existing ASGI server instead, forward the same
`assets_dir` to `create_app()`:

```python
from lcars_ui.app import create_app
import uvicorn

server = create_app(
    manifest=app.build_manifest(),
    app=app,
    assets_dir="examples/kitchen_sink/assets",
)
uvicorn.run(server, host="127.0.0.1", port=8077)
```

(This exact `create_app(..., assets_dir=...)` call, including the resulting
`/lcars/assets` route, was executed while writing this guide.)

Missing modules, bad exports, initialization failures, frame errors, absent WebGL2, and
context loss all resolve to an in-panel message rather than taking the console down.
Camera state is emitted only when an orbit/pan/zoom gesture *ends*, never per frame; with
`options.interaction.mode="server"` the widget id's action receives a `ThreeSceneState`
(camera pose, `last_event`, any custom `emit` payload). Three.js loads as a lazy chunk, so
pages without a scene pay nothing for it.

### Node canvas (`advanced`)

A typed, editable node-graph editor. The library is engine-agnostic and never executes a
workflow: `run`, `queue`, and `cancel` emit the current graph as an action and your
application does the work.

```python
document = lcars_ui.GraphDocument(
    templates=[
        lcars_ui.NodeTemplate(
            id="filter", label="Filter", category="Process", color="anakiwa",
            inputs=[lcars_ui.GraphPort(id="input", type="stream")],
            outputs=[lcars_ui.GraphPort(id="output", type="stream")],
            fields=[lcars_ui.GraphField(id="cutoff", kind="number", default=42.0)],
        ),
    ],
    nodes=[lcars_ui.GraphNode(id="f1", template="filter", position=(120, 40))],
)

advanced.node_canvas(
    document,
    title="Sensor Pipeline",
    execution=lcars_ui.GraphExecutionState(status="running"),
    options=lcars_ui.NodeCanvasOptions(
        show_run=True,
        interaction=lcars_ui.InteractionOptions(mode="server", action_id="graph-changed"),
    ),
)
```

**Format.** `lcars-node-graph` version 1 is the backward-compatible unlayered document.
Templates are declared once and referenced by nodes. Ports connect output→input when
their types match or either is `"any"`. An input accepts one connection unless it
declares a larger `capacity`; an output fans out without limit unless it declares one.
Duplicate, dangling, and type-incompatible edges are rejected on both sides.

Version 2 adds a caller-defined edge-layer grammar for truthful graphs — every version-2
edge must reference a declared layer; layer ids and meanings stay entirely in the
application, and LCARS renders only the supplied color, non-color line pattern, marker,
labels, and defaults:

```python
document = lcars_ui.GraphDocument(
    version=2,
    layers=[
        lcars_ui.GraphLayer(
            id="layer-a", label="Layer A", token="LA", color="anakiwa",
            pattern="dashed", marker="arrow_open",
        ),
    ],
    templates=templates,
    nodes=nodes,
    edges=[
        lcars_ui.GraphEdge(
            id="e1", source="a", source_port="out", target="b", target_port="in",
            layer="layer-a", label="Related to",
        ),
    ],
)
advanced.node_canvas(document, options=lcars_ui.NodeCanvasOptions(editable=False))
```

The persistent legend shows visible/total counts and controls reader-local visibility and
emphasis without deleting or changing graph data. Parallel edges get stable lanes,
reciprocal directions use opposite sides, self-loops nest, and a selected edge gets a
continuous trace without replacing its layer pattern. With `editable=True`, a completed
drag opens a chooser populated from the document's declared layers, so an unlayered
version-2 edge is never created. The runnable reader example is
`examples/layered_graph/app.py`.

**Execution status is separate from the document.** `GraphExecutionState` carries overall
and per-node `idle|queued|running|success|error|cancelled` plus progress and messages —
keeping it out of the editable document is what lets status stream in continuously
without clobbering an edit in the user's hands.

**Editing.** Add/delete/move/multi-select, typed field editing, connect/disconnect,
pan/zoom, a contained minimap, optional grid snapping, copy/paste/duplicate, bounded
undo/redo, align and distribute, group frames, comments, edge reroutes, a searchable
template palette, and native JSON import/export. Set `options.editable=False` for a
read-only view. The editor loads as a lazy chunk.

### Graph proposal workspace (`advanced`)

`graph_workspace` is a server-driven proposal workbench built on the node canvas. Its
versioned `GraphWorkspaceDocument` keeps an immutable canonical revision, proposal-local
changes, reader navigation state, and ingestion receipts separate.

```python
revision = lcars_ui.GraphRevision(graph_id="network", revision="r17")
workspace = lcars_ui.GraphWorkspaceDocument(
    format="lcars-graph-workspace", version=1, workspace_id="workbench",
    canonical=lcars_ui.CanonicalPlane(graph=revision, records=canonical_records),
    proposal=lcars_ui.ProposalPlane(proposal_id="draft", title="Draft", base=revision),
    record_schemas=record_schemas, tree_schemas=tree_schemas,
    validation_rules=validation_rules, actions=actions,
)

advanced.graph_workspace(
    workspace,
    title="Proposal workbench",
    options=lcars_ui.GraphWorkspaceOptions(
        fan_page_size=20,
        interaction=lcars_ui.InteractionOptions(mode="server", action_id="workspace"),
    ),
)
```

Draft record create/edit/delete and proposal graph edits are transactional. Undo, redo,
autosave, and the interaction counter are proposal-scoped; pan, zoom, layer visibility,
collapse, focus, filters, search, breadcrumbs, and history are reader state. Virtual
lists bound large record/diff surfaces; submission emits a versioned command with
structural diff and preflight data. The runnable example is
`examples/graph_workspace/app.py`.

### Microphone (`advanced`)

```python
advanced.mic_button("voice-command", continuous=True, silence_ms=900, id="mic")

@app.action("voice-command")
def on_voice_command(ctx: ActionContext[dict]) -> None:
    transcribe(ctx.value)   # whatever your own upload_url/STT backend returns
```

Push-to-talk (default): click once to record, click again (or wait `timeout_ms`, default
5s) to stop; the clip uploads automatically and the action fires when it completes.
Continuous mode (`continuous=True`): click once to arm, then the widget uses browser
voice-activity detection to upload each utterance automatically — `silence_ms` (default
900ms) is how long a pause must last before an utterance is considered finished;
`timeout_ms` is a safety cap for one very long utterance. Microphone access requires
HTTPS or localhost. It uploads to `/lcars/upload/audio` by default; point `upload_url` at
your own endpoint to integrate a different speech-to-text backend.

## Containers

| Context manager | Best use | Namespace |
| --- | --- | --- |
| `data_panel(title)` | Charts, tables, logs, text, readouts | `ui` |
| `control_panel(title)` | Buttons, inputs, forms | `ui` |
| `box(title)` | Lower-level framed LCARS region | `ui` |
| `console(title)` | Explicit header, input column, left/right regions | `advanced` |
| `padd(title)` | Compact detail or review views | `advanced` |
| `diagnostic(title)` | Main/side diagnostic instruments | `advanced` |
| `sweep(title)` | Explicit sweep geometry, bilateral content | `advanced` |
| `bracket(...)` | Lightweight framed grouping | `advanced` |
| `popup(title)` | Movable/resizable modal or modeless overlay | `advanced` |

Collapsible containers can post server events the same way tables do — see
[Server interaction state](#server-interaction-state) — with `ContainerOptions`.

`advanced.raw(reason=...)` is a local strict-layout escape hatch. `advanced.input_column(side="left" | "right")`
declares an input-oriented rail. Prefer these semantic containers over the page-level
`row`/`col` grid escape hatch documented in [layout & composition](dsl.md).

## Hints and pop-ups

A string hint is the short form:

```python
ui.button("Engage", id="engage", hint="Initiates warp drive")
```

A rich hint is attached after its target and can contain widgets:

```python
ui.button("Inspect", id="inspect")
with ui.hint("inspect", trigger="click", placement="right", title="Briefing"):
    ui.text("Warp-core pressure")
    ui.sparkline([82, 84, 87, 85])
```

Triggers: `hover`, `focus`, `click`, `press`, `always`, `manual`. Placements: `auto`,
`top`, `bottom`, `left`, `right`. Manual hints respond to `ui.show_hint(widget_id)` /
`ui.hide_hint(widget_id)` (or, from inside an action handler, `ctx.show_hint(...)` /
`ctx.hide_hint(...)`). Rich hint controls dispatch normal actions, exactly like the same
widget declared on the page.

```python
with advanced.popup(
    "Transfer Details", modal=False, draggable=True, resizable=True,
    close_action_id="close-transfer", id="transfer-popup",
):
    ui.text("Payload accepted.")
```

Pop-ups stay inside the viewport after movement/resizing/rotation and support pointer and
keyboard movement. `notify()` (`ctx.notify(...)`) creates a movable notification with
`info`, `success`, `warning`, or `error` level plus optional `title`, `duration_ms`, and
dismissal settings.

## Knowledge-graph widgets

Version 4.5 added eight semantic instruments for versioned knowledge-graph payloads. An
audit (`docs/knowledge-graph-audit.md`) found six had exactly one downstream consumer and
removed them; `support_panel` and `tri_state` remain — the two with a real reuse case
beyond their origin application. Both live in `advanced`.

```python
support_data = {
    "node": "n07",
    "truncated": False,
    "environments": [
        {"atoms": [
            {"id": "e01", "type": "empirical", "label": "HH 1952 voltage clamp"},
            {"id": "a04", "type": "assumption", "label": "space clamp"},
        ]},
    ],
}

with advanced.support_panel(
    "Alternative Support", node="n07", data=support_data,
    show_environments=True, show_legend=True, id="support-n07",
):
    pass

advanced.tri_state(
    {
        "query": "supported_under", "target": "n07", "scope": "c02",
        "result": "UNKNOWN", "mode": "FAST", "reason": "label_truncated",
    },
    on_escalate="EXACT",
    id="support-query-n07",
)

@app.action("support-query-n07")
def escalate(ctx: ActionContext[str]) -> None:
    if ctx.value == "EXACT":
        run_exact_query()
```

(This exact page — both widgets, plus dispatching the escalate action through
`app.test_client()` — was executed while writing this guide.)

`support_panel()` folds its display toggles into keyword arguments: `show_environments`
renders (or, if `False`, suppresses) the alternative support environments;
`show_legend` renders the empirical/formal/assumption legend. `"environments": []` means
unsupported; `"environments": [{"atoms": []}]` means support-independent — a distinction
the widget preserves rather than collapsing to one "empty" state. It may still hold
nested child widgets declared inside its `with` block.

`tri_state()` always returns the declared `TriState` widget, exactly like every other
widget — it does not report clicks. When a viewer triggers the optional `EXACT`
escalation, the widget's own `id` fires an action with `ctx.value == "EXACT"`; handle it
with `@app.action(widget_id)` as shown above. `UNKNOWN` renders as a neutral semantic
result, not warning or alert chrome. `target` names the subject of the query; `scope`
names the context it was evaluated under.

## Update pattern

From inside an action handler, mutate widgets through `ctx`:

```python
@app.action("refresh")
def refresh(ctx: ActionContext[None]) -> None:
    ctx.update("prog-repair", value=67.0)
    ctx.update("gauge-shields", value=91.2)
    ctx.update("md-report", content="## Updated")
```

From an `@app.live(...)` job, which has no triggering session, use the plain
root-level effect functions instead — they act on whichever context is active:

```python
@app.live(interval=2.0)
def tick() -> None:
    lcars_ui.update("prog-repair", value=next(readings))
```

Both forms are private to one session by default (a live job defaults to `audience="all"`
instead — see `App.live`'s `audience=` parameter); pass `audience="all"` /
`audience="session"` explicitly to override.
