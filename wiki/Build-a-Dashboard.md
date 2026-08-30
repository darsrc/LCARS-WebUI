# Build a Dashboard

This tutorial builds a practical two-page dashboard with readouts, charts, controls,
logs, alerts, and live updates. Every step below was assembled into one file and run
through `app.build_manifest()` and `app.test_client()` while writing this page.

## 1. Create the file and the App

Create `ops_dashboard.py`:

```python
from __future__ import annotations

import itertools
import os

from lcars_ui import ActionContext, App, ui

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

app = App()
app.config("Operations Dashboard", theme="galaxy", subtitle="Tutorial")
```

`App()` is the one entry point — pages, actions, live jobs, configuration, and serving
all attach to it.

## 2. Add the Overview page

Use `layout="console"` for a standard operations surface: primary telemetry lane, side
readout rail, control dock.

```python
@app.page("Overview", id="overview", layout="console")
def overview() -> None:
    with ui.data_panel("Core Telemetry", color="anakiwa", id="core-telemetry"):
        ui.chart(POWER_SERIES, title="EPS Flow", color="anakiwa", id="eps-flow")
        ui.table(SYSTEM_ROWS, title="System Matrix", id="system-matrix")
        ui.log("ops-log", title="Operations Log", max_lines=12, id="ops-log-widget")

    with ui.data_panel("Readouts", color="pale-canary", zone="side", id="readouts"):
        ui.metric("Core Output", "87%", status="ok", color="pale-canary", id="core-output")
        ui.gauge(
            "Deflector Load", 64, unit="%", warn_threshold=75, crit_threshold=90,
            id="deflector-load",
        )
        ui.progress("Shield Grid", 74, color="anakiwa", id="shield-grid")
```

`@app.page(...)` registers this function; it runs once, at manifest-build time, and
never reruns on a browser action. Every widget that a later action handler will touch
(`core-output`, `shield-grid`, `ops-log`) gets an explicit `id=` here.

## 3. Add controls

Controls are declared the same way as anything else — no branch, no return value to
capture:

```python
    with ui.control_panel("Operator Actions", color="orange", id="operator-actions"):
        ui.select(
            "Scan Profile", ["Local", "Sector", "Deep"], value="Sector", id="scan-profile",
        )
        ui.number_input(
            "Sensor Gain", value=6.5, min=1.0, max=10.0, step=0.1, id="sensor-gain",
        )
        ui.text_input("Operator", placeholder="OPS-01", id="operator")

        ui.button("Refresh Telemetry", color="anakiwa", id="refresh-telemetry")
        ui.button("Red Alert", color="red", id="red-alert")
        ui.button("Stand Down", color="anakiwa", id="stand-down")
```

(Append this block inside `overview()`, after the panels from step 2.)

## 4. Handle what the controls do

Each button's `id` gets its own handler, registered separately from the page function:

```python
@app.action("refresh-telemetry")
def refresh_telemetry(ctx: ActionContext[None]) -> None:
    level = next(POWER_LEVELS)
    status = "warn" if level >= 90 else "ok"
    ctx.update("core-output", value=f"{level}%", status=status)
    ctx.update("shield-grid", value=level)
    ctx.append_log("ops-log", f"[OPS] telemetry refreshed, core={level}%")
    ctx.notify("Telemetry refreshed.")


@app.action("red-alert")
def red_alert(ctx: ActionContext[None]) -> None:
    ctx.set_alert_condition("red")
    ctx.notify("Red Alert!", level="error")


@app.action("stand-down")
def stand_down(ctx: ActionContext[None]) -> None:
    ctx.set_alert_condition("normal")
    ctx.notify("Alert condition cleared.")
```

`refresh-telemetry`'s handler doesn't read `scan-profile`/`sensor-gain`/`operator` here —
a handler only ever receives its own triggering widget's value on `ctx.value`. If you
need several controls' values together at once, group them in a `ui.form(...)` (see
[Actions and State](Actions-and-State#forms)) so they arrive together as one dict (or
parsed model) on submit.

## 5. Add a Diagnostics page

```python
@app.page("Diagnostics", id="diagnostics", layout="telemetry")
def diagnostics() -> None:
    with ui.data_panel("Diagnostic Trace", color="anakiwa", id="diagnostic-trace"):
        ui.chart([2, 4, 8, 16, 12, 18, 25, 21], title="Trace", id="trace-chart")
        ui.sparkline([7, 6, 8, 9, 8, 10, 11], title="Variance", id="variance")

    with ui.data_panel("Diagnostic State", color="lilac", zone="side", id="diag-state"):
        ui.metric("Diagnostic", "PASS", status="ok", id="diag-pass")
        ui.progress("Buffer", 56, color="lilac", id="diag-buffer")
```

`@app.page(..., nav=True)` (the default) adds every page to the sidebar automatically —
there's no separate navigation call to make.

## 6. Add a live job and serve

```python
if __name__ == "__main__":
    @app.live(interval=5.0)
    def poll() -> None:
        import lcars_ui

        level = next(POWER_LEVELS)
        lcars_ui.update(
            "core-output", value=f"{level}%", status="warn" if level >= 90 else "ok",
        )
        lcars_ui.update("shield-grid", value=level)
        lcars_ui.append_log("ops-log", f"[LIVE] core={level}%")

    app.serve(
        host=os.getenv("LCARS_HOST", "127.0.0.1"),
        port=int(os.getenv("LCARS_PORT", "8077")),
        open_browser=os.getenv("LCARS_OPEN_BROWSER", "1") == "1",
    )
```

`@app.live(interval=5.0)` has no triggering session, so its body calls the plain
root-level effect functions (`lcars_ui.update`, `lcars_ui.append_log`) instead of
`ctx.*` methods — those default to `audience="all"`, broadcasting to every connected
browser. Register it inside `if __name__ == "__main__":` so importing the module (from a
test, for instance) doesn't also start the periodic job.

## 7. Run it

```bash
python ops_dashboard.py
python ops_dashboard.py --port 8011 --ip 0.0.0.0
```

The first command uses the defaults in the script. The second overrides them for
that run; `--host` is an alias for `--ip`.

## 8. Test it

```python
with app.test_client() as client:
    session = client.session()
    assert session.pages[:2] == ["overview", "diagnostics"]

    effects = session.action("refresh-telemetry")
    kinds = [e.type for e in effects]
    assert "widget_update" in kinds
    assert "notification" in kinds

    session.action("red-alert")
    assert session.widget("core-output").value.endswith("%")
```

This exact block was run against the file assembled above; `session.action(...)`
dispatches through the same registry, event bus, and acknowledgement path a real
browser action would use.

## Full file shape

Your completed file has this order:

```python
imports
constants

app = App()
app.config(...)

@app.page("Overview", id="overview", layout="console")
def overview() -> None: ...

@app.page("Diagnostics", id="diagnostics", layout="telemetry")
def diagnostics() -> None: ...

@app.action("refresh-telemetry")
def refresh_telemetry(ctx: ActionContext[None]) -> None: ...

@app.action("red-alert")
def red_alert(ctx: ActionContext[None]) -> None: ...

@app.action("stand-down")
def stand_down(ctx: ActionContext[None]) -> None: ...

if __name__ == "__main__":
    @app.live(interval=5.0)
    def poll() -> None: ...

    app.serve(...)
```

## Improve it

- Add more pages with more `@app.page(...)` functions — each opts into the sidebar by
  default.
- Split complex command areas into more `ui.control_panel` containers.
- Give every interactive or updated widget an explicit `id=`.
- Group related controls into a `ui.form(...)` (or a Pydantic model-backed one) when a
  handler genuinely needs several values together.
- Move repeated panel blocks into normal Python helper functions called from inside a
  page function.
- Add a test for every action handler with `app.test_client()` as you write it, not
  after.

---

**See Also:** [Concepts](Concepts) · [Layouts](Layouts) · [Widgets](Widgets) · [Actions and State](Actions-and-State) · [Recipes](Recipes)
