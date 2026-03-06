# LCARS WebUI

Turn a Python script into a live, Star Trek-style LCARS dashboard — no web development experience required.
Current release track: **v0.3.0-alpha** (Phase 12 strict visual language).

```python
import lcars_ui as lcars

def ui() -> None:
    lcars.config("My Ship", subtitle="NCC-1701", visual_language="strict")

    with lcars.box(title="Operations", color="orange-peel"):
        lcars.metric("Shields", "100%", status="ok")
        if lcars.button("Red Alert"):
            lcars.notify("Battle stations!", level="error")

lcars.run(ui)
```

That script starts a server and opens your browser automatically.

---

## What You Get

- **Python-first**: describe your UI in Python, no HTML/CSS/JS needed
- **LCARS-native strict mode**: seamless shell frame, structural elbows/bars, black-void content areas
- **Mode compatibility**: `visual_language="strict"` (default) or `visual_language="classic"` for pre-Phase-12 chrome
- **Live updates**: dashboards update in real time via WebSocket; charts, gauges, logs all animate
- **Expanded widget set**: classic controls plus LCARS container widgets and LCARS-styled checkbox/radio inputs
- **Session-safe**: each browser tab gets its own isolated state

---

## Repository Layout

```
LCARS-WebUI/
├── lcars-ui/           # Python package + frontend + tests
│   ├── src/lcars_ui/   # Python library source
│   ├── frontend/       # React/TypeScript source (pre-bundled for you)
│   ├── tests/          # 146+ backend tests
│   ├── examples/       # Runnable example dashboards
│   └── docs/           # Detailed reference docs
├── LCARS UI Specification.md
└── Implementation Plan.md
```

---

## Quick Start (5 minutes)

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
python examples/bridge_ops/app.py
```

Your browser opens `http://127.0.0.1:8000/` automatically. You should see a live LCARS dashboard with metrics, charts, buttons, and navigation.

### 5. Write your own dashboard

Create `my_dashboard.py` anywhere:

```python
import lcars_ui as lcars


@lcars.live(interval=5.0)        # optional: refresh every 5 seconds
def ui() -> None:
    lcars.config("My Dashboard", theme="galaxy", visual_language="strict")

    lcars.nav("Home", page="home")

    with lcars.page("Home", id="home"):
        with lcars.box(title="Ship Systems", subtitle="Deck A", color="orange-peel"):
            lcars.metric("Status", "Online", status="ok")
            lcars.progress("Loading", 72.0)

        with lcars.row():
            with lcars.col("2fr"):
                speed = lcars.number_input("Warp Factor", value=5.0, min=1.0, max=9.99, step=0.01)
                if lcars.button("Engage"):
                    lcars.notify(f"Warp {speed:.2f} engaged!")
            with lcars.col("1fr"):
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
| `lcars.progress(label, value)` | Horizontal progress bar 0–100 | — |
| `lcars.gauge(label, value, min, max)` | Circular gauge | — |
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

Phase 12 introduces a manifest-level visual language switch:

```python
lcars.config("Ops Console", visual_language="strict")   # default, LCARS-native frame language
lcars.config("Ops Console", visual_language="classic")  # compatibility mode
```

Strict mode also auto-wraps bare widget groups into LCARS bracket containers so pages remain structurally LCARS without extra boilerplate.

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

---

## Documentation

Full reference docs live in `lcars-ui/docs/`:

- `docs/quickstart.md` — step-by-step first-use guide
- `docs/widgets.md` — all 17 widget types with parameters
- `docs/dsl.md` — complete DSL function reference
- `docs/lcars_language.md` — strict/classic visual language guide
- `docs/phase12_coverage.md` — Phase 12 implementation coverage
- `docs/deployment.md` — production deployment guide

---

## Important Notes

- **MicButton** requires HTTPS or localhost (browser microphone restriction)
- **Auth/CORS**: set environment variables before any internet-facing deployment (see `docs/deployment.md`)
- **WebSocket**: keep WebSocket upgrade forwarding enabled in your reverse proxy
