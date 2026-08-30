# lcars-ui

`lcars-ui` is a Python 3.10+ library for building live, browser-rendered LCARS
applications. You declare pages and instruments in Python; the package builds a typed
manifest, serves it with FastAPI, and renders it with a bundled React frontend. Standard
dashboard users do not need Node.js.

Current package version: **7.1.0**.

## Live example gallery

The screenshots below are generated from the bundled examples at 1920×1080. They show
real browser output, including clicked hints, notifications, uploaded-file state, and
lazy table expansion.

| Rich interaction | Spatial workspaces |
| --- | --- |
| ![Rich hint and notification](https://raw.githubusercontent.com/darsrc/LCARS-WebUI/main/docs/screenshots/rich-hint-notification.png) | ![Editable node canvas](https://raw.githubusercontent.com/darsrc/LCARS-WebUI/main/docs/screenshots/node-canvas.png) |

| Layered graph reader | Layer visibility and emphasis |
| --- | --- |
| ![Caller-defined graph edge layers](https://raw.githubusercontent.com/darsrc/LCARS-WebUI/main/docs/screenshots/layered-node-canvas.png) | ![Filtered and emphasized edge layers with a selected trace](https://raw.githubusercontent.com/darsrc/LCARS-WebUI/main/docs/screenshots/layered-node-canvas-filtered.png) |

| Proposal workspace | Typed draft authoring |
| --- | --- |
| ![Canonical and proposal planes](https://raw.githubusercontent.com/darsrc/LCARS-WebUI/main/docs/screenshots/graph-workspace.png) | ![Proposal authoring and structural diff](https://raw.githubusercontent.com/darsrc/LCARS-WebUI/main/docs/screenshots/graph-workspace-authoring.png) |

The complete gallery is in the
[repository README](https://github.com/darsrc/LCARS-WebUI#current-interactive-surfaces). Rebuild it with
`make docs-screenshots`; see the
[capture notes](https://github.com/darsrc/LCARS-WebUI/blob/main/docs/screenshots/README.md)
for requirements and browser overrides.

## Install

From a clone of the repository:

```bash
cd lcars-ui
python -m venv .venv
source .venv/bin/activate          # Windows: .\.venv\Scripts\Activate.ps1
pip install -e ".[dev]"
```

Run the introductory example:

```bash
python examples/bridge_ops/app.py
```

It serves `http://127.0.0.1:8077/` and opens the browser automatically.

## Command line

The package installs one `lcars` command. It scaffolds a project and runs it:

```bash
lcars new bridge-ops          # create a ready-to-run project directory
cd bridge-ops
pytest -q                     # the generated test passes with no editing
lcars dev                     # serve with reload on save, http://127.0.0.1:8077/
lcars check                   # build and validate the manifest, serve nothing
lcars run --port 8077         # one production process: no reload, no browser
```

`lcars new NAME` writes a `pyproject.toml`, a `src/<name>/` package holding a
two-page application with one action handler, a test that uses
`app.test_client()`, a `README.md`, and a `.gitignore`.

`dev`, `check` and `run` share one discovery step. With no target they search
`./app.py`, `./main.py`, `./src/<package>/app.py`, then `./<package>/app.py`,
and take the `app` (or `application`) attribute, or the single `App` instance,
that the module declares. Pass a target to be explicit:

```bash
lcars dev src/bridge_ops/app.py     # a file
lcars run bridge_ops.app            # a dotted module
lcars check bridge_ops.app:console  # a dotted module and an attribute
```

When discovery fails it names every location and attribute it looked for, and
exits non-zero. `lcars check` is the CI command: it imports the application,
runs every declared page, validates the manifest, and exits 1 if construction
fails, 2 if the application could not be found or imported.

## First application

```python
from lcars_ui import ActionContext, App, ui

app = App()
app.config("Bridge Ops", theme="galaxy", subtitle="NCC-1701-D")


@app.page("Overview", id="overview", layout="console")
def overview() -> None:
    with ui.data_panel("Telemetry", id="telemetry"):
        ui.metric("Shields", "100%", status="ok", id="shields")
        ui.chart([82, 84, 87, 91, 95], title="Warp Field")

    with ui.control_panel("Commands", id="commands"):
        ui.number_input(
            "Warp Factor", value=5.0, min=1.0, max=9.99, step=0.01, id="warp-factor"
        )
        ui.button("Engage", id="engage")


@app.action("engage")
def engage(ctx: ActionContext[None]) -> None:
    ctx.notify("Warp command accepted.", level="success")


if __name__ == "__main__":
    app.serve(port=8077, open_browser=True)
```

## How it works

There is no rerun. `@app.page("Overview", id="overview")` registers `overview()` and
runs it exactly once — at startup (and again whenever `app.build_manifest()` runs, e.g.
inside a test) — to declare that page's widgets. It never runs again when a browser
action arrives, so `ui.button(...)` never "becomes true": it just declares a button.

To react to something a widget did, register an explicit handler for its `id` with
`@app.action(...)`. It runs once per matching action and receives an `ActionContext[T]`:
`ctx.value` is the event's payload (`None` for a plain button, the new value for a
toggle/select/input, the parsed model for a form). Effects — `ctx.update(...)`,
`ctx.notify(...)`, `ctx.append_log(...)`, `ctx.set_theme(...)`, `ctx.set_alert_condition(...)`
— are methods on `ctx`, private to the session that triggered the handler by default; pass
`audience="all"` to broadcast to every connected browser instead.

Give every widget you will reference later — from an action handler, a form, another
widget's `hint=`, or `update()` — an explicit `id=`.

If you have used a rerun-style Python UI framework before (or an earlier version of this
library, where `lcars.run(ui)` and `if lcars.button(...):` were the norm), see
[docs/migration.md](docs/migration.md) — its `lcars migrate` scanner finds every place the
change affects. Otherwise, [docs/quickstart.md](docs/quickstart.md) is the fuller
walkthrough of the same model.

## Testing an application

Declarative `App` applications have a synchronous, in-process harness. It builds the
typed manifest without starting a server, and actions use the same registry, event bus,
effect draining, and acknowledgement path as WebSocket actions:

```python
from lcars_ui import ActionContext, App, ui

app = App()

@app.page("Bridge", id="bridge")
def bridge() -> None:
    ui.button("Engage", id="engage")

@app.page("Engineering", id="engineering")
def engineering() -> None:
    ui.metric("Warp Core", "Standby", id="warp-core")

@app.action("engage")
async def engage(ctx: ActionContext[str]) -> None:
    ctx.update("warp-core", value=ctx.value)

with app.test_client() as client:
    session = client.session()
    # [:2] because a `settings_page` (default on) adds one more page after these two.
    assert session.pages[:2] == ["bridge", "engineering"]

    effects = session.action("engage", "Online")
    assert session.widget("warp-core").value == "Online"
    assert [effect.type for effect in effects] == ["widget_update", "action_ack"]
```

`session.manifest` is the current typed `Manifest`; `session.widget(id)` reflects
applied updates. `session.effects` captures downstream envelopes, while
`session.effects_since(mark, type="widget_update")` supports cursor and type queries.
Use `session.logs(stream_id)` for retained log lines and
`session.submit(form_id, payload)` for declared forms. Each `client.session()` owns an
independent rendered widget state. Handler exceptions are re-raised by `action()` or
`submit()` so tests fail at the invocation that caused them.

## Themes

`app.config(..., theme=...)` accepts nine values: `"galaxy"` (default, TNG/DS9),
`"nemesis"`, `"tng"`, `"outpost"`, `"cardassian"`, `"klingon"`, `"romulan"`, `"ferengi"`,
and `"gruvbox"`. `ctx.set_theme(...)` (or, outside a handler, `lcars_ui.set_theme(...)`)
changes it at runtime; every named `color=` token shifts hue with it.

## Application and layout

```python
from lcars_ui import ActionContext, App, advanced, ui

app = App()
app.config(
    "My App",
    theme="galaxy",           # see Themes above for the full list
    subtitle="Operations",
    settings_page=True,       # browser-local Options page
)


@app.page(
    "Ops",
    id="ops",
    layout="console",         # auto | console | telemetry | grid | menu | authored
    fillers=True,
    sizing="fill",            # fill | content
)
def ops() -> None:
    with ui.data_panel("Telemetry", id="telemetry"):
        ui.chart([1, 2, 3])
```

The Options page groups browser-local Appearance, Behavior, and Keyboard settings.
Applications can add a managed shortcut through the ordinary action path:

```python
app.bind_key("mod+k", "open-search", label="Open search")


@app.action("open-search")
def open_search(ctx: ActionContext[dict[str, str]]) -> None:
    ctx.notify("Search requested")
```

`mod` means Command on macOS and Control elsewhere. Reuse a framework binding's stable
`id=` to override it for every user, or pass `chord=None` to disable it. Each browser can
then change, disable, or reset bindings from Options without changing the manifest.

LCARS-native page containers are `ui.data_panel`, `ui.control_panel`, `ui.box`,
`advanced.console`, `advanced.padd`, `advanced.diagnostic`, `advanced.sweep`, and
`advanced.bracket`. `ui.row`, `ui.col`, and `ui.columns` remain available as compatibility
escape hatches.

Top-level panels participate in the adaptive mosaic. Use these optional hints only when
content inference is not enough:

| Hint | Meaning |
| --- | --- |
| `zone="primary" | "side" | "dock" | "full"` | Preferred page region. |
| `span=(columns, rows)` | Exact panel footprint. |
| `weight=1..12` | Relative importance in packing. |
| `aspect="wide" | "tall" | "square" | "flex"` | Preferred shape. |
| `group="name"` | Keep related panels adjacent. |
| `sizing="fill" | "content"` | Free-space behavior. |

The renderer also provides browser-local Arrange mode. User arrangements never alter the
manifest or server state.

For screens whose exact topology is itself meaningful, opt into an authored composition:

```python
@app.page("Exact", id="exact", layout="authored", chrome="none")
def exact() -> None:
    with advanced.composition(
        columns=[advanced.px(120), advanced.fr(1), advanced.fr(2)],
        rows=[advanced.px(72), advanced.fr(1)],
        design_size=(1440, 900),
        narrow="scroll",
    ) as stage:
        with stage.area("title", row=1, column=2, column_span=2):
            ui.text("EXACT SURFACE", size="display")
        with stage.area("rail", row=2, column=1, decorative=True):
            ui.bar(color="orange", caps="both", thickness=28)
```

Authored pages require exactly one top-level `composition()` plus optional pop-ups.
Same-layer area overlap is rejected. Narrow behavior is `scroll`, `scale`, or `adaptive`;
adaptive mode repacks only non-decorative content through the ordinary mosaic.

## Surface Engine

LCARS-WebUI has three layout regimes: the adaptive mosaic for responsive applications,
`advanced.composition()` for exact row-and-column arrangements, and `advanced.surface()`
for arbitrary topology. A surface combines code-rendered geometry and ordinary widget
regions for measured rails, paths, telemetry grids, curves, and freeform display housings.

```python
@app.page("Pentharan Seismic Monitor", id="pentharan", layout="authored", chrome="none")
def pentharan() -> None:
    with advanced.surface(design_size=(984, 750), min_width=720, narrow="scale") as surface:
        surface.rect(0, 0, 984, 750, color="#000000", id="viewport-base")
        surface.rect(2, 2, 120, 96, color="#caadb2", id="identity-block")
        with surface.region("title", x=330, y=2, w=645, h=62):
            ui.text("PENTHARA IV SEISMIC ACTIVITY MONITOR", size="h1", align="end")
```

![Measured Pentharan seismic activity monitor rendered by the Surface Engine](https://raw.githubusercontent.com/darsrc/LCARS-WebUI/main/docs/screenshots/surface-seismic-monitor.png)

The bundled `examples/surface_recreation/app.py` builds this complete display from Surface
geometry and ordinary text regions. Reference pixels were measurement inputs only; the browser
receives no screenshot, raster backdrop, image URL, or data URL.

See [docs/surface.md](docs/surface.md) for the complete Surface Engine reference.

## Widget catalog

Every widget call **declares** its widget — it does not report clicks, current values, or
anything else that happened later; there is no rerun. All leaf widgets accept `id=`,
`color=`, `hint=`, placement hints, and visibility where applicable; interactive widgets
also support `disabled=`. To react to something a widget did, register `@app.action(id)`
and read the event from `ctx.value` — see [How it works](#how-it-works) above. Most of
these live in `ui`; a handful of specialist ones live in `advanced` (marked below). The
full per-widget reference, including exactly what `ctx.value` carries for each one, is
[docs/widgets.md](docs/widgets.md).

The snippets below assume the same setup as [First application](#first-application):
`app = App()`, called from inside a function registered with `@app.page(...)`.

### Text, status, and data (`ui`)

| Function | Purpose |
| --- | --- |
| `header(text, size="h2")` | LCARS section heading. |
| `text(content, size="body")` | Plain text (`display`, `h1`, `h2`, `body`, `label`, `micro`, `mono`). |
| `markdown(content)` | Safe rendered Markdown. |
| `metric(label, value, status="ok")` | Status tile; `ok`, `warn`, or `crit`. |
| `alert(message, level="yellow", blink=False)` | Alert banner. |
| `progress(label, value)` | Segmented progress meter. |
| `gauge(label, value, min=0, max=100, unit=None)` | Segmented gauge with thresholds. |
| `table(data, title=None)` | Static or fully interactive typed table. |
| `log(stream_id, title=None)` | Streaming log viewer; append with `append_log`. |

### Charts, media, and workspaces (`ui`, or `advanced` where noted)

| Function | Purpose |
| --- | --- |
| `chart(data, title=None)` | Line chart from a series, mapping, or DataFrame. |
| `sparkline(data, title=None)` | Compact trend plot. |
| `advanced.candlestick(data, title=None, markers=None)` | Zoomable OHLC chart. |
| `advanced.renko(data, brick_size, title=None)` | Server-computed Renko bricks. |
| `advanced.shader(fragment_shader, uniforms=None)` | Animated WebGL fragment-shader viewport. |
| `advanced.video_hls(src, title=None)` | HLS player. |
| `advanced.three_scene(module, props=None)` | Managed Three.js scene. |
| `advanced.node_canvas(document, execution=None)` | Typed graph reader/editor with caller-defined edge layers. |
| `advanced.graph_workspace(workspace)` | Canonical graph plus proposal-only authoring and density navigation. |

Interactive tables, charts, logs, and video can also *post* a typed event to Python — see
[Effects and live updates](#effects-and-live-updates) below and
[Server interaction state](docs/widgets.md#server-interaction-state).

### Inputs (`ui`, or `advanced` where noted)

| Function | What its action's `ctx.value` carries |
| --- | --- |
| `button(label)` | `None`. |
| `toggle(label, value=False)` | The new `bool`. |
| `checkbox(label, value=False)` | The new `bool`. |
| `select(label, options, value=None)` | The new `str` (or `list[str]` in multi-select mode). |
| `radio(label, options, value=None)` | The new `str`. |
| `radio_toggle(label, options, value=None)` | The new `str`. |
| `text_input(label, value="", placeholder="")` | The new `str`. |
| `command_input(label="Command", submit_label="Send")` | A one-entry form `dict` keyed by `{id}-value`; Enter submits. |
| `number_input(label, value=0, min=None, max=None, step=1)` | The new `float`. |
| `file_upload(label, accept=None, max_files=10, max_bytes=25_000_000)` | `{"files": [...]}`; each entry has metadata and request-scoped raw `data` bytes. |
| `advanced.mic_button(action_id, timeout_ms=5000, continuous=False)` | A `MicResult` for that recording. |

`form(label, action_id, submit_label="Submit")` groups child inputs and submits them
together as one action, whose `ctx.value` is a `dict` keyed by each child's own `id`.
Passing a Pydantic model in place of the label generates and validates the fields instead
— see [Model-backed forms](#model-backed-forms).

For chat prompts and command lines, use the purpose-built composer. It keeps the field,
send control, and optional secondary actions in one wide LCARS instrument; single-line
input submits with Enter and clears by default:

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

`command_input` is a one-field form, so it does not deliver a bare string. If
`action_id` is omitted, the generated action id is `{id}-submit`.

For multiline composers, plain Enter inserts a line break and Ctrl+Enter (Command+Enter
on macOS) submits.

## Model-backed forms

Pass a Pydantic model to `form()` instead of a label and the fields are generated from
the model's own metadata, then validated against it on submit. Field descriptions become
help text, `title` (or a humanised field name) becomes the label, `ge`/`le`/`max_length`
become widget bounds, and defaults become initial values:

```python
from enum import Enum

from pydantic import BaseModel, Field
import lcars_ui as lcars
from lcars_ui import ActionContext, App, ui

class SensorMode(str, Enum):
    PASSIVE = "passive"
    ACTIVE = "active"

class ConfigureSensor(BaseModel):
    designation: str = Field(default="Array One", description="Operator-facing name.")
    gain: int = Field(default=4, ge=1, le=10, title="Signal Gain")
    mode: SensorMode = SensorMode.PASSIVE
    enabled: bool = True

app = App()

@app.page("Sensors", id="sensors")
def sensors() -> None:
    ui.form(ConfigureSensor, action_id="save-sensor", submit_label="Apply", id="sensor")

@app.action("save-sensor")
def save_sensor(ctx: ActionContext[ConfigureSensor]) -> None:
    lcars.notify(f"Gain set to {ctx.value.gain}")

with app.test_client() as client:
    session = client.session()

    session.submit("sensor", {"designation": "Array Six", "gain": 8, "mode": "active"})
    session.submit("sensor", {"gain": 99})
    assert session.widget("sensor-gain").options.feedback.state == "error"
```

A valid submission reaches the handler as a parsed instance, so `ctx.value` is the model
itself, not a dictionary. An invalid one never reaches the handler: field-level errors
render beside the offending fields and model-level (cross-field) errors render on the
form, both clearing on the next successful submit. The model is the authority, so bounds
hold even when a client posts around the rendered widget.

Field widgets are named `{form_id}-{field_name}`; submissions may use either those ids or
the plain field names. `str`, `bool`, `int`, `float`, `Enum`, `Literal` and `Optional` of
those scalars are supported, and enums and literals render through the ordinary LCARS
choice control (a segment bank or option stack — there is no dropdown). Anything else —
a nested model, a list of models — raises at declaration time naming the field and its
type; compose that part with `with form(label, action_id)` and the field-by-field API,
which is unchanged.

## Typed capabilities

Pass `options=` to opt into richer behavior. Choice widgets use `settings=` because
their positional `options` argument already means choices.

| Family | Option types and capabilities |
| --- | --- |
| Text/header | `TextOptions`, `MarkdownOptions`, `HeaderOptions`: semantics, wrapping, bounded scrolling, copy, anchors, actions. |
| Status/meters | `MetricOptions`, `AlertOptions`, `MeterOptions`: trends, formatting, dismissals, ticks, thresholds. |
| Inputs/forms | `ButtonOptions`, `ToggleOptions`, `ChoiceOptions`, `TextInputOptions`, `NumberInputOptions`, `FormOptions`: confirmation, debounce, validation, search, multi-select, layout. |
| Tables | `TableOptions`: typed columns/cells, bounded scrolling, smart sorting, filters, pagination, selection, expansion, lazy content, copy and link actions. |
| Charts/media | `ChartOptions`, `SparklineOptions`, `FinancialChartOptions`, `ShaderOptions`, `LogOptions`, `VideoOptions`: bounded scrolling, axes, zoom, pause, search, playback, reduced motion. |
| Workspaces | `ThreeSceneOptions`, `NodeCanvasOptions`, `GraphWorkspaceOptions`: cameras, graph editing, proposal transactions, density navigation, virtualization, and submission. |
| Containers | `ContainerOptions`: density, overflow, collapse, and interaction state. |

Display interactions are browser-local by default. Add
`InteractionOptions(mode="server")` when Python must receive state. Enhanced tables can
instead keep client-side data operations while emitting state with
`data_mode="client", emit_state_changes=True`.

`ScrollOptions` supplies optional `max_height`, `overflow`, and `auto_scroll` fields to
text, Markdown, tables, logs, and chart-family options only. It is intentionally absent
from `BaseOptions`, so non-scrolling controls do not accept meaningless height settings.

## Layered graph reader

Use graph format version 2 when edge categories carry meaning. The application declares
the visual grammar; the library remains unaware of what any layer means.

```python
import lcars_ui
from lcars_ui import App, advanced

app = App()


@app.page("Graph", id="graph")
def graph_page() -> None:
    templates = [
        lcars_ui.NodeTemplate(
            id="node-a",
            label="Node A",
            category="Process",
            inputs=[lcars_ui.GraphPort(id="in", type="stream")],
            outputs=[lcars_ui.GraphPort(id="out", type="stream")],
        ),
    ]
    nodes = [
        lcars_ui.GraphNode(id="a", template="node-a", position=(0, 0)),
        lcars_ui.GraphNode(id="b", template="node-a", position=(200, 0)),
    ]

    document = lcars_ui.GraphDocument(
        version=2,
        layers=[
            lcars_ui.GraphLayer(
                id="layer-a",
                label="Layer A",
                token="LA",
                color="anakiwa",
                pattern="dashed",
                marker="arrow_open",
            ),
        ],
        templates=templates,
        nodes=nodes,
        edges=[
            lcars_ui.GraphEdge(
                id="e1",
                source="a",
                source_port="out",
                target="b",
                target_port="in",
                layer="layer-a",
                label="Related to",
            ),
        ],
    )

    advanced.node_canvas(
        document,
        options=lcars_ui.NodeCanvasOptions(editable=False, minimap=True),
    )
```

Each layer chooses a color, `solid|dashed|dotted|double` pattern,
`arrow_closed|arrow_open|none` marker, label token, label zoom threshold, and default
visibility/emphasis. The persistent legend reports visible/total counts and lets the
reader hide or emphasize layers without mutating the document. Edge labels retain a
complete accessible name when the visual label contracts to a token. Parallel,
reciprocal, and self-loop edges are routed separately, and selecting an edge adds a
continuous trace while preserving its layer pattern.

Version 1 remains the backward-compatible unlayered format. Version 2 requires every
edge to reference a declared layer and permits parallel edges and self-loops when port
capacities allow them. In an editable version-2 canvas, drag-to-connect opens an explicit
caller-declared layer chooser before the edge is committed; an unlayered v2 edge is never
created. Run `python examples/layered_graph/app.py` for the complete reader example.

## Graph proposal workspace

`graph_workspace()` is the higher-level authoring surface for knowledge graphs whose
canonical revision must remain immutable. The caller supplies record kinds, fields,
tree-part grammar, validation rules, graph projection, and submission actions. LCARS
supplies the generic mechanics and does not assign meaning to any kind, layer, or field.

```python
import lcars_ui
from lcars_ui import App, advanced

app = App()


@app.page("Workspace", id="workspace")
def workspace_page() -> None:
    revision = lcars_ui.GraphRevision(graph_id="network", revision="r17")
    workspace = lcars_ui.GraphWorkspaceDocument(
        format="lcars-graph-workspace",
        version=1,
        workspace_id="workbench",
        # `records=`, `record_schemas=`, `tree_schemas=`, `validation_rules=`, and
        # `actions=` all default to `[]` — see examples/graph_workspace/app.py for a
        # populated version.
        canonical=lcars_ui.CanonicalPlane(graph=revision, records=[]),
        proposal=lcars_ui.ProposalPlane(
            proposal_id="draft-1",
            title="Draft",
            base=revision,
        ),
    )

    advanced.graph_workspace(
        workspace,
        title="Proposal workbench",
        options=lcars_ui.GraphWorkspaceOptions(
            autosave_key="proposal-draft-1",
            fan_page_size=20,
            interaction=lcars_ui.InteractionOptions(mode="server", action_id="workspace"),
        ),
    )
```

Canonical content is read-only. Structured values default to a compose/review/commit
flow: root, part, slot, and field changes stay in a local working tree until the reviewed
tree is committed as one group edit and one interaction. Use
`GraphWorkspaceOptions(tree_commit_mode="incremental")` only for compatibility with the
original per-operation tree integration. Draft create/edit/delete, committed tree and
scalar edits, graph edits, undo/redo, autosave, and interaction counts are
proposal-scoped. Pan, zoom, layer
visibility, collapse, focus, filters, search, breadcrumbs, and history are reader state
and do not enter proposal history. Search results report which caller-declared fields
matched. Large record lists and exact edge fans are windowed; routing still uses the
complete graph. Submission emits the versioned workspace command with structural diff
and preflight data, and receipts require a fresh canonical read.

One measured interaction is one intentional committed proposal command or committed
field/group edit. A compound command counts once; accepting a semantic suggestion counts.
Keystrokes, pointer motion, DOM/React/React Flow/transport events, intermediate edits,
reader operations, and passive previews count zero. The reusable harness implements this
definition; 31 independently committed structured fields therefore record 31
interactions regardless of their internal part count. Downstream applications own their
domain walkthrough and semantic validators.

Run `python examples/graph_workspace/app.py` for a generic example with both planes,
typed values, collapse/focus/search controls, a 36-edge fan, diff, and submission.

## Hints, pop-ups, and notifications

Every widget accepts a short text hint:

```python
ui.button("Engage", id="engage", hint="Initiates warp drive")
```

Rich hints attach after their target and may contain a widget subtree:

```python
ui.button("Inspect", id="inspect")
with ui.hint("inspect", trigger="click", placement="right", title="Telemetry"):
    ui.metric("Core", "87%", status="ok")
    ui.sparkline([82, 84, 87], title="Trend")
```

Triggers are `hover`, `focus`, `click`, `press`, `always`, and `manual`. Manual hints open
with `ctx.show_hint(widget_id)` and close with `ctx.hide_hint(widget_id)` from inside an
action handler.

`advanced.popup()` creates a movable/resizable modal or modeless overlay. `ctx.notify(...)`
(or, outside a handler, `lcars_ui.notify(...)`) creates a movable notification with
`info`, `success`, `warning`, or `error` level plus optional title, timeout, and dismissal
settings.

## File and media integration

`ui.file_upload()` uses `/lcars/upload/files`. Uploaded bytes exist only for the duration
of that action's handler; consume or persist each `ctx.value["files"][i]["data"]`
immediately. The browser receives metadata, not file bytes. Server and widget byte
limits are both enforced.

`advanced.mic_button()` uses `/lcars/upload/audio`. Microphone access requires HTTPS
except on localhost. `continuous=True` enables voice-activity detection and repeated
utterances.

`advanced.three_scene()` loads a local JavaScript module from a read-only directory
served at `/lcars/assets/`. Pass it to `app.serve(..., assets_dir=...)`:

```python
@app.page("Bridge", id="bridge")
def bridge() -> None:
    advanced.three_scene("scenes/bridge.js", props={"alert": "normal"}, id="bridge-scene")


if __name__ == "__main__":
    app.serve(port=8077, assets_dir="./assets")
```

## Knowledge-graph instruments

Version 4.5.0 added eight semantic instruments. An audit
(`docs/knowledge-graph-audit.md`) found six had exactly one downstream consumer and
removed them; `advanced.support_panel` and `advanced.tri_state` remain, each accepting
its documented dictionary shape or an exported Pydantic model.

| Widget | Meaning | What its action's `ctx.value` carries |
| --- | --- | --- |
| `support_panel` | Alternative typed support environments, with `show_environments`/`show_legend` display toggles. | (display-only; no action) |
| `tri_state` | YES / NO / UNKNOWN with FAST/EXACT mode. | `"EXACT"`, on the optional escalation. |

```python
@app.page("Support", id="support")
def support() -> None:
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

See [the v5 release notes](docs/history/release-v5.0.0.md), the
[widget reference](docs/widgets.md#knowledge-graph-widgets), and the
[knowledge-graph audit](docs/knowledge-graph-audit.md).

## Effects and live updates

```python
import lcars_ui
from lcars_ui import ActionContext, App, ui

app = App()


@app.page("Ops", id="ops")
def ops() -> None:
    ui.metric("Shields", "100%", status="ok", id="shields")
    ui.button("Refresh", id="refresh")


@app.action("refresh")
def refresh(ctx: ActionContext[None]) -> None:
    ctx.update("shields", value="91%", status="warn")
    ctx.append_log("ops-log", "Telemetry refreshed")
    ctx.notify("Refresh complete", level="success")


@app.live(interval=2.0)
def tick() -> None:
    lcars_ui.update("shields", value=f"{read_shields()}%")


if __name__ == "__main__":
    app.serve(port=8077)
```

`ctx.update(widget_id, **fields)` merges keyword fields onto the widget's current
serialized state and is private to the session that triggered the handler by default
(pass `audience="all"` to broadcast). Outside a handler — most commonly inside an
`@app.live(...)` job, which has no triggering session to be private to — call the same
effect as a plain function imported from the package root instead: `lcars_ui.update(...)`,
`lcars_ui.notify(...)`, `lcars_ui.append_log(...)`, and so on.

Other global effects are `set_alert_condition("normal" | "yellow" | "red")` and
`set_theme(...)` — see [Themes](#themes) above for the full list of accepted names.

## Server routes

| Route | Method | Purpose |
| --- | --- | --- |
| `/` | GET | Bundled application shell. |
| `/lcars/manifest` | GET | Current manifest. |
| `/lcars/schema` | GET | JSON Schema. |
| `/lcars/ws` | WebSocket | Primary bidirectional transport. |
| `/lcars/events` | GET | SSE downstream fallback. |
| `/lcars/action/{widget_id}` | POST | HTTP action fallback. |
| `/lcars/input/{widget_id}` | POST | HTTP input fallback. |
| `/lcars/form/{widget_id}` | POST | HTTP form fallback. |
| `/lcars/upload/audio` | POST | Bounded microphone upload. |
| `/lcars/upload/files` | POST | Bounded multipart file upload. |
| `/lcars/assets/...` | GET | Optional read-only application assets. |

**All `/lcars/*` routes above (except `/lcars/schema`) are session-scoped.** Every
browser tab — and every independent client — gets its own server-issued session that
holds its widget state and private (`audience="session"`) effects. The session is
identified by an opaque token the client must present back on every request:

- Plain HTTP requests (`/lcars/manifest`, `/lcars/action/{id}`, `/lcars/input/{id}`,
  `/lcars/form/{id}`, `/lcars/upload/audio`, `/lcars/upload/files`) carry the token in
  the `X-Lcars-Session` request header.
- `/lcars/ws` (WebSocket) and `/lcars/events` (SSE) carry it as a `?session=` query
  parameter instead, since the browser's native `WebSocket`/`EventSource` APIs cannot
  set custom request headers.

`GET /lcars/manifest` is the primary token-issuance point: call it with no token (or an
unknown/expired one) and the server mints a new session and returns it in the
`X-Lcars-Session` *response* header. Store that value and send it back as the
`X-Lcars-Session` *request* header on every subsequent call — including the action/input/
form endpoints — so they all resolve to the same session.

**This matters even for a quick curl sanity check.** A request with no (or a stale)
token is not rejected — it silently succeeds under a brand-new, disposable session
instead. A `POST /lcars/action/{id}` sent without the header returns a normal
`{"status": "ok"}` action ack, but the private `ctx.update(...)` effect it triggered
lands in a session that request just minted and immediately discarded. A follow-up
`GET /lcars/manifest` — with no header, or with a different/older token — mints or
resolves yet another session and never sees the change. There is no error on either
call. Thread the same token through both:

```bash
# 1. Mint a session and capture its token from the response header.
TOKEN=$(curl -sS -D - http://127.0.0.1:8077/lcars/manifest -o /dev/null \
  | grep -i '^x-lcars-session:' | awk '{print $2}' | tr -d '\r')

# 2. Reuse that token on the action call...
curl -sS -X POST http://127.0.0.1:8077/lcars/action/bridge-shields \
  -H "X-Lcars-Session: $TOKEN" -H "Content-Type: application/json" -d '{"value": false}'

# 3. ...and again on the manifest re-check, or the update above is invisible here.
curl -sS -H "X-Lcars-Session: $TOKEN" http://127.0.0.1:8077/lcars/manifest
```

Run live against `examples/bridge_ops/app.py` on port 8077:

```
$ TOKEN=$(curl -sS -D - http://127.0.0.1:8077/lcars/manifest -o /dev/null | grep -i '^x-lcars-session:' | awk '{print $2}' | tr -d '\r')
$ echo "$TOKEN"
ZyQ6L7Nhjvi3ilayzywn0wDnTI2D5sL-2AI2yzpta5w

$ curl -sS -X POST http://127.0.0.1:8077/lcars/action/bridge-shields \
    -H "X-Lcars-Session: $TOKEN" -H "Content-Type: application/json" -d '{"value": false}'
{"v":"2.0","ts":1787971401.4889867,"type":"action_ack","payload":{"action_id":"bridge-shields","status":"ok"}}

$ curl -sS -H "X-Lcars-Session: $TOKEN" http://127.0.0.1:8077/lcars/manifest | python3 -c "
import json,sys
m = json.load(sys.stdin)
def find(n):
    if isinstance(n, dict):
        if n.get('id') == 'bridge-shieldstatus':
            print(n['value'], n['status'], n['color'])
        for v in n.values(): find(v)
    elif isinstance(n, list):
        for v in n: find(v)
find(m)
"
DOWN warn yellow
```

`bridge-shieldstatus` started as `ACTIVE ok blue`; toggling `bridge-shields` to `false`
with the token threaded through both calls updated it to `DOWN warn yellow`, exactly as
the handler's `ctx.update(...)` intends. Omitting `-H "X-Lcars-Session: $TOKEN"` from
either call still returns `200`/`action_ack: ok`, but the manifest re-check would keep
showing `ACTIVE ok blue` — see
[wiki/Troubleshooting.md](https://github.com/darsrc/LCARS-WebUI/blob/main/wiki/Troubleshooting.md#action-acks-succeed-but-manifest-never-changes)
for that failure mode.

A reverse proxy in front of the app must forward the `X-Lcars-Session` header (and the
`session` query parameter on `/lcars/ws`/`/lcars/events`) unmodified — a proxy that
strips unrecognized headers breaks session continuity even though every individual
request still returns `200`. See [docs/deployment.md](docs/deployment.md).

Internet-facing deployments should enable HTTPS, scoped token authentication, explicit
CORS origins, secure headers, payload/rate limits, and WebSocket proxy upgrades. See
[docs/deployment.md](docs/deployment.md).

## Examples

| Directory | Focus |
| --- | --- |
| `examples/bridge_ops` | Minimal operations app. |
| `examples/kitchen_sink` | Broad widget and layout showcase. |
| `examples/widget_capabilities` | Typed v4 options and interaction state. |
| `examples/table_repositories` | Sorting, filtering, selection, and lazy expansion. |
| `examples/vibe_coder` | AI development console with task tracking and live logs. |
| `examples/algo_trading` | Financial charts. |
| `examples/game_planner` | Rich multi-panel application composition. |
| `examples/layered_graph` | Layered graph-format-2 reader with a caller-defined edge legend. |
| `examples/graph_workspace` | Proposal authoring, density navigation, edge fans, diff, and submission. |
| `examples/canon_recreation` | Exact image-free authored compositions using the public DSL. |
| `examples/surface_recreation` | A measured Surface Engine display built from geometry, not pixels. |

## Development

Run from this directory:

```bash
pytest tests/                     # backend and contract tests
cd frontend && npx vitest run     # frontend tests
cd .. && make lint                # ruff + mypy
make contracts-check              # generated contract parity
make frontend-bundle              # bundle React assets into the package
make docs-screenshots             # refresh every README and Wiki screenshot
make canon-screenshots            # refresh code-rendered canon-recreation screenshots
make security-audit               # dependency and security checks
make ci                           # complete project gate
```

Node.js 20.19+ (or 22.12+) is required only for frontend development. When Pydantic widget models
change, run `make contracts-update` and commit the generated schema, TypeScript types,
validator, and golden fixtures together.

Key locations:

- `src/lcars_ui/dsl/` — Python authoring API and manifest builder.
- `src/lcars_ui/widgets/` — typed widget data, options, and state.
- `src/lcars_ui/core/` — manifest and protocol models.
- `src/lcars_ui/server/` — security and transport support.
- `frontend/src/` — React renderer and client state.
- `docs/` — detailed package references and release notes.

## Documentation

- [Quick start](docs/quickstart.md)
- [Migration guide (v6 to v7)](docs/migration.md)
- [DSL and adaptive layout](docs/dsl.md)
- [Widget capability reference](docs/widgets.md)
- [Surface Engine reference](docs/surface.md)
- [Deployment and security](docs/deployment.md)
- [LCARS visual language](docs/lcars_language.md)
- [GitHub Wiki](https://github.com/darsrc/LCARS-WebUI/wiki)
