# Tutorial: Build a Dashboard

This tutorial builds a small operations dashboard with pages, panels, readouts, inputs,
button handlers, logs, and live updates.

## 1. Create a File

From `lcars-ui/`, create `ops_dashboard.py`.

```python
from __future__ import annotations

import itertools
import os

import lcars_ui as lcars


POWER_LEVELS = itertools.cycle([86, 88, 91, 89, 92, 87, 90])

POWER_SERIES = {
    "EPS A": [18, 21, 26, 34, 42, 51, 57, 61, 67, 64, 70, 74],
    "EPS B": [12, 17, 24, 29, 35, 43, 46, 52, 49, 58, 62, 68],
}

SYSTEM_ROWS = [
    {"System": "Warp Core", "State": "Nominal", "Load": "87%"},
    {"System": "Deflector", "State": "Aligned", "Load": "64%"},
    {"System": "Computer", "State": "Synced", "Load": "42%"},
]
```

## 2. Configure the App

`lcars.config` sets metadata and theme. `lcars.nav` creates sidebar buttons.

```python
def ui() -> None:
    lcars.config(
        "Operations Dashboard",
        theme="galaxy",
        subtitle="Tutorial",
        visual_language="strict",
    )

    lcars.nav("Overview", page="overview", color="pale-canary")
    lcars.nav("Diagnostics", page="diagnostics", color="anakiwa")
```

## 3. Add the Overview Page

A `console` page works well for everyday dashboards: primary data, side readouts, and a
control dock.

```python
    with lcars.page("Overview", id="overview", layout="console"):
        with lcars.data_panel("Core Telemetry", color="anakiwa", id="core-telemetry"):
            lcars.chart(POWER_SERIES, title="EPS Flow", color="anakiwa", id="eps-flow")
            lcars.table(SYSTEM_ROWS, title="System Matrix", id="system-matrix")
            lcars.log("ops-log", title="Operations Log", max_lines=12, id="ops-log-widget")

        with lcars.data_panel("Readouts", color="pale-canary", zone="side", id="readouts"):
            lcars.metric("Core Output", "87%", status="ok", color="pale-canary", id="core-output")
            lcars.gauge("Deflector Load", 64, unit="%", warn_threshold=75, crit_threshold=90, id="deflector-load")
            lcars.progress("Shield Grid", 74, color="anakiwa", id="shield-grid")
```

## 4. Add Controls

Stateful inputs return the current browser-session value. Buttons return `True` only for
the click being handled.

```python
        with lcars.control_panel("Operator Actions", color="orange", id="operator-actions"):
            scan_profile = lcars.select(
                "Scan Profile",
                ["Local", "Sector", "Deep"],
                value="Sector",
                id="scan-profile",
            )
            sensor_gain = lcars.number_input(
                "Sensor Gain",
                value=6.5,
                min=1.0,
                max=10.0,
                step=0.1,
                id="sensor-gain",
            )
            operator = lcars.text_input("Operator", placeholder="OPS-01", id="operator")

            if lcars.button("Refresh Telemetry", color="anakiwa", id="refresh-telemetry"):
                level = next(POWER_LEVELS)
                status = "warn" if level >= 90 else "ok"
                name = operator.strip() or "OPS-DEFAULT"
                lcars.update("core-output", value=f"{level}%", status=status)
                lcars.update("shield-grid", value=level)
                lcars.append_log(
                    "ops-log",
                    f"[OPS] profile={scan_profile} gain={sensor_gain:.1f} operator={name}",
                )
                lcars.notify("Telemetry refreshed.")

            if lcars.button("Red Alert", color="red", id="red-alert"):
                lcars.set_alert_condition("red")
                lcars.notify("Red Alert!", level="error")

            if lcars.button("Stand Down", color="anakiwa", id="stand-down"):
                lcars.set_alert_condition("normal")
                lcars.notify("Alert condition cleared.")
```

## 5. Add Another Page

Use `telemetry` for a page dominated by a chart or readout.

```python
    with lcars.page("Diagnostics", id="diagnostics", layout="telemetry"):
        with lcars.data_panel("Diagnostic Trace", color="anakiwa", id="diagnostic-trace"):
            lcars.chart([2, 4, 8, 16, 12, 18, 25, 21], title="Trace", id="trace-chart")
            lcars.sparkline([7, 6, 8, 9, 8, 10, 11], title="Variance", id="variance")

        with lcars.data_panel("Diagnostic State", color="lilac", zone="side", id="diag-state"):
            lcars.metric("Diagnostic", "PASS", status="ok", id="diag-pass")
            lcars.progress("Buffer", 56, color="lilac", id="diag-buffer")
```

## 6. Add Live Updates

One live callback is supported per app. It can patch widgets and append logs.

```python
@lcars.live(interval=5.0)
def poll() -> None:
    level = next(POWER_LEVELS)
    lcars.update("core-output", value=f"{level}%", status="warn" if level >= 90 else "ok")
    lcars.update("shield-grid", value=level)
    lcars.append_log("ops-log", f"[LIVE] core={level}%")
```

## 7. Run the App

```python
if __name__ == "__main__":
    lcars.run(
        ui,
        host=os.getenv("LCARS_HOST", "127.0.0.1"),
        port=int(os.getenv("LCARS_PORT", "8000")),
        open_browser=os.getenv("LCARS_OPEN_BROWSER", "1") == "1",
    )
```

Run it:

```bash
PYTHONPATH=src python ops_dashboard.py
```

Open `http://127.0.0.1:8000/`.

## What to Change Next

- Add more pages with `lcars.nav` and `lcars.page`.
- Split controls into `control_panel` containers.
- Use explicit ids for anything interactive or updated.
- Validate text, number, and choice values before using them for important behavior.
- Move repeated page sections into normal Python helper functions.
