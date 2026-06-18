# Widgets

Widgets are declared inside pages and containers. Use explicit ids for anything
interactive or updated.

**Contents:** [Primitive](#primitive-widgets) · [Data](#data-widgets) · [Inputs](#input-widgets) · [Media](#media-widgets)

| Category | Widgets |
|---|---|
| Primitive | `text`, `markdown`, `metric`, `alert`, `progress`, `header` |
| Data | `chart`, `sparkline`, `gauge`, `table`, `candlestick` (v3), `renko` (v3), `shader` (v3) |
| Inputs | `button`, `toggle`, `checkbox`, `select`, `radio`, `radio_toggle`, `text_input`, `number_input`, `form` |
| Media | `log`, `video_hls`, `mic_button` |

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

### Candlestick Chart (v3)

Zoomable, pannable OHLC candlestick chart powered by TradingView's `lightweight-charts`.

```python
import lcars_ui as lcars

ohlc = [
    {"time": "2024-01-01", "open": 100.0, "high": 110.0, "low": 95.0, "close": 105.0},
    {"time": "2024-01-02", "open": 105.0, "high": 115.0, "low": 100.0, "close": 108.0},
]

lcars.candlestick(
    ohlc,
    title="ES Futures",
    up_color="anakiwa",
    down_color="hopbush",
    id="es-candles",
)
```

Attach trade markers to any bar:

```python
lcars.candlestick(
    ohlc,
    title="ES Futures",
    markers=[
        {"time": "2024-01-01", "position": "below", "shape": "arrow_up", "color": "anakiwa", "text": "BUY x4"},
        {"time": "2024-01-02", "position": "above", "shape": "arrow_down", "color": "hopbush", "text": "SELL x4"},
    ],
    id="es-candles-marked",
)
```

Marker `position`: `"above"`, `"below"`, `"in"`. Marker `shape`: `"arrow_up"`, `"arrow_down"`, `"circle"`, `"square"`.

**Data formats accepted:** `list[dict]` with keys `time/open/high/low/close` (optional `volume`), or a pandas
`DataFrame` with matching columns and a `DatetimeIndex`. If `time` is missing in a dict row it defaults to
the row index.

### Renko Chart (v3)

Renko bricks are computed server-side from a flat price series; no OHLC data required.

```python
price_series = [100000, 100420, 100180, 100850, 101200, 101050, 101680, 102140]

lcars.renko(
    price_series,
    brick_size=300.0,      # price movement per brick
    title="Equity Renko",
    up_color="pale-canary",
    down_color="hopbush",
    id="equity-renko",
)
```

`data` accepts `list[float]`, `list[dict]` with a `"close"` or `"price"` key, or a pandas `Series`. Bricks
render without wicks by convention. Markers work exactly like on `candlestick`.

### Shader Viewport (v3)

Runs a GLSL ES 1.00 fragment shader on the GPU, producing animated real-time graphics.

```python
WARP_GLOW = """
void main() {
  vec2 uv = (v_uv - 0.5) * vec2(u_resolution.x / u_resolution.y, 1.0);
  float r = length(uv);
  float pulse = 0.5 + 0.5 * sin(u_time * 2.0 - r * 10.0);
  float core = smoothstep(0.9, 0.0, r) * pulse;
  gl_FragColor = vec4(u_color * (0.15 + core), 1.0);
}
"""

lcars.shader(
    WARP_GLOW,
    title="Warp Core",
    uniforms={"u_color": [0.973, 0.6, 0.0]},  # orange glow
    aspect_ratio=2.0,
    id="warp-core",
)
```

**Built-in uniforms** (always available, no declaration needed):
| Uniform | Type | Value |
|---------|------|-------|
| `u_time` | `float` | Seconds since widget mounted |
| `u_resolution` | `vec2` | Canvas size in physical pixels |
| `v_uv` | `vec2` (varying) | UV coords in [0, 1] |

**Custom uniforms** via the `uniforms` dict:
- Single `float` → `uniform float name;`
- `list[float]` of length 2/3/4 → `uniform vec2/vec3/vec4 name;`

GLSL shader compile/link errors render as an inline error banner without crashing the page.

## Input Widgets

### Button

```python
execute_clicked = lcars.button("Execute", color="orange", id="execute")

if execute_clicked:
    lcars.notify("Execute pressed.")
```

Buttons are momentary. They return `True` only during the handler rerun caused by that
click.

For very small handlers, inline style is also valid:

```python
if lcars.button("Acknowledge", id="ack"):
    lcars.append_log("ops-log", "ACKNOWLEDGE command accepted")
```

### Toggle and Checkbox

```python
autocycle = lcars.toggle("Autocycle", value=True, color="hopbush", id="autocycle")
interlock = lcars.checkbox("Safety Interlock", value=True, color="lilac", id="interlock")
commit_clicked = lcars.button("Commit", id="commit")

if commit_clicked:
    lcars.append_log("ops-log", f"autocycle={autocycle} interlock={interlock}")
```

The `value=` argument is the initial fallback. Browser-session state wins after the user
changes the control.

### Select, Radio, and Radio Toggle

```python
mode = lcars.select("Mode", ["Cruise", "Alert", "Diagnostics"], value="Cruise", id="mode")
band = lcars.radio("Band", ["A", "B", "C"], value="B", id="band")
gain = lcars.radio_toggle("Gain", ["Low", "Mid", "High"], value="Mid", id="gain")
apply_clicked = lcars.button("Apply Mode", id="apply-mode")

if apply_clicked:
    lcars.append_log("ops-log", f"mode={mode} band={band} gain={gain}")
```

If `value` is omitted, the first option is the default. If `options` is empty, the return
value is `""`.

The browser only offers declared options, but custom clients can send arbitrary strings.
Validate important choices before acting.

### Text Input

```python
operator = lcars.text_input("Operator Code", placeholder="OPS-01", id="operator-code")
authenticate_clicked = lcars.button("Authenticate", id="authenticate")

if authenticate_clicked:
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
apply_threshold = lcars.button("Apply Threshold", id="apply-threshold")

if apply_threshold:
    lcars.append_log("ops-log", f"threshold={threshold:.1f}")
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

```python
warp = lcars.number_input("Warp Factor", value=5.0, min=0, max=9.99, id="warp-factor")
dampeners = lcars.toggle("Inertial Dampeners", value=True, id="dampeners")
commit_warp = lcars.button("Commit Warp", id="commit-warp")

if commit_warp:
    lcars.append_log("ops-log", f"warp={warp:.2f} dampeners={dampeners}")
```

## Media Widgets

### Log

```python
lcars.log("ops-log", title="Operations Log", max_lines=50, id="ops-log-widget")

if lcars.button("Acknowledge", id="ack"):
    lcars.append_log("ops-log", "ACKNOWLEDGE command accepted")
```

`append_log` targets the stream id, not the widget id.

The viewer follows new lines automatically while the reader is already
scrolled to the bottom; scrolling up to read history suspends following
until they scroll back down. Set `auto_scroll=False` to disable following
entirely:

```python
lcars.log("ops-log", title="Operations Log", auto_scroll=False, id="ops-log-widget")
```

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

**Push-to-talk (default).** Click to start recording, click again (or wait
`timeout_ms`, default 5000ms) to stop. The clip uploads automatically and
your `action_id` handler fires once the upload completes.

**Hands-free / continuous.** Set `continuous=True` to get an always-listening
mic — click once to arm it, then no further clicks are needed. The widget
watches the microphone's volume and automatically detects when someone
starts and stops talking (voice activity detection), uploading each
"utterance" the moment it ends and immediately re-listening for the next
one, with no repeated permission prompt:

```python
lcars.mic_button(
    "voice-command",
    title="Hands-Free Listening",
    continuous=True,
    silence_ms=900,
    id="voice-command-button",
)
```

`silence_ms` controls how long a pause must last before the widget decides
an utterance is finished — lower is snappier but may cut off a speaker
mid-thought, higher is more forgiving but adds latency. `timeout_ms` doubles
as a safety cap in continuous mode: if someone talks past it without ever
pausing, the widget force-stops and uploads anyway (it must be set to at
least `silence_ms`). Uploads still go to whatever `upload_url` you configure,
so pointing continuous mode at your own speech-to-text/dispatch backend
works exactly like push-to-talk — only the upload cadence changes.

---

**See Also:** [Layouts](Layouts) · [Actions and State](Actions-and-State) · [Recipes](Recipes) · [Reference](Reference)
