# Widgets

LCARS-WebUI exposes leaf instruments, interactive workspaces, overlay surfaces, and
LCARS-native containers through one Python DSL, split across two curated modules:
`lcars_ui.ui` (ordinary panels, text, readouts, common controls, tables, charts, forms)
and `lcars_ui.advanced` (composition, the Surface Engine, graph workspaces, and
specialist media). Widget models are validated by Pydantic and included in the generated
browser contract. This page is a task-shaped tour; the exhaustive per-widget reference —
every option model, every field `ctx.value` carries — lives in
[docs/widgets.md](https://github.com/darsrc/LCARS-WebUI/blob/main/lcars-ui/docs/widgets.md).

Every widget call **declares** its widget in place — it does not report a click, a
current value, or anything else that happened later; there is no rerun. To react to
something a widget did, register `@app.action(widget_id)` and read the event from
`ctx.value` — see [Actions and State](Actions-and-State).

Most widget calls accept:

- `id=` for stable identity — required for anything an action handler, `ctx.update()`,
  or a `hint=` will reference later;
- `color=` for a named LCARS token or a hex code (see [Reference](Reference#color-tokens)
  for which tokens actually tint);
- `hint=` for a short tooltip;
- `zone=`, `span=`, `weight=`, `aspect=`, and `group=` as adaptive layout hints;
- `visible=` and, for interactive widgets, `disabled=`;
- `options=` for the widget's typed capability model.

Choice widgets use `settings=` because their positional `options` argument already holds
the available choices.

## Catalog

### Text and status (`ui`)

| Function | Description |
| --- | --- |
| `header(text, size="h2")` | LCARS heading with optional subtitle, anchor, and actions. |
| `text(content, size="body")` | Plain body, heading, or monospace text. |
| `markdown(content)` | Rendered Markdown with safe links and optional code-copy controls. |
| `metric(label, value, status="ok")` | Status tile with `ok`, `warn`, or `crit` state. |
| `alert(message, level="yellow", blink=False)` | Alert banner with dismissal/action support. |
| `progress(label, value)` | Segmented progress meter. |
| `gauge(label, value, min=0, max=100)` | Segmented gauge with unit and threshold support. |

```python
ui.header("Propulsion", size="h2", color="pale-canary")
ui.metric("Warp Core", "98%", status="ok", id="warp-core")
ui.progress("Shield Recharge", 72.0, color="anakiwa", id="shield-recharge")
ui.gauge(
    "Deflector Load", 64, unit="%", warn_threshold=75, crit_threshold=90,
    id="deflector-load",
)
ui.alert("Coolant pressure elevated", level="yellow", id="coolant-alert")
```

(Executed via `app.build_manifest()` while writing this page.)

Notification levels are separate from `alert()` levels. `ctx.notify(...)` accepts `info`,
`success`, `warning`, and `error`.

### Charts and data (`ui`, plus `advanced` for financial charts)

| Function | Description |
| --- | --- |
| `chart(data, title=None)` | Line chart. |
| `sparkline(data, title=None)` | Compact series view. |
| `advanced.candlestick(data, title=None, markers=None)` | Zoomable OHLC chart. |
| `advanced.renko(data, brick_size, title=None)` | Server-computed Renko chart. |
| `advanced.shader(fragment_shader, uniforms=None)` | Animated WebGL fragment shader. |
| `table(data, title=None)` | Simple or typed interactive table. |
| `log(stream_id, title=None)` | Streaming log; append with `ctx.append_log(...)`. |

`chart` and `sparkline` accept a numeric list, a mapping of series names to numeric
lists, or supported pandas data. Candlesticks accept OHLC dictionaries or a matching
DataFrame. Renko accepts prices, close/price dictionaries, or a pandas Series.

```python
ui.chart(
    {"EPS A": [18, 21, 26, 34], "EPS B": [12, 17, 24, 29]},
    title="EPS Flow", id="eps-flow",
)

advanced.candlestick(
    ohlc_rows,
    title="ES Futures",
    markers=[{
        "time": "2026-08-08",
        "position": "below",
        "shape": "arrow_up",
        "color": "anakiwa",
        "text": "BUY",
    }],
    id="es-candles",
)
```

(Executed while writing this page.)

Candlestick marker positions are `above`, `below`, and `in`; shapes are `arrow_up`,
`arrow_down`, `circle`, and `square`. `renko` requires a positive `brick_size`.

### Inputs and forms (`ui`)

| Function | What its action's `ctx.value` carries |
| --- | --- |
| `button(label)` | `None`. |
| `toggle(label, value=False)` | The new `bool`. |
| `checkbox(label, value=False)` | The new `bool`. |
| `select(label, options, value=None)` | The new `str` (or `list[str]` in multi-select mode). |
| `radio(label, options, value=None)` | The new `str`. |
| `radio_toggle(label, options, value=None)` | The new `str`. |
| `text_input(label, value="", placeholder="")` | The new `str`. |
| `command_input(label="Command", submit_label="Send")` | The submitted `str`; Enter sends. |
| `number_input(label, value=0, min=None, max=None, step=1)` | The new `float`. |
| `file_upload(label, ...)` | `list[UploadedFile]` for that upload. |
| `advanced.mic_button(action_id, ...)` | A `MicResult` for that recording. |

```python
with ui.control_panel("Commands", id="commands"):
    ui.select("Mode", ["Cruise", "Alert"], id="mode")
    ui.number_input("Gain", value=5, min=0, max=10, id="gain")
    ui.button("Apply", id="apply")


@app.action("apply")
def apply_mode(ctx: ActionContext[None]) -> None:
    ctx.notify("Applied")
```

(Executed via `app.test_client()` while writing this page.)

Forms submit a group of child inputs as one action:

```python
with ui.form("Warp Setup", action_id="warp-submit", submit_label="Commit", id="warp-form"):
    ui.number_input("Warp Factor", value=5.0, id="warp-factor")
    ui.toggle("Dampeners", value=True, id="dampeners")


@app.action("warp-submit")
def warp_submit(ctx: ActionContext[dict]) -> None:
    ctx.notify(f"warp={ctx.value['warp-factor']}")
```

`ctx.value` is a `dict` keyed by each child's own `id`, unless the form was built from a
Pydantic model — see [Model-backed forms](#model-backed-forms) below. (Both blocks above
executed together, including a real submission through `session.submit(...)`, while
writing this page.)

For a chat prompt or command line, use the purpose-built composer. A single-line composer
submits with Enter and clears by default; multiline mode reserves plain Enter for a newline and
submits with Ctrl+Enter or Command+Enter.

```python
import lcars_ui

ui.command_input(
    "Message",
    placeholder="Transmit a message…",
    actions=[lcars_ui.ActionSpec(label="New Session", action_id="new-session")],
    id="composer",
)


@app.action("composer")
def on_message(ctx: ActionContext[str]) -> None:
    ctx.append_log("conversation", f"YOU: {ctx.value}")
```

(Executed while writing this page.)

### Model-backed forms

Pass a Pydantic model to `form()` instead of a label and the fields are generated from
the model's own metadata, then validated against it on submit:

```python
from pydantic import BaseModel, Field

class ConfigureSensor(BaseModel):
    designation: str = Field(default="Array One", description="Operator-facing name.")
    gain: int = Field(default=4, ge=1, le=10, title="Signal Gain")
    enabled: bool = True

@app.page("Sensors", id="sensors")
def sensors() -> None:
    ui.form(ConfigureSensor, action_id="save-sensor", submit_label="Apply", id="sensor")

@app.action("save-sensor")
def save_sensor(ctx: ActionContext[ConfigureSensor]) -> None:
    ctx.notify(f"Gain set to {ctx.value.gain}")
```

`ctx.value` is a real `ConfigureSensor` instance, not a dictionary — an invalid
submission never reaches the handler; field-level errors render beside the offending
field instead. See [docs/quickstart.md](https://github.com/darsrc/LCARS-WebUI/blob/main/lcars-ui/docs/quickstart.md#7-model-backed-forms)
for a complete example with the exact validation-error assertions, executed while it was
written.

## Enhanced tables

Without `TableOptions`, a `list[dict]` creates a simple table whose headers come from the
first dictionary. Typed rows separate raw values from presentation, links, copying, and
expanded detail:

```python
import lcars_ui

rows = [
    lcars_ui.TableRow(
        id="repo-a",
        cells=[
            lcars_ui.TableCell(
                value="org/repo-a",
                display="repo-a",
                link=lcars_ui.LinkSpec(href="https://example.com/org/repo-a"),
                copyable=True,
            ),
            4200000,
            91,
        ],
    )
]

ui.table(
    rows,
    id="results",
    options=lcars_ui.TableOptions(
        columns=[
            lcars_ui.TableColumn(key="repo", label="Repository", sortable=True, filter="text"),
            lcars_ui.TableColumn(key="size", label="Size", sortable=True, sort_as="bytes"),
            lcars_ui.TableColumn(key="fit", label="Fit", value_type="number", sortable=True),
        ],
        pagination=lcars_ui.TablePagination(page_size=25),
        selection=lcars_ui.TableSelection(mode="single"),
        expandable=True,
        data_mode="client",
        emit_state_changes=True,
        interaction=lcars_ui.InteractionOptions(action_id="results"),
    ),
)
```

(Executed while writing this page.)

Tables support sorting, text/select filters, numeric comparisons, pagination, sticky
headers, row selection, child rows, full-width expanded content, loading/error states,
copyable cells, and links/actions. Smart sorting recognizes numbers, bytes, percentages,
durations, currencies, dates, versions, booleans, and natural numbers in text.

`data_mode="client"` performs sort/filter/page operations in the browser.
`data_mode="server"` leaves them to Python. `emit_state_changes=True` independently
chooses whether Python receives typed state events, delivered as an action on the
table's own `action_id` whose `ctx.value` is
`{"kind": "selection" | "expansion" | "sort" | "filter" | "page", "state": {...TableState...}}`.
See [Actions and State](Actions-and-State#enhanced-table-state-and-events) for a handler example.

State reconciliation is ID-based: ordinary data refreshes preserve the reader's current
selection and expansion, removed row IDs are pruned, and explicit option changes are
authoritative.

## Media and interactive workspaces

### HLS video (`advanced`)

```python
advanced.video_hls("/media/telemetry.m3u8", title="Visual Feed", autoplay=False, id="feed")
```

`VideoOptions` controls looping, preload, playback rates, source display, and
client/server state.

### Shader viewport (`advanced`)

```python
advanced.shader(
    fragment_shader,
    title="Warp Core",
    uniforms={"u_color": [0.973, 0.6, 0.0]},
    aspect_ratio=2.0,
    id="warp-core-shader",
)
```

Every shader receives `u_time`, `u_resolution`, and `v_uv`. Compile errors appear inline.
`ShaderOptions` covers pause, frame limiting, reduced motion, and fallback content.
(Executed while writing this page.)

### Managed Three.js scene (`advanced`)

```python
advanced.three_scene("scenes/bridge.js", props={"alert": "normal"}, id="bridge-scene")

# Local module directory is mounted read-only at /lcars/assets/.
if __name__ == "__main__":
    app.serve(assets_dir="./assets")
```

`ThreeSceneOptions` configures camera, orbit controls, animation policy, DPR limits,
fallbacks, and state reporting. The scene module is application code; it is not bundled
into LCARS WebUI automatically.

### Node canvas (`advanced`)

```python
advanced.node_canvas(
    document,
    title="Automation Graph",
    options=lcars_ui.NodeCanvasOptions(editable=True, minimap=True, allow_import_export=True),
    id="automation-graph",
)
```

`GraphDocument` includes typed nodes, ports, edges, reroutes, groups, comments, and a
viewport. Options cover editing, zoom, snapping, palette, history, import/export, and
run/queue/cancel actions.

Nodes render as low-radius LCARS rail panels rather than capsules. Titles, port labels,
field labels, values, execution messages, and full-zoom edge labels wrap instead of
being clipped or replaced by ellipses. Named contract colours and caller-supplied hex
colours are resolved consistently for nodes, groups, palettes, layers, and ports.

For a read-only graph whose edge categories carry meaning, use format version 2 and
declare the visual grammar in the document:

```python
import lcars_ui

document = lcars_ui.GraphDocument(
    version=2,
    layers=[
        lcars_ui.GraphLayer(
            id="layer-a", label="Layer A", token="LA",
            color="anakiwa", pattern="dashed", marker="arrow_open",
        ),
    ],
    templates=templates,
    nodes=nodes,
    edges=[
        lcars_ui.GraphEdge(
            id="edge-a", source="a", source_port="out", target="b", target_port="in",
            layer="layer-a", label="Related to",
        ),
    ],
)
advanced.node_canvas(document, options=lcars_ui.NodeCanvasOptions(editable=False), id="graph")
```

(Both node-canvas blocks above executed together while writing this page.)

The application owns every layer id and its semantics. LCARS renders caller-supplied
colors, `solid|dashed|dotted|double` patterns, markers, labels, legend tokens, and
defaults. Legend visibility and emphasis are reader-local state and do not mutate the
graph. Parallel and reciprocal edges separate into stable lanes, self-loops nest, and
selection adds a continuous trace without hiding the original pattern. Visual labels
can contract to tokens by zoom while retaining complete accessible names.

Version 1 remains the compatible unlayered format. Every version-2 edge must name a
declared layer; parallel edges and self-loops are valid when port capacities allow them.
With `editable=True`, a version-2 drag-to-connect gesture opens a chooser populated from
the document's declared layers. The edge is committed only after a layer is selected, so
the editor cannot manufacture an unlayered v2 edge. Run
`python examples/layered_graph/app.py` to inspect all four treatments and routing cases.

### Graph proposal workspace (`advanced`)

`advanced.graph_workspace(workspace)` composes an immutable canonical plane beside a
visually distinct proposal plane. It adds proposal-only records and graph edits,
caller-defined typed-tree editors, undo/redo and autosave, collapse/focus/filter/search
navigation, matched-field reporting, breadcrumbs/history, virtual record and edge-fan
views, structural diff, preflight, and submission commands.

Structured values use a compose/review/commit boundary by default. Intermediate root,
part, slot, and field edits stay in an uncommitted working tree and count zero; committing
the reviewed tree replaces the complete value as one group edit. Set
`GraphWorkspaceOptions(tree_commit_mode="incremental")` for compatibility with the
original per-operation tree callback behavior.

The workspace contract is general: record kinds, fields, edge layers, part shapes,
compatibility rules, semantic validation, and submission actions are supplied by the
application. See **[Graph Workspace](Graph-Workspace)** and run
`python examples/graph_workspace/app.py`.

### Microphone and file upload

```python
advanced.mic_button("voice-command", continuous=True, silence_ms=900, id="mic")

ui.file_upload(
    "Training Data",
    accept=[".json", "application/json"],
    max_files=4,
    max_bytes=10_000_000,
    id="training-data",
)


@app.action("training-data")
def ingest_files(ctx: ActionContext[list]) -> None:
    for uploaded in ctx.value:
        ingest(uploaded.name, uploaded.data)
```

(The declarations executed while writing this page. Microphone access requires HTTPS or
localhost.) Continuous mode uses browser voice activity detection and uploads each
completed utterance. File uploads are request-scoped: consume or persist their bytes
inside the action handler, from `ctx.value`. LCARS does not permanently store them.

## Containers

| Context manager | Best use |
| --- | --- |
| `ui.data_panel(title)` | Charts, tables, logs, text, and readouts. |
| `ui.control_panel(title)` | Buttons, inputs, and forms. |
| `advanced.console(title)` | Explicit header, input column, left, and right regions. |
| `advanced.padd(title)` | Compact detail or review views. |
| `advanced.diagnostic(title)` | Main/side diagnostic instruments. |
| `ui.box(title)` | Lower-level framed LCARS region. |
| `advanced.sweep(title)` | Explicit sweep geometry and bilateral content. |
| `advanced.bracket()` | Lightweight framed grouping. |
| `advanced.popup(title)` | Movable/resizable modal or modeless overlay. |

Container context objects expose named slot context managers (`main()`, `side()`,
`header()`, `left()`, `right()`, and so on — see [Layouts](Layouts) for which container
exposes which slots). Collapsible containers can expose `ContainerState` when server
interaction is enabled.

`advanced.raw(reason=...)` is a local strict-layout escape hatch. `advanced.input_column(side="left" |
"right")` declares an input-oriented rail. Prefer semantic containers over page-level
`ui.row`/`ui.col` grids.

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
`top`, `bottom`, `left`, `right`. Manual hints respond to `ctx.show_hint(widget_id)` and
`ctx.hide_hint(widget_id)` from inside an action handler. Rich hint controls dispatch
normal actions. (Executed while writing this page.)

```python
with advanced.popup(
    "Transfer Details",
    modal=False,
    draggable=True,
    resizable=True,
    close_action_id="close-transfer",
    id="transfer-popup",
):
    ui.text("Payload accepted.")
```

Pop-ups remain inside the viewport and support pointer and keyboard movement.

## Typed capability model

| Calls | Option model |
| --- | --- |
| `text` | `TextOptions` |
| `markdown` | `MarkdownOptions` |
| `header` | `HeaderOptions` |
| `metric` | `MetricOptions` |
| `alert` | `AlertOptions` |
| `progress`, `gauge` | `MeterOptions` |
| `button` | `ButtonOptions` |
| `toggle`, `checkbox` | `ToggleOptions` |
| `select`, `radio`, `radio_toggle` | `ChoiceOptions` via `settings=` |
| `text_input` | `TextInputOptions` |
| `number_input` | `NumberInputOptions` |
| `form` | `FormOptions` |
| `table` | `TableOptions` |
| `chart` | `ChartOptions` |
| `sparkline` | `SparklineOptions` |
| `candlestick`, `renko` | `FinancialChartOptions` |
| `shader` | `ShaderOptions` |
| `log` | `LogOptions` |
| `video_hls` | `VideoOptions` |
| `three_scene` | `ThreeSceneOptions` |
| `node_canvas` | `NodeCanvasOptions` |
| `graph_workspace` | `GraphWorkspaceOptions` |
| LCARS containers | `ContainerOptions` |

All models and state types are exported from `lcars_ui` (the package root — not `ui` or
`advanced`, which hold only the widget-declaring functions).

## Knowledge-graph instruments

Version 4.5 added eight semantic instruments for versioned knowledge-graph payloads. An
audit found that six of them — `frontier`, `assertion_card` + `context_tags`,
`anchor_card`, `constraint_band`, `gap_panel` + `contender_list`, and
`commitment_selector` — had exactly one downstream consumer and were removed in the v7
trim. `support_panel` and `tri_state` remain — the two with a real reuse case beyond
their origin application — and both now live in `advanced`, not the flat namespace these
docs used to describe.

`support_panel` folds its display toggles into keyword arguments (`show_environments`,
`show_legend`) rather than separate mutator calls, and preserves the distinction between
`"environments": []` (unsupported) and `"environments": [{"atoms": []}]`
(support-independent). `tri_state` gives `YES`/`NO`/`UNKNOWN` distinct neutral semantics
with an optional `EXACT` escalation; its fields are `target` (the subject of the query)
and `scope` (the context it was evaluated under) rather than the earlier
`commitment`/`subject` naming.

```python
with advanced.support_panel(
    "Support", node="n07", data=support_data,
    show_environments=True, show_legend=True, id="support-n07",
):
    pass

advanced.tri_state(result_data, on_escalate="EXACT", id="support-query-n07")

@app.action("support-query-n07")
def escalate(ctx: ActionContext[str]) -> None:
    if ctx.value == "EXACT":
        run_exact_query()
```

`tri_state()` declares its widget like every other widget — it does not return a click
flag. The escalation fires as an ordinary action on the widget's own `id`, with
`ctx.value == "EXACT"`.

See **[Knowledge Graph](Knowledge-Graph)** for payload shapes, **[Reference](Reference#knowledge-graph-widgets)**
for signatures and exported data models, and the
[knowledge-graph audit](https://github.com/darsrc/LCARS-WebUI/blob/main/lcars-ui/docs/knowledge-graph-audit.md)
for why the other six were cut.

---

**See also:** [Layouts](Layouts) · [Actions and State](Actions-and-State) ·
[Reference](Reference)
