# Widgets

Widgets are declared inside pages and containers. Use explicit ids for anything
interactive or updated.

## Primitive Widgets

### Text

```python
lcars.text("LCARS H1 SAMPLE", size="h1", color="pale-canary", id="headline")
lcars.text("Body text sample.", size="body", id="body")
lcars.text("MONO 1701-D // 47.23", size="mono", color="lilac", id="code")
```

Text sizes: `h1`, `h2`, `body`, `mono`.

### Markdown

```python
lcars.markdown("### Report\n\n- Rendered markdown\n- Sanitized HTML", id="report")
```

Update markdown with `content`:

```python
if lcars.button("Refresh Report", id="refresh-report"):
    lcars.update("report", content="### Report\n\nComplete")
```

### Metric

```python
lcars.metric("Warp Core", "98%", status="ok", color="anakiwa", id="warp-core")
lcars.metric("Thermal", "CAUTION", status="warn", id="thermal")
lcars.metric("Fault Bus", "LOCKED", status="crit", id="fault")
```

Statuses: `ok`, `warn`, `crit`.

### Alert

```python
lcars.alert("Yellow alert simulation channel armed.", level="yellow", id="yellow-alert")
lcars.alert("Red alert banner sample.", level="red", blink=True, id="red-banner")
```

Use `set_alert_condition` when the whole interface should change alert tint.

### Progress

```python
lcars.progress("Shield Grid", 74, color="anakiwa", id="shield-grid")
```

Pass values in the 0 to 100 range. Clamp your source value if it can exceed that range.

### Header

```python
lcars.header("Operational Summary", size="h3", color="pale-canary", id="ops-header")
```

## Data Widgets

### Chart and Sparkline

```python
lcars.chart([18, 21, 26, 34], title="EPS Flow", color="anakiwa", id="eps-flow")

lcars.chart(
    {
        "EPS A": [18, 21, 26, 34],
        "EPS B": [12, 17, 24, 29],
    },
    title="EPS Comparison",
    id="eps-comparison",
)

lcars.sparkline([4, 7, 6, 9, 12], title="Sensor Gain", id="sensor-gain-trace")
```

Accepted chart data:

- Numeric list.
- Dictionary of named numeric lists.
- pandas `DataFrame`.
- pandas `Series`.

Dictionary series should use matching lengths for predictable chart alignment.

### Gauge

```python
lcars.gauge(
    "Deflector Load",
    72.4,
    unit="%",
    warn_threshold=75,
    crit_threshold=90,
    color="orange",
    id="deflector-load",
)
```

Choose a value inside `min` and `max`; gauges do not clamp automatically.

### Table

```python
rows = [
    {"System": "Warp Core", "State": "Nominal", "Load": "87%"},
    {"System": "Computer", "State": "Synced", "Load": "42%"},
]

lcars.table(rows, title="System Matrix", id="system-matrix")
```

For `list[dict]`, headers come from the first row. Missing keys in later rows render as
empty cells. Extra keys in later rows are ignored unless they appear in the first row.

## Input Widgets

### Button

```python
if lcars.button("Execute", color="orange", id="execute"):
    lcars.notify("Execute pressed.")
```

Buttons are momentary. They return `True` only during the handler rerun caused by that
click.

### Toggle and Checkbox

```python
autocycle = lcars.toggle("Autocycle", value=True, color="hopbush", id="autocycle")
interlock = lcars.checkbox("Safety Interlock", value=True, color="lilac", id="interlock")
```

The `value=` argument is the initial fallback. Browser-session state wins after the user
changes the control.

### Select, Radio, and Radio Toggle

```python
mode = lcars.select("Mode", ["Cruise", "Alert", "Diagnostics"], value="Cruise", id="mode")
band = lcars.radio("Band", ["A", "B", "C"], value="B", id="band")
gain = lcars.radio_toggle("Gain", ["Low", "Mid", "High"], value="Mid", id="gain")
```

If `value` is omitted, the first option is the default. If `options` is empty, the return
value is `""`.

The browser only offers declared options, but custom clients can send arbitrary strings.
Validate important choices before acting.

### Text Input

```python
operator = lcars.text_input("Operator Code", placeholder="OPS-01", id="operator-code")

if lcars.button("Authenticate", id="authenticate"):
    code = operator.strip()
    if not code:
        lcars.notify("Operator code required.", level="error")
```

`password=True` masks browser display but is not encrypted secret storage.

### Number Input

```python
threshold = lcars.number_input(
    "Threshold",
    value=5.5,
    min=0,
    max=9.99,
    step=0.1,
    id="threshold",
)
```

`number_input` returns a `float`. Invalid submitted values fall back to the previous
numeric value. New values are clamped to `min` and `max` when set.

### Form

```python
with lcars.form("Configure Warp", action_id="warp-submit", submit_label="Commit", id="warp-form"):
    lcars.number_input("Warp Factor", value=5.0, min=0, max=9.99, id="warp-factor")
    lcars.toggle("Inertial Dampeners", value=True, id="dampeners")
```

Forms group child input payloads and hydrate child state. A form can contain only input
widgets. `lcars.form()` does not currently return a submit flag; use a normal button when
you need a direct Python branch.

## Media Widgets

### Log

```python
lcars.log("ops-log", title="Operations Log", max_lines=50, id="ops-log-widget")

if lcars.button("Acknowledge", id="ack"):
    lcars.append_log("ops-log", "ACKNOWLEDGE command accepted")
```

`append_log` targets the stream id, not the widget id.

### HLS Video

```python
lcars.video_hls("/media/demo/manifest.m3u8", title="Local HLS", muted=True, id="video")
```

Use app-local or explicitly allowed HLS manifests.

### Microphone Button

```python
lcars.mic_button("voice-command", title="Voice Command", id="voice-command-button")
```

Browser microphone access requires HTTPS except on localhost.
