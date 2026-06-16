# Layouts

LCARS-WebUI works best when you compose pages from LCARS-native panels instead of generic
rows of cards.

![Layout containers](images/layout-containers.png)

## Page Archetypes

```python
with lcars.page("Overview", id="overview", layout="console"):
    ...
```

| Layout | Shape | Use for |
| --- | --- | --- |
| `auto` | Renderer chooses from content. | Early prototyping. |
| `console` | Primary lane, side rail, control dock. | Operational dashboards. |
| `telemetry` | Dominant data scope and side readouts. | Big charts, monitors, sensor pages. |
| `grid` | Equal cells. | Repeated subsystem panels. |
| `menu` | Sparse command field. | Focused detail or selection pages. |

## Container Selection

| Need | Use |
| --- | --- |
| Charts, tables, metrics, logs, readouts | `data_panel` |
| Buttons, toggles, selects, text inputs | `control_panel` |
| A full command surface with explicit regions | `console` |
| A compact review/detail screen | `padd` |
| A diagnostic frame with main/side/input areas | `diagnostic` |
| Custom framed LCARS region | `box` |
| Explicit sweep geometry | `sweep` |
| Lightweight local grouping | `bracket` |
| Legacy/manual grid split | `row`, `col`, `columns` |

## Recommended Default

Start with page-level `data_panel` and `control_panel`.

```python
with lcars.page("Ops", id="ops", layout="console"):
    with lcars.data_panel("Telemetry", id="telemetry"):
        lcars.chart([1, 3, 5, 8], title="EPS Flow")

    with lcars.data_panel("Readouts", zone="side", id="readouts"):
        lcars.metric("Core Output", "87%", status="ok")

    with lcars.control_panel("Actions", id="actions"):
        lcars.button("Refresh", id="refresh")
```

## Zones

Zones hint where a page-level panel should land.

| Zone | Meaning |
| --- | --- |
| `primary` | Main content lane. |
| `side` | Side readout rail. |
| `dock` | Control dock. |
| `full` | Full page span or grid cell. |

```python
with lcars.data_panel("Readouts", zone="side", id="readouts"):
    lcars.metric("Core Output", "87%", status="ok")
```

The adaptive renderer promotes a panel into the primary lane if a non-grid page would
otherwise have no primary content.

## `data_panel`

```python
with lcars.data_panel("Core Telemetry", color="anakiwa", id="core-telemetry"):
    lcars.chart([1, 3, 5, 8], title="EPS Flow")
    lcars.table([{"System": "Core", "State": "Nominal"}], title="Systems")
```

Use it for charts, tables, logs, metrics, gauges, progress bars, markdown, and grouped
readouts.

## `control_panel`

```python
with lcars.control_panel("Operator Actions", color="orange", id="actions"):
    mode = lcars.select("Mode", ["Cruise", "Alert"], value="Cruise", id="mode")
    if lcars.button("Apply", id="apply"):
        lcars.append_log("ops-log", f"mode={mode}")
```

Nested widgets default into an input-oriented LCARS region.

## `console`

Use `console` when one panel needs explicit slots.

```python
with lcars.console("Bridge Console", color="pale-canary", id="bridge-console") as console:
    with console.header():
        lcars.header("Operational Summary", size="h3")

    with console.column_inputs():
        lcars.button("Acknowledge", id="ack")

    with console.left():
        lcars.metric("Core", "87%", status="ok")

    with console.right():
        lcars.chart([1, 3, 5, 8], title="EPS")
```

## `box`

```python
with lcars.box("Display Widgets", subtitle="Readouts", color="pale-canary", id="display") as box:
    with box.main():
        lcars.text("LCARS H1 SAMPLE", size="h1")
    with box.side():
        lcars.metric("Ready", "TRUE", status="ok")
```

`box` is a lower-level framed container. It supports `main`, `side`, `left_inputs`, and
`right_inputs` slots.

## `sweep`

```python
with lcars.sweep("Reverse Sweep", reverse=True, id="sweep") as sweep:
    with sweep.header():
        lcars.header("Sweep Header", size="h4")
    with sweep.column_inputs():
        lcars.button("Sweep Input", id="sweep-input")
    with sweep.left():
        lcars.text("Left content")
    with sweep.right():
        lcars.chart([1, 2, 3], title="Trace")
```

Use it when you need explicit sweep geometry.

## `padd` and `diagnostic`

```python
with lcars.padd("Crew Transfer", color="golden-tanoi") as padd:
    with padd.column_inputs():
        lcars.button("Approve", id="approve-transfer")
    with padd.left():
        lcars.markdown("### Transfer\n\nPending command review.")
    with padd.right():
        lcars.metric("Status", "READY", status="ok")
```

```python
with lcars.diagnostic("Diagnostic", color="blue") as diag:
    with diag.main():
        lcars.chart([2, 4, 8, 16], title="Trace")
    with diag.side():
        lcars.metric("Diagnostic", "PASS", status="ok")
```

## Compatibility Layout

`row`, `col`, and `columns` still exist for explicit splits.

```python
with lcars.row():
    with lcars.col("2fr"):
        lcars.chart([1, 2, 3], title="Primary")
    with lcars.col("1fr"):
        lcars.metric("Status", "OK")
```

Prefer LCARS containers first; use compatibility layout only when the container grammar
does not describe the screen.

---

**See Also:** [Widgets](Widgets) · [Concepts](Concepts) · [Recipes](Recipes) · [Visual Gallery](Visual-Gallery)
