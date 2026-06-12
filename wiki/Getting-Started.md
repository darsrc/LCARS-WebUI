# Getting Started

This page gets LCARS-WebUI installed and running. For a fuller application walkthrough,
continue with [[Tutorial: Build a Dashboard|Tutorial-Build-a-Dashboard]].

## Prerequisites

- Python 3.10+
- Git
- Node.js 18+ only if you plan to edit frontend source

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

## Run a Bundled Example

```bash
PYTHONPATH=src python examples/dashboard.py
```

Open `http://127.0.0.1:8000/` if the browser does not open automatically.

To run without opening a browser:

```bash
LCARS_OPEN_BROWSER=0 PYTHONPATH=src python examples/dashboard.py
```

## Minimal App

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

## What the Example Shows

- `lcars.config(...)` sets app metadata, theme, and visual behavior.
- `lcars.nav(...)` links the sidebar to a page id.
- `lcars.page(...)` declares a page and layout archetype.
- `data_panel` and `control_panel` give the adaptive layout useful LCARS structure.
- `metric` and `progress` are display widgets.
- `button` is a momentary action and returns `True` only for the click being handled.
- `notify` and `set_alert_condition` are effects, so they belong inside button branches.

## Run the Kitchen Sink

The screenshots in this wiki come from the bundled kitchen sink app:

```bash
LCARS_PORT=8126 LCARS_OPEN_BROWSER=0 PYTHONPATH=src python examples/kitchen_sink/app.py
```

It demonstrates:

- `Console`: data panels, readouts, controls, live logs
- `Telemetry`: a dominant data view with side readouts
- `Grid`: repeated subsystem cells
- `Widgets`: primitives, data widgets, inputs, forms, and media widgets

## Next Steps

- [[Tutorial: Build a Dashboard|Tutorial-Build-a-Dashboard]]
- [[Core Concepts|Core-Concepts]]
- [[API Reference|API-Reference]]
- [[Recipes|Recipes]]
- [[Troubleshooting|Troubleshooting]]
