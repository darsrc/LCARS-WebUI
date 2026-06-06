# lcars-ui

`lcars-ui` turns a plain Python script into a live, Star Trek-style **LCARS** dashboard — no HTML, CSS, or JavaScript required.

You write a Python function that declares your dashboard. The library:

1. Builds a versioned JSON **manifest** describing the layout and widgets,
2. Serves it via **FastAPI** (WebSocket + HTTP), and
3. Renders it in the browser with a **bundled React frontend**.

Every click, toggle, or form submit reruns your function so it can react to the new state.

> **Status (June 2026):** the Python library, server, and contract are solid and tested — author dashboards in pure Python today. The **frontend renderer is being rebuilt** to match authentic LCARS (measured against the reference frames in `../LCARS_TRUTH/` and `../STRICT_LCARS_VISUAL_SPEC.md`); current visuals are a work in progress.

---

## Install and run

**Prerequisites:** Python 3.10+ and Git. (Node.js is *not* needed to run dashboards — the frontend is pre-bundled.)

```bash
git clone https://github.com/darsrc/LCARS-WebUI.git
cd LCARS-WebUI/lcars-ui

python -m venv .venv
source .venv/bin/activate          # Windows: .\.venv\Scripts\Activate.ps1

pip install -e ".[dev]"            # or: make install
python examples/lcars_console/app.py
```

Your browser opens `http://127.0.0.1:8000/` automatically.

---

## Write your own dashboard

```python
import lcars_ui as lcars


@lcars.live(interval=5.0)   # optional: auto-refresh every 5 seconds
def ui() -> None:
    lcars.config("My LCARS App", theme="galaxy", subtitle="Learning Mode")

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

## Widget reference

### Input (8) — return the user's current value

| Function | Returns | Notes |
|---|---|---|
| `lcars.button(label, color)` | `bool` | `True` only on the rerun triggered by this click |
| `lcars.toggle(label, value, color)` | `bool` | on/off state |
| `lcars.checkbox(label, value, color)` | `bool` | checkbox state |
| `lcars.radio_toggle(label, options, value, color)` | `str` | segmented radio |
| `lcars.select(label, options, value, color)` | `str` | dropdown |
| `lcars.text_input(label, placeholder, password)` | `str` | text field |
| `lcars.number_input(label, value, min, max, step)` | `float` | numeric field |
| `lcars.form(id, action_id, submit_label)` | context | composite form |

### Display (9)

| Function | Description |
|---|---|
| `lcars.text(content, size, color)` | text block (`size`: `body`, `h1`, `h2`, `mono`) |
| `lcars.alert(message, level, blink)` | banner alert (`level`: `yellow`/`red`) |
| `lcars.metric(label, value, status, color)` | status tile with dot (`ok`/`warn`/`crit`) |
| `lcars.progress(label, value, color)` | segmented bar 0–100 |
| `lcars.gauge(label, value, min, max, unit, warn_threshold, crit_threshold)` | segmented gauge |
| `lcars.table(data, title)` | table from a list of dicts |
| `lcars.chart(data, title, color)` | line chart |
| `lcars.sparkline(data, title)` | compact mini-chart |
| `lcars.markdown(content, color)` | rendered Markdown |

### Streaming (1)

| Function | Description |
|---|---|
| `lcars.log(stream_id, max_lines, title)` | live log viewer (append with `lcars.append_log`) |

### Containers (4) + media (2)

| Function | Description |
|---|---|
| `with lcars.box(title, color):` | basic container |
| `with lcars.sweep(title, color):` | sweep container with sidebar |
| `with lcars.bracket(title, color):` | bracket grouping container |
| `lcars.header(text, size, color)` | section header |
| `lcars.video_hls(src, title)` | HLS video player |
| `lcars.mic_button(action_id, title)` | microphone input (HTTPS/localhost only) |

**LCARS-first recipes** compose the above into authentic console layouts: `console()`, `padd()`, `diagnostic()`, `data_panel()`, `control_panel()`, `input_column()`, and `raw()` (a local escape hatch).

---

## Layout, navigation, themes

```python
with lcars.page("My Page", id="my_page"):
    with lcars.console("My Console"):
        with lcars.data_panel("Telemetry"):
            lcars.metric("Left", "A")
        with lcars.control_panel("Actions"):
            if lcars.button("Go"): ...

# Or explicit grid:
with lcars.row():
    with lcars.col("2fr"): ...
    with lcars.col("1fr"): ...

lcars.nav("Home", page="home")             # sidebar nav button
```

```python
lcars.config("My App", theme="galaxy")     # TNG/DS9 orange+blue (default)
lcars.config("My App", theme="tng")        # Season 1–2 muted palette
lcars.config("My App", theme="nemesis")    # First Contact dark blues
```

30+ named LCARS colors (`"pale-canary"`, `"atomic-tangerine"`, `"anakiwa"`, `"husk"`, …) work in any `color=` parameter.

---

## Real-time effects and the rerun model

Call these inside button handlers, `@lcars.live`, or anywhere in `ui()`:

```python
lcars.update("widget_id", value=55.0)         # push new data to a widget
lcars.notify("Message text", level="info")     # notification banner
lcars.append_log("stream_id", "log line")      # append to a log viewer
```

- On startup, `ui()` runs in **BUILD** mode to create the manifest.
- On each user action, `ui()` runs in **HANDLE** mode: input widgets return their current values, `button()` returns `True` only for the button clicked, and effects are queued to the browser.

---

## API endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/lcars/manifest` | GET | full dashboard manifest JSON |
| `/lcars/schema` | GET | JSON Schema for the manifest |
| `/lcars/ws` | WS | primary real-time channel |
| `/lcars/events` | GET | SSE fallback stream |
| `/lcars/action/{widget_id}` | POST | HTTP action fallback |
| `/lcars/upload/audio` | POST | audio upload for MicButton |

---

## Develop

All commands run from `lcars-ui/`.

```bash
pytest tests/             # backend tests
make lint                 # ruff + mypy
make contracts-check      # verify the manifest/protocol contract hasn't drifted
```

Frontend (Node.js 18+, only needed to change the renderer):

```bash
make frontend-install
python examples/lcars_console/app.py    # backend in one terminal
cd frontend && npm run dev              # Vite dev server in another
make frontend-bundle                    # rebuild the bundle in src/lcars_ui/_static/
```

Key directories: `src/lcars_ui/dsl/` (DSL + rerun), `src/lcars_ui/core/` (manifest models), `src/lcars_ui/server/` (FastAPI/WS/SSE), `frontend/src/components/` (renderer).

When you change widget models, regenerate the contract: `make contracts-update`.

---

## More docs

- [docs/quickstart.md](docs/quickstart.md) — first-use walkthrough
- [docs/widgets.md](docs/widgets.md) — every widget parameter
- [docs/dsl.md](docs/dsl.md) — full DSL function reference
- [docs/lcars_language.md](docs/lcars_language.md) — LCARS visual language guide
- [docs/deployment.md](docs/deployment.md) — production deployment (reverse proxy, env vars)

**Deploying to the internet?** Set `LCARS_AUTH_TOKENS` and `LCARS_CORS_ORIGINS`, keep WebSocket upgrades enabled in your proxy, and serve over HTTPS (MicButton needs it). See `docs/deployment.md`.
