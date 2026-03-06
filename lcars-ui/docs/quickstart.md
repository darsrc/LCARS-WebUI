# Quickstart

This guide gets your first LCARS app running with the new Phase 12 strict visual language.

## 1) Prerequisites

- Python 3.10+
- Git
- Node.js 18+ (only needed if you plan to edit frontend source)

## 2) Clone and enter the package

```bash
git clone https://github.com/darsrc/LCARS-WebUI.git
cd LCARS-WebUI/lcars-ui
```

## 3) Create and activate a virtual environment

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

## 4) Install dependencies

```bash
make install
```

Or:

```bash
pip install -e ".[dev]"
```

## 5) Create your first strict LCARS app

Create `my_dashboard.py`:

```python
import lcars_ui as lcars


def ui() -> None:
    lcars.config("Bridge Ops", subtitle="Strict LCARS", theme="galaxy")

    lcars.nav("Main", page="main", color="orange-peel")

    with lcars.page("Main", id="main"):
        lcars.section("Ship Systems", color="anakiwa")

        with lcars.box(title="Operations", subtitle="Deck A", color="orange-peel"):
            lcars.metric("Warp Core", "98%", status="ok", color="anakiwa")
            lcars.progress("Shield Recharge", 72.0, color="husk")

            if lcars.button("Red Alert", color="chestnut-rose"):
                lcars.notify("Battle stations", level="error")


if __name__ == "__main__":
    lcars.run(ui)
```

## 6) Run it

```bash
python my_dashboard.py
```

Open `http://127.0.0.1:8000/` if your browser does not open automatically.

## 7) Visual language modes

Strict mode is the default in Phase 12.

```python
lcars.config("Bridge Ops", visual_language="strict")   # default
lcars.config("Bridge Ops", visual_language="classic")  # pre-Phase-12 compatibility
```

See [lcars_language.md](./lcars_language.md) for the full visual language rules.

## 8) Next steps

- Review [widgets.md](./widgets.md) for widget APIs
- Review [dsl.md](./dsl.md) for the full DSL reference
- Review [deployment.md](./deployment.md) before internet-facing deployment
