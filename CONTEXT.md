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

## Current Repository Truth

- The current working-tree repo state is closed through Phase 18.
- The active architecture is a two-role renderer system:
  - `legacy_strict` is the live product renderer
  - Oracle/acceptance infrastructure has been archived
  - `joern_strict` is deprecated and retained only for compatibility, archived comparison, and frozen bake-off paths
- Phase status:
  - Phase 15 is complete and is the baseline for primitive-boundary, explicit strict-role, and parity-retirement guardrails
  - Phase 16 is complete / closed and locks the current seven-target / four-family canonical target-bank scope
  - Phase 17 is complete / closed and is the current product-side scaffold/surface convergence baseline
  - Phase 18 is complete / closed and is the current explicit strict-contract, compatibility-fence, and shared elbow-scaffold baseline
- Phase 18 actually accomplished:
  - explicit strict manifest contract metadata now ships through the active strict DSL path and golden/schema fixtures
  - compatibility repair for older implicit manifests is fenced to manifest ingest while explicit-manifest runtime heuristics stay retired
  - shared elbow-scaffold reuse is active across oracle and product paths without changing renderer roles or canonical acceptance scope
  - repo-local build, visual, schema, HTTP, and WebSocket validation remain restored under the current toolchain
- Canonical LCARS-ready acceptance is the catalog-driven target-bank run:
  - `make ci`
  - `make canonical-acceptance`
  - `cd lcars-ui/frontend && npm run test:visual`
- `CURRENT_STATE.md` at the repo root is the short current-state document, and `lcars-ui/docs/PHASE18_CLOSEOUT.md` is the package-level closeout summary. This file remains the deeper orientation reference.
- The next frontier is future phase planning against the closed Phase 18 baseline. This truth-sync pass does not open that phase, continue convergence work, or reopen renderer strategy.

---

## Repository Layout

```
LCARS-WebUI/                          ← git root
├── CURRENT_STATE.md                  ← root current-state / phase-status truth
├── CONTEXT.md                        ← this file
├── README.md                         ← project overview (beginner-friendly)
├── LCARS UI Specification.md         ← original design spec (authoritative reference)
├── Phases 1-10 Pre Alpha Implementation Plan.md ← original pre-alpha implementation plan
├── Phase N Implementation Plan.md   ← per-phase planning docs (historical)
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
    │   └── run_security_audit.py     ← validates security environment settings
    ├── docs/
    │   ├── quickstart.md
    │   ├── lcars_language.md
    │   ├── widgets.md
    │   ├── dsl.md
    │   ├── deployment.md
    │   ├── PHASE17_CLOSEOUT.md      ← historical Phase 17 closeout summary
    │   ├── PHASE18_CLOSEOUT.md      ← current Phase 18 closeout summary / truth-sync anchor
    │   └── phaseN_coverage.md        ← coverage docs per phase
    ├── examples/
    │   ├── bridge_ops/app.py         ← canonical multi-panel bridge sample (Phase 13 composition)
    │   ├── lcars_console/app.py      ← canonical console recipe sample
    │   └── lcars_padd/app.py         ← canonical PADD recipe sample
    ├── src/lcars_ui/                 ← Python package source
    │   ├── __init__.py               ← re-exports full DSL public surface
    │   ├── app.py                    ← FastAPI factory create_app()
    │   ├── _static/                  ← pre-built React bundle (committed)
    │   │   ├── index.html
    │   │   └── assets/               ← JS, CSS, fonts
    │   ├── core/
    │   │   ├── models.py             ← Manifest, Page, Row, Column, Layout, Meta, Widget union
    │   │   └── widget_base.py        ← BaseWidget, LcarsColor, LcarsNamedColor, HexColor
    │   ├── widgets/
    │   │   ├── primitives.py         ← Text, StatusTile, Alert, ProgressBar, Markdown
    │   │   ├── inputs.py             ← Button, Toggle, Checkbox, Select, Radio, RadioToggle,
    │   │   │                            TextInput, NumberInput, Form, InputWidget, SelectOption
    │   │   ├── data.py               ← Table, LineChart, Sparkline, Gauge,
    │   │   │                            TableRow, SeriesPointSet
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
    │       ├── _state.py             ← _LCARSContext, _Config, Mode enum, session state dict
    │       ├── _builder.py           ← _ManifestBuilder (accumulates pages/rows/cols/widgets)
    │       ├── _normalize.py         ← strict-mode layout compiler (smart auto-paneling + title sweeps)
    │       ├── _recipes.py           ← Phase 13 LCARS recipe helpers
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
        │   ├── index.css             ← global CSS entry (imports lcars/ stylesheets)
        │   ├── vite-env.d.ts
        │   ├── components/
        │   │   ├── WidgetRenderer.tsx        ← renders all widget/container types (recursive)
        │   │   ├── MicButtonControl.tsx      ← MediaRecorder push-to-talk
        │   │   ├── widgetStyles.ts           ← shared color/style utility for widget components
        │   │   ├── controls/Lcars*Control.tsx ← strict LCARS-native control renderers
        │   │   ├── shell/LcarsFrame.tsx      ← LCARS shell built from composable primitives
        │   │   ├── shell/LcarsElbow.tsx      ← SVG elbow geometry for all 4 corners
        │   │   ├── shapes/LcarsBar.tsx       ← horizontal/vertical bar primitive
        │   │   ├── shapes/LcarsPill.tsx      ← rounded pill primitive
        │   │   ├── shapes/LcarsRect.tsx      ← rectangle primitive
        │   │   ├── shapes/LcarsSegmentedBar.tsx ← stacked multi-color bar primitive
        │   │   ├── containers/LcarsBoxControl.tsx
        │   │   ├── containers/LcarsSweepControl.tsx
        │   │   ├── containers/LcarsBracketControl.tsx
        │   │   ├── containers/LcarsHeaderControl.tsx
        │   │   ├── charts/LineChartWidget.tsx
        │   │   └── charts/SparklineWidget.tsx
        │   ├── runtime/
        │   │   ├── transport.ts      ← WebSocket + SSE + reconnect logic
        │   │   ├── manifest.ts       ← applyManifestUpdate, applyWidgetUpdate, resolveDefaultPageId
        │   │   └── audio.ts          ← LcarsAudioManager, sound cue system
        │   ├── context/
        │   │   └── VisualLanguageContext.tsx ← strict/classic rendering context
        │   ├── types/
        │   │   ├── contract.ts       ← TypeScript types mirroring Pydantic models + isManifest()
        │   │   └── protocol.ts       ← Envelope types + parseEnvelope(), makeActionEnvelope(), etc.
        │   ├── theme/
        │   │   ├── colorTokens.ts    ← resolveColorToken(), THEME_COLOR_HEX, isTheme()
        │   │   └── geometryTokens.ts ← TS mirror of strict geometry constants
        │   ├── hooks/
        │   │   └── useTransientPulse.ts  ← triggers CSS pulse animation on value change
        │   ├── test/
        │   │   ├── manifestFixture.ts    ← shared manifest fixture data for tests
        │   │   └── setup.ts              ← Vitest global test setup
        │   └── styles/lcars/
        │       ├── tokens.css        ← CSS custom properties for all theme palettes
        │       ├── geometry.css      ← strict geometry token system (Phase 13)
        │       ├── base.css          ← reset, body, .lcars-ui root
        │       ├── primitives.css    ← bar/pill/rect/elbow primitive styling
        │       ├── containers.css    ← lcars_box/sweep/bracket/header styling
        │       ├── controls.css      ← strict control geometry and states
        │       ├── shell.css         ← frame, header, sidebar, footer composition
        │       ├── widgets-core.css  ← all widget card, input, toggle, form styles
        │       ├── charts.css        ← gauge, chart container styles
        │       ├── media.css         ← log viewer, video, mic button styles
        │       ├── motion.css        ← animations: pulse, blink, page-enter
        │       └── responsive.css    ← sidebar/frame responsive adjustments
        ├── tests/visual/*.spec.ts    ← Playwright strict visual regression tests
        └── e2e/app.spec.ts           ← Playwright end-to-end tests
```

---

## Implementation Status

Earlier phases 0 through 13 built the package, strict-mode runtime, and DSL foundation.

Current phase-status truth:

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
| 11 | Authentic composable LCARS system: 37 named colors, primitive LCARS shapes, `lcars_box`/`lcars_sweep`/`lcars_bracket`/`lcars_header`, shell refactor, segmented sidebar/footer, checkbox/radio/radio-toggle inputs, typography config flags |
| 12 | Strict LCARS visual language overhaul: corrected elbow geometry, seamless shell frame, strict/classic mode switch (`meta.visual_language`), strict-mode widget auto-wrapping normalizer (`_normalize.py`), docs/tests/golden updates |
| 13 | LCARS-native architecture completion: strict layout compiler (smart auto-paneling + page-title sweeps + raw bypass), explicit sweep region semantics (header/rail/content with dual-region subdivision), container-owned interior zoning (telemetry/readout/control), and de-dashboarded strict widget routes. Its old default visual-regression gate was later superseded. |
| 14 | Historical / superseded as a phase label. It established the target-bank family/oracle path, but is not the current live roadmap. |
| 15 | Complete baseline. Primitive promotion, explicit strict-role and strict-title contracts, parity retirement, and architecture-boundary guardrails are closed baseline, not active carry-over work. |
| 16 | Complete / closed. Canonical acceptance is catalog-driven, the family-state policy is explicit, `periodic_table_matrix` is an accepted singleton exemption, and `adge_intro` is onboarded as a canonical family. |
| 17 | Complete / closed. `legacy_strict` now consumes more explicit scaffold and shared-surface intent, second-wave shared primitive promotion is landed across oracle and product paths, and repo-local HTTP plus WebSocket app-backed validation is restored under the current toolchain. The two-role renderer architecture remains unchanged. |

---

## Architecture

### Current active architecture

- Product renderer: `legacy_strict`
- Oracle / acceptance engine: archived
- Deprecated compatibility path: `joern_strict`
- Current shape: one application with intentionally separate product and canonical-acceptance routes

Important naming note:
- The oracle component namespace from the historical target-bank path has been archived.

### The Contract (JSON Manifest)

The central artifact is a **Manifest** JSON object. The backend generates it; the frontend consumes it. It is versioned (`meta.version = "1.0"`), validated by Pydantic, and frozen in `fixtures/golden/manifest.v1.json` as a contract test artifact.

```
Manifest
├── meta         (version, app_name, theme, lang, sound_enabled, typography flags, visual_language)
├── layout
│   ├── header   (title, subtitle, color)
│   └── sidebar  (position: left|right|hidden, items: [{id, label, target_page, color, segments?}])
└── pages        dict[page_id → Page]
                 Page → rows: [Row]  (id, height)
                         Row → columns: [Column]  (id, width)
                               Column → widgets: [Widget]  (id, type, ...)
```

### Backend (Python / FastAPI)

**Entry point:** `lcars_ui.app.create_app(*, manifest=None) -> FastAPI`

- Called with `manifest=None` in raw mode (loads manifest from `fixtures/golden/`)
- Called with a `Manifest` object in DSL mode (generated from the user's Python function)

**Key internal objects (stored on `app.state`):**
- `connection_manager` — `ConnectionManager`: tracks active WebSocket sessions, broadcasts envelopes
- `event_bus` — `EventBus`: async pub/sub; internal code publishes envelopes, `bus_forwarder` asyncio task sends them to all connected clients
- `stt_adapter` — `STTAdapter`: pluggable speech-to-text; default is `MockSTTAdapter`
- `manifest` — `Manifest | None`: live manifest in DSL mode; `None` in raw mode
- `plugin_action_handlers` — `dict[str, ActionHandler]`: glob-pattern-matched action handler registry; DSL mode injects `"*"` key
- `security_settings` — `SecuritySettings`: resolved from env vars at startup
- `rate_limiter` — `SlidingWindowRateLimiter`: in-memory per-identity sliding window
- `_live_coro_factory` — optional coroutine factory injected by `@lcars.live`

**Lifespan:**
1. Validates fixture artifacts on startup (raw mode only)
2. Starts `bus_forwarder` asyncio task (routes EventBus publishes → WebSocket broadcast)
3. Optionally starts `_live_loop` task if `@lcars.live` was used (factory stored on `app.state._live_coro_factory`)
4. Cancels both tasks on shutdown

**Middleware stack (outermost to innermost):**
1. `SecurityHeadersMiddleware` — CSP and security headers
2. `CORSMiddleware` — configurable allowed origins
3. `GZipMiddleware` — compresses responses ≥ 500 bytes

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
lcars.config(
    name,
    *,
    theme="galaxy",           # "galaxy" | "tng" | "nemesis"
    subtitle=None,
    header_color="orange",
    sound_enabled=True,
    lang="en-US",
    visual_language="strict", # "strict" | "classic"
    force_uppercase=True,
    label_uppercase=True,
    lcars_font_headers=True,
    lcars_font_labels=True,
    lcars_font_text=False,
)

lcars.run(ui_fn, *, host="127.0.0.1", port=8000, open_browser=True)

@lcars.live(interval=5.0)   # decorator; only one per app; raises RuntimeError if called twice
def ui(): ...
```

**Navigation and pages:**
```python
lcars.nav(
    label,
    *,
    page=None,                # target page id; auto-derived from label if omitted
    color=None,
    segments=None,            # list[{"label": str|None, "color": str}] for stacked sidebar bars
)

with lcars.page(title, *, id=None): ...
```

**Layout context managers (grid compatibility):**
```python
with lcars.row(*, height="auto"): ...
with lcars.col(width="1fr"): ...
lcars.columns(["2fr", "1fr"])   # returns list of context managers (one per column)
with lcars.section(label, *, color=None): ...  # syntactic sugar: calls lcars.header() then yields
with lcars.form(label, action_id, *, submit_label="Submit", color=None, id=None): ...
```

In strict mode, top-level `row()` / `col()` usage triggers an advisory warning to prefer LCARS-first composition.

**LCARS-first composition context managers (Phase 13):**
```python
with lcars.console(title, *, color="orange", id=None): ...
with lcars.padd(title, *, color="orange", id=None): ...
with lcars.diagnostic(title, *, color="blue", id=None): ...
with lcars.data_panel(title="Data", *, color="blue", id=None): ...
with lcars.control_panel(title="Controls", *, color="orange", id=None): ...
with lcars.input_column(*, side="left"|"right"): ...  # routes widgets to enclosing lcars_box side inputs
with lcars.raw(*, reason=None): ...                   # strict-mode subtree bypass for auto-paneling
```

**LCARS container primitives:**
```python
# yields _LcarsBoxContext with .left_inputs() and .right_inputs() sub-context-managers
with lcars.box(
    title=None,
    *,
    subtitle=None,
    corners=[1, 2, 3, 4],      # corner elbows: [TL, TR, BR, BL]
    sides=[1, 2, 3, 4],         # side bars: [top, right, bottom, left]
    color="orange",
    corner_colors=None,         # list[LcarsColor] length 4, per-corner overrides
    side_colors=None,           # list[LcarsColor] length 4, per-side overrides
    title_color=None,
    subtitle_color=None,
    width_left=150,             # left sidebar px (min 48)
    width_right=150,            # right sidebar px (min 48)
    id=None,
) as box:
    with box.left_inputs(): ... # widgets placed in left sidebar column
    with box.right_inputs(): ...# widgets placed in right sidebar column
    # widgets declared here go into the main content area (children)

with lcars.sweep(
    title=None,
    *,
    color="orange",
    reverse=False,              # if True, renders sweep reversed vertically
    width_sidebar=150,          # sidebar px (min 48)
    id=None,
): ...

with lcars.bracket(
    *,
    color="orange",
    orientation="both",         # "left" | "right" | "both"
    id=None,
): ...
```

**Display widgets (return None; only active in BUILD mode):**
```python
lcars.header(text_value, *, size="h2", color=None, id=None)  # size: h1–h6
lcars.text(content, *, size="body", color=None, id=None)      # size: h1|h2|body|mono
lcars.markdown(content, *, color=None, id=None)
lcars.metric(label, value, *, status="ok", color=None, id=None)  # status: ok|warn|crit
lcars.alert(message, *, level="yellow", blink=False, id=None)    # level: red|yellow
lcars.progress(label, value, *, color=None, show_label=True, id=None)
lcars.chart(data, *, title=None, color=None, id=None)            # data: list[float] | dict | DataFrame
lcars.sparkline(data, *, title=None, id=None)
lcars.gauge(label, value, *, min=0.0, max=100.0, unit=None, color=None,
            warn_threshold=None, crit_threshold=None, id=None)
lcars.table(data, *, title=None, id=None)                        # data: list[list] | list[dict] | DataFrame
lcars.log(stream_id, *, max_lines=1000, title=None, id=None)
```

**Input widgets (return current value; active in all modes):**
```python
lcars.button(label, *, color=None, id=None) -> bool         # True only in the triggering rerun
lcars.toggle(label, *, value=False, color=None, id=None) -> bool
lcars.checkbox(label, *, value=False, color=None, id=None) -> bool
lcars.select(label, options, *, value=None, color=None, id=None) -> str
lcars.radio(label, options, *, value=None, color=None, id=None) -> str
lcars.radio_toggle(label, options, *, value=None, color=None, id=None) -> str
lcars.text_input(label, *, placeholder="", password=False, id=None) -> str
lcars.number_input(label, *, value=0.0, min=None, max=None, step=1.0, placeholder=None, id=None) -> float
```

`options` for select/radio/radio_toggle: `list[str]` — converted to `SelectOption(label=o, value=o)` internally.

**Effects (HANDLE/LIVE mode only; no-op in BUILD):**
```python
lcars.update(widget_id, **fields)          # broadcast widget_update envelope
lcars.notify(message, *, level="info")     # broadcast notification envelope; level: info|error
lcars.append_log(stream_id, *lines)        # broadcast log_chunk envelope
```

### DSL Execution Modes

The `_LCARSContext` (stored in a `ContextVar[_LCARSContext]`) has three modes:

| Mode | When | What happens |
|---|---|---|
| `BUILD` | Startup, or explicit rebuild | `ui_fn()` runs; widgets are declared and collected by `_ManifestBuilder`; input functions return defaults or stored session values |
| `HANDLE` | On every upstream action (WS action/input/form_submit) | `ui_fn()` re-runs; `button()` returns `True` only if its id == `active_action_id`; toggle/checkbox/select/radio/radio_toggle/text_input/number_input return new value from payload and persist to session state; effects queue envelopes |
| `LIVE` | On `@lcars.live` timer tick | Like HANDLE but without an active_action_id; only effects fire |

### Session State

`_widget_state: dict[str, dict[str, Any]]` — module-level global dict in `dsl/_state.py`, keyed by `session_id → widget_id → value`.

- WebSocket connections: each gets a UUID `session_id` from `ConnectionManager.connect()`
- HTTP fallback: always uses `session_id="http_fallback"` (shared across all HTTP calls)
- On WebSocket disconnect: `clear_session_state(session_id)` is called to free memory

### ID Generation

`auto_id(label, registered_ids)` — converts label to kebab-case, appends numeric suffix on collision. IDs are generated once per `ui_fn` call and must be stable across reruns (same label → same id). Explicit `id=` overrides bypass auto-generation but still check for duplicates.

### Strict Mode Normalizer (`dsl/_normalize.py`)

When `config.visual_language == "strict"` (the default), `_ManifestBuilder.build()` calls `normalize_manifest_for_strict(manifest)` before returning. This function:

- Injects a top-row page-title `lcars_sweep` for titled pages (unless already present)
- Scans each column's widget list and groups consecutive non-structural widgets
- Applies smart wrapper selection:
  - all-input groups -> generated `LcarsBox` with widgets routed to `right_inputs`
  - all-data groups -> generated `LcarsBox` with widgets routed to `children`
  - mixed groups -> generated `LcarsBracket` (`orientation="both"`)
  - single widgets -> generated `LcarsBracket` (`orientation="left"`)
- Compiles `lcars_sweep` interiors into explicit `header_children`, `rail_children`, and `content_children` regions
- Compiles `lcars_box` interiors so input widgets are side-rail owned before content placement
- Normalizes structural container subtrees recursively while preserving authored container intent
- Respects `raw_widget_ids` collected by `lcars.raw()`, which bypasses strict auto-paneling for those widget subtrees

This yields LCARS-native page structure even when authors write bare widgets, while preserving explicit containers and raw escape hatches.

---

## Widget Type Catalog

25 widget types total across 5 categories.

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
| `text_input` | `TextInput` | `value: str`, `placeholder: str\|None`, `password: bool`, `regex: str\|None` |
| `number_input` | `NumberInput` | `value: float`, `min: float\|None`, `max: float\|None`, `step: float`, `placeholder: str\|None` |
| `form` | `Form` | `submit_label: str`, `action_id: str`, `children: [InputWidget]` |

`SelectOption`: `{label: str, value: str}`

`InputWidget` discriminated union: Button | Toggle | Checkbox | Select | Radio | RadioToggle | TextInput | NumberInput. These are the only types allowed as `form` children.

### Data (`widgets/data.py`)

| type literal | class | key fields |
|---|---|---|
| `table` | `Table` | `headers: [str]`, `rows: [TableRow]` |
| `line_chart` | `LineChart` | `series: [SeriesPointSet]`, `x_labels: [str]` |
| `sparkline` | `Sparkline` | `series: [SeriesPointSet]`, `x_labels: [str]` |
| `gauge` | `Gauge` | `value: float`, `min`, `max`, `unit: str\|None`, `warn_threshold: float\|None`, `crit_threshold: float\|None` |

`TableRow`: `{id: str, cells: [str]}`
`SeriesPointSet`: `{name: str, data: [float], color: LcarsColor|None}`

### Media (`widgets/media.py`)

| type literal | class | key fields |
|---|---|---|
| `log_viewer` | `LogViewer` | `stream_id: str`, `max_lines: int` (default 1000, min 1) |
| `video_hls` | `VideoHls` | `src: str`, `autoplay: bool`, `muted: bool` |
| `mic_button` | `MicButton` | `upload_url: str`, `action_id: str`, `timeout_ms: int` (default 5000, min 100) |

### Containers (`widgets/containers.py`)

| type literal | class | key fields |
|---|---|---|
| `lcars_box` | `LcarsBox` | `title/subtitle: str\|None`, `corners: [int]`, `sides: [int]`, `color`, `corner_colors: [LcarsColor]\|None` (len 4), `side_colors: [LcarsColor]\|None` (len 4), `title_color`, `subtitle_color`, `width_left: int` (≥48), `width_right: int` (≥48), `left_inputs: [Widget]\|None`, `right_inputs: [Widget]\|None`, `children: [Widget]` |
| `lcars_sweep` | `LcarsSweep` | `title: str\|None`, `color`, `reverse: bool`, `width_sidebar: int` (≥48), `header_children: [Widget]\|None`, `rail_children: [Widget]\|None`, `content_children: [Widget]\|None`, `children: [Widget]` (legacy content mirror) |
| `lcars_bracket` | `LcarsBracket` | `color`, `orientation: left\|right\|both`, `children: [Widget]` |
| `lcars_header` | `LcarsHeader` | `text: str`, `color`, `size: h1\|h2\|h3\|h4\|h5\|h6` |

Containers hold recursive `Widget` references. `LcarsBox`, `LcarsSweep`, and `LcarsBracket` call `model_rebuild()` in `core/models.py` after the `Widget` union is defined to resolve forward references.

`corners` and `sides` index meaning: `[1,2,3,4]` = `[TL,TR,BR,BL]` for corners, `[top,right,bottom,left]` for sides. Values must be in `{1,2,3,4}`; duplicates are de-duped automatically.

### Common base fields (all widgets — `core/widget_base.py`)

`id: str`, `type: str` (literal discriminator), `label: str|None`, `color: LcarsColor|None`, `disabled: bool` (default False), `visible: bool` (default True)

### LcarsColor type (`core/widget_base.py`)

`LcarsColor: TypeAlias = LcarsNamedColor | HexColor`

`HexColor`: string matching `^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$`

`LcarsNamedColor` — 37 named values:

| Era | Names |
|---|---|
| Legacy aliases | `orange`, `red`, `blue`, `purple`, `white`, `yellow` |
| 2357 era | `pale-canary`, `tanoi`, `golden-tanoi`, `neon-carrot`, `eggplant`, `lilac`, `anakiwa`, `mariner` |
| 2369 era | `bahama-blue`, `blue-bell`, `melrose`, `hopbush`, `chestnut-rose`, `orange-peel`, `atomic-tangerine`, `danub` |
| 2375 era | `indigo`, `lavender-purple`, `cosmic`, `red-damask`, `medium-carmine`, `bourbon`, `sandy-brown`, `periwinkle` |
| 2379 era | `dodger-pale`, `dodger-soft`, `near-blue`, `navy-blue`, `husk`, `rust`, `tamarillo` |

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
| `LCARS_FIXTURES_DIR` | (package-relative) | Override path to golden fixture files |

### Scopes

- `lcars.read` — required for `GET /lcars/manifest`, `GET /lcars/schema`, `GET /lcars/events`
- `lcars.write` — required for `POST /lcars/action/{id}`, `POST /lcars/upload/audio`, upstream WS messages
- `lcars.stream` — required for WebSocket connection

Token is passed as `Authorization: Bearer <token>` header or `?token=<token>` query param.

Anonymous access gets all three scopes when `LCARS_AUTH_REQUIRED=false`.

### Security constraints at startup

- `LCARS_AUTH_REQUIRED=true` + empty `LCARS_AUTH_TOKENS` → `RuntimeError`
- `LCARS_AUTH_REQUIRED=true` + `LCARS_CORS_ORIGINS=*` → `RuntimeError`

### Rate limiter

`SlidingWindowRateLimiter` — in-memory, per `{channel}:{identity}` key. Rate-limit channels: `http_action:...`, `http_sse:...`, `http_upload:...`, `ws:{identity}`. WebSocket messages are rate-limited inline; excess closes the connection with code 1013.

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

Plugins are not loaded in DSL mode (`manifest` provided to `create_app`).

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

`dispatch_plugin_action(handlers, action_id, value, session_id)` — iterates handler patterns using `fnmatch.fnmatch`. First match wins. Inspects callback signature to decide whether to pass `session_id`. Supports both sync and async callbacks.

The wildcard `"*"` pattern is used internally by the DSL mode `_dsl_action_handler` registered in `lcars.run()`.

---

## Frontend Architecture

### Component Tree

```
main.tsx
└── App.tsx                          ← all state, data fetching, transport setup
    ├── canonical fixture mode       ← archived scene routing for accepted target-bank targets
    │   ├── SeismographicFamilyScene
    │   ├── HolodeckFamilyScene
    │   ├── PeriodicTableFamilyScene
    │   └── AdgeIntroFamilyScene
    ├── live product path            ← `legacy_strict` inside `LcarsFrame`
    │   └── [page content]
    │       └── [rows × cols]
    │           └── WidgetRenderer   ← switch on widget.type, renders one widget
    │               ├── StatusTileControl
    │               ├── GaugeControl
    │               ├── ProgressControl
    │               ├── TextInputControl / NumberInputControl
    │               ├── ToggleControl / CheckboxControl / RadioControl / RadioToggleControl
    │               ├── SelectControl
    │               ├── FormControl (wraps form children recursively via WidgetRenderer)
    │               ├── MarkdownControl (marked.js + DOMPurify)
    │               ├── LineChartWidget / SparklineWidget (Recharts)
    │               ├── MicButtonControl (MediaRecorder)
    │               ├── LcarsBoxControl / LcarsSweepControl / LcarsBracketControl / LcarsHeaderControl
    │               └── LogViewerControl / VideoHlsControl
    ├── deprecated compatibility     ← `joern_strict` deprecation notice on live product requests
    ├── archived comparison mode     ← frozen bake-off harness can still resolve `legacy_strict` or `joern_strict`
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
- `applyWidgetUpdate(manifest, id, data)` — immutable update; traverses all pages/rows/cols/widgets (including form children and container children)
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

Applied via `data-theme` attribute on `.lcars-ui` root. CSS custom properties in `tokens.css` define all colors per theme. The theme is set from `manifest.meta.theme` on load.

### CSS Architecture

All styles are in `frontend/src/styles/lcars/`:

| File | Contents |
|---|---|
| `tokens.css` | CSS custom properties for colors, spacing, fonts per theme |
| `base.css` | Body reset, `.lcars-ui` root, `.boot-status` loading/error states |
| `primitives.css` | LcarsBar, LcarsPill, LcarsRect, LcarsSegmentedBar, LcarsElbow primitive styling |
| `containers.css` | `lcars_box`, `lcars_sweep`, `lcars_bracket`, `lcars_header` layout and chrome |
| `shell.css` | `.lcars-shell-frame`, `.lcars-header-bar`, `.lcars-sidebar-rail`, `.lcars-footer-bar`, elbow integration |
| `widgets-core.css` | Widget cards, inputs, toggles, checkboxes, radios, selects, buttons, forms, tables, progress, status tiles, alerts |
| `charts.css` | Gauge SVG, chart containers, Recharts overrides |
| `media.css` | Log viewer pre, video player, mic button |
| `motion.css` | `@keyframes lcars-pulse`, `@keyframes lcars-blink`, `.lcars-page-enter` |
| `responsive.css` | Sidebar layout adjustments for position left/right/hidden |

---

## HTTP API Endpoints

| Method | Path | Auth Scope | Description |
|---|---|---|---|
| GET | `/` | none | Serves bundled React SPA (or inline status page if bundle absent) |
| GET | `/{path}` | none | SPA catch-all (serves index.html for client-side routing) |
| GET | `/lcars/manifest` | `lcars.read` | Returns full manifest JSON |
| GET | `/lcars/schema` | `lcars.read` | Returns JSON Schema for the manifest |
| WS | `/lcars/ws` | `lcars.stream` | WebSocket realtime channel |
| GET | `/lcars/events` | `lcars.read` | SSE stream fallback |
| POST | `/lcars/action/{widget_id}` | `lcars.write` | HTTP action fallback; body: `{"value": any}` |
| POST | `/lcars/upload/audio` | `lcars.write` | Multipart audio upload (`file` field); returns 202 |
| GET | `/docs` | none | FastAPI auto-generated Swagger UI |
| GET | `/assets/*` | none | Served by StaticFiles mount when bundle present |

Static files (`/assets/*`) are mounted before routes. The SPA catch-all is registered last so `/lcars/*` routes take priority.

---

## Test Infrastructure

**Backend: pytest** (contracts + unit + integration; pandas-dependent tests skip when pandas is absent)

```
tests/
├── conftest.py                          ← shared fixtures (TestClient, async fixtures)
├── contracts/
│   ├── test_manifest_schema.py          ← compares live Pydantic output to golden JSON
│   └── test_protocol_schema.py          ← validates protocol envelope golden file
├── unit/
│   ├── test_widgets.py                  ← widget serialization, type uniqueness, discriminator
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
│   ├── test_phase11_colors.py           ← LcarsColor named values, hex validation
│   ├── test_phase11_dsl.py              ← checkbox/radio/radio_toggle DSL + container DSL
│   ├── test_phase12_visual_language.py  ← strict/classic defaults, normalizer behavior
│   ├── test_phase13_recipes.py          ← console/padd/diagnostic recipe structure
│   ├── test_phase13_normalize.py        ← smart auto-paneling + title sweep injection
│   ├── test_phase13_input_column.py     ← input_column side routing + error path
│   └── test_placeholder.py             ← placeholder fixture (always passes)
└── integration/
    ├── test_api_endpoints.py             ← HTTP route responses with TestClient
    ├── test_streaming.py                 ← WebSocket connect/action/ack, SSE
    ├── test_plugins.py                   ← plugin discovery, collision errors
    ├── test_dsl_roundtrip.py             ← full DSL build → serve → action → ack cycle
    └── test_security_phase8.py           ← auth, scopes, rate limits, payload limits
```

**Contract test flag:** `pytest tests/contracts/ --check-golden` — fails if live output differs from golden files.

**Frontend: Vitest** (strict controls + renderer/runtime/type coverage)

```
frontend/src/
├── App.test.tsx                          ← manifest load, transport status, sidebar, notifications
├── components/WidgetRenderer.test.tsx    ← renders all major widget types
├── components/MicButtonControl.test.tsx  ← recording state, upload trigger
├── components/controls/*.test.tsx        ← strict control behavior tests (button/toggle/select/radio/text/table/metric/gauge/progress)
├── components/controls/LcarsControls.snapshot.test.tsx
├── components/controls/__snapshots__/... ← committed control snapshot baselines
├── components/charts/LineChartWidget.test.tsx
├── components/charts/SparklineWidget.test.tsx
├── runtime/transport.test.ts            ← WS/SSE connect, reconnect, send
├── runtime/manifest.test.ts             ← applyManifestUpdate, applyWidgetUpdate
├── runtime/audio.test.ts                ← AudioManager cue/enable/dispose
├── theme/colorTokens.test.ts            ← resolveColorToken(), THEME_COLOR_HEX
└── types/contract.test.ts               ← isManifest() validation
```

Test support files: `test/setup.ts` (Vitest globals setup), `test/manifestFixture.ts` (shared manifest fixture).

**Playwright visual regression:** `frontend/tests/visual/*.spec.ts` (console/padd/bridge goldens at desktop + tablet viewports).

**E2E:** `frontend/e2e/app.spec.ts`.

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
| `visual-regression` | `cd frontend && npx playwright test --project=visual-regression` | Strict LCARS screenshot regression gate |
| `ci` | `clean lint contracts-check test smoke security-audit frontend-ci visual-regression frontend-bundle test` | Full pipeline (includes visual regression gate) |

---

## Python Package Configuration (`pyproject.toml`)

```toml
[project]
name = "lcars-ui"
version = "0.6.0"
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
- `@tanstack/react-query ^5.62` — installed, available for future use
- `tailwind-merge ^2.5` — installed, available

**Dev:**
- `vite ^5.4`, `@vitejs/plugin-react ^5.1` — build and dev server
- `typescript ^5.6`
- `vitest ^3.2`, `@testing-library/react ^16`, `jsdom ^27` — unit testing
- `@playwright/test ^1.56` — E2E testing
- `tailwindcss ^3.4`, `postcss ^8.4`, `autoprefixer ^10.4` — CSS toolchain

---

## Known Limitations

1. **Not on PyPI** — install from wheel file only
2. **MicButton requires HTTPS or localhost** — browser microphone policy
3. **One `@lcars.live` per app** — second decorator raises `RuntimeError`
4. **In-memory session state** — lost on server restart; no persistence layer
5. **In-memory rate limiter** — not shared across multiple server processes
6. **MockSTTAdapter only** — real STT requires a custom `STTAdapter` implementation
7. **No dark-mode override** — theme controls all colors; no independent dark/light toggle
8. **VideoHls widget** — renders `<video src>` directly; HLS.js not bundled (only works where browser natively supports HLS)
9. **Session state is process-global** — multiple concurrent users sharing one process share the `http_fallback` session; WebSocket users are properly isolated by UUID session_id

---

## Extending the Project

### Add a new widget type

1. Add Pydantic class to appropriate `src/lcars_ui/widgets/*.py` file
2. Add to the `Widget` union in `src/lcars_ui/core/models.py` (call `model_rebuild()` if it holds recursive `Widget` children)
3. Add TypeScript interface to `frontend/src/types/contract.ts` and add to the `Widget` union there
4. Add render case to `frontend/src/components/WidgetRenderer.tsx`
5. Add DSL function to `src/lcars_ui/dsl/api.py` and re-export from `__init__.py`
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
