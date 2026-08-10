# lcars-ui

`lcars-ui` is a Python 3.10+ library for building live, browser-rendered LCARS
applications. You declare pages and instruments in Python; the package builds a typed
manifest, serves it with FastAPI, and renders it with a bundled React frontend. Standard
dashboard users do not need Node.js.

Current package version: **4.5.0**.

## Live example gallery

The screenshots below are generated from the bundled examples at 1920×1080. They show
real browser output, including clicked hints, notifications, uploaded-file state, and
lazy table expansion.

| Rich interaction | Spatial workspaces |
| --- | --- |
| ![Rich hint and notification](https://raw.githubusercontent.com/darsrc/LCARS-WebUI/main/docs/screenshots/rich-hint-notification.png) | ![Editable node canvas](https://raw.githubusercontent.com/darsrc/LCARS-WebUI/main/docs/screenshots/node-canvas.png) |

The complete seven-view gallery is in the
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
    layout="console",        # auto | console | telemetry | grid | menu
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
| `node_canvas(document, execution=None)` | Editable typed graph; can return `NodeCanvasState`. |

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

## Typed v4 capabilities

Pass `options=` to opt into richer behavior. Choice widgets use `settings=` because
their positional `options` argument already means choices.

| Family | Option types and capabilities |
| --- | --- |
| Text/header | `TextOptions`, `MarkdownOptions`, `HeaderOptions`: semantics, wrapping, copy, anchors, actions. |
| Status/meters | `MetricOptions`, `AlertOptions`, `MeterOptions`: trends, formatting, dismissals, ticks, thresholds. |
| Inputs/forms | `ButtonOptions`, `ToggleOptions`, `ChoiceOptions`, `TextInputOptions`, `NumberInputOptions`, `FormOptions`: confirmation, debounce, validation, search, multi-select, layout. |
| Tables | `TableOptions`: typed columns/cells, smart sorting, filters, pagination, selection, expansion, lazy content, copy and link actions. |
| Charts/media | `ChartOptions`, `SparklineOptions`, `FinancialChartOptions`, `ShaderOptions`, `LogOptions`, `VideoOptions`: axes, zoom, pause, search, playback, reduced motion. |
| Workspaces | `ThreeSceneOptions`, `NodeCanvasOptions`: cameras, controls, graph editing, history, import/export, execution controls. |
| Containers | `ContainerOptions`: density, overflow, collapse, and interaction state. |

Display interactions are browser-local by default. Add
`InteractionOptions(mode="server")` when Python must receive state. Enhanced tables can
instead keep client-side data operations while emitting state with
`data_mode="client", emit_state_changes=True`.

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

## The Web v0.3/v0.3.1

Version 4.5.0 adds eight semantic instruments. Each accepts its documented dictionary
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

See [the release notes](docs/release-v4.5.0.md) and the
[widget reference](docs/widgets.md#the-web-knowledge-widgets).

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

## Development

Run from this directory:

```bash
pytest tests/                     # backend and contract tests
cd frontend && npx vitest run     # frontend tests
cd .. && make lint                # ruff + mypy
make contracts-check              # generated contract parity
make frontend-bundle              # bundle React assets into the package
make docs-screenshots             # capture the nine-view documentation gallery
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
