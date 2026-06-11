# Data Widgets

Data widgets render telemetry, tables, and numeric status values using LCARS panel geometry.

![Data readouts](images/data-readouts-panel.png)

## `chart`

Use `chart` for line-series telemetry. It accepts a list or a dictionary of named series.

```python
power_series = {
    "EPS A": [18, 21, 26, 34, 42, 51, 57, 61, 67, 64, 70, 74],
    "EPS B": [12, 17, 24, 29, 35, 43, 46, 52, 49, 58, 62, 68],
}

lcars.chart(power_series, title="EPS Flow", color="anakiwa")
```

## `sparkline`

Use `sparkline` for compact telemetry traces.

```python
lcars.sparkline([4, 7, 6, 9, 12, 10, 13, 16], title="Sensor Gain")
```

## `gauge`

Use `gauge` for bounded numeric readouts. Thresholds change the visual state.

```python
lcars.gauge(
    "Containment",
    91,
    unit="%",
    warn_threshold=70,
    crit_threshold=90,
)
```

## `table`

Use `table` for row and column data.

```python
rows = [
    {"System": "Warp Core", "State": "Nominal", "Load": "87%"},
    {"System": "Deflector", "State": "Aligned", "Load": "64%"},
    {"System": "Computer", "State": "Synced", "Load": "42%"},
]

lcars.table(rows, title="System Matrix")
```

## Telemetry Example

![Telemetry panel](images/telemetry-panel.png)

