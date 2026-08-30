# Getting Started

This guide installs LCARS-WebUI from source, runs a bundled example, and creates a small
application.

## Requirements

- Python 3.10+
- Git
- Node.js 20.19+ or 22.12+ only when changing the React renderer

## Install

```bash
git clone https://github.com/darsrc/LCARS-WebUI.git
cd LCARS-WebUI/lcars-ui
python -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
```

Windows PowerShell activation:

```powershell
.\.venv\Scripts\Activate.ps1
```

Installing the package also installs the `lcars` command line — see
[Scaffold a project](#scaffold-a-project) below for the fastest way to start a new app.

## Run an example

```bash
python examples/bridge_ops/app.py
```

Open `http://127.0.0.1:8077/` if the browser does not open automatically. Never bind
port 8000 for a second app on the same machine if you already have something else
listening there — pass an explicit `port=` to `app.serve(...)` instead:

```python
app.serve(host="127.0.0.1", port=8078, open_browser=False)
```

`LCARS_PORT`, `LCARS_HOST`, and `LCARS_OPEN_BROWSER` are not library-level environment
settings; they only have an effect when an application reads them itself and forwards the
values to `app.serve()` — exactly as `examples/bridge_ops/app.py` does.

## Scaffold a project

The `lcars` command line ships with the package and is the fastest way to a running app:

```console
$ lcars new bridge-ops
Created /home/you/bridge-ops
  pyproject.toml
  README.md
  .gitignore
  src/bridge_ops/__init__.py
  src/bridge_ops/app.py
  tests/test_app.py

Next:
  cd bridge-ops
  pip install -e '.[dev]'
  pytest -q
  lcars dev            # http://127.0.0.1:8077/
```

(Captured live — `lcars new` writes a two-page application, one action handler, and one
passing test with nothing left as a placeholder.) Follow its own next steps:

```bash
cd bridge-ops
pip install -e '.[dev]'
pytest -q          # passes with no editing
lcars dev           # serves on http://127.0.0.1:8077/, reloads on save
lcars check         # builds and validates the manifest; binds no port — the CI command
```

## Write `my_dashboard.py` by hand

If you'd rather start from a single file instead of the scaffold:

```python
from lcars_ui import ActionContext, App, ui

app = App()
app.config("Bridge Ops", subtitle="Strict LCARS", theme="galaxy")


@app.page("Main", id="main", layout="console")
def main() -> None:
    with ui.data_panel("Operations", id="operations"):
        ui.metric("Warp Core", "98%", status="ok", id="warp-core")
        ui.progress("Shield Recharge", 72.0, color="golden-tanoi", id="shield-recharge")

    with ui.control_panel("Commands", id="commands"):
        ui.number_input(
            "Warp Factor", value=5.0, min=1.0, max=9.99, step=0.01, id="warp-factor"
        )
        ui.button("Red Alert", color="red", id="red-alert")
        ui.button("Stand Down", id="stand-down")


@app.action("red-alert")
def red_alert(ctx: ActionContext[None]) -> None:
    ctx.set_alert_condition("red")
    ctx.notify("Battle stations!", level="error")


@app.action("stand-down")
def stand_down(ctx: ActionContext[None]) -> None:
    ctx.set_alert_condition("normal")
    ctx.notify("Alert cleared", level="success")


if __name__ == "__main__":
    app.serve(port=8077, open_browser=True)
```

Run it from the activated environment:

```bash
python my_dashboard.py
```

(`app.build_manifest()` was executed against this exact file while writing this guide.)

## What the pieces do

| Piece | Role |
| --- | --- |
| `app.config(name, ...)` | Sets app metadata, theme, typography, sound, Options behavior, and optional binding definitions. |
| `app.bind_key(chord, action_id, ...)` | Declares a portable managed shortcut routed through the normal action handler. |
| `@app.page(title, id=...)` | Declares a page's widgets and adaptive layout archetype. Runs once, not on every action. |
| `ui.data_panel` / `ui.control_panel` | Give content semantic LCARS structure. |
| `ui.metric` / `ui.progress` | Render status and meter instruments. |
| `ui.number_input`, `ui.button` | Declare inputs and controls; they never return a click flag or the current value directly. |
| `@app.action(widget_id)` | Registers a handler that runs once each time that widget's id fires an action; `ctx.value` carries the event's payload. |
| `ctx.notify(...)` / `ctx.set_alert_condition(...)` | Effects — methods on the handler's `ActionContext`, private to the triggering session by default. |
| `app.serve(...)` | Builds the manifest and serves it; normally called once, inside `if __name__ == "__main__":`. |

If this "declare once, handle explicitly" shape is unfamiliar because you've used a
rerun-style Python UI framework — or an earlier version of this library — before, see
[Concepts](Concepts) and [Actions and State](Actions-and-State) next.

## Choose the next example

| Command | Focus |
| --- | --- |
| `python examples/kitchen_sink/app.py` | Broad widget and layout showcase across six pages. |
| `python examples/widget_capabilities/app.py` | Typed capability options and server interaction state. |
| `python examples/table_repositories/app.py` | Enhanced tables and lazy detail rows. |
| `python examples/algo_trading/app.py` | Candlestick and Renko charts. |
| `python examples/vibe_coder/app.py` | AI development console with task tracking and live logs. |
| `python examples/layered_graph/app.py` | Layered graph-format-2 reader with a caller-defined edge legend. |
| `python examples/graph_workspace/app.py` | Proposal authoring, density navigation, diff, and submission. |
| `python examples/surface_recreation/app.py` | A measured Surface Engine display built from geometry, not pixels. |

Every one of these builds cleanly under `lcars check examples/<name>/app.py`.

## Run from source without installation

Editable installation is recommended. For a one-off source run:

```bash
PYTHONPATH=src python examples/bridge_ops/app.py
```

---

**Next:** [Build a Dashboard](Build-a-Dashboard) · [Concepts](Concepts) ·
[Widgets](Widgets) · [Troubleshooting](Troubleshooting)
