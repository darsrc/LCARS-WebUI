# Getting Started

## Install

```bash
git clone https://github.com/darsrc/LCARS-WebUI.git
cd LCARS-WebUI/lcars-ui
python -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
```

## Minimal App

```python
import lcars_ui as lcars


def ui() -> None:
    lcars.config("Bridge Ops", subtitle="Strict LCARS", theme="galaxy")
    lcars.nav("Main", page="main", color="orange-peel")

    with lcars.page("Main", id="main"):
        with lcars.box("Operations", subtitle="Deck A", color="orange"):
            lcars.metric("Warp Core", "98%", status="ok", color="anakiwa")
            lcars.progress("Shield Recharge", 72.0, color="golden-tanoi")

            if lcars.button("Red Alert", color="red"):
                lcars.notify("Battle stations", level="error")


if __name__ == "__main__":
    lcars.run(ui)
```

Run it:

```bash
python my_dashboard.py
```

Open `http://127.0.0.1:8000/`.

## Kitchen Sink Showcase

The screenshots in this wiki come from the bundled showcase:

```bash
cd LCARS-WebUI/lcars-ui
LCARS_PORT=8126 LCARS_OPEN_BROWSER=0 PYTHONPATH=src .venv/bin/python examples/kitchen_sink/app.py
```

The showcase has three pages:

- `Overview`: console layout, readouts, telemetry, alerts
- `Widgets`: primitive, data, input, form, media widgets
- `Layouts`: PADD, diagnostic, sweep, bracket, row/column helpers

