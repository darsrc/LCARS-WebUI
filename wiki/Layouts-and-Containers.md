# Layouts and Containers

LCARS-WebUI favors composed LCARS geometry over generic card layouts. Use containers to shape the page before adding widgets.

![Layout containers](images/layout-containers.png)

## `box`

Use `box` for a framed content region with optional side/input regions.

```python
with lcars.box("Display Widgets", subtitle="Readouts", color="pale-canary") as box:
    with box.main():
        lcars.header("Text and Markdown", size="h3")
        lcars.text("LCARS H1 SAMPLE", size="h1")

    with box.side():
        lcars.metric("Ready", "TRUE", status="ok")
        lcars.progress("Decode", 42)
```

## `console`

Use `console` for a full command-console composition with header, input column, and left/right content regions.

```python
with lcars.console("Command Console", color="pale-canary") as console:
    with console.header():
        lcars.header("Operational Summary", size="h3")

    with console.column_inputs():
        lcars.button("Acknowledge")
        lcars.toggle("Autocycle", value=True)

    with console.left():
        lcars.metric("Core Output", "87%", status="ok")

    with console.right():
        lcars.chart([1, 3, 5, 8], title="EPS Flow")
```

## `sweep`

Use `sweep` for LCARS sweep geometry with explicit regions.

![Sweep container](images/sweep-container.png)

```python
with lcars.sweep("Reverse Sweep", subtitle="Explicit Regions", reverse=True) as sweep:
    with sweep.header():
        lcars.header("Sweep Header Slot", size="h4")
    with sweep.column_inputs():
        lcars.button("Sweep Input")
    with sweep.left():
        lcars.text("Left sweep content")
    with sweep.right():
        lcars.text("Right sweep content")
```

## `padd`

Use `padd` for a compact PADD-style recipe.

![PADD container](images/padd-container.png)

```python
with lcars.padd("PADD Recipe", color="golden-tanoi") as padd:
    with padd.column_inputs():
        lcars.button("PADD Action")
    with padd.left():
        lcars.text("PADD left region")
    with padd.right():
        lcars.metric("PADD Status", "ONLINE")
```

## `diagnostic`

Use `diagnostic` for diagnostic panels with input rails and data areas.

![Diagnostic container](images/diagnostic-container.png)

```python
with lcars.diagnostic("Diagnostic Recipe", color="blue") as diag:
    with diag.left_inputs():
        lcars.button("Left Input")
    with diag.right_inputs():
        lcars.button("Right Input")
    with diag.main():
        lcars.chart([2, 4, 8, 16, 12, 18], title="Diagnostic Trace")
    with diag.side():
        lcars.metric("Diagnostic", "PASS", status="ok")
```

## `bracket`, `row`, `col`, and `columns`

Use brackets for LCARS grouping and rows/columns for explicit layout splits.

```python
with lcars.row(height="auto"):
    with lcars.col("1fr"):
        with lcars.bracket(color="anakiwa", orientation="left"):
            lcars.text("Left bracket")

    with lcars.col("1fr"):
        with lcars.bracket(color="hopbush", orientation="right"):
            lcars.text("Right bracket")
```

