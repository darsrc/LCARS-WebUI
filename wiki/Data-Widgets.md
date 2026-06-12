# Data Widgets

Data widgets render telemetry, tables, and numeric status values using LCARS panel geometry.

![Data readouts](images/data-readouts-panel.png)

## `chart`

Use `chart` for line-series telemetry. It accepts a numeric list, a dictionary of named
numeric series, a pandas `DataFrame`, or a pandas `Series`.

```python
power_series = {
    "EPS A": [18, 21, 26, 34, 42, 51, 57, 61, 67, 64, 70, 74],
    "EPS B": [12, 17, 24, 29, 35, 43, 46, 52, 49, 58, 62, 68],
}

lcars.chart(power_series, title="EPS Flow", color="anakiwa")
```

Edge notes:

- A list must contain numbers.
- An empty list renders an empty `series`.
- Dict keys become series names.
- Dict series should use matching lengths for predictable chart alignment.
- DataFrame columns become series and the DataFrame index becomes x-axis labels.

## `sparkline`

Use `sparkline` for compact telemetry traces.

```python
lcars.sparkline([4, 7, 6, 9, 12, 10, 13, 16], title="Sensor Gain")
```

`sparkline` uses the same data adapter as `chart`, so the same input rules apply.

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

Choose a `value` inside the declared `min` and `max` range. The DSL stores the numeric
value you provide; it does not clamp gauge values for you.

## `table`

Use `table` for row and column data. It accepts a list of dictionaries, a list of lists or
tuples, a flat list, or a pandas `DataFrame`.

```python
rows = [
    {"System": "Warp Core", "State": "Nominal", "Load": "87%"},
    {"System": "Deflector", "State": "Aligned", "Load": "64%"},
    {"System": "Computer", "State": "Synced", "Load": "42%"},
]

lcars.table(rows, title="System Matrix")
```

Edge notes:

- For `list[dict]`, headers come from the first dictionary's keys.
- Missing keys in later rows render as empty cells.
- Extra keys in later rows are ignored unless they also appear in the first row.
- For `list[list]` or `list[tuple]`, headers are generated as `col_0`, `col_1`, and so on.
- A flat list renders as a single `value` column.
- An empty list renders an empty table.

For stable live updates, give the table an explicit id:

```python
lcars.table(rows, title="System Matrix", id="system-matrix")
```

## Telemetry Example

![Telemetry panel](images/telemetry-panel.png)
