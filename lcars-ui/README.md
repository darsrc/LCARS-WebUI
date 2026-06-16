# lcars-ui

`lcars-ui` turns a plain Python script into a live, Star Trek-style **LCARS** dashboard — no HTML, CSS, or JavaScript required.

You write a Python function that declares your dashboard. The library:

1. Builds a versioned JSON **manifest** describing the layout and widgets,
2. Serves it via **FastAPI** (WebSocket + HTTP), and
3. Renders it in the browser with a **bundled React frontend**.

Every click, toggle, or form submit reruns your function so it can react to the new state.

---

## Install and run

**Prerequisites:** Python 3.10+ and Git. Node.js is *not* needed to run dashboards — the frontend is pre-bundled.

```bash
git clone https://github.com/darsrc/LCARS-WebUI.git
cd LCARS-WebUI/lcars-ui

python -m venv .venv
source .venv/bin/activate          # Windows: .\.venv\Scripts\Activate.ps1

pip install -e ".[dev]"            # or: make install
python examples/bridge_ops/app.py
```

Your browser opens `http://127.0.0.1:8000/` automatically.

---

## Write your own dashboard

```python
import lcars_ui as lcars


def ui() -> None:
    lcars.config("My LCARS App", theme="galaxy", subtitle="Learning Mode")
    lcars.nav("Main", page="main")

    with lcars.page("Main", id="main", layout="console"):
        with lcars.data_panel("Telemetry"):
            lcars.metric("Shields", "100%", status="ok")
            lcars.progress("Repair Progress", 42.0)
        with lcars.control_panel("Actions"):
            speed = lcars.number_input("Warp Factor", value=5.0, min=1.0, max=9.99, step=0.01)
            if lcars.button("Engage"):
                lcars.notify(f"Warp command accepted: {speed:.2f}")
        with lcars.data_panel("Core"):
            lcars.gauge("Core Output", 87.2, unit="%")


if __name__ == "__main__":
    lcars.run(ui)
```

```bash
python my_dashboard.py
```

---

## Widget reference

### Inputs (9) — return the user's current value

| Function | Returns | Notes |
|---|---|---|
| `lcars.button(label, color)` | `bool` | `True` only on the rerun triggered by this click |
| `lcars.toggle(label, value, color)` | `bool` | on/off state |
| `lcars.checkbox(label, value, color)` | `bool` | checkbox state |
| `lcars.radio(label, options, value, color)` | `str` | radio group |
| `lcars.radio_toggle(label, options, value, color)` | `str` | segmented radio |
| `lcars.select(label, options, value, color)` | `str` | dropdown |
| `lcars.text_input(label, placeholder, password)` | `str` | text field |
| `lcars.number_input(label, value, min, max, step)` | `float` | numeric field |
| `lcars.form(id, action_id, submit_label)` | context | composite form |

### Display (12)

| Function | Description |
|---|---|
| `lcars.text(content, size, color)` | text block (`size`: `body`, `h1`, `h2`, `mono`) |
| `lcars.alert(message, level, blink)` | banner alert (`level`: `yellow`/`red`) |
| `lcars.metric(label, value, status, color)` | status tile with dot (`ok`/`warn`/`crit`) |
| `lcars.progress(label, value, color)` | segmented bar 0–100 |
| `lcars.gauge(label, value, min, max, unit, warn_threshold, crit_threshold)` | segmented gauge |
| `lcars.table(data, title)` | table from a list of dicts |
| `lcars.chart(data, title, color)` | line chart (list, dict, or DataFrame) |
| `lcars.sparkline(data, title)` | compact mini-chart |
| `lcars.markdown(content, color)` | rendered Markdown |
| `lcars.candlestick(data, title, markers, up_color, down_color)` | zoomable OHLC chart with trade markers |
| `lcars.renko(data, brick_size, title)` | Renko brick chart computed server-side |
| `lcars.shader(fragment_shader, title, uniforms, aspect_ratio)` | animated WebGL viewport |

### Streaming (1)

| Function | Description |
|---|---|
| `lcars.log(stream_id, max_lines, title)` | live log viewer (append with `lcars.append_log`) |

### Containers (4) + media (2)

| Function | Description |
|---|---|
| `with lcars.box(title, color):` | basic container |
| `with lcars.sweep(title, color):` | sweep container with sidebar |
| `with lcars.bracket(color):` | bracket grouping container |
| `lcars.header(text, size, color)` | section header |
| `lcars.video_hls(src, title)` | HLS video player |
| `lcars.mic_button(action_id, title)` | microphone input (HTTPS/localhost only) |

**LCARS-first recipes** compose the above into authentic console layouts: `data_panel()`, `control_panel()`, `console()`, `padd()`, `diagnostic()`, `input_column()`, and `raw()` (a local escape hatch).

---

## Layout, navigation, themes

```python
# Archetype layout — the engine zones panels automatically
with lcars.page("Ops", id="ops", layout="console"):   # or telemetry / grid / menu / auto
    with lcars.data_panel("Telemetry"):
        lcars.metric("Left", "A")
    with lcars.control_panel("Actions"):
        if lcars.button("Go"): ...

# Override zone explicitly
with lcars.data_panel("Side Rail", zone="side"):
    lcars.metric("Status", "OK")

# Sidebar nav
lcars.nav("Home", page="home")
```

```python
lcars.config("My App", theme="galaxy")     # TNG/DS9 orange+blue (default)
lcars.config("My App", theme="tng")        # Season 1–2 muted palette
lcars.config("My App", theme="nemesis")    # First Contact dark blues
```

30+ named LCARS colors (`"pale-canary"`, `"atomic-tangerine"`, `"anakiwa"`, `"husk"`, …) work in any `color=` parameter. Hex values like `"#ff9933"` are also accepted.

---

## Real-time effects and the rerun model

Call these inside button handlers or anywhere in `ui()`:

```python
lcars.update("widget_id", value=55.0)         # push new data to a widget
lcars.notify("Message text", level="info")     # notification banner
lcars.append_log("stream_id", "log line")      # append to a log viewer
```

For autonomous background streaming, register a live tick inside `__main__`:

```python
if __name__ == "__main__":
    @lcars.live(interval=2.0)          # pushes widget_update over WebSocket every 2s
    def tick() -> None:
        lcars.update("core-output", value=f"{read_sensor()}%")

    lcars.run(ui)
```

- On startup, `ui()` runs in **BUILD** mode to create the manifest.
- On each user action, `ui()` runs in **HANDLE** mode: input widgets return their current values, `button()` returns `True` only for the button clicked, and effects are queued to the browser.
- `@lcars.live` runs independently of user actions and pushes updates over the persistent WebSocket connection.

---

## API endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/lcars/manifest` | GET | full dashboard manifest JSON |
| `/lcars/schema` | GET | JSON Schema for the manifest |
| `/lcars/ws` | WS | primary real-time channel (actions, updates, logs) |
| `/lcars/events` | GET | SSE fallback stream |
| `/lcars/action/{widget_id}` | POST | HTTP action fallback |
| `/lcars/upload/audio` | POST | audio upload for MicButton |

---

## Develop

All commands run from `lcars-ui/`.

```bash
pytest tests/             # backend tests (231 pass)
make lint                 # ruff + mypy
make contracts-check      # verify manifest/protocol contract hasn't drifted
make ci                   # full gate: lint + contracts + tests + smoke + security + frontend
```

Frontend (Node.js 18+, only needed to change the renderer):

```bash
make frontend-install
python examples/bridge_ops/app.py   # backend in one terminal
cd frontend && npm run dev           # Vite dev server in another terminal
make frontend-bundle                 # rebuild the bundle into src/lcars_ui/_static/
```

Key directories: `src/lcars_ui/dsl/` (DSL + rerun), `src/lcars_ui/core/` (manifest models), `src/lcars_ui/server/` (FastAPI/WS/SSE), `frontend/src/widgets/` (renderer).

When you change widget models, regenerate the contract golden: `make contracts-update`.

---

## More docs

- [docs/quickstart.md](docs/quickstart.md) — first-use walkthrough
- [docs/widgets.md](docs/widgets.md) — every widget parameter including v3 chart/shader types
- [docs/dsl.md](docs/dsl.md) — full DSL function reference and adaptive layout
- [docs/lcars_language.md](docs/lcars_language.md) — LCARS visual language guide
- [docs/deployment.md](docs/deployment.md) — production deployment (reverse proxy, env vars)
- [GitHub Wiki](https://github.com/darsrc/LCARS-WebUI/wiki) — tutorials, recipes, and reference

**Deploying to the internet?** Set `LCARS_AUTH_TOKENS` and `LCARS_CORS_ORIGINS`, keep WebSocket upgrades enabled in your proxy, and serve over HTTPS (MicButton needs it). See `docs/deployment.md`.
