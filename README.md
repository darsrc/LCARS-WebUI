# LCARS WebUI

Turn a Python script into a live, Star Trek-style LCARS dashboard — no web development experience required.

## Current Repository Truth

- **Active release**: Beta 1.0 (`lcars-ui 1.0.0b1`)
- **Product renderer**: `legacy_strict` (only renderer in product)
- **Visual language**: `strict` only (`classic` removed in Beta 1.0)
- **Themes**: `galaxy` (default), `tng`, `nemesis`
- **Widget freeze**: 24 stable widgets (see [CURRENT_STATE.md](CURRENT_STATE.md))
- **Removed in Beta 1.0**: `joern_strict` renderer, oracle/acceptance infrastructure, `classic` visual language
- **Canonical target-bank acceptance**: 7-target / 4-family acceptance gate runs in `make ci`
- Publication docs:
  - [CURRENT_STATE.md](CURRENT_STATE.md)
  - [RELEASE_NOTES.md](RELEASE_NOTES.md)
  - [lcars-ui/docs/RELEASE_READINESS_2026-03-23.md](lcars-ui/docs/RELEASE_READINESS_2026-03-23.md)
  - [GITHUB_PUBLICATION_CHECKLIST.md](GITHUB_PUBLICATION_CHECKLIST.md)

```python
import lcars_ui as lcars

def ui() -> None:
    lcars.config("My Ship", subtitle="NCC-1701", visual_language="strict")

    with lcars.console("Bridge Operations"):
        with lcars.data_panel("Telemetry"):
            lcars.metric("Shields", "100%", status="ok")
        with lcars.control_panel("Actions"):
            if lcars.button("Red Alert"):
                lcars.notify("Battle stations!", level="error")

lcars.run(ui)
```

That script starts a server and opens your browser automatically.

---

## What You Get

- **Python-first**: describe your UI in Python, no HTML/CSS/JS needed
- **LCARS-first strict mode**: rail-driven composition lowering + LCARS-native control rendering
- **LCARS-first recipes**: `console()`, `padd()`, `diagnostic()`, `data_panel()`, `control_panel()`, `input_column()`, `raw()`
- **Strict sweep/container semantics**: sweep owns dual-region header/rail/content structure; box/bracket own interior telemetry/readout/control zones
- **Two-role renderer architecture**: product pages and canonical acceptance scenes are intentionally separate
- **Strict density guardrails**: large strict regions are compositionally subdivided and canonical target-bank acceptance guards structural density across accepted families
- **Mode compatibility**: `visual_language="strict"` (default) or `visual_language="classic"` for legacy chrome
- **Live updates**: dashboards update in real time via WebSocket; charts, gauges, logs all animate
- **Canonical acceptance gate in CI**: the closed 7-target / 4-family target-bank run is part of `make ci`
- **Session-safe**: each browser tab gets its own isolated state

---

## Repository Layout

```text
LCARS-WebUI/
├── README.md                       # this file
├── LCARS_PORTING_SPEC.md           # semantic source of truth
├── STRICT_LCARS_VISUAL_SPEC.md     # strict-mode visual law (screenshot-level)
├── LCARS_TRUTH/                    # canonical Star Trek LCARS reference frames
└── lcars-ui/                       # Python package + frontend + tests
    ├── src/lcars_ui/               # Python library source (DSL, server, contract)
    ├── frontend/                   # React/TypeScript renderer (built into the package)
    ├── tests/                      # backend tests (contracts/unit/integration)
    ├── examples/                   # runnable example dashboards
    └── docs/                       # user docs (quickstart, DSL, widgets)
```

---

## Quick Start (5 minutes)

Unless noted otherwise, the command examples below assume you are working from `LCARS-WebUI/lcars-ui/` after step 1.

### Prerequisites

- Python 3.10 or newer
- Git

That's it. You do **not** need Node.js just to run a dashboard.

### 1. Clone and enter the project

```bash
git clone https://github.com/darsrc/LCARS-WebUI.git
cd LCARS-WebUI/lcars-ui
```

### 2. Create and activate a virtual environment

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

### 3. Install the Python package

```bash
make install
```

Or without `make`:
```bash
pip install -e ".[dev]"
```

### 4. Run the example dashboard

```bash
python examples/lcars_console/app.py
```

Your browser opens `http://127.0.0.1:8000/` automatically.

### 5. Write your own dashboard

Create `my_dashboard.py` anywhere:

```python
import lcars_ui as lcars


@lcars.live(interval=5.0)        # optional: refresh every 5 seconds
def ui() -> None:
    lcars.config("My Dashboard", theme="galaxy", visual_language="strict")

    lcars.nav("Home", page="home")

    with lcars.page("Home", id="home"):
        with lcars.console("Ship Systems"):
            lcars.metric("Status", "Online", status="ok")
            lcars.progress("Loading", 72.0)
            with lcars.control_panel("Actions"):
                speed = lcars.number_input("Warp Factor", value=5.0, min=1.0, max=9.99, step=0.01)
                if lcars.button("Engage"):
                    lcars.notify(f"Warp {speed:.2f} engaged!")
            with lcars.data_panel("Core"):
                lcars.gauge("Power", 87.2, unit="%", warn_threshold=80.0, crit_threshold=95.0)


lcars.run(ui)
```

```bash
python my_dashboard.py
```

---

## Widgets Cheat Sheet

| Function | What it shows | Returns |
|---|---|---|
| `lcars.metric(label, value, status)` | Status tile with color dot | — |
| `lcars.alert(message, level, blink)` | Banner alert (yellow/red) | — |
| `lcars.progress(label, value)` | Segmented progress bar 0–100 | — |
| `lcars.gauge(label, value, min, max)` | Segmented LCARS gauge readout | — |
| `lcars.chart(data, title)` | Line chart (list or dict) | — |
| `lcars.sparkline(data, title)` | Mini sparkline | — |
| `lcars.table(data, title)` | Data table (list of dicts) | — |
| `lcars.markdown(content)` | Rendered markdown | — |
| `lcars.log(stream_id)` | Live log window | — |
| `lcars.text(content, size)` | Plain text block | — |
| `lcars.button(label)` | Clickable button | `True` on click |
| `lcars.toggle(label, value)` | On/off switch | `bool` |
| `lcars.checkbox(label, value)` | LCARS checkbox | `bool` |
| `lcars.select(label, options)` | Dropdown selector | `str` |
| `lcars.radio(label, options)` | Radio group | `str` |
| `lcars.radio_toggle(label, options)` | Segmented radio toggle | `str` |
| `lcars.text_input(label)` | Text field | `str` |
| `lcars.number_input(label, value)` | Numeric field | `float` |
| `lcars.header(text, size, color)` | LCARS section divider | — |
| `with lcars.box(...):` | Composable LCARS container | context |
| `with lcars.sweep(...):` | LCARS sweep container | context |
| `with lcars.bracket(...):` | LCARS bracket grouping container | context |
| `with lcars.console(...):` | Canonical console composition recipe | context |
| `with lcars.padd(...):` | Canonical PADD composition recipe | context |
| `with lcars.diagnostic(...):` | Canonical diagnostic composition recipe | context |
| `with lcars.input_column(...):` | Route children to enclosing `lcars_box` side input column | context |
| `with lcars.raw(...):` | Strict-mode local escape hatch from auto-paneling | context |

---

## Themes

Set `theme` in `lcars.config()`. You can also use 30+ named LCARS colors such as
`"pale-canary"`, `"atomic-tangerine"`, `"anakiwa"`, `"husk"`, and `"dodger-soft"` in any `color=` parameter.

| Theme | Palette |
|---|---|
| `"galaxy"` | Classic TNG/DS9 orange + blue |
| `"tng"` | Season 1–2 muted palette |
| `"nemesis"` | First Contact dark blues |

---

## Visual Language Modes

Strict mode keeps the same visual-language switch but treats LCARS as structure, not only style:

```python
lcars.config("Ops Console", visual_language="strict")   # default, LCARS compiler + strict controls
lcars.config("Ops Console", visual_language="classic")  # compatibility mode
```

Strict mode now compiles into LCARS-native containers:

- input groups -> `lcars_box` side input columns
- data groups -> `lcars_box` content panels
- mixed groups -> `lcars_bracket`
- `lcars_sweep` -> explicit header/rail/content regions
- strict page render path uses container composition bands (not dashboard card traversal)

Use `lcars.raw()` to bypass this behavior for a local subtree.

---

## Real-Time Effects

Call these inside any button handler or `@lcars.live` function:

```python
lcars.update("widget_id", value=75.0)     # push new data to any widget
lcars.notify("Message here")              # show a notification banner
lcars.append_log("stream_id", "log line") # append to a log viewer
```

---

## Running Tests

Backend:
```bash
make lint
make contracts-check
pytest tests/ -v
```

Frontend (requires Node.js 18+):
```bash
make frontend-ci
make canonical-acceptance
```

Full pipeline:
```bash
make ci
```

---

## Frontend Development (Optional)

The frontend (React/TypeScript) is **pre-built and bundled** inside the Python package. You only need Node.js if you want to modify the frontend source.

Node.js 18+ required:

```bash
# Install frontend dependencies
make frontend-install

# Dev server with hot reload (run Python backend separately first)
cd frontend && npm run dev

# Rebuild bundle after frontend changes
make frontend-bundle
```

Canonical LCARS-ready acceptance:
```bash
make canonical-acceptance
```

Legacy overview/self-golden visual checks remain available only as transitional regressions:
```bash
make legacy-visual-regression
```

---

## Documentation

Root and package docs are split by purpose:

- [CURRENT_STATE.md](CURRENT_STATE.md) — root current-state audit and phase-status truth
- [RELEASE_NOTES.md](RELEASE_NOTES.md) — current shippable-state release note tied to the canonical acceptance bundle
- [GITHUB_PUBLICATION_CHECKLIST.md](GITHUB_PUBLICATION_CHECKLIST.md) — remaining GitHub web UI actions for publication
- [CONTRIBUTING.md](CONTRIBUTING.md) — contributor scope, validation expectations, and anti-cheat reminders
- [SECURITY.md](SECURITY.md) — best-effort vulnerability reporting policy
- [SUPPORT.md](SUPPORT.md) — where to route bugs, questions, and release-support requests
- [lcars-ui/docs/RELEASE_READINESS_2026-03-23.md](lcars-ui/docs/RELEASE_READINESS_2026-03-23.md) — full validation record and canonical artifact-bundle reference for the current shippable claim
- [lcars-ui/docs/TARGET_BANK_ACCEPTANCE.md](lcars-ui/docs/TARGET_BANK_ACCEPTANCE.md) — canonical target-bank acceptance scope and LCARS-ready definition
- [lcars-ui/docs/PHASE16_CLOSEOUT.md](lcars-ui/docs/PHASE16_CLOSEOUT.md) — closed Phase 16 scope and catalog markers
- [lcars-ui/docs/PHASE17_CLOSEOUT.md](lcars-ui/docs/PHASE17_CLOSEOUT.md) — historical Phase 17 closeout summary
- [lcars-ui/docs/PHASE18_CLOSEOUT.md](lcars-ui/docs/PHASE18_CLOSEOUT.md) — closed Phase 18 scope and current architecture baseline summary
- [lcars-ui/docs/PHASE16_ADGE_INTRO_EVALUATION.md](lcars-ui/docs/PHASE16_ADGE_INTRO_EVALUATION.md) — ADGE onboarding decision record

Additional reference docs live in `lcars-ui/docs/`:

- [lcars-ui/docs/quickstart.md](lcars-ui/docs/quickstart.md) — step-by-step first-use guide
- [lcars-ui/docs/widgets.md](lcars-ui/docs/widgets.md) — widget + container reference
- [lcars-ui/docs/dsl.md](lcars-ui/docs/dsl.md) — complete DSL function reference
- [lcars-ui/docs/lcars_language.md](lcars-ui/docs/lcars_language.md) — strict/classic visual language guide
- [lcars-ui/docs/deployment.md](lcars-ui/docs/deployment.md) — production deployment guide

---

## Important Notes

- **MicButton** requires HTTPS or localhost (browser microphone restriction)
- **Auth/CORS**: set environment variables before any internet-facing deployment (see `lcars-ui/docs/deployment.md`)
- **WebSocket**: keep WebSocket upgrade forwarding enabled in your reverse proxy
