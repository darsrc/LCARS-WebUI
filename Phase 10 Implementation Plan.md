# LCARS WebUI — Phase 10 Implementation Plan

**Status:** Planning
**Depends on:** Phases 0–9 complete (backend, DSL, frontend renderer, bundle integration, security)

---

## Goal

Phase 10 has three equal pillars:

1. **Expand** — add new widget types and real chart rendering to cover obvious gaps in the current widget catalog.
2. **Solidify** — harden the runtime against real-world failure modes: WebSocket reconnect, multi-session state isolation, and consistent transport fallback behavior.
3. **Simplify** — reduce the lines of code a developer writes to build a complete, interactive dashboard.

All changes are additive and backward-compatible with the v1.0 manifest schema. No existing public API is removed.

---

## Current Gaps (Rationale)

| Area | Gap | Impact |
|---|---|---|
| Charts | `line_chart` / `sparkline` render as raw text lists, not graphical lines | High — core data widget is non-functional visually |
| Widgets | No progress bar, gauge, markdown, or numeric input | Medium — common patterns require workarounds |
| WebSocket | Reconnect is naive; no state resync after disconnect | High — dashboard goes stale silently |
| State | `_widget_state` is a module-level dict shared across all browser sessions | High — two tabs corrupt each other's state |
| MicButton | Uses a file picker fallback, not the browser MediaRecorder API | Medium — push-to-talk doesn't work |
| DSL | No `form()` context manager; `columns()` requires nested context managers | Medium — friction for simple layouts |
| Testing | No end-to-end coverage of reconnect, state isolation, or new widgets | Medium — reliability regressions go undetected |

---

## Phase 10A — Real Chart Rendering (Frontend)

**Goal:** Replace the `line_chart` and `sparkline` text-list fallback with a real SVG chart library.

### Library Choice

Use **Recharts** (React-native, no Canvas dependency, tree-shakeable, ~50 kB gzip).

```
cd lcars-ui/frontend
npm install recharts
```

### Changes

**`frontend/src/components/charts/LineChartWidget.tsx`** (new file)

- Import `LineChart`, `Line`, `XAxis`, `YAxis`, `Tooltip`, `ResponsiveContainer` from `recharts`.
- Map each `widget.series` entry to a `<Line>` with `stroke` resolved from the LCARS color palette.
- Use `widget.x_labels` as the `dataKey` source for the `<XAxis>`.
- No gridlines (LCARS aesthetic preference); keep background transparent.
- Height: `200px` default, overridable via future widget field.

**`frontend/src/components/charts/SparklineWidget.tsx`** (new file)

- Use `AreaChart` without `XAxis`, `YAxis`, or `Tooltip`.
- Intended for embedding inside small `StatusTile`-adjacent columns.
- Fixed height `60px`.

**`frontend/src/components/WidgetRenderer.tsx`** (edit)

- Replace the `case "line_chart":` and `case "sparkline":` blocks with the new components.

### Contract

No schema changes required. The `series` and `x_labels` fields already exist in the manifest.

### Tests

- `frontend/src/components/charts/LineChartWidget.test.tsx` — render with single series, multi-series, empty data.
- `frontend/src/components/charts/SparklineWidget.test.tsx` — render with data, render with empty array.

---

## Phase 10B — New Widget Types

**Goal:** Add four new widget types that cover the most common patterns missing from the current catalog.

### B1 — ProgressBar

A horizontal fill bar for task completion, resource utilization, or loading state.

**Schema additions (`src/lcars_ui/widgets/primitives.py`)**

```python
class ProgressBar(BaseWidget):
    type: Literal["progress_bar"] = "progress_bar"
    label: str | None = None
    value: float          # 0.0 – 100.0
    color: LcarsColor | None = None
    show_label: bool = True  # show "42%" text overlay
```

**DSL (`src/lcars_ui/dsl/api.py`)**

```python
def progress(
    label: str,
    value: float,                 # 0–100
    *,
    color: str | None = None,
    id: str | None = None,
) -> None:
    """Render a progress bar."""
```

`lcars.update(widget_id, value=75.0)` works via existing `widget_update` protocol — no new event type needed.

**Frontend (`frontend/src/components/WidgetRenderer.tsx`)**

```tsx
case "progress_bar":
  return (
    <article className={cardClass(widget.color)}>
      <span className="widget-label">{widget.label ?? widget.id}</span>
      <div className="progress-track">
        <div
          className="progress-fill"
          style={{ width: `${Math.min(100, Math.max(0, widget.value))}%` }}
        />
        {widget.show_label && (
          <span className="progress-text">{widget.value.toFixed(0)}%</span>
        )}
      </div>
    </article>
  );
```

### B2 — Gauge

A circular arc readout for single-value system health (shield strength, warp core output, etc.).

**Schema additions (`src/lcars_ui/widgets/data.py`)**

```python
class Gauge(BaseWidget):
    type: Literal["gauge"] = "gauge"
    label: str | None = None
    value: float         # 0.0 – 100.0
    min: float = 0.0
    max: float = 100.0
    unit: str | None = None  # e.g. "GW", "%"
    color: LcarsColor | None = None
    warn_threshold: float | None = None   # auto-color shift at this value
    crit_threshold: float | None = None   # auto-color shift at this value
```

**DSL**

```python
def gauge(
    label: str,
    value: float,
    *,
    min: float = 0.0,
    max: float = 100.0,
    unit: str | None = None,
    color: str | None = None,
    warn_threshold: float | None = None,
    crit_threshold: float | None = None,
    id: str | None = None,
) -> None:
    """Render a circular gauge readout."""
```

**Frontend** — pure CSS/SVG arc using `stroke-dasharray` / `stroke-dashoffset`. No additional library required.

### B3 — Markdown

Rich text rendering for documentation blocks, dynamic reports, or command output.

**Schema additions (`src/lcars_ui/widgets/primitives.py`)**

```python
class Markdown(BaseWidget):
    type: Literal["markdown"] = "markdown"
    content: str
    color: LcarsColor | None = None
```

**DSL**

```python
def markdown(
    content: str,
    *,
    color: str | None = None,
    id: str | None = None,
) -> None:
    """Render a Markdown block."""
```

`lcars.update(widget_id, content="## New Report\n...")` replaces content in real time.

**Frontend** — `npm install marked dompurify`. Render via `dangerouslySetInnerHTML` after `DOMPurify.sanitize(marked.parse(content))`. Apply LCARS-scoped CSS for `h1`–`h4`, `code`, `pre`, `table`.

### B4 — NumberInput

A numeric input field with min/max/step constraints. Common for setting thresholds, timeouts, or counts.

**Schema additions (`src/lcars_ui/widgets/inputs.py`)**

```python
class NumberInput(BaseWidget):
    type: Literal["number_input"] = "number_input"
    label: str | None = None
    value: float = 0.0
    min: float | None = None
    max: float | None = None
    step: float = 1.0
    placeholder: str | None = None
```

**DSL**

```python
def number_input(
    label: str,
    *,
    value: float = 0.0,
    min: float | None = None,
    max: float | None = None,
    step: float = 1.0,
    placeholder: str | None = None,
    id: str | None = None,
) -> float:
    """Render a numeric input. Returns current float value."""
```

Follows the same HANDLE mode / `_widget_state` pattern as `text_input`.

### Schema Freeze

After all four types are implemented:

```
make contracts-update    # regenerate golden fixtures
make ci                  # verify no drift
```

Add each new widget to `fixtures/golden/manifest.v1.json` as a concrete example. Add corresponding `tests/contracts/` assertions.

---

## Phase 10C — WebSocket Reliability

**Goal:** The frontend handles network interruptions gracefully. A reconnected client receives fresh state without a full page reload.

### C1 — Exponential Backoff Reconnect

**`frontend/src/runtime/transport.ts`** (edit)

Current behavior: reconnect after a fixed delay.
New behavior: exponential backoff with jitter.

```ts
const BASE_DELAY_MS = 500;
const MAX_DELAY_MS = 30_000;

function nextDelay(attempt: number): number {
  const exp = Math.min(BASE_DELAY_MS * 2 ** attempt, MAX_DELAY_MS);
  return exp * (0.8 + Math.random() * 0.4);  // ±20% jitter
}
```

Reconnect attempt counter resets to 0 on a clean connect.
Expose current attempt count via `onModeChange` callback so the UI can display "Reconnecting (attempt 3)…".

### C2 — State Resync After Reconnect

When a WebSocket reconnects after a network gap, the frontend manifest may be stale. Add a resync sequence:

**Backend** (`src/lcars_ui/server/stream.py`)

On WS connect, after the standard handshake, send a `manifest_update` envelope with `path = ""` (root) and `value = <current manifest dict>`. This is a full-manifest push that replaces the client's state atomically.

```python
# In ConnectionManager.connect():
full_manifest_envelope = make_envelope(
    "manifest_update",
    ManifestUpdatePayload(path="", value=app_state.manifest.model_dump()),
)
await websocket.send_json(full_manifest_envelope.model_dump())
```

**Frontend** (`frontend/src/runtime/manifest.ts`)

Handle `path == ""` in `applyManifestUpdate()` as a full replacement:

```ts
export function applyManifestUpdate(
  current: Manifest,
  path: string,
  value: unknown,
): { applied: boolean; manifest: Manifest } {
  if (path === "") {
    if (!isManifest(value)) return { applied: false, manifest: current };
    return { applied: true, manifest: value as Manifest };
  }
  // … existing dot-path logic …
}
```

### C3 — Reconnect Status in UI

**`frontend/src/App.tsx`** (edit)

- Replace plain `transportMode` string badge with a `ConnectionBadge` component.
- Shows: `WS LIVE` (green), `SSE FALLBACK` (yellow), `RECONNECTING (3)` (pulsing yellow), `OFFLINE` (red).
- Position: top-right of the header, next to the schema version.

### Tests

- `frontend/src/runtime/transport.test.ts` — mock `WebSocket`, verify reconnect fires, verify delay doubles, verify delay caps at `MAX_DELAY_MS`.
- `tests/integration/test_streaming.py` — assert that on new WS connect, a `manifest_update` envelope with `path=""` is the first downstream message.

---

## Phase 10D — Session-Isolated State

**Goal:** Two browser tabs running the same app do not corrupt each other's widget state.

### Problem

`_widget_state` in `src/lcars_ui/dsl/_state.py` is a module-level `dict`. Every tab that triggers an action writes to the same dictionary. Tab A's toggle overwrites Tab B's view of the same widget.

### Solution

Key the state store by WebSocket connection ID (a `uuid4` generated per connection). The DSL action handler receives the connection ID and uses it to scope state.

**`src/lcars_ui/dsl/_state.py`** (edit)

Replace the module-level dict with a two-level store:

```python
# session_id -> widget_id -> value
_widget_state: dict[str, dict[str, object]] = {}

def get_session_state(session_id: str) -> dict[str, object]:
    if session_id not in _widget_state:
        _widget_state[session_id] = {}
    return _widget_state[session_id]

def clear_session_state(session_id: str) -> None:
    _widget_state.pop(session_id, None)
```

**`src/lcars_ui/server/stream.py`** (edit)

- `ConnectionManager.connect()` generates and returns a `session_id = str(uuid4())`.
- `ConnectionManager.disconnect()` calls `clear_session_state(session_id)`.
- Pass `session_id` into the action dispatch call.

**`src/lcars_ui/dsl/api.py`** (edit)

- `_dsl_action_handler` receives `session_id` as a parameter.
- `_LCARSContext` gains a `session_id: str` field.
- All `_widget_state` reads/writes inside DSL functions use `get_session_state(ctx.session_id)`.

**Backward Compatibility**

`POST /lcars/action/{id}` HTTP fallback has no session concept. It uses a fixed `session_id = "http_fallback"`, which means HTTP-fallback actions share state — acceptable for single-user dev use, and consistent with the existing model.

### Tests

- `tests/unit/test_session_state.py` — two concurrent HANDLE contexts with different session IDs do not share state.
- `tests/integration/test_streaming.py` — two WS clients click the same toggle; assert each gets independent state in action acks.

---

## Phase 10E — DSL Ergonomics

**Goal:** Common patterns require less boilerplate.

### E1 — `lcars.form()` Context Manager

Currently, a Form widget must be constructed with `children` as a list inside the manifest model. There is no DSL equivalent.

```python
# NEW: declare a form with a context manager
with lcars.form("Configure Warp Drive", action_id="warp_config_submit"):
    speed = lcars.number_input("Warp Factor", value=5.0, min=1.0, max=9.99)
    lcars.toggle("Engage Inertial Dampeners")
```

**Implementation**

- Add `lcars.form(label, action_id, *, submit_label="Submit", color=None, id=None)` as a `@contextmanager`.
- In BUILD mode: push a form context onto `_ManifestBuilder`; child widget calls add to the form's `children` list rather than to the column.
- In HANDLE mode: `form()` is a no-op context manager; child widgets behave identically to standalone widgets (read/write `_widget_state`).
- On form submit, the `form_submit` upstream event carries a `data` dict; the DSL hydrates each child widget's stored value from the dict before calling `ui_fn()`.

### E2 — `lcars.section()` Labeled Group

A visual grouping container that renders a header and a bordered box around child widgets, without the submit semantics of a form.

```python
with lcars.section("Propulsion Systems", color="blue"):
    lcars.metric("Warp Core Temp", "3200 K", status="warn")
    lcars.gauge("Output", 87.2, unit="%")
```

**Implementation**

- Section is a layout concept, not a new widget type. In BUILD mode it emits a `Text` heading and wraps the subsequent widgets in a new `Column` with a CSS class hint (pass as a future `class_hint` field on `Column`, or simply use the existing layout hierarchy).
- Simpler alternative: render a `Text` widget with `size="h2"` as the section header and rely on column padding for grouping. No schema change required.

### E3 — Auto-Default Page

If `ui_fn()` places widgets without ever calling `lcars.page()`, all widgets are collected into an implicit page with `id="main"` and `title=""`. This removes the boilerplate for single-page dashboards.

```python
# This is now valid — no page() required:
import lcars_ui as lcars

def ui():
    lcars.config("Bridge Status")
    lcars.metric("Shields", "100%", status="ok")

lcars.run(ui)
```

**Implementation**

`_ManifestBuilder.build()` already groups loose widgets — verify this works and document it as an explicit guarantee.

### E4 — `lcars.row()` Shorthand

`lcars.columns()` requires iterating over a list of context managers, which is verbose:

```python
# Current
col_a, col_b = lcars.columns(["2fr", "1fr"])
with col_a:
    lcars.metric(...)
with col_b:
    lcars.metric(...)
```

Add `lcars.row()` as a context manager that uses an inner `lcars.col()` per column:

```python
# New
with lcars.row():
    with lcars.col("2fr"):
        lcars.metric(...)
    with lcars.col("1fr"):
        lcars.metric(...)
```

**Implementation**

`lcars.row()` opens a row context on the builder. `lcars.col(width)` opens a column within it. Both are `@contextmanager` functions. Existing `lcars.columns()` remains unchanged.

---

## Phase 10F — MicButton MediaRecorder

**Goal:** MicButton uses the browser's `MediaRecorder` API for actual push-to-talk, replacing the current file-picker fallback.

### Frontend Changes

**`frontend/src/components/MicButtonControl.tsx`** (refactor from `WidgetRenderer.tsx`)

State machine: `idle` → `requesting_permission` → `recording` → `uploading` → `idle`.

```ts
type MicState = "idle" | "requesting" | "recording" | "uploading" | "error";
```

- `pointerdown` / `touchstart` on the button: request microphone permission, start `MediaRecorder`.
- `pointerup` / `touchend` / `pointercancel`: stop recording, `ondataavailable` fires, upload Blob to `widget.upload_url`.
- Auto-stop after `widget.timeout_ms` milliseconds (default 5000) via `setTimeout`.
- Display status text: "Hold to speak", "Recording…", "Uploading…", "Done", or the error message.
- If `navigator.mediaDevices` is undefined (non-HTTPS, non-localhost), show a clear warning: "Microphone requires HTTPS or localhost."

### Backend Changes

None — `POST /lcars/upload/audio` endpoint already accepts `multipart/form-data`.

### Tests

- `frontend/src/components/MicButtonControl.test.tsx` — mock `navigator.mediaDevices.getUserMedia`, verify state transitions, verify upload is called with correct Blob.
- Test the HTTPS-unavailable branch: mock `navigator.mediaDevices = undefined`, assert warning renders.

---

## Phase 10G — Test Coverage Solidification

**Goal:** All new functionality has tests; reliability gaps have regression tests.

### New Test Files

| File | Coverage |
|---|---|
| `tests/unit/test_new_widgets.py` | ProgressBar, Gauge, Markdown, NumberInput schema validation |
| `tests/unit/test_session_state.py` | Two-session state isolation; session cleanup on disconnect |
| `tests/unit/test_dsl_form.py` | `lcars.form()` CM — BUILD mode widget accumulation; HANDLE mode value hydration |
| `tests/unit/test_dsl_row_col.py` | `lcars.row()` / `lcars.col()` produce correct column widths |
| `tests/contracts/test_manifest_schema.py` | Extended to cover all four new widget types in golden fixture |
| `frontend/src/runtime/transport.test.ts` | Exponential backoff delay sequence; delay cap; jitter range |
| `frontend/src/components/charts/*.test.tsx` | LineChartWidget and SparklineWidget render with real data |
| `frontend/src/components/MicButtonControl.test.tsx` | State machine transitions; HTTPS warning |

### Coverage Gate

Add to `pyproject.toml`:

```toml
[tool.pytest.ini_options]
addopts = "--cov=lcars_ui --cov-fail-under=90"
```

Add to `frontend/package.json`:

```json
"test:coverage": "vitest run --coverage --coverage.thresholds.lines=90"
```

Add both to `make ci`.

---

## Phase 10H — Documentation

**Goal:** A developer can build a real dashboard without reading source code.

### New Docs

**`lcars-ui/docs/quickstart.md`**

Single-page guide: install → minimal `lcars.run()` example → add a metric → add a button with a handler → deploy.

**`lcars-ui/docs/widgets.md`**

Reference for all 18 widget types (14 original + 4 new). For each: DSL signature, screenshot mockup description, update example.

**`lcars-ui/docs/dsl.md`**

Full DSL reference: `lcars.config()`, `lcars.run()`, `@lcars.live`, layout primitives (`page`, `row`, `col`, `columns`), all widget functions, effect functions (`update`, `notify`, `append_log`).

**`lcars-ui/docs/deployment.md`**

Production checklist: HTTPS requirement for MicButton, CORS env variable, authentication wrapper pattern, reverse proxy config.

**Update `lcars-ui/README.md`**

- Replace stub sections with links to docs/.
- Add a short feature table and a 10-line "Hello World" example.

---

## Execution Sequence

Phases are largely parallelizable but have some dependencies:

```
10A (charts)        ──────────────────────────────────── Frontend only
10B (new widgets)   ── schema → DSL → frontend → tests   Full stack
10C (WS reliability)── backend + frontend                Full stack
10D (session state) ── depends on 10C (connection ID)    Backend + tests
10E (DSL ergonomics)── depends on 10D (session state)    Backend only
10F (MicButton)     ──────────────────────────────────── Frontend only
10G (test coverage) ── depends on all above              Tests only
10H (docs)          ── can start after 10A–10F complete  Docs only
```

Recommended implementation order for a single developer:

1. **10D** first — session state isolation is a correctness fix that everything else should build on.
2. **10B** — new widgets add the most visible value.
3. **10A** — chart rendering makes the existing `line_chart`/`sparkline` widgets usable.
4. **10C** — WebSocket reliability; resync depends on 10D being complete.
5. **10E** — DSL ergonomics; most depend on 10D.
6. **10F** — MicButton; self-contained frontend change.
7. **10G** — fill coverage gaps across all of the above.
8. **10H** — documentation last, after the API is stable.

---

## Makefile Additions

```makefile
# Run frontend tests with coverage
frontend-test:
	cd frontend && npm run test:coverage

# Build docs (if using mkdocs)
docs:
	mkdocs build

# Full CI including frontend
ci: clean lint contracts-check test frontend-test
```

---

## Risk Register

| ID | Risk | Mitigation |
|---|---|---|
| R-10-01 | Recharts bundle size increases initial load time | Lazy-load chart components via `React.lazy()` / code splitting |
| R-10-02 | Full-manifest resync on reconnect causes visible flash | Diff current vs incoming manifest in frontend; only re-render changed widgets |
| R-10-03 | Session state dict grows unboundedly if WS disconnect isn't detected | `clear_session_state()` is called on disconnect; add a TTL cleanup job for HTTP-fallback sessions |
| R-10-04 | `lcars.form()` CM in HANDLE mode requires correct child ID resolution across both modes | Ensure `_resolve_id()` is called in both BUILD and HANDLE modes; add explicit test |
| R-10-05 | MediaRecorder codecs differ across browsers (Firefox: ogg, Chrome: webm) | Accept any audio MIME type on the backend; document codec behavior |
| R-10-06 | New widget types break existing golden fixture contract tests | `contracts-update` must be run explicitly; CI will fail loudly before any merge |
