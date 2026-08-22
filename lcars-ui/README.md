# lcars-ui

`lcars-ui` is a Python 3.10+ library for building live, browser-rendered LCARS
applications. You declare pages and instruments in Python; the package builds a typed
manifest, serves it with FastAPI, and renders it with a bundled React frontend. Standard
dashboard users do not need Node.js.

Current package version: **6.0.1**.

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

It serves `http://127.0.0.1:8000/` and opens the browser automatically.

## First application

```python
import lcars_ui as lcars


def ui() -> None:
    lcars.config("Bridge Ops", theme="galaxy", subtitle="NCC-1701-D")
    lcars.nav("Overview", page="overview", color="pale-canary")

    with lcars.page("Overview", id="overview", layout="console"):
        with lcars.data_panel("Telemetry", id="telemetry"):
            lcars.metric("Shields", "100%", status="ok", id="shields")
            lcars.chart([82, 84, 87, 91, 95], title="Warp Field")

        with lcars.control_panel("Commands", id="commands"):
            factor = lcars.number_input(
                "Warp Factor", value=5.0, min=1.0, max=9.99, step=0.01, id="warp-factor"
            )
            if lcars.button("Engage", id="engage"):
                lcars.notify(f"Warp command accepted: {factor:.2f}", level="success")


if __name__ == "__main__":
    lcars.run(ui)
```

## How execution works

LCARS WebUI has three execution modes:

- **BUILD:** `lcars.run(ui)` calls `ui()` once to produce the initial manifest. Inputs
  return their defaults and effects are ignored.
- **HANDLE:** a browser action reruns `ui()`. Input values are restored per browser
  session, and `button()` returns `True` only for the action that caused the rerun.
- **LIVE:** one optional `@lcars.live` callback can push widget updates and log lines to
  every connected browser without rebuilding the manifest.

Widget IDs connect browser state, actions, forms, and effects. Give explicit IDs to
interactive widgets, form children, log streams, and anything targeted by `update()`.

## Application and layout

```python
lcars.config(
    "My App",
    theme="galaxy",          # galaxy | tng | nemesis
    subtitle="Operations",
    settings_page=True,      # browser-local Options page
)

lcars.nav("Ops", page="ops")
with lcars.page(
    "Ops",
    id="ops",
    layout="console",        # auto | console | telemetry | grid | menu | authored
    fillers=True,
    sizing="fill",           # fill | content
):
    ...
```

LCARS-native page containers are `data_panel`, `control_panel`, `console`, `padd`,
`diagnostic`, `box`, `sweep`, and `bracket`. `row`, `col`, and `columns` remain available
as compatibility escape hatches.

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
with lcars.page("Exact", id="exact", layout="authored", chrome="none"):
    with lcars.composition(
        columns=[lcars.px(120), lcars.fr(1), lcars.fr(2)],
        rows=[lcars.px(72), lcars.fr(1)],
        design_size=(1440, 900),
        narrow="scroll",
    ) as stage:
        with stage.area("title", row=1, column=2, column_span=2):
            lcars.text("EXACT SURFACE", size="display")
        with stage.area("rail", row=2, column=1, decorative=True):
            lcars.bar(color="orange", caps="both", thickness=28)
```

Authored pages require exactly one top-level `composition()` plus optional pop-ups.
Same-layer area overlap is rejected. Narrow behavior is `scroll`, `scale`, or `adaptive`;
adaptive mode repacks only non-decorative content through the ordinary mosaic.

## Surface Engine

LCARS-WebUI now has three layout regimes: the adaptive mosaic for responsive applications,
`lcars.composition()` for exact row-and-column arrangements, and `lcars.surface()` for arbitrary
non-rectangular topology. A surface combines code-rendered geometry and ordinary widget regions
for arcs, routed diagrams, mirrored consoles, and radial instruments while preserving LCARS rails,
elbows, attached controls, and operational hierarchy.

```python
with lcars.page("Tactical Sensor", layout="authored", chrome="none"):
    with lcars.surface(design_size=(960, 840), min_width=600, narrow="scale") as surface:
        surface.rect(0, 0, 960, 840, color="#000", id="viewport-base")
        surface.elbow(0, 0, 610, 205, 145, 32, "top-left", color="atomic-tangerine")
        surface.ring(500, 430, 205, 215, 0, 360, color="lilac")
        with surface.region("commands", x=8, y=228, w=124, h=350):
            lcars.button("DEEP SCAN", color="atomic-tangerine", id="deep-scan")
```

| Seismic monitor | Tactical sensor |
| --- | --- |
| ![Planetary seismic activity monitor](https://raw.githubusercontent.com/darsrc/LCARS-WebUI/main/docs/screenshots/surface-seismic-monitor.png) | ![Tactical sensor analysis console](https://raw.githubusercontent.com/darsrc/LCARS-WebUI/main/docs/screenshots/surface-tactical-sensor.png) |
| EPS distribution PADD | Warp field diagnostic |
| ![EPS distribution PADD](https://raw.githubusercontent.com/darsrc/LCARS-WebUI/main/docs/screenshots/surface-eps-distribution-padd.png) | ![Warp field diagnostic console](https://raw.githubusercontent.com/darsrc/LCARS-WebUI/main/docs/screenshots/surface-warp-field-diagnostic.png) |
| Neural bioscan | |
| ![Neural bioscan console](https://raw.githubusercontent.com/darsrc/LCARS-WebUI/main/docs/screenshots/surface-neural-bioscan.png) | |

A surface's silhouette is the real paint boundary, not a shape drawn on a rectangular
backdrop — the page background outside the housing geometry is fully transparent. Clip a
device or embed viewport to the same outline and only the shape renders:

![EPS PADD with a transparent viewport background](https://raw.githubusercontent.com/darsrc/LCARS-WebUI/main/docs/screenshots/surface-eps-distribution-padd-viewport.png)

See [docs/surface.md](docs/surface.md) for the complete Surface Engine reference.

## Widget catalog

All leaf widgets accept `id=`, `color=`, `hint=`, placement hints, and visibility where
applicable. Interactive widgets also support `disabled=`. The table below focuses on
their defining arguments and return values.

### Text, status, and data

| Function | Purpose / return |
| --- | --- |
| `header(text, size="h2")` | LCARS section heading. |
| `text(content, size="body")` | Plain text (`body`, `h1`, `h2`, or `mono`). |
| `markdown(content)` | Safe rendered Markdown. |
| `metric(label, value, status="ok")` | Status tile; `ok`, `warn`, or `crit`. |
| `alert(message, level="yellow", blink=False)` | Alert banner; can return `AlertState`. |
| `progress(label, value)` | Segmented progress meter. |
| `gauge(label, value, min=0, max=100, unit=None)` | Segmented gauge with thresholds. |
| `table(data, title=None)` | Static or fully interactive typed table; can return `TableState`. |
| `log(stream_id, title=None)` | Streaming log viewer; append with `append_log`. |

### Charts, media, and workspaces

| Function | Purpose / return |
| --- | --- |
| `chart(data, title=None)` | Line chart from a series, mapping, or DataFrame. |
| `sparkline(data, title=None)` | Compact trend plot. |
| `candlestick(data, title=None, markers=None)` | Zoomable OHLC chart; can return `ChartState`. |
| `renko(data, brick_size, title=None)` | Server-computed Renko bricks; can return `ChartState`. |
| `shader(fragment_shader, uniforms=None)` | Animated WebGL fragment-shader viewport. |
| `video_hls(src, title=None)` | HLS player; can return `VideoState`. |
| `three_scene(module, props=None)` | Managed Three.js scene; can return `ThreeSceneState`. |
| `node_canvas(document, execution=None)` | Typed graph reader/editor with caller-defined edge layers; can return `NodeCanvasState`. |
| `graph_workspace(workspace)` | Canonical graph plus proposal-only authoring and density navigation; can return `GraphWorkspaceState`. |

### Inputs

| Function | Return |
| --- | --- |
| `button(label)` | `bool`; true only for its click rerun. |
| `toggle(label, value=False)` | Current `bool`. |
| `checkbox(label, value=False)` | Current `bool`. |
| `select(label, options, value=None)` | Current `str` or `list[str]` in multi-select mode. |
| `radio(label, options, value=None)` | Current `str`. |
| `radio_toggle(label, options, value=None)` | Current `str`. |
| `text_input(label, value="", placeholder="")` | Current `str`. |
| `number_input(label, value=0, min=None, max=None, step=1)` | Current `float`. |
| `file_upload(label, accept=None, max_files=10, max_bytes=25_000_000)` | `list[UploadedFile]` during the upload rerun. |
| `mic_button(action_id, timeout_ms=5000, continuous=False)` | `MicResult` during the completed recording rerun. |

`form(label, action_id, submit_label="Submit")` groups inputs and submits their values
together. It is a context manager and does not return a submit flag; use ordinary inputs
plus a button when direct Python branching is preferable.

## Typed capabilities

Pass `options=` to opt into richer behavior. Choice widgets use `settings=` because
their positional `options` argument already means choices.

| Family | Option types and capabilities |
| --- | --- |
| Text/header | `TextOptions`, `MarkdownOptions`, `HeaderOptions`: semantics, wrapping, copy, anchors, actions. |
| Status/meters | `MetricOptions`, `AlertOptions`, `MeterOptions`: trends, formatting, dismissals, ticks, thresholds. |
| Inputs/forms | `ButtonOptions`, `ToggleOptions`, `ChoiceOptions`, `TextInputOptions`, `NumberInputOptions`, `FormOptions`: confirmation, debounce, validation, search, multi-select, layout. |
| Tables | `TableOptions`: typed columns/cells, smart sorting, filters, pagination, selection, expansion, lazy content, copy and link actions. |
| Charts/media | `ChartOptions`, `SparklineOptions`, `FinancialChartOptions`, `ShaderOptions`, `LogOptions`, `VideoOptions`: axes, zoom, pause, search, playback, reduced motion. |
| Workspaces | `ThreeSceneOptions`, `NodeCanvasOptions`, `GraphWorkspaceOptions`: cameras, graph editing, proposal transactions, density navigation, virtualization, and submission. |
| Containers | `ContainerOptions`: density, overflow, collapse, and interaction state. |

Display interactions are browser-local by default. Add
`InteractionOptions(mode="server")` when Python must receive state. Enhanced tables can
instead keep client-side data operations while emitting state with
`data_mode="client", emit_state_changes=True`.

## Layered graph reader

Use graph format version 2 when edge categories carry meaning. The application declares
the visual grammar; the library remains unaware of what any layer means.

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

lcars.node_canvas(
    document,
    options=lcars.NodeCanvasOptions(editable=False, minimap=True),
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
revision = lcars.GraphRevision(graph_id="network", revision="r17")
workspace = lcars.GraphWorkspaceDocument(
    format="lcars-graph-workspace",
    version=1,
    workspace_id="workbench",
    canonical=lcars.CanonicalPlane(graph=revision, records=canonical_records),
    proposal=lcars.ProposalPlane(
        proposal_id="draft-1",
        title="Draft",
        base=revision,
    ),
    record_schemas=record_schemas,
    tree_schemas=tree_schemas,
    validation_rules=validation_rules,
    actions=submission_actions,
)

state = lcars.graph_workspace(
    workspace,
    title="Proposal workbench",
    options=lcars.GraphWorkspaceOptions(
        autosave_key="proposal-draft-1",
        fan_page_size=20,
        interaction=lcars.InteractionOptions(mode="server", action_id="workspace"),
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
lcars.button("Engage", id="engage", hint="Initiates warp drive")
```

Rich hints attach after their target and may contain a widget subtree:

```python
lcars.button("Inspect", id="inspect")
with lcars.hint("inspect", trigger="click", placement="right", title="Telemetry"):
    lcars.metric("Core", "87%", status="ok")
    lcars.sparkline([82, 84, 87], title="Trend")
```

Triggers are `hover`, `focus`, `click`, `press`, `always`, and `manual`. Manual hints
open with `show_hint(widget_id)` and close with `hide_hint(widget_id)`.

`popup()` creates a movable/resizable modal or modeless overlay. `notify()` creates a
movable notification with `info`, `success`, `warning`, or `error` level plus optional
title, timeout, and dismissal settings.

## File and media integration

`file_upload()` uses `/lcars/upload/files`. Uploaded bytes exist only for the action
rerun; consume or persist `UploadedFile.data` immediately. The browser receives metadata,
not file bytes. Server and widget byte limits are both enforced.

`mic_button()` uses `/lcars/upload/audio`. Microphone access requires HTTPS except on
localhost. `continuous=True` enables voice-activity detection and repeated utterances.

`three_scene()` loads a local JavaScript module from the read-only directory passed to
`run(..., assets_dir=...)` and served at `/lcars/assets/`:

```python
lcars.three_scene("scenes/bridge.js", props={"alert": "normal"})
lcars.run(ui, assets_dir="./assets")
```

## Knowledge-graph instruments

Version 4.5.0 added eight semantic instruments. Each accepts its documented dictionary
shape or an exported Pydantic model.

| Widget | Meaning | Return |
| --- | --- | --- |
| `support_panel` + `environments` + `atom_legend` | Alternative typed support environments. | context |
| `frontier` | Current node, path, and immediate neighbors. | clicked ID or `None` |
| `assertion_card` + `context_tags` | Assertion, singular framework, and qualifier roles. | context |
| `anchor_card` | Empirical/formal evidence, polarity, and source. | — |
| `tri_state` | YES / NO / UNKNOWN with FAST/EXACT mode. | exact-escalation `bool` |
| `constraint_band` | Interval exclusion and positioned/uncommitted claims. | — |
| `gap_panel` + `contender_list` | Missing bridge and valid empty/non-empty contenders. | context |
| `commitment_selector` | Commitment stance and separated consequence sets. | chosen ID or `None` |

```python
with lcars.support_panel("Support", node="n07"):
    lcars.environments(support_data)
    lcars.atom_legend()

clicked = lcars.frontier(frontier_data, layer_filter=["JUSTIFICATION"])
if clicked:
    navigate_to(clicked)

chosen = lcars.commitment_selector(commitment_data)
if chosen:
    reload_under(chosen)
```

See [the v5 release notes](docs/release-v5.0.0.md) and the
[widget reference](docs/widgets.md#knowledge-graph-widgets).

## Effects and live updates

```python
if lcars.button("Refresh", id="refresh"):
    lcars.update("shields", value="91%", status="warn")
    lcars.append_log("ops-log", "Telemetry refreshed")
    lcars.notify("Refresh complete", level="success")

if __name__ == "__main__":
    @lcars.live(interval=2.0)
    def tick() -> None:
        lcars.update("shields", value=f"{read_shields()}%")

    lcars.run(ui)
```

Other global effects are `set_alert_condition("normal" | "yellow" | "red")` and
`set_theme("galaxy" | "tng" | "nemesis")`.

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
| `examples/graph_workspace` | Proposal authoring, density navigation, edge fans, diff, and submission. |
| `examples/canon_recreation` | Exact image-free authored compositions using the public DSL. |

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

- `src/lcars_ui/dsl/` — Python authoring API and rerun engine.
- `src/lcars_ui/widgets/` — typed widget data, options, and state.
- `src/lcars_ui/core/` — manifest and protocol models.
- `src/lcars_ui/server/` — security and transport support.
- `frontend/src/` — React renderer and client state.
- `docs/` — detailed package references and release notes.

## Documentation

- [Quick start](docs/quickstart.md)
- [DSL and adaptive layout](docs/dsl.md)
- [Widget capability reference](docs/widgets.md)
- [Deployment and security](docs/deployment.md)
- [LCARS visual language](docs/lcars_language.md)
- [GitHub Wiki](https://github.com/darsrc/LCARS-WebUI/wiki)
