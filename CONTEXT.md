# LCARS WebUI — Project Context

This document is a complete reference for the LCARS WebUI project. It is intended to be handed to an AI assistant or used for fast human orientation without reading the source files.

---

## What This Project Is

LCARS WebUI is a Python library that lets developers build live, Star Trek-style LCARS dashboards by writing a single Python function. There is no HTML, CSS, or JavaScript to write. The library:

1. Takes a Python function that declares widgets using a simple DSL (`import lcars_ui as lcars`)
2. Builds a versioned JSON **Manifest** describing the full UI layout
3. Serves the manifest and handles realtime events via a FastAPI backend
4. Renders everything in a pre-bundled React/TypeScript frontend (served from within the Python package)

When the user clicks a button, toggles a switch, or submits a form, the Python function re-runs with updated state. The developer only writes Python.

---

## Repository Layout

```
LCARS-WebUI/                          ← git root
├── CONTEXT.md                        ← this file
├── README.md                         ← project overview (beginner-friendly)
├── LCARS UI Specification.md         ← original design spec (authoritative reference)
├── Implementation Plan.md            ← original backend implementation plan
├── Phase N Implementation Plan.md   ← per-phase planning docs (historical)
├── Project_Context.txt               ← earlier informal context notes
└── lcars-ui/                         ← the Python package + frontend + tests
    ├── pyproject.toml                ← package metadata, dependencies, tool config
    ├── Makefile                      ← developer command runner
    ├── README.md                     ← detailed library README (beginner-friendly)
    ├── spec/SPEC.md                  ← copy of spec inside package
    ├── fixtures/golden/              ← CONTRACT ARTIFACTS (committed, version-controlled)
    │   ├── manifest.v1.json          ← reference manifest output
    │   ├── protocol.v1.json          ← reference protocol envelopes
    │   └── schema.v1.json            ← JSON Schema generated from Pydantic models
    ├── scripts/
    │   ├── generate_golden.py        ← regenerates fixtures/golden/*.json
    │   ├── run_smoke_test.py         ← boots app and checks /lcars/manifest
    │   └── run_security_audit.py    ← validates security environment settings
    ├── docs/
    │   ├── quickstart.md
    │   ├── lcars_language.md
    │   ├── widgets.md
    │   ├── dsl.md
    │   ├── deployment.md
    │   ├── phase12_coverage.md
    │   └── phaseN_coverage.md       ← coverage docs per phase
    ├── examples/
    │   └── bridge_ops/app.py        ← reference DSL app (fully runnable)
    ├── src/lcars_ui/                 ← Python package source
    │   ├── __init__.py               ← re-exports full DSL public surface
    │   ├── app.py                    ← FastAPI factory create_app()
    │   ├── _static/                  ← pre-built React bundle (committed)
    │   │   ├── index.html
    │   │   └── assets/               ← JS, CSS, fonts
    │   ├── core/
    │   │   ├── models.py             ← Manifest, Page, Row, Column, Layout, Meta, Widget union
    │   │   └── widget_base.py        ← BaseWidget (id, type, label, color, disabled, visible)
    │   ├── widgets/
    │   │   ├── primitives.py         ← Text, StatusTile, Alert, ProgressBar, Markdown
    │   │   ├── inputs.py             ← Button, Toggle, Checkbox, Select, Radio, RadioToggle, TextInput, NumberInput, Form
    │   │   ├── data.py               ← Table, LineChart, Sparkline, Gauge
    │   │   ├── containers.py         ← LcarsBox, LcarsSweep, LcarsBracket, LcarsHeader
    │   │   └── media.py              ← LogViewer, VideoHls, MicButton
    │   ├── server/
    │   │   ├── events.py             ← Envelope, all payload models, make_envelope()
    │   │   ├── stream.py             ← ConnectionManager, EventBus
    │   │   ├── security.py           ← Auth, rate limiting, headers middleware
    │   │   └── stt.py                ← STTAdapter ABC, MockSTTAdapter
    │   ├── plugins/
    │   │   └── loader.py             ← PluginLoader, PluginDefinition, dispatch_plugin_action()
    │   └── dsl/
    │       ├── api.py                ← all public lcars.* functions
    │       ├── _state.py             ← _LCARSContext, Mode enum, session state dict
    │       ├── _builder.py           ← _ManifestBuilder (accumulates pages/rows/cols/widgets)
    │       ├── _normalize.py         ← strict-mode bare-widget auto-wrap normalizer
    │       └── _adapters.py          ← _to_series_and_labels(), _to_table_data()
    ├── tests/
    │   ├── conftest.py
    │   ├── contracts/                ← golden artifact validation (anti-drift)
    │   ├── unit/                     ← logic tests (no server required)
    │   └── integration/              ← HTTP + WebSocket end-to-end tests
    └── frontend/                     ← React/TypeScript source
        ├── src/
        │   ├── App.tsx               ← root component, all runtime state
        │   ├── main.tsx              ← React entry point
        │   ├── components/
        │   │   ├── WidgetRenderer.tsx        ← renders all widget/container types (recursive)
        │   │   ├── MicButtonControl.tsx      ← MediaRecorder push-to-talk
        │   │   ├── shell/LcarsFrame.tsx      ← LCARS shell built from composable primitives
        │   │   ├── shell/LcarsElbow.tsx      ← SVG elbow geometry for all 4 corners
        │   │   ├── shapes/*.tsx              ← LCARS bars/pills/rects/segments primitives
        │   │   ├── containers/*.tsx          ← lcars_box/sweep/bracket/header controls
        │   │   ├── charts/LineChartWidget.tsx
        │   │   └── charts/SparklineWidget.tsx
        │   ├── runtime/
        │   │   ├── transport.ts      ← WebSocket + SSE + reconnect logic
        │   │   ├── manifest.ts       ← applyManifestUpdate, applyWidgetUpdate, resolveDefaultPageId
        │   │   └── audio.ts          ← LcarsAudioManager, sound cue system
        │   ├── types/
        │   │   ├── contract.ts       ← TypeScript types mirroring Pydantic models + isManifest()
        │   │   └── protocol.ts       ← Envelope types + parseEnvelope(), makeActionEnvelope(), etc.
        │   ├── theme/
        │   │   └── colorTokens.ts    ← resolveColorToken(), THEME_COLOR_HEX, isTheme()
        │   ├── hooks/
        │   │   └── useTransientPulse.ts  ← triggers CSS pulse animation on value change
        │   └── styles/lcars/
        │       ├── tokens.css        ← CSS custom properties for all theme palettes
        │       ├── base.css          ← reset, body, .lcars-ui root
        │       ├── primitives.css    ← bar/pill/rect/elbow primitive styling
        │       ├── containers.css    ← lcars_box/sweep/bracket/header styling
        │       ├── shell.css         ← frame, header, sidebar, footer composition
        │       ├── widgets-core.css  ← all widget card, input, toggle, form styles
        │       ├── charts.css        ← gauge, chart container styles
        │       ├── media.css         ← log viewer, video, mic button styles
        │       ├── motion.css        ← animations: pulse, blink, page-enter
        │       └── responsive.css    ← sidebar/frame responsive adjustments
        └── e2e/app.spec.ts           ← Playwright end-to-end tests
```

---

## Implementation Status

All phases through Phase 12 are complete. The library is at **v0.3.0-alpha**.

| Phase | Description |
|---|---|
| 0 | Scaffolding, Makefile, pyproject.toml, golden artifact scripts |
| 1 | Core widget Pydantic models, golden artifact generation + contract tests |
| 2 | FastAPI server, `/lcars/manifest`, `/lcars/schema`, CORS, Gzip |
| 3 | WebSocket `/lcars/ws`, SSE `/lcars/events`, HTTP `/lcars/action/{id}`, `ConnectionManager`, `EventBus` |
| 4 | Audio upload `/lcars/upload/audio`, `STTAdapter` ABC, `MockSTTAdapter` |
| 5 | Plugin system — entry-point + filesystem discovery, collision detection, handler dispatch |
| 6 | Python DSL (`import lcars_ui as lcars`), rerun model, session-isolated state |
| 7 | Full React frontend renderer, LCARS shell frame, transport layer |
| 8 | Security hardening — token auth, scopes, rate limits, payload limits, CSP headers |
| 9 | Static bundle serving inside package (`_static/`), SPA catch-all routing, smoke tests |
| 10 | Recharts chart rendering, 4 new widgets (gauge, progress_bar, markdown, number_input), WS reconnect hardening, root manifest resync on reconnect, session state isolation, DSL ergonomics (`form`, `row`, `col`, `section`), MediaRecorder mic flow |
| 11 | Authentic composable LCARS system: 30+ named colors, primitive LCARS shapes, `lcars_box`/`lcars_sweep`/`lcars_bracket`/`lcars_header`, shell refactor, segmented sidebar/footer, checkbox/radio/radio-toggle inputs, typography config flags |
| 12 | Strict LCARS visual language overhaul: corrected elbow geometry, seamless shell frame, strict/classic mode switch (`meta.visual_language`), strict-mode widget auto-wrapping normalizer, docs/tests/golden updates |

---

## Architecture

### The Contract (JSON Manifest)

The central artifact is a **Manifest** JSON object. The backend generates it; the frontend consumes it. It is versioned (`meta.version = "1.0.0"` in golden artifacts), validated by Pydantic, and frozen in `fixtures/golden/manifest.v1.json` as a contract test artifact.

```
Manifest
├── meta         (version, app_name, theme, lang, sound_enabled, typography flags, visual_language)
├── layout
│   ├── header   (title, subtitle, color)
│   └── sidebar  (position: left|right|hidden, items: [{id, label, target_page, color, segments?}])
└── pages        dict[page_id → Page]
                 Page → rows: [Row]
                         Row → columns: [Column]  (id, height)
                               Column → widgets: [Widget]  (id, width)
```

### Backend (Python / FastAPI)

**Entry point:** `lcars_ui.app.create_app(*, manifest=None) -> FastAPI`

- Called with `manifest=None` in raw mode (loads from `fixtures/golden/`)
- Called with a `Manifest` object in DSL mode (generated from the user's Python function)

**Key internal objects (stored on `app.state`):**
- `connection_manager` — `ConnectionManager`: tracks active WebSocket sessions, broadcasts envelopes
- `event_bus` — `EventBus`: async pub/sub; internal code publishes envelopes, bus forwarder task sends them to all connected clients
- `stt_adapter` — `STTAdapter`: pluggable speech-to-text; default is `MockSTTAdapter`
- `manifest` — `Manifest | None`: live manifest in DSL mode
- `plugin_action_handlers` — `dict[str, ActionHandler]`: glob-pattern-matched action handler registry
- `security_settings` — `SecuritySettings`: resolved from env vars at startup
- `rate_limiter` — `SlidingWindowRateLimiter`: in-memory per-identity sliding window

**Lifespan:**
1. Validates fixture artifacts on startup (raw mode only)
2. Starts `bus_forwarder` asyncio task (routes EventBus publishes → WebSocket broadcast)
3. Optionally starts `_live_loop` task if `@lcars.live` was used
4. Cancels both tasks on shutdown

### Frontend (React / TypeScript / Vite)

The frontend is a single-page app bundled into `src/lcars_ui/_static/`. It is served by FastAPI when the Python server starts. Users do not need Node.js to run dashboards.

**Startup sequence:**
1. `GET /lcars/manifest` → validates with `isManifest()` → stores in React state
2. Creates `ProtocolTransport` → connects WebSocket → falls back to SSE if WS fails
3. On `manifest_update` with empty path → replaces full manifest (initial sync or resync after reconnect)
4. Subsequent envelopes patch state immutably

**App.tsx owns all runtime state:**
- `manifest` — full parsed manifest
- `activePageId` — currently displayed page
- `transportStatus` — `{mode: ws|sse|reconnecting|offline, attempt: number}`
- `logsByStream` — `Record<stream_id, string[]>`
- `notifications` — transient notification stack (max 6)
- `actionStatus` — `Record<action_id, pending|ok|fail>`

---

## Realtime Protocol (v1.0)

All messages share an **Envelope** shape:

```json
{
  "v": "1.0",
  "ts": 1709000000.0,
  "type": "<event_type>",
  "payload": { ... }
}
```

### Downstream (server → browser)

| type | payload fields | purpose |
|---|---|---|
| `manifest_update` | `path: str`, `value: any` | Patch or replace manifest. Empty path replaces root. |
| `widget_update` | `id: str`, `data: dict` | Merge partial data into a widget by id |
| `log_chunk` | `stream_id: str`, `lines: [str]` | Append lines to a log viewer |
| `notification` | `message: str`, `level: info\|error` | Show toast notification |
| `action_ack` | `action_id: str`, `status: ok\|fail` | Acknowledge an upstream action |

### Upstream (browser → server)

| type | payload fields | purpose |
|---|---|---|
| `action` | `id: str`, `value: any` | Button click or generic widget action |
| `input` | `id: str`, `value: str` | Text/number input value committed |
| `form_submit` | `id: str`, `data: dict` | Form submitted with all child values |

### Transport fallback chain

1. **WebSocket** `/lcars/ws` — primary; sends full manifest on connect; bidirectional
2. **SSE** `/lcars/events` — fallback when WS fails; downstream-only
3. **HTTP POST** `/lcars/action/{widget_id}` — action fallback when neither WS nor SSE is available

**Reconnect behavior (frontend):** Exponential back-off starting at 500ms, capped at 30s, ±20% jitter. On reconnect, server sends a `manifest_update` with empty path to resync full state.

---

## Python DSL

### Public surface (`import lcars_ui as lcars`)

All functions are re-exported from `lcars_ui.dsl.api` via `lcars_ui/__init__.py`.

**App lifecycle:**
```python
lcars.config(name, *, theme="galaxy", subtitle=None, header_color="orange", sound_enabled=True, lang="en-US", visual_language="strict", force_uppercase=True, label_uppercase=True, lcars_font_headers=True, lcars_font_labels=True, lcars_font_text=False)
lcars.run(ui_fn, *, host="127.0.0.1", port=8000, open_browser=True)

@lcars.live(interval=5.0)   # decorator; only one per app
def ui(): ...
```

**Layout:**
```python
lcars.nav(label, *, page=None, color=None)          # sidebar nav item
with lcars.page(title, *, id=None): ...             # named page
with lcars.row(*, height="auto"): ...               # horizontal strip
with lcars.col(width="1fr"): ...                    # column inside row
lcars.columns(["2fr", "1fr"])                       # returns list of context managers
with lcars.section(label, *, color=None): ...       # visual group (heading + body)
with lcars.form(label, action_id, *, submit_label, color, id): ...
```

**Display widgets (return None):**
```python
lcars.text(content, *, size="body", color=None, id=None)
lcars.markdown(content, *, color=None, id=None)
lcars.metric(label, value, *, status="ok", color=None, id=None)
lcars.alert(message, *, level="yellow", blink=False, id=None)
lcars.progress(label, value, *, color=None, show_label=True, id=None)
lcars.chart(data, *, title=None, color=None, id=None)     # list[float] | dict | DataFrame
lcars.sparkline(data, *, title=None, id=None)
lcars.gauge(label, value, *, min=0.0, max=100.0, unit=None, color=None, warn_threshold=None, crit_threshold=None, id=None)
lcars.table(data, *, title=None, id=None)                 # list[list] | list[dict] | DataFrame
lcars.log(stream_id, *, max_lines=1000, title=None, id=None)
```

**Input widgets (return current value):**
```python
lcars.button(label, *, color=None, id=None) -> bool       # True only on the triggering rerun
lcars.toggle(label, *, value=False, color=None, id=None) -> bool
lcars.select(label, options, *, value=None, color=None, id=None) -> str
lcars.text_input(label, *, placeholder="", password=False, id=None) -> str
lcars.number_input(label, *, value=0.0, min=None, max=None, step=1.0, placeholder=None, id=None) -> float
```

**Effects (HANDLE/LIVE mode only; no-op in BUILD):**
```python
lcars.update(widget_id, **fields)          # broadcast widget_update envelope
lcars.notify(message, *, level="info")     # broadcast notification envelope
lcars.append_log(stream_id, *lines)        # broadcast log_chunk envelope
```

### DSL Execution Modes

The `_LCARSContext` (stored in a `ContextVar`) has three modes:

| Mode | When | What happens |
|---|---|---|
| `BUILD` | Startup, or explicit rebuild | `ui_fn()` runs; widgets are declared and collected by `_ManifestBuilder`; input functions return defaults or stored session values |
| `HANDLE` | On every upstream action (WS action/input/form_submit) | `ui_fn()` re-runs; `button()` returns `True` only if its id == `active_action_id`; toggle/select/text_input return new value from payload and persist to session state; effects (`notify`, `update`, `append_log`) queue envelopes |
| `LIVE` | On `@lcars.live` timer tick | Like HANDLE but without an active_action_id; only effects fire |

### Session State

`_widget_state: dict[str, dict[str, Any]]` — global in-process dict keyed by `session_id`.

- WebSocket connections: each gets a UUID `session_id` from `ConnectionManager.connect()`
- HTTP fallback: always uses `session_id="http_fallback"` (shared)
- On WebSocket disconnect: `clear_session_state(session_id)` is called

### ID Generation

`auto_id(label, registered_ids)` — converts label to kebab-case, appends numeric suffix on collision. IDs are generated once per `ui_fn` call and must be stable across reruns (same label → same id).

---

## Widget Type Catalog

### Primitives (`widgets/primitives.py`)

| type literal | class | key fields |
|---|---|---|
| `text` | `Text` | `content: str`, `size: h1\|h2\|body\|mono` |
| `status_tile` | `StatusTile` | `value: str`, `status: ok\|warn\|crit` |
| `alert` | `Alert` | `message: str`, `severity: red\|yellow`, `blink: bool` |
| `progress_bar` | `ProgressBar` | `value: float` (0–100), `show_label: bool` |
| `markdown` | `Markdown` | `content: str` (rendered with marked.js + DOMPurify) |

### Inputs (`widgets/inputs.py`)

| type literal | class | key fields |
|---|---|---|
| `button` | `Button` | `action_id: str` |
| `toggle` | `Toggle` | `checked: bool`, `action_id: str` |
| `lcars_checkbox` | `Checkbox` | `checked: bool`, `action_id: str` |
| `select` | `Select` | `options: [SelectOption]`, `value: str`, `action_id: str` |
| `lcars_radio` | `Radio` | `options: [SelectOption]`, `value: str`, `action_id: str` |
| `lcars_radio_toggle` | `RadioToggle` | `options: [SelectOption]`, `value: str`, `action_id: str` |
| `text_input` | `TextInput` | `value: str`, `placeholder`, `password: bool`, `regex` |
| `number_input` | `NumberInput` | `value: float`, `min`, `max`, `step: float` |
| `form` | `Form` | `submit_label: str`, `action_id: str`, `children: [InputWidget]` |

`SelectOption`: `{label: str, value: str}`

`InputWidget` discriminated union: Button | Toggle | Checkbox | Select | Radio | RadioToggle | TextInput | NumberInput (can be form children)

### Data (`widgets/data.py`)

| type literal | class | key fields |
|---|---|---|
| `table` | `Table` | `headers: [str]`, `rows: [TableRow]` |
| `line_chart` | `LineChart` | `series: [SeriesPointSet]`, `x_labels: [str]` |
| `sparkline` | `Sparkline` | `series: [SeriesPointSet]`, `x_labels: [str]` |
| `gauge` | `Gauge` | `value: float`, `min`, `max`, `unit`, `warn_threshold`, `crit_threshold` |

`TableRow`: `{id: str, cells: [str]}`
`SeriesPointSet`: `{name: str, data: [float], color: LcarsColor|None}`

### Media (`widgets/media.py`)

| type literal | class | key fields |
|---|---|---|
| `log_viewer` | `LogViewer` | `stream_id: str`, `max_lines: int` (default 1000) |
| `video_hls` | `VideoHls` | `src: str`, `autoplay: bool`, `muted: bool` |
| `mic_button` | `MicButton` | `upload_url: str`, `action_id: str`, `timeout_ms: int` |

### Containers (`widgets/containers.py`)

| type literal | class | key fields |
|---|---|---|
| `lcars_box` | `LcarsBox` | `title/subtitle`, `corners`, `sides`, per-corner/side colors, `left_inputs`, `right_inputs`, `children` |
| `lcars_sweep` | `LcarsSweep` | `title`, `color`, `reverse`, `width_sidebar`, `children` |
| `lcars_bracket` | `LcarsBracket` | `color`, `orientation`, `children` |
| `lcars_header` | `LcarsHeader` | `text`, `color`, `size` |

### Common base fields (all widgets)

`id: str`, `type: str` (literal), `label: str|None`, `color: LcarsColor|None`, `disabled: bool`, `visible: bool`

**`LcarsColor`**: legacy aliases + 30+ named LCARS colors (e.g. `pale-canary`, `atomic-tangerine`, `dodger-soft`) + raw hex (`#RRGGBB`).

---

## Security System (`server/security.py`)

Configured entirely via environment variables. Defaults are development-safe (no auth required).

### Environment Variables

| Variable | Default | Description |
|---|---|---|
| `LCARS_AUTH_REQUIRED` | `false` | Enforce token auth on all endpoints |
| `LCARS_AUTH_TOKENS` | `""` | Token→scope map. JSON: `{"tok": ["lcars.read"]}` or CSV: `tok:lcars.read\|lcars.write` |
| `LCARS_CORS_ORIGINS` | `*` | Comma-separated allowed origins |
| `LCARS_MAX_JSON_BODY_BYTES` | `64000` | Max HTTP action body size |
| `LCARS_MAX_AUDIO_UPLOAD_BYTES` | `5000000` | Max audio upload size (5MB) |
| `LCARS_MAX_WS_MESSAGE_BYTES` | `64000` | Max WebSocket message size |
| `LCARS_RATE_LIMIT_WINDOW_SECONDS` | `10.0` | Sliding window duration |
| `LCARS_RATE_LIMIT_MAX_REQUESTS` | `30` | Max requests per window per identity |
| `LCARS_SECURE_HEADERS_ENABLED` | `true` | Attach CSP, X-Frame-Options, etc. |

### Scopes

- `lcars.read` — required for `GET /lcars/manifest`, `GET /lcars/schema`, `GET /lcars/events`
- `lcars.write` — required for `POST /lcars/action/{id}`, `POST /lcars/upload/audio`, upstream WS messages
- `lcars.stream` — required for WebSocket connection

Token is passed as `Authorization: Bearer <token>` header or `?token=<token>` query param.

Anonymous access gets all three scopes when `LCARS_AUTH_REQUIRED=false`.

### Security constraints at startup

- `LCARS_AUTH_REQUIRED=true` + empty `LCARS_AUTH_TOKENS` → RuntimeError
- `LCARS_AUTH_REQUIRED=true` + `LCARS_CORS_ORIGINS=*` → RuntimeError

### Rate limiter

`SlidingWindowRateLimiter` — in-memory, per `{channel}:{identity}` key, thread-safe. Keys: `http_action:...`, `http_sse:...`, `http_upload:...`, `ws:{identity}`.

### Response headers (when enabled)

```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: no-referrer
Cache-Control: no-store
Content-Security-Policy: default-src 'self'; connect-src 'self' ws: wss:; img-src 'self' data:; media-src 'self' https:;
```

---

## Plugin System (`plugins/loader.py`)

Plugins extend the manifest with additional pages, sidebar items, and action handlers.

### Discovery order

1. Python package entry points under group `lcars_ui.plugins`
2. `*.py` files in `./plugins/` (relative to `os.getcwd()`), sorted alphabetically, skipping `_*`

### Plugin module interface

A plugin module must expose either:
- `PLUGIN` — a `PluginDefinition` instance or compatible dict
- `get_plugin()` — a callable returning the same

### PluginDefinition fields

```python
@dataclass
class PluginDefinition:
    name: str
    pages: dict[str, Page]
    sidebar_items: list[SidebarItem]
    action_handlers: dict[str, ActionHandler]  # glob-pattern → async/sync callable
```

### Collision rules

- Page id collision → `PluginCollisionError`
- Sidebar item id collision → `PluginCollisionError`
- Action handler pattern collision → `PluginCollisionError`

### Action handler dispatch

`dispatch_plugin_action(handlers, action_id, value, session_id)` — iterates handler patterns using `fnmatch.fnmatch`. Matches the first pattern. Inspects callback signature to decide whether to pass `session_id`. Supports both sync and async callbacks.

The wildcard `"*"` pattern is used internally by DSL mode's `_dsl_action_handler`.

---

## Frontend Architecture

### Component Tree

```
main.tsx
└── App.tsx                          ← all state, data fetching, transport setup
    ├── LcarsFrame (shell)           ← LCARS geometry: elbows, header, sidebar, footer
    │   └── [page content]
    │       └── [rows × cols]
    │           └── WidgetRenderer   ← switch on widget.type, renders one widget
    │               ├── StatusTileControl
    │               ├── GaugeControl
    │               ├── ProgressControl
    │               ├── TextInputControl / NumberInputControl / ToggleControl / SelectControl
    │               ├── FormControl (wraps form children)
    │               ├── MarkdownControl (marked.js + DOMPurify)
    │               ├── LineChartWidget / SparklineWidget (Recharts)
    │               └── MicButtonControl (MediaRecorder)
    └── notification-stack           ← last 6 notifications
```

### Transport Layer (`runtime/transport.ts`)

`createProtocolTransport(callbacks)` returns `{send, close, mode}`.

- Opens WebSocket immediately on creation
- On WS open: clears SSE if active, resets attempt counter
- On WS close (non-intentional): opens SSE, schedules WS reconnect
- Reconnect: exponential back-off `BASE_DELAY_MS=500`, `MAX_DELAY_MS=30000`, ±20% jitter
- SSE: registers named event listeners for all 5 downstream event types
- `send()`: sends via WS if open; returns `false` otherwise (caller falls back to HTTP)

### Manifest Runtime (`runtime/manifest.ts`)

- `applyManifestUpdate(manifest, path, value)` — deep-clones manifest, patches at dot/bracket path, or replaces root if path is `""`
- `applyWidgetUpdate(manifest, id, data)` — immutable update; traverses all pages/rows/cols/widgets (including form children)
- `resolveDefaultPageId(manifest)` — first sidebar target that exists in pages, else first page key
- `getLogViewerByStream(manifest, streamId)` — finds a LogViewer widget by stream_id

### Audio (`runtime/audio.ts`)

`createLcarsAudioManager()` creates a manager with:
- `unlock()` — must be called from a user gesture (pointerdown) to unlock AudioContext
- `play(cue)` — plays a named cue: `ready`, `ack`, `alert`, `negative`
- `setEnabled(bool)` — mutes/unmutes
- `dispose()` — closes AudioContext

Sound cues are suppressed during initial page load (`suppressAutomatedAudioRef`). The ref is cleared after the first manifest renders.

### Themes

Three themes: `galaxy` (TNG/DS9), `tng` (Season 1–2), `nemesis` (First Contact).

Applied via `data-theme` attribute on `.lcars-ui` root. CSS custom properties in `tokens.css` define all colors per theme:

```css
[data-theme="galaxy"] { --lcars-color-orange: #FF9900; ... }
[data-theme="tng"]    { --lcars-color-orange: #FF9933; ... }
[data-theme="nemesis"]{ --lcars-color-orange: #BBAA55; ... }
```

Colors: `orange`, `red`, `blue`, `purple`, `white`, `yellow`.

### CSS Architecture

All styles are in `frontend/src/styles/lcars/`:

| File | Contents |
|---|---|
| `tokens.css` | CSS custom properties for colors, spacing, fonts per theme |
| `base.css` | Body reset, `.lcars-ui` root, `.boot-status` loading/error states |
| `shell.css` | `.lcars-shell-frame`, `.lcars-header-bar`, `.lcars-sidebar-rail`, `.lcars-footer-bar`, elbows |
| `widgets-core.css` | Widget cards, inputs, toggles, selects, buttons, forms, tables, progress, status tiles, alerts |
| `charts.css` | Gauge SVG, chart containers, Recharts overrides |
| `media.css` | Log viewer pre, video player, mic button |
| `motion.css` | `@keyframes lcars-pulse`, `@keyframes lcars-blink`, `.lcars-page-enter` |
| `responsive.css` | Sidebar layout adjustments for position left/right/hidden |

---

## HTTP API Endpoints

| Method | Path | Auth Scope | Description |
|---|---|---|---|
| GET | `/` | none | Serves bundled React SPA (or status page if no bundle) |
| GET | `/{path}` | none | SPA catch-all (serves index.html for client-side routing) |
| GET | `/lcars/manifest` | `lcars.read` | Returns full manifest JSON |
| GET | `/lcars/schema` | `lcars.read` | Returns JSON Schema for the manifest |
| WS | `/lcars/ws` | `lcars.stream` | WebSocket realtime channel |
| GET | `/lcars/events` | `lcars.read` | SSE stream fallback |
| POST | `/lcars/action/{widget_id}` | `lcars.write` | HTTP action fallback; body: `{"value": any}` |
| POST | `/lcars/upload/audio` | `lcars.write` | Multipart audio upload; returns 202 |
| GET | `/docs` | none | FastAPI auto-generated Swagger UI |

---

## Test Infrastructure

**Backend: pytest** (194 tests collected; pandas-dependent tests skip when pandas is absent)

```
tests/
├── conftest.py                          ← shared fixtures
├── contracts/
│   ├── test_manifest_schema.py          ← compares live Pydantic output to golden JSON
│   └── test_protocol_schema.py          ← validates protocol envelope golden file
├── unit/
│   ├── test_widgets.py                  ← widget serialization, type uniqueness
│   ├── test_dsl_state.py                ← auto_id, session state, mode transitions
│   ├── test_dsl_builder.py              ← _ManifestBuilder page/row/col/widget assembly
│   ├── test_dsl_adapters.py             ← _to_series_and_labels, _to_table_data (pandas optional)
│   ├── test_dsl_row_col.py              ← row/col context managers
│   ├── test_dsl_form.py                 ← form children, action dispatch
│   ├── test_new_widgets.py              ← gauge, progress_bar, markdown, number_input
│   ├── test_session_state.py            ← per-session isolation
│   ├── test_static_serving.py           ← bundle present/absent scenarios
│   ├── test_stream_and_dispatch.py      ← ConnectionManager, EventBus, dispatch_plugin_action
│   ├── test_security_config.py          ← SecuritySettings, env var parsing
│   ├── test_stt.py                      ← MockSTTAdapter determinism
│   ├── test_phase0_coverage.py          ← scaffold compliance
│   ├── test_phase0_semantic_confidence.py
│   ├── test_phase2_coverage.py          ← HTTP routes, CORS, status page
│   └── test_phase12_visual_language.py  ← strict/classic defaults + normalizer behavior
└── integration/
    ├── test_api_endpoints.py             ← HTTP route responses with TestClient
    ├── test_streaming.py                 ← WebSocket connect/action/ack, SSE
    ├── test_plugins.py                   ← plugin discovery, collision errors
    ├── test_dsl_roundtrip.py             ← full DSL build → serve → action → ack cycle
    └── test_security_phase8.py           ← auth, scopes, rate limits, payload limits
```

**Contract test flag:** `pytest tests/contracts/ --check-golden` — fails if live output differs from golden files.

**Frontend: Vitest** (45 tests, 10 files)

```
frontend/src/
├── App.test.tsx                          ← manifest load, transport status, sidebar, notifications
├── components/WidgetRenderer.test.tsx    ← renders all major widget types
├── components/MicButtonControl.test.tsx  ← recording state, upload trigger
├── components/charts/LineChartWidget.test.tsx
├── components/charts/SparklineWidget.test.tsx
├── runtime/transport.test.ts            ← WS/SSE connect, reconnect, send
├── runtime/manifest.test.ts             ← applyManifestUpdate, applyWidgetUpdate
├── runtime/audio.test.ts                ← AudioManager cue/enable/dispose
└── types/contract.test.ts               ← isManifest() validation
```

**E2E: Playwright** (`frontend/e2e/app.spec.ts`) — requires a running backend.

---

## Build System (Makefile)

All targets run from `lcars-ui/`.

| Target | Command | Description |
|---|---|---|
| `install` | `pip install -e ".[dev]"` | Install Python package in editable mode with dev deps |
| `dev` | `python examples/bridge_ops/app.py` | Run the reference DSL app |
| `test` | `pytest tests/ -v --cov=lcars_ui --cov-fail-under=60` | Run all backend tests |
| `contracts-check` | `pytest tests/contracts/ --check-golden --no-cov` | CI gate: verify no contract drift |
| `contracts-update` | `python scripts/generate_golden.py` | Regenerate golden artifacts after model changes |
| `lint` | `ruff check src/ tests/ && mypy src/` | Lint + type check |
| `smoke` | `python scripts/run_smoke_test.py` | Boot server, hit /lcars/manifest, assert 200 |
| `security-audit` | `LCARS_SECURITY_AUDIT_STRICT=1 python scripts/run_security_audit.py` | Validate security settings |
| `clean` | removes build/, dist/, __pycache__, `_static/assets/`, `_static/index.html` | Clean all generated artifacts |
| `frontend-install` | `cd frontend && npm ci` | Install frontend node_modules |
| `frontend-test` | runs `frontend-install` then `npm run test:coverage` | Frontend unit tests with coverage |
| `frontend-build` | runs `frontend-install` then `npm run build` | Vite production build |
| `frontend-bundle` | runs `frontend-build` then copies `dist/` → `src/lcars_ui/_static/` | Bundle into Python package |
| `frontend-ci` | `frontend-test` + `frontend-build` | Frontend CI |
| `frontend-e2e` | Playwright install + `npm run test:e2e` | Playwright browser tests |
| `ci` | `clean lint contracts-check test smoke security-audit frontend-ci frontend-bundle test` | Full pipeline |

---

## Python Package Configuration (`pyproject.toml`)

```toml
[project]
name = "lcars-ui"
version = "0.3.0"
requires-python = ">=3.10"
dependencies = [
  "fastapi>=0.110.0",
  "uvicorn[standard]>=0.29.0",
  "pydantic>=2.0",
  "python-multipart>=0.0.9",
]

[project.optional-dependencies]
dev = [
  "pytest>=8.0.0", "pytest-asyncio>=0.23.0", "pytest-cov>=5.0.0",
  "httpx>=0.27.0", "ruff>=0.6.0", "mypy>=1.10.0",
  "jsonschema>=4.22.0", "pip-audit>=2.7.0",
]

[tool.setuptools.package-data]
lcars_ui = ["_static/index.html", "_static/assets/*"]
```

The `_static/` directory is included in the wheel, so `pip install lcars_ui-*.whl` gives a fully self-contained install.

---

## Frontend Dependencies (`package.json`)

**Runtime:**
- `react ^18`, `react-dom ^18`
- `axios ^1.7` — HTTP client for manifest fetch and action fallback
- `recharts ^3.7` — Line chart and sparkline rendering
- `marked ^17` — Markdown rendering (used with DOMPurify)
- `dompurify ^3.3` — Sanitizes marked.js HTML output
- `clsx ^2.1` — Conditional className utility
- `@fontsource/antonio ^5.2` — LCARS-style display font
- `@tanstack/react-query ^5.62` — (installed, available for future use)
- `tailwind-merge ^2.5` — (installed, available)

**Dev:**
- `vite ^5.4`, `@vitejs/plugin-react ^5.1` — build and dev server
- `typescript ^5.6`
- `vitest ^3.2`, `@testing-library/react ^16`, `jsdom ^27` — unit testing
- `@playwright/test ^1.56` — E2E testing
- `tailwindcss ^3.4`, `postcss ^8.4`, `autoprefixer ^10.4` — CSS toolchain

---

## Known Limitations (v0.3.0-alpha)

1. **Not on PyPI** — install from wheel file only
2. **MicButton requires HTTPS or localhost** — browser microphone policy
3. **One `@lcars.live` per app** — second decorator raises `RuntimeError`
4. **In-memory session state** — lost on server restart; no persistence layer
5. **In-memory rate limiter** — not shared across multiple server processes
6. **MockSTTAdapter only** — real STT requires a custom `STTAdapter` implementation
7. **No dark-mode override** — theme controls all colors; no independent dark/light toggle
8. **VideoHls widget** — renders `<video src>` directly; HLS.js not bundled (only works where browser natively supports HLS)

---

## Extending the Project

### Add a new widget type

1. Add Pydantic class to appropriate `src/lcars_ui/widgets/*.py` file
2. Add to the `Widget` union in `src/lcars_ui/core/models.py`
3. Add TypeScript interface to `frontend/src/types/contract.ts` and add to `Widget` union
4. Add render case to `frontend/src/components/WidgetRenderer.tsx`
5. Add DSL function to `src/lcars_ui/dsl/api.py` and export from `__init__.py`
6. Regenerate golden artifacts: `make contracts-update && make contracts-check`

### Add a plugin

Create `plugins/my_plugin.py` in the working directory:

```python
from lcars_ui.plugins.loader import PluginDefinition
from lcars_ui.core.models import Page

PLUGIN = PluginDefinition(
    name="my_plugin",
    pages={"my_page": Page(id="my_page", title="My Page", rows=[])},
    sidebar_items=[],
    action_handlers={"my_plugin.*": lambda action_id, value: print(f"action: {action_id}")},
)
```

### Change security settings for production

```bash
export LCARS_AUTH_REQUIRED=true
export LCARS_AUTH_TOKENS='{"secret-token": ["lcars.read", "lcars.write", "lcars.stream"]}'
export LCARS_CORS_ORIGINS="https://your-frontend.example.com"
```

### Rebuild frontend after source changes

```bash
make frontend-bundle   # rebuilds Vite bundle and copies into _static/
```
