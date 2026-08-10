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

## Run an example

```bash
python examples/bridge_ops/app.py
```

Open `http://127.0.0.1:8000/` if the browser does not open automatically.

The example files call `lcars.run(...)` directly. To change their port or browser
behavior, copy the example and pass explicit arguments:

```python
lcars.run(ui, host="127.0.0.1", port=8010, open_browser=False)
```

`LCARS_PORT` and `LCARS_OPEN_BROWSER` are not library-level environment settings; they
only have an effect when an application chooses to read them and forward them to
`lcars.run()`.

## Create `my_dashboard.py`

```python
import lcars_ui as lcars


def ui() -> None:
    lcars.config("Bridge Ops", subtitle="Strict LCARS", theme="galaxy")
    lcars.nav("Main", page="main", color="orange-peel")

    with lcars.page("Main", id="main", layout="console"):
        with lcars.data_panel("Operations", id="operations"):
            lcars.metric("Warp Core", "98%", status="ok", id="warp-core")
            lcars.progress("Shield Recharge", 72.0, color="golden-tanoi")

        with lcars.control_panel("Commands", id="commands"):
            factor = lcars.number_input(
                "Warp Factor", value=5.0, min=1.0, max=9.99, step=0.01, id="warp-factor"
            )
            red_alert = lcars.button("Red Alert", color="red", id="red-alert")
            stand_down = lcars.button("Stand Down", id="stand-down")

            if red_alert:
                lcars.set_alert_condition("red")
                lcars.notify(f"Battle stations at warp {factor:.2f}", level="error")

            if stand_down:
                lcars.set_alert_condition("normal")
                lcars.notify("Alert cleared", level="success")


if __name__ == "__main__":
    lcars.run(ui)
```

Run it from the activated environment:

```bash
python my_dashboard.py
```

## What the calls do

| Call | Role |
| --- | --- |
| `config` | Sets app metadata, theme, typography, sound, and Options-page behavior. |
| `nav` | Adds a sidebar destination. Its `page=` matches a page `id=`. |
| `page` | Declares a page and adaptive layout archetype. |
| `data_panel` / `control_panel` | Give content semantic LCARS structure. |
| `metric` / `progress` | Render status and meter instruments. |
| `number_input` | Returns the current per-session numeric value. |
| `button` | Returns `True` only during the rerun caused by its click. |
| `notify` / `set_alert_condition` | Push browser effects during HANDLE or LIVE mode. |

## Choose the next example

| Command | Focus |
| --- | --- |
| `python examples/kitchen_sink/app.py` | Broad widget and layout showcase. |
| `python examples/the_web/app.py` | The Web v0.3/v0.3.1 instruments. |
| `python examples/widget_capabilities/app.py` | Typed v4 options and interaction state. |
| `python examples/table_repositories/app.py` | Enhanced tables and lazy detail rows. |
| `python examples/algo_trading/app.py` | Candlestick and Renko charts. |
| `python examples/vibe_coder/app.py` | AI development console with task tracking and live logs. |

## Run from source without installation

Editable installation is recommended. For a one-off source run:

```bash
PYTHONPATH=src python examples/bridge_ops/app.py
```

---

**Next:** [Build a Dashboard](Build-a-Dashboard) · [Concepts](Concepts) ·
[Widgets](Widgets) · [Troubleshooting](Troubleshooting)
