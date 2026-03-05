# LCARS WebUI

Turn any Python script into a live Star Trek-style web dashboard — no frontend experience needed.

```python
import lcars_ui as lcars

def ui():
    lcars.config("Bridge Operations", theme="galaxy")
    lcars.metric("Warp Core", "Nominal", status="ok")
    lcars.metric("Shield Integrity", "94%", status="ok")

    if lcars.button("Red Alert", color="red"):
        lcars.notify("All hands to battle stations!")

lcars.run(ui)
```

Open a browser. Your dashboard is running.

---

## What is this?

LCARS WebUI is a Python library that lets you build interactive web dashboards using nothing but Python functions. You describe what to show — metrics, charts, tables, buttons — and the library handles the browser UI, real-time updates, and WebSocket communication automatically.

The visual style is inspired by the LCARS interface from *Star Trek: The Next Generation*.

**You do not need to know JavaScript, HTML, or CSS to use it.**

---

## Features

- **Pure Python API** — write `lcars.metric(...)`, `lcars.button(...)`, `lcars.chart(...)` and it just works
- **Live updates** — poll a data source on an interval with `@lcars.live`
- **All the widgets you need** — metrics, charts, sparklines, tables, log viewers, toggles, dropdowns, text inputs, forms, and more
- **pandas-friendly** — pass a DataFrame directly to `lcars.chart()` or `lcars.table()`
- **Real-time transport** — WebSocket primary, SSE fallback, HTTP action fallback
- **Token-based auth** — protect endpoints with `LCARS_AUTH_REQUIRED` and `LCARS_AUTH_TOKENS`
- **No boilerplate** — no App objects, no decorators, no widget IDs required for basic use

---

## Quick start

**Requirements:** Python 3.11+

```bash
git clone https://github.com/darsrc/LCARS-WebUI.git
cd LCARS-WebUI/lcars-ui
pip install -e .
python examples/bridge_ops/app.py
```

Then open `http://127.0.0.1:8000` in your browser.

---

## A longer example

```python
import random
import lcars_ui as lcars

@lcars.live(interval=5.0)   # refresh every 5 seconds automatically
def ui():
    lcars.config("My Dashboard", theme="galaxy", subtitle="v1.0")

    # Sidebar navigation
    lcars.nav("Overview", page="overview")
    lcars.nav("Systems",  page="systems")

    with lcars.page("Overview", id="overview"):
        # Status tiles
        lcars.metric("CPU", f"{random.randint(20, 80)}%", status="ok")
        lcars.metric("Memory", "3.2 GB", status="warn")

        # Chart from a plain Python list
        data = [random.uniform(0, 1) for _ in range(20)]
        lcars.chart(data, title="Signal strength")

        # Button that triggers an action
        if lcars.button("Run Diagnostics", color="blue"):
            lcars.notify("Diagnostics complete.")

    with lcars.page("Systems", id="systems"):
        rows = [
            {"System": "Impulse Drive",   "Status": "Online"},
            {"System": "Life Support",    "Status": "Online"},
            {"System": "Sensors",         "Status": "Degraded"},
        ]
        lcars.table(rows, title="System Status")

        # Toggle that remembers its state across reruns
        if lcars.toggle("Emergency Power"):
            lcars.alert("Emergency power engaged!", level="yellow", blink=True)

lcars.run(ui)
```

---

## Widget reference

| Function | What it shows |
|---|---|
| `lcars.metric(label, value, status=)` | Status tile with ok / warn / crit colour |
| `lcars.chart(data, title=)` | Line chart — accepts `list[float]`, `dict`, or `pd.DataFrame` |
| `lcars.sparkline(data)` | Compact inline trend line |
| `lcars.table(data, title=)` | Table — accepts `list[dict]`, `list[list]`, or `pd.DataFrame` |
| `lcars.text(content, size=)` | Heading or body paragraph |
| `lcars.alert(message, level=)` | Yellow or red alert banner, optional blink |
| `lcars.log(stream_id)` | Scrolling log window fed by `lcars.append_log()` |
| `lcars.button(label)` | Returns `True` on the rerun triggered by a click |
| `lcars.toggle(label)` | Returns current `bool` state, persists across reruns |
| `lcars.select(label, options)` | Dropdown — returns selected value |
| `lcars.text_input(label)` | Free-text field — returns current string |

Layout helpers: `lcars.page()`, `lcars.columns()`, `lcars.nav()`

Effect functions (run only when an action fires): `lcars.notify()`, `lcars.update()`, `lcars.append_log()`

---

## How it works

`lcars.run(ui)` calls your `ui` function once to build a manifest (a description of your entire UI), then starts a local web server. When a user clicks a button, the server calls `ui` again — this time the clicked button returns `True` and everything else returns its previous value. Your function re-runs top to bottom, the server sends the diff, and the browser updates instantly. No page reload.

This is the same mental model as [Streamlit](https://streamlit.io/), applied to a Star Trek aesthetic.

---

## Project layout

```
lcars-ui/
  src/lcars_ui/       Python library
    dsl/              Public API (lcars.run, lcars.metric, …)
    core/             Manifest and widget models (Pydantic)
    server/           FastAPI, WebSocket, SSE, security
    plugins/          Plugin system for custom action handlers
  frontend/           React/TypeScript browser client
  examples/
    bridge_ops/       Reference dashboard app
  tests/              125 backend + 18 frontend tests
```

---

## Configuration

All settings are optional environment variables:

| Variable | Default | Description |
|---|---|---|
| `LCARS_AUTH_REQUIRED` | `false` | Set to `true` to require a token on all requests |
| `LCARS_AUTH_TOKENS` | _(none)_ | JSON map of `{"token": ["lcars.read", "lcars.write"]}` |
| `LCARS_CORS_ORIGINS` | `*` | Comma-separated list of allowed origins |
| `LCARS_MAX_JSON_BODY_BYTES` | `64000` | Maximum action payload size |
| `LCARS_RATE_LIMIT_MAX_REQUESTS` | `30` | Requests allowed per window per identity |
| `LCARS_RATE_LIMIT_WINDOW_SECONDS` | `10` | Rate-limit sliding window length |

Frontend: set `VITE_LCARS_TOKEN` at build time to attach a bearer token to all requests from the browser.

---

## Running the tests

```bash
cd lcars-ui

# Backend
pip install -e ".[dev]"
pytest tests/

# Frontend
cd frontend
npm ci
npm test
```

---

## Themes

Three colour schemes are available via `lcars.config(theme=...)`:

| Theme | Style |
|---|---|
| `galaxy` | TNG / DS9 era — dark blue-black with orange and white accents (default) |
| `nemesis` | First Contact / film era — deeper blacks, cooler blues |
| `tng` | Early TNG seasons — warmer, more muted palette |

---

## Status

Active development. The core API, realtime transport, and security controls are stable. The visual LCARS renderer is functional. Contributions and feedback are welcome — open an issue or pull request.
