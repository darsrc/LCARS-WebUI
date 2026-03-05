# Quickstart

This guide is written for first-time users.

## 1) Install prerequisites

- Python 3.10+
- Node.js 18+
- Git
- `make` (optional but recommended)

Check versions:

```bash
python --version
node --version
npm --version
```

## 2) Clone and enter project

```bash
git clone https://github.com/darsrc/LCARS-WebUI.git
cd LCARS-WebUI/lcars-ui
```

## 3) Create and activate virtual environment

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
cd frontend && npm ci && cd ..
```

## 5) Create your first app

Create `my_dashboard.py`:

```python
import lcars_ui as lcars


def ui() -> None:
    lcars.config("Beginner Bridge", subtitle="Quickstart")

    with lcars.page("Main", id="main"):
        lcars.metric("Shields", "100%", status="ok")
        lcars.progress("Warp Drive Calibration", 42.0)

        with lcars.row():
            with lcars.col("2fr"):
                speed = lcars.number_input("Warp Factor", value=5.0, min=1.0, max=9.99, step=0.01)
                if lcars.button("Engage"):
                    lcars.notify(f"Warp command accepted: {speed:.2f}")
            with lcars.col("1fr"):
                lcars.gauge("Core Output", 87.2, unit="%", warn_threshold=70.0, crit_threshold=90.0)


if __name__ == "__main__":
    lcars.run(ui)
```

## 6) Run backend and frontend

Terminal A:

```bash
python my_dashboard.py
```

Terminal B:

```bash
cd frontend
npm run dev
```

Open the frontend URL printed by Vite (usually `http://127.0.0.1:5173`).

## 7) Verify realtime updates

Click **Engage**. You should see a notification without refreshing the page.

## 8) Next steps

- Add charts with `lcars.chart(...)` and `lcars.sparkline(...)`
- Group controls with `with lcars.form(...):`
- Render formatted reports with `lcars.markdown(...)`
- Review [widgets.md](./widgets.md), [dsl.md](./dsl.md), and [deployment.md](./deployment.md)
