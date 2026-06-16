# Recipes

Copy these patterns into your app and adjust ids, labels, and data sources.

## Button Updates a Metric

```python
lcars.metric("Core Output", "87%", status="ok", id="core-output")
refresh_clicked = lcars.button("Refresh", id="refresh")

if refresh_clicked:
    lcars.update("core-output", value="91%", status="warn")
    lcars.notify("Telemetry refreshed.")
```

## Button Uses Current Inputs

```python
profile = lcars.select("Scan Profile", ["Local", "Sector", "Deep"], value="Sector", id="scan-profile")
gain = lcars.number_input("Sensor Gain", value=6.5, min=1.0, max=10.0, step=0.1, id="sensor-gain")
operator = lcars.text_input("Operator", placeholder="OPS-01", id="operator")
dispatch_clicked = lcars.button("Dispatch Scan", id="dispatch-scan")

if dispatch_clicked:
    name = operator.strip() or "OPS-DEFAULT"
    lcars.append_log("ops-log", f"profile={profile} gain={gain:.1f} operator={name}")
```

## Assignment-Style Command Panel

Use this style when a panel has several controls. It keeps declarations together and
handlers readable.

```python
with lcars.control_panel("Commands", id="commands"):
    scan_profile = lcars.select("Scan Profile", ["Local", "Sector", "Deep"], value="Sector", id="scan-profile")
    sensor_gain = lcars.number_input("Sensor Gain", value=6.5, min=1.0, max=10.0, step=0.1, id="sensor-gain")
    operator = lcars.text_input("Operator", placeholder="OPS-01", id="operator")

    dispatch_scan = lcars.button("Dispatch Scan", id="dispatch-scan")
    red_alert = lcars.button("Red Alert", color="red", id="red-alert")
    stand_down = lcars.button("Stand Down", color="anakiwa", id="stand-down")

    if dispatch_scan:
        name = operator.strip() or "OPS-DEFAULT"
        lcars.append_log("ops-log", f"scan={scan_profile} gain={sensor_gain:.1f} operator={name}")

    if red_alert:
        lcars.set_alert_condition("red")

    if stand_down:
        lcars.set_alert_condition("normal")
```

## Validate Choice Input

```python
allowed = ["Cruise", "Alert", "Diagnostics"]
mode = lcars.select("Mode", allowed, value="Cruise", id="mode")

if mode not in allowed:
    mode = "Cruise"

if lcars.button("Apply Mode", id="apply-mode"):
    lcars.append_log("ops-log", f"mode={mode}")
```

## Require Text Before Acting

```python
operator = lcars.text_input("Operator Code", placeholder="OPS-01", id="operator-code")

if lcars.button("Authenticate", id="authenticate"):
    code = operator.strip()
    if not code:
        lcars.notify("Operator code required.", level="error")
    else:
        lcars.notify(f"Operator {code} authenticated.")
```

## Round Numeric Input

```python
raw_decks = lcars.number_input("Deck Count", value=12, min=1, max=42, step=1, id="deck-count")
deck_count = int(round(raw_decks))

if lcars.button("Allocate", id="allocate"):
    lcars.append_log("ops-log", f"allocated_decks={deck_count}")
```

## Append to a Log

```python
lcars.log("ops-log", title="Operations Log", max_lines=50, id="ops-log-widget")

if lcars.button("Acknowledge", id="ack"):
    lcars.append_log("ops-log", "ACKNOWLEDGE command accepted")
```

## Global Alert Controls

```python
if lcars.button("Red Alert", color="red", id="red-alert"):
    lcars.set_alert_condition("red")
    lcars.notify("Red Alert!", level="error")

if lcars.button("Stand Down", color="anakiwa", id="stand-down"):
    lcars.set_alert_condition("normal")
    lcars.notify("Alert condition cleared.")
```

## Live Telemetry

```python
import itertools

levels = itertools.cycle([86, 88, 91, 89, 92])


@lcars.live(interval=2.0)
def poll() -> None:
    level = next(levels)
    lcars.update("core-output", value=f"{level}%", status="warn" if level >= 90 else "ok")
    lcars.append_log("ops-log", f"[LIVE] core={level}%")
```

## Multi-Page App

```python
lcars.nav("Overview", page="overview", color="pale-canary")
lcars.nav("Diagnostics", page="diagnostics", color="anakiwa")

with lcars.page("Overview", id="overview", layout="console"):
    with lcars.data_panel("Summary"):
        lcars.metric("Core", "Nominal")

with lcars.page("Diagnostics", id="diagnostics", layout="telemetry"):
    with lcars.data_panel("Trace"):
        lcars.chart([2, 4, 8, 16], title="Diagnostic Trace")
```

## Grouped Form

```python
with lcars.form("Configure Warp", action_id="warp-submit", submit_label="Commit", id="warp-form"):
    lcars.number_input("Warp Factor", value=5.0, min=0, max=9.99, id="warp-factor")
    lcars.toggle("Inertial Dampeners", value=True, id="dampeners")
```

Use a normal button for direct Python commit logic:

```python
warp = lcars.number_input("Warp Factor", value=5.0, min=0, max=9.99, id="warp-factor")

if lcars.button("Commit Warp", id="commit-warp"):
    lcars.append_log("ops-log", f"warp={warp:.2f}")
```

## Console Layout

```python
with lcars.page("Ops", id="ops", layout="console"):
    with lcars.data_panel("Telemetry", id="telemetry"):
        lcars.chart([1, 3, 5, 8], title="EPS Flow")

    with lcars.data_panel("Readouts", zone="side", id="readouts"):
        lcars.metric("Core", "87%", status="ok")

    with lcars.control_panel("Actions", id="actions"):
        lcars.button("Refresh", id="refresh")
```

## PADD Detail Page

```python
with lcars.page("PADD", id="padd", layout="menu"):
    with lcars.padd("Crew Transfer", color="golden-tanoi") as padd:
        with padd.column_inputs():
            lcars.button("Approve", id="approve-transfer")
        with padd.left():
            lcars.markdown("### Transfer\n\nPending command review.")
        with padd.right():
            lcars.metric("Status", "READY", status="ok")
```

## Candlestick Chart with Trade Markers

```python
ohlc = [
    {"time": "2024-01-01", "open": 100.0, "high": 110.0, "low": 95.0, "close": 105.0},
    {"time": "2024-01-02", "open": 105.0, "high": 115.0, "low": 100.0, "close": 108.0},
    {"time": "2024-01-03", "open": 108.0, "high": 109.0, "low": 100.0, "close": 102.0},
]

with lcars.data_panel("Price Action", color="pale-canary", id="price-action"):
    lcars.candlestick(
        ohlc,
        title="ES Futures",
        markers=[
            {"time": "2024-01-01", "position": "below", "shape": "arrow_up", "color": "anakiwa", "text": "BUY x4"},
            {"time": "2024-01-03", "position": "above", "shape": "arrow_down", "color": "hopbush", "text": "SELL x4"},
        ],
        up_color="anakiwa",
        down_color="hopbush",
        id="es-candles",
    )
```

Marker `position`: `"above"`, `"below"`, `"in"`. Marker `shape`: `"arrow_up"`, `"arrow_down"`, `"circle"`, `"square"`.

## Renko Bricks from a Price Series

```python
prices = [100_000, 100_420, 100_180, 100_850, 101_200, 101_050, 101_680, 102_140]

with lcars.data_panel("Trend", color="lilac", id="renko-panel"):
    lcars.renko(
        prices,
        brick_size=300.0,
        title="Equity Renko (300pt bricks)",
        up_color="pale-canary",
        down_color="hopbush",
        id="equity-renko",
    )
```

`brick_size` must be positive. Bricks render without wicks by convention.

## Animated Shader Viewport

```python
PULSE = """
void main() {
  vec2 uv = (v_uv - 0.5) * vec2(u_resolution.x / u_resolution.y, 1.0);
  float r = length(uv);
  float pulse = 0.5 + 0.5 * sin(u_time * 2.0 - r * 10.0);
  float core = smoothstep(0.9, 0.0, r) * pulse;
  gl_FragColor = vec4(u_color * (0.15 + core), 1.0);
}
"""

lcars.shader(
    PULSE,
    title="Warp Core",
    uniforms={"u_color": [0.973, 0.6, 0.0]},  # LCARS orange
    aspect_ratio=2.0,
    id="warp-core",
)
```

Built-in uniforms available in every shader: `u_time` (float, seconds), `u_resolution` (vec2, pixels), `v_uv` (varying vec2, 0–1). Shader compile errors render as an inline error banner.

---

**See Also:** [Widgets](Widgets) · [Actions and State](Actions-and-State) · [Reference](Reference)
