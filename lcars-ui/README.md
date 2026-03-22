# lcars-ui

`lcars-ui` is a Python library that turns a plain Python script into a live, Star Trek-authentic LCARS dashboard — no HTML, CSS, or JavaScript knowledge required.

## What Is This?

You write a Python function that declares what your dashboard should look like. The library:
1. Builds a JSON manifest describing the layout and widgets
2. Serves it via FastAPI (WebSocket + HTTP API)
3. Renders it in the browser using a bundled React frontend

Every click, toggle, or form submit calls your Python function again so it can react to the new state.

---

## Current Repository Truth

- The repository is closed through Phase 17 in the current working tree.
- Active architecture is a two-role system:
  - `legacy_strict` is the live product renderer
  - `phase14_family` is the oracle / canonical acceptance engine
  - `joern_strict` is a deprecated compatibility path only
- Current phase status:
  - Phase 14 is historical / superseded as a phase label
  - Phase 15 is complete and is the baseline for primitive-boundary, explicit strict-role, and parity-retirement closure
  - Phase 16 is complete / closed as the catalog-driven canonical acceptance baseline
  - Phase 17 is complete / closed as the product-side scaffold/surface convergence baseline
- Phase 17 actually accomplished:
  - additive strict scaffold and shared-surface intent now drive more of the product strict path
  - second-wave shared primitive promotion now spans oracle scenes and strict product controls
  - repo-local build, visual, schema, HTTP, and WebSocket validation are restored under the current toolchain
- Canonical LCARS-ready acceptance is the catalog-driven target-bank run:
  - 7 canonical targets
  - 4 blocking families
  - catalog-owned thresholds
  - explicit singleton-family policy
  - default commands: `make ci`, `make canonical-acceptance`, `npm run test:visual`
- `../CURRENT_STATE.md` is the root current-state and phase-status audit.
- `docs/PHASE17_CLOSEOUT.md` is the package-level Phase 17 closeout summary.
- Next frontier: plan the next scoped phase against the closed Phase 17 baseline without reopening renderer roles or continuing convergence work in this pass.

## Phase Status

Earlier phases 0 through 13 built the package, DSL, strict-mode runtime, and frontend foundation.

Current phase-status truth:

| Phase | Status | Current meaning |
|---|---|---|
| 14 | Historical / superseded | Target-bank family acceptance work landed here, but Phase 14 is no longer the active roadmap. The `phase14_family` namespace remains active as the oracle component name. |
| 15 | Complete baseline | Shared primitive promotion, explicit strict-role / strict-title behavior, parity retirement, and architecture-boundary guardrails are closed baseline. |
| 16 | Complete / closed | Canonical acceptance is now catalog-driven, the family-state policy is explicit, `periodic_table_matrix` is a documented singleton exemption, and `adge_intro` is onboarded as a canonical family. |
| 17 | Complete / closed | `legacy_strict` now consumes more explicit scaffold and shared-surface intent, shared primitive promotion wave 2 is landed across oracle and product paths, and repo-local HTTP plus WebSocket app-backed validation is restored. The renderer-role split does not change. |

---

## Install and Run (Beginner-Friendly)

### Prerequisites

- Python 3.10+
- Git
- `make` (optional, but the commands below are simpler with it)

You do **not** need Node.js to run or use LCARS dashboards. The frontend is pre-built and included in the package.

### Step 1 — Clone and enter the package directory

```bash
git clone https://github.com/darsrc/LCARS-WebUI.git
cd LCARS-WebUI/lcars-ui
```

### Step 2 — Create a virtual environment

macOS/Linux:
```bash
python -m venv .venv
source .venv/bin/activate
```

Windows PowerShell:
```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

### Step 3 — Install the package

```bash
make install
```

Or without `make`:
```bash
pip install -e ".[dev]"
```

### Step 4 — Run the example

```bash
python examples/lcars_console/app.py
```

Your browser opens at `http://127.0.0.1:8000/` automatically. You will see a live LCARS dashboard with navigation pages, metrics, charts, buttons, and a log viewer.

### Step 5 — Write your own dashboard

Create `my_dashboard.py`:

```python
import lcars_ui as lcars


@lcars.live(interval=5.0)   # optional: auto-refresh every 5 seconds
def ui() -> None:
    lcars.config("My LCARS App", theme="galaxy", subtitle="Learning Mode", visual_language="strict")

    lcars.nav("Main", page="main")

    with lcars.page("Main", id="main"):
        with lcars.console("Bridge Operations"):
            with lcars.data_panel("Telemetry"):
                lcars.metric("Shields", "100%", status="ok")
                lcars.progress("Repair Progress", 42.0)
            with lcars.control_panel("Actions"):
                speed = lcars.number_input("Warp Factor", value=5.0, min=1.0, max=9.99, step=0.01)
                if lcars.button("Engage"):
                    lcars.notify(f"Warp command accepted: {speed:.2f}")
            with lcars.data_panel("Core"):
                lcars.gauge("Core Output", 87.2, unit="%")


lcars.run(ui)
```

```bash
python my_dashboard.py
```

---

## Widget Reference

### Display widgets

| Function | Description |
|---|---|
| `lcars.text(content, size, color)` | Plain text block (`size`: `body`, `h1`, `h2`, `mono`) |
| `lcars.markdown(content, color)` | Rendered Markdown |
| `lcars.metric(label, value, status, color)` | Status tile with colored dot (`ok`, `warn`, `error`) |
| `lcars.alert(message, level, blink)` | Alert banner (`level`: `yellow` or `red`) |
| `lcars.progress(label, value, color, show_label)` | Segmented LCARS progress bar 0–100 |

### Data widgets

| Function | Description |
|---|---|
| `lcars.chart(data, title, color)` | Line chart; `data` can be a list, dict, or DataFrame |
| `lcars.sparkline(data, title)` | Compact mini-chart |
| `lcars.gauge(label, value, min, max, unit, warn_threshold, crit_threshold)` | Segmented LCARS gauge readout |
| `lcars.table(data, title)` | Data table; `data` can be list-of-dicts or list-of-lists |
| `lcars.log(stream_id, max_lines, title)` | Streaming log viewer |

### Input widgets (return the current value)

| Function | Returns | Description |
|---|---|---|
| `lcars.button(label, color)` | `bool` | `True` only in the rerun triggered by this click |
| `lcars.toggle(label, value, color)` | `bool` | Current on/off state |
| `lcars.select(label, options, value, color)` | `str` | Current selected option |
| `lcars.text_input(label, placeholder, password)` | `str` | Current text value |
| `lcars.number_input(label, value, min, max, step)` | `float` | Current numeric value |

### Forms

```python
with lcars.form("Settings", action_id="save_settings", submit_label="Save"):
    name = lcars.text_input("Name")
    dark_mode = lcars.toggle("Dark Mode")
```

A form groups input widgets and submits them together when the user clicks the submit button.

---

## Layout

```python
with lcars.page("My Page", id="my_page"):
    with lcars.console("My Console"):    # LCARS-first recipe
        with lcars.data_panel("Telemetry"):
            lcars.metric("Left", "A")
        with lcars.control_panel("Actions"):
            lcars.metric("Right", "B")
```

Legacy grid composition still works:

```python
with lcars.row():
    with lcars.col("2fr"):
        ...
    with lcars.col("1fr"):
        ...
```

`lcars.row()` and `lcars.col(width)` accept CSS grid width values like `"1fr"`, `"2fr"`, `"300px"`, `"auto"`.

Navigation:
```python
lcars.nav("Home", page="home")   # adds a sidebar button linking to the "home" page
```

---

## Themes

```python
lcars.config("My App", theme="galaxy")   # TNG/DS9 orange+blue (default)
lcars.config("My App", theme="tng")      # Season 1-2 muted palette
lcars.config("My App", theme="nemesis")  # First Contact dark blues
```

---

## Real-Time Effects

Call these inside button handlers, `@lcars.live`, or anywhere in your `ui()` function:

```python
lcars.update("my_widget_id", value=55.0)       # push new data to a widget
lcars.notify("Message text", level="info")      # show a notification banner
lcars.append_log("stream_id", "log line here")  # append a line to a log viewer
```

---

## DSL Lifecycle

```python
@lcars.live(interval=5.0)   # runs ui() on a timer in addition to user actions
def ui() -> None:
    ...

lcars.run(ui)               # starts server, opens browser
```

**How the rerun model works:**

- On startup: `ui()` runs in BUILD mode to create the manifest
- On user action (click, toggle, etc.): `ui()` runs in HANDLE mode
  - Input widgets return their current values from session state
  - `button()` returns `True` only for the button that was clicked
  - Effects (`notify`, `update`, `append_log`) are queued and sent to the browser

---

## Build, Test, and Verify

All commands run from `lcars-ui/`.

```bash
# Run backend tests
pytest tests/ -v

# Check for contract drift (CI gate)
make contracts-check

# Lint + type check
make lint

# Full backend + frontend CI pipeline
make ci
```

Frontend tests (requires Node.js 18+):

```bash
make frontend-ci       # type check + unit tests + build
make frontend-e2e      # Playwright browser tests
make canonical-acceptance
make legacy-visual-regression
```

Security audit:
```bash
make security-audit
```

---

## Frontend Development (Optional)

The frontend (React/TypeScript) is pre-built and bundled inside the package at `src/lcars_ui/_static/`. You only need Node.js if you want to modify the frontend source.

```bash
# Install frontend dependencies (Node.js 18+ required)
make frontend-install

# Start Python backend in one terminal
python examples/lcars_console/app.py

# Start Vite dev server in another terminal (hot-reload)
cd frontend
npm run dev
# Open the URL Vite prints, usually http://127.0.0.1:5173
```

After making frontend changes, rebuild the bundle:
```bash
make frontend-bundle
```

Key frontend files:
- `frontend/src/components/WidgetRenderer.tsx` — renders all widget types
- `frontend/src/components/shell/LcarsFrame.tsx` — LCARS shell frame and navigation
- `frontend/src/runtime/transport.ts` — WebSocket/SSE connection logic
- `frontend/src/styles/lcars/` — LCARS color tokens, themes, animations

---

## Extending the Backend

When you change Pydantic widget models, regenerate the golden contract artifacts:
```bash
make contracts-update   # regenerate fixtures/golden/*.json
make contracts-check    # verify no drift
```

Key backend directories:
- `src/lcars_ui/widgets/` — widget Pydantic models
- `src/lcars_ui/core/` — Manifest, Page, Row, Column models
- `src/lcars_ui/dsl/` — DSL functions and rerun logic
- `src/lcars_ui/server/` — FastAPI routes, WebSocket, SSE, security

---

## Realtime API Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/lcars/manifest` | GET | Full dashboard manifest JSON |
| `/lcars/schema` | GET | JSON Schema for the manifest |
| `/lcars/ws` | WS | Primary real-time channel |
| `/lcars/events` | GET | SSE fallback stream |
| `/lcars/action/{widget_id}` | POST | HTTP action fallback |
| `/lcars/upload/audio` | POST | Audio upload for MicButton |

---

## Production Notes

- **MicButton** requires HTTPS (or `localhost`) — browsers block microphone on plain HTTP
- Set `LCARS_AUTH_TOKENS`, `LCARS_CORS_ORIGINS`, and other env vars before internet-facing deployment
- See `docs/deployment.md` for reverse proxy and Docker guidance

---

## Documentation

- `../CURRENT_STATE.md` — root current-state and phase-status truth
- `docs/quickstart.md` — first-use walkthrough
- `docs/lcars_language.md` — strict/classic visual language guide
- `docs/widgets.md` — all widget parameters
- `docs/dsl.md` — full DSL function reference
- `docs/TARGET_BANK_ACCEPTANCE.md` — canonical target-bank acceptance scope and LCARS-ready definition
- `docs/PHASE14_TARGET_BANK_VISUAL_FLOW.md` — canonical artifact flow and operator contract
- `docs/PHASE14_ACCEPTANCE_PROMOTION.md` — Phase 6 promotion and legacy parity deprecation plan
- `docs/OVERVIEW_PARITY_ARCHITECTURE.md` — legacy overview parity renderer boundaries and deprecation status
- `docs/deployment.md` — production deployment guide
- `docs/phase13_coverage.md` — Phase 13 feature coverage
- `docs/phase12_coverage.md` — Phase 12 feature coverage
