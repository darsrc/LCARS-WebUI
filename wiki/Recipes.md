# Recipes

These are copyable patterns for common LCARS-WebUI tasks.

## Button Updates a Metric

```python
lcars.metric("Core Output", "87%", status="ok", id="core-output")

if lcars.button("Refresh", id="refresh"):
    lcars.update("core-output", value="91%", status="warn")
    lcars.notify("Telemetry refreshed.")
```

## Button Uses Current Input Values

```python
profile = lcars.select("Scan Profile", ["Local", "Sector", "Deep"], value="Sector", id="scan-profile")
gain = lcars.number_input("Sensor Gain", value=6.5, min=1.0, max=10.0, step=0.1, id="sensor-gain")
operator = lcars.text_input("Operator", placeholder="OPS-01", id="operator")

if lcars.button("Dispatch Scan", id="dispatch-scan"):
    name = operator.strip() or "OPS-DEFAULT"
    lcars.append_log("ops-log", f"profile={profile} gain={gain:.1f} operator={name}")
```

## Validate a Select Value

The browser only offers declared options, but custom clients can send arbitrary strings.

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

## Clamp or Round Number Values

`number_input` converts to `float` and clamps submitted min/max. Round yourself when the
domain wants whole numbers.

```python
raw_decks = lcars.number_input("Deck Count", value=12, min=1, max=42, step=1, id="deck-count")
deck_count = int(round(raw_decks))

if lcars.button("Allocate", id="allocate"):
    lcars.append_log("ops-log", f"allocated_decks={deck_count}")
```

## Append to a Log Stream

```python
lcars.log("ops-log", title="Operations Log", max_lines=50, id="ops-log-widget")

if lcars.button("Acknowledge", id="ack"):
    lcars.append_log("ops-log", "ACKNOWLEDGE command accepted")
```

The stream id is `ops-log`. The widget id is `ops-log-widget`.

## Toggle Global Alert Condition

```python
if lcars.button("Red Alert", color="red", id="red-alert"):
    lcars.set_alert_condition("red")
    lcars.notify("Red Alert!", level="error")

if lcars.button("Stand Down", color="anakiwa", id="stand-down"):
    lcars.set_alert_condition("normal")
    lcars.notify("Alert condition cleared.")
```

## Switch Theme Live

```python
theme = lcars.radio_toggle("Theme", ["galaxy", "tng", "nemesis"], value="galaxy", id="theme")

if lcars.button("Apply Theme", id="apply-theme"):
    if theme in {"galaxy", "tng", "nemesis"}:
        lcars.set_theme(theme)
```

## Live Telemetry Polling

```python
import itertools

levels = itertools.cycle([86, 88, 91, 89, 92])


@lcars.live(interval=2.0)
def poll() -> None:
    level = next(levels)
    lcars.update("core-output", value=f"{level}%", status="warn" if level >= 90 else "ok")
    lcars.append_log("ops-log", f"[LIVE] core={level}%")
```

Only one `@lcars.live` callback is supported per app.

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

## Use a Form for Grouped Submission

Forms group child payloads and hydrate child input state. They do not currently return a
submit flag.

```python
with lcars.form("Configure Warp", action_id="warp-submit", submit_label="Commit", id="warp-form"):
    lcars.number_input("Warp Factor", value=5.0, min=0, max=9.99, id="warp-factor")
    lcars.toggle("Inertial Dampeners", value=True, id="dampeners")
```

Use a normal button when you need a direct Python branch:

```python
warp = lcars.number_input("Warp Factor", value=5.0, min=0, max=9.99, id="warp-factor")

if lcars.button("Commit Warp", id="commit-warp"):
    lcars.append_log("ops-log", f"warp={warp:.2f}")
```

## Layout: Data Plus Controls

```python
with lcars.page("Ops", id="ops", layout="console"):
    with lcars.data_panel("Telemetry", id="telemetry"):
        lcars.chart([1, 3, 5, 8], title="EPS Flow")

    with lcars.data_panel("Readouts", zone="side", id="readouts"):
        lcars.metric("Core", "87%", status="ok")

    with lcars.control_panel("Actions", id="actions"):
        lcars.button("Refresh", id="refresh")
```

## Layout: PADD Detail Page

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
