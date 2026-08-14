# Widgets

LCARS-WebUI 5.0.0 exposes leaf instruments, interactive workspaces, overlay surfaces,
and LCARS-native containers through one Python DSL. Widget models are validated by
Pydantic and included in the generated browser contract.

Most widget calls accept:

- `id=` for stable identity;
- `color=` for an LCARS named color or CSS color;
- `hint=` for a short tooltip;
- `zone=`, `span=`, `weight=`, `aspect=`, and `group=` as adaptive layout hints;
- `visible=` and, for interactive widgets, `disabled=`;
- `options=` for typed v4 capabilities.

Choice widgets use `settings=` because their positional `options` argument already holds
the available choices.

## Catalog

### Text and status

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
lcars.header("Propulsion", size="h2", color="pale-canary")
lcars.metric("Warp Core", "98%", status="ok", id="warp-core")
lcars.progress("Shield Recharge", 72.0, color="anakiwa")
lcars.gauge("Deflector Load", 64, unit="%", warn_threshold=75, crit_threshold=90)
lcars.alert("Coolant pressure elevated", level="yellow")
```

Notification levels are separate from `alert()` levels. `notify()` accepts `info`,
`success`, `warning`, and `error`.

### Charts and data

| Function | Description / return |
| --- | --- |
| `chart(data, title=None)` | Line chart; optionally returns `ChartState`. |
| `sparkline(data, title=None)` | Compact series view. |
| `candlestick(data, title=None, markers=None)` | Zoomable OHLC chart; optionally returns `ChartState`. |
| `renko(data, brick_size, title=None)` | Server-computed Renko chart; optionally returns `ChartState`. |
| `shader(fragment_shader, uniforms=None)` | Animated WebGL fragment shader. |
| `table(data, title=None)` | Simple or typed interactive table; optionally returns `TableState`. |
| `log(stream_id, title=None)` | Streaming log; optionally returns `LogState`. |

`chart` and `sparkline` accept a numeric list, a mapping of series names to numeric
lists, or supported pandas data. Candlesticks accept OHLC dictionaries or a matching
DataFrame. Renko accepts prices, close/price dictionaries, or a pandas Series.

```python
lcars.chart(
    {"EPS A": [18, 21, 26, 34], "EPS B": [12, 17, 24, 29]},
    title="EPS Flow",
)

lcars.candlestick(
    ohlc_rows,
    title="ES Futures",
    markers=[{
        "time": "2026-08-08",
        "position": "below",
        "shape": "arrow_up",
        "color": "anakiwa",
        "text": "BUY",
    }],
)
```

Candlestick marker positions are `above`, `below`, and `in`; shapes are `arrow_up`,
`arrow_down`, `circle`, and `square`. `renko` requires a positive `brick_size`.

### Inputs and forms

| Function | Return |
| --- | --- |
| `button(label)` | `True` only during its click rerun. |
| `toggle(label, value=False)` | Current `bool`. |
| `checkbox(label, value=False)` | Current `bool`. |
| `select(label, options, value=None)` | Current `str`, or `list[str]` in multi-select mode. |
| `radio(label, options, value=None)` | Current `str`. |
| `radio_toggle(label, options, value=None)` | Current `str`. |
| `text_input(label, value="", placeholder="")` | Current `str`. |
| `number_input(label, value=0, min=None, max=None, step=1)` | Current `float`. |
| `file_upload(label, ...)` | `list[UploadedFile]` during a successful upload rerun. |
| `mic_button(action_id, ...)` | `MicResult` during a completed recording rerun. |

```python
mode = lcars.select("Mode", ["Cruise", "Alert"], id="mode")
gain = lcars.number_input("Gain", value=5, min=0, max=10, id="gain")

if lcars.button("Apply", id="apply"):
    lcars.notify(f"{mode=} {gain=}")
```

Forms submit a group of child inputs as one action:

```python
with lcars.form("Warp Setup", action_id="warp-submit", submit_label="Commit", id="warp-form"):
    lcars.number_input("Warp Factor", value=5.0, id="warp-factor")
    lcars.toggle("Dampeners", value=True, id="dampeners")
```

`form()` is a context manager and does not return a submitted flag. Use regular inputs
plus `button()` when the handler needs a direct Python branch.

## Enhanced tables

Without `TableOptions`, a `list[dict]` creates a simple table whose headers come from the
first dictionary. Typed rows separate raw values from presentation, links, copying, and
expanded detail:

```python
rows = [
    lcars.TableRow(
        id="repo-a",
        cells=[
            lcars.TableCell(
                value="org/repo-a",
                display="repo-a",
                link=lcars.LinkSpec(href="https://example.com/org/repo-a"),
                copyable=True,
            ),
            4200000,
            91,
        ],
    )
]

state = lcars.table(
    rows,
    id="results",
    options=lcars.TableOptions(
        columns=[
            lcars.TableColumn(key="repo", label="Repository", sortable=True, filter="text"),
            lcars.TableColumn(key="size", label="Size", sortable=True, sort_as="bytes"),
            lcars.TableColumn(key="fit", label="Fit", value_type="number", sortable=True),
        ],
        pagination=lcars.TablePagination(page_size=25),
        selection=lcars.TableSelection(mode="single"),
        expandable=True,
        data_mode="client",
        emit_state_changes=True,
        interaction=lcars.InteractionOptions(action_id="results"),
    ),
)
```

Tables support sorting, text/select filters, numeric comparisons, pagination, sticky
headers, row selection, child rows, full-width expanded content, loading/error states,
copyable cells, and links/actions. Smart sorting recognizes numbers, bytes, percentages,
durations, currencies, dates, versions, booleans, and natural numbers in text.

`data_mode="client"` performs sort/filter/page operations in the browser.
`data_mode="server"` leaves them to Python. `emit_state_changes=True` independently
chooses whether Python receives typed state events. The legacy
`InteractionOptions(mode="server")` shorthand enables server data mode and events.

State reconciliation is ID-based: ordinary data refreshes preserve the reader's current
selection and expansion, removed row IDs are pruned, and explicit option changes are
authoritative.

## Media and interactive workspaces

### HLS video

```python
lcars.video_hls("/media/telemetry.m3u8", title="Visual Feed", autoplay=False)
```

`VideoOptions` controls looping, preload, playback rates, source display, and
client/server state.

### Shader viewport

```python
lcars.shader(
    fragment_shader,
    title="Warp Core",
    uniforms={"u_color": [0.973, 0.6, 0.0]},
    aspect_ratio=2.0,
)
```

Every shader receives `u_time`, `u_resolution`, and `v_uv`. Compile errors appear inline.
`ShaderOptions` covers pause, frame limiting, reduced motion, and fallback content.

### Managed Three.js scene

```python
lcars.three_scene("scenes/bridge.js", props={"alert": "normal"}, id="bridge-3d")

# Local module directory is mounted read-only at /lcars/assets/.
lcars.run(ui, assets_dir="./assets")
```

`ThreeSceneOptions` configures camera, orbit controls, animation policy, DPR limits,
fallbacks, and state reporting. The scene module is application code; it is not bundled
into LCARS WebUI automatically.

### Node canvas

```python
state = lcars.node_canvas(
    document,
    title="Automation Graph",
    execution=execution_state,
    options=lcars.NodeCanvasOptions(editable=True, minimap=True, allow_import_export=True),
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
document = lcars.GraphDocument(
    version=2,
    layers=[
        lcars.GraphLayer(
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
        lcars.GraphEdge(
            id="edge-a",
            source="a",
            source_port="out",
            target="b",
            target_port="in",
            layer="layer-a",
            label="Related to",
        ),
    ],
)
lcars.node_canvas(document, options=lcars.NodeCanvasOptions(editable=False))
```

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

### Graph proposal workspace

`graph_workspace(workspace)` composes an immutable canonical plane beside a visually
distinct proposal plane. It adds proposal-only records and graph edits, caller-defined
typed-tree editors, undo/redo and autosave, collapse/focus/filter/search navigation,
matched-field reporting, breadcrumbs/history, virtual record and edge-fan views,
structural diff, preflight, and submission commands.

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
lcars.mic_button("voice-command", continuous=True, silence_ms=900)

files = lcars.file_upload(
    "Training Data",
    accept=[".json", "application/json"],
    max_files=4,
    max_bytes=10_000_000,
    id="training-data",
)
for uploaded in files:
    ingest(uploaded.name, uploaded.read())
```

Microphone access requires HTTPS or localhost. Continuous mode uses browser voice
activity detection and uploads each completed utterance. File uploads are request-scoped:
consume or persist their bytes during the rerun. LCARS does not permanently store them.

## Containers

| Context manager | Best use |
| --- | --- |
| `data_panel(title)` | Charts, tables, logs, text, and readouts. |
| `control_panel(title)` | Buttons, inputs, and forms. |
| `console(title)` | Explicit header, input column, left, and right regions. |
| `padd(title)` | Compact detail or review views. |
| `diagnostic(title)` | Main/side diagnostic instruments. |
| `box(title)` | Lower-level framed LCARS region. |
| `sweep(title)` | Explicit sweep geometry and bilateral content. |
| `bracket(title)` | Lightweight framed grouping. |
| `popup(title)` | Movable/resizable modal or modeless overlay. |

Container context objects expose named slot context managers. Collapsible containers
can expose `ContainerState` when server interaction is enabled.

`raw(reason=...)` is a local strict-layout escape hatch. `input_column(side="left" |
"right")` declares an input-oriented rail. Prefer semantic containers over page-level
`row`/`col` grids.

## Hints and pop-ups

A string hint is the short form:

```python
lcars.button("Engage", id="engage", hint="Initiates warp drive")
```

A rich hint is attached after its target and can contain widgets:

```python
lcars.button("Inspect", id="inspect")
with lcars.hint("inspect", trigger="click", placement="right", title="Briefing"):
    lcars.text("Warp-core pressure")
    lcars.sparkline([82, 84, 87, 85])
```

Triggers: `hover`, `focus`, `click`, `press`, `always`, `manual`. Placements: `auto`,
`top`, `bottom`, `left`, `right`. Manual hints respond to `show_hint()` and
`hide_hint()`. Rich hint controls dispatch normal actions.

```python
with lcars.popup(
    "Transfer Details",
    modal=False,
    draggable=True,
    resizable=True,
    close_action_id="close-transfer",
):
    lcars.text("Payload accepted.")
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

All models and state types are exported from `lcars_ui`.

## Knowledge-graph instruments

Version 4.5 adds `support_panel`, `frontier`, `assertion_card`, `anchor_card`,
`tri_state`, `constraint_band`, `gap_panel`, and `commitment_selector`, with the helper
calls `environments`, `atom_legend`, `context_tags`, and `contender_list`.

They preserve semantic distinctions such as alternative support environments,
UNKNOWN-versus-warning, support-versus-exclusion, unsupported-versus
support-independent, and supported-versus-empirically-grounded result sets.

See **[Knowledge Graph](Knowledge-Graph)** for payload shapes and return behavior, and
**[Reference](Reference#knowledge-graph-45-widgets)** for signatures and exported data models.

---

**See also:** [Layouts](Layouts) · [Actions and State](Actions-and-State) ·
[Reference](Reference)
