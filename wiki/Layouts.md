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
| `authored` | Explicit caller-declared CSS Grid topology. | Canon-sensitive or spatial screens that must not be repacked. |

## Authored composition

Use authored layout only when spatial topology carries information. It is an opt-in
escape from the adaptive mosaic, not the default dashboard tool.

```python
with lcars.page("Exact surface", id="exact", layout="authored", chrome="none"):
    with lcars.composition(
        columns=[lcars.px(120), lcars.fr(1), lcars.fr(2)],
        rows=[lcars.px(64), lcars.fr(1)],
        design_size=(1440, 900),
        narrow="scroll",  # scroll | scale | adaptive
    ) as stage:
        with stage.area("title", row=1, column=2, column_span=2):
            lcars.text("EXACT SURFACE", size="display")
        with stage.area("rail", row=2, column=1, decorative=True):
            lcars.bar(color="orange", caps="both", thickness=28)
```

An authored page requires exactly one top-level `composition()`, plus optional pop-ups.
Areas use one-based row/column placement and reject same-layer overlap. `px`, `fr`,
`auto`, and `minmax` build validated track strings. `chrome="none"` removes the standard
console shell. At narrow widths, `scroll` preserves geometry, `scale` scales it, and
`adaptive` repacks only non-decorative content through the normal mosaic.

## Surface geometry

Use `lcars.surface()` when an authored screen needs non-rectangular topology such as arcs,
polygons, routed paths, or mirrored and repeated consoles. It combines code-rendered geometry
with positioned regions that can host ordinary widgets. See the [Surface Engine](Surface-Engine)
page for the full reference.

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

## Footprint and sizing hints

The renderer infers panel size from content, then shares the usable deck among panels.
These hints are accepted by top-level containers and most widgets:

| Hint | Meaning |
| --- | --- |
| `span=(columns, rows)` | Pin an exact mosaic footprint. |
| `weight=1..12` | Anchor more important panels earlier and larger. |
| `aspect="wide" | "tall" | "square" | "flex"` | Override inferred shape. |
| `group="name"` | Ask the packer to keep related panels adjacent. |
| `sizing="fill" | "content"` | Fill free deck space or keep intrinsic height. |

Pages default to `sizing="fill"`. A collapsed panel always shrinks to its title band,
and the released space is redistributed. Use `fillers=False` for dense pages where
decorative LCARS blocks would compete with data.

```python
with lcars.page("Ops", layout="console", sizing="fill", fillers=False):
    with lcars.data_panel("Warp Field", weight=11, aspect="wide"):
        lcars.chart([82, 84, 87, 91])
    with lcars.data_panel("Coolant", group="eps", zone="side"):
        lcars.gauge("Flow", 72, unit="%")
    with lcars.control_panel("EPS", group="eps"):
        lcars.button("Purge", id="purge")
```

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

## Pop-ups and rich hints

`popup()` and `hint()` are overlays, not mosaic cells. They can contain recursive widget
content without changing the page's packed geometry.

```python
with lcars.popup("Transfer Details", modal=False, draggable=True, resizable=True):
    lcars.markdown("### Cargo\n\nThree containers accepted.")

lcars.button("Inspect", id="inspect")
with lcars.hint("inspect", trigger="click", placement="right"):
    lcars.metric("Core", "87%", status="ok")
```

## Arrange mode

The renderer's **Arrange** control lets a viewer drag, resize, group, or swap panels and
add persistent rows, columns, and named sections. Arrangements are stored locally per
page and screen size. **Reset** returns to the automatic mosaic. No arrangement data is
sent to Python or serialized into the manifest.

---

**See Also:** [Widgets](Widgets) · [Concepts](Concepts) · [Recipes](Recipes) · [Visual Gallery](Visual-Gallery)
