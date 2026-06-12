# Getting Started

This page gets LCARS-WebUI installed and running. After this, continue with
[Build a Dashboard](Build-a-Dashboard).

## Prerequisites

- Python 3.10+
- Git
- Node.js 18+ only if you are editing frontend renderer source

## Install from Source

```bash
git clone https://github.com/darsrc/LCARS-WebUI.git
cd LCARS-WebUI/lcars-ui
python -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
```

Windows PowerShell:

```powershell
.\.venv\Scripts\Activate.ps1
```

## Run a Bundled Example

```bash
PYTHONPATH=src python examples/dashboard.py
```

Open `http://127.0.0.1:8000/` if the browser does not open automatically.

Run without launching a browser:

```bash
LCARS_OPEN_BROWSER=0 PYTHONPATH=src python examples/dashboard.py
```

Use another port:

```bash
LCARS_PORT=8010 PYTHONPATH=src python examples/dashboard.py
```

## Create a Small App

Create `my_dashboard.py`:

```python
import lcars_ui as lcars


def ui() -> None:
    lcars.config("Bridge Ops", subtitle="Strict LCARS", theme="galaxy")
    lcars.nav("Main", page="main", color="orange-peel")

    with lcars.page("Main", id="main", layout="console"):
        with lcars.data_panel("Operations", color="orange", id="operations"):
            lcars.metric("Warp Core", "98%", status="ok", color="anakiwa", id="warp-core")
            lcars.progress("Shield Recharge", 72.0, color="golden-tanoi", id="shield-recharge")

        with lcars.control_panel("Commands", color="orange", id="commands"):
            if lcars.button("Red Alert", color="red", id="red-alert"):
                lcars.set_alert_condition("red")
                lcars.notify("Battle stations", level="error")

            if lcars.button("Stand Down", color="anakiwa", id="stand-down"):
                lcars.set_alert_condition("normal")
                lcars.notify("Alert cleared")


if __name__ == "__main__":
    lcars.run(ui)
```

Run it:

```bash
python my_dashboard.py
```

## What You Just Used

- `lcars.config(...)` sets app metadata and visual defaults.
- `lcars.nav(...)` adds a sidebar navigation entry.
- `lcars.page(...)` declares a page and layout archetype.
- `data_panel` and `control_panel` create LCARS-native page panels.
- `metric` and `progress` display state.
- `button` returns `True` only for the click being handled.
- `notify` and `set_alert_condition` are browser effects, so they belong inside handlers.

## Run the Kitchen Sink

```bash
LCARS_PORT=8126 LCARS_OPEN_BROWSER=0 PYTHONPATH=src python examples/kitchen_sink/app.py
```

The kitchen sink demonstrates the full supported widget set and the screenshots used in
this wiki.

## Next

- [Build a Dashboard](Build-a-Dashboard)
- [Concepts](Concepts)
- [Widgets](Widgets)
- [Troubleshooting](Troubleshooting)
