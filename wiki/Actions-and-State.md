# Actions and State

LCARS-WebUI action handling is Python-first: browser events rerun your `ui` function with
current input values.

## Button Handlers

```python
if lcars.button("Refresh Telemetry", color="anakiwa", id="refresh"):
    lcars.update("core-output", value="91%", status="warn")
    lcars.append_log("ops-log", "Telemetry refresh requested")
    lcars.notify("Telemetry refreshed.")
```

Keep effects inside the branch that should trigger them. A top-level `notify`,
`append_log`, or `update` can run during any action rerun.

## Stateful Inputs

```python
autocycle = lcars.toggle("Autocycle", value=True, id="autocycle")
mode = lcars.select("Mode", ["Cruise", "Alert", "Diagnostics"], value="Cruise", id="mode")

if lcars.button("Commit", id="commit"):
    lcars.append_log("ops-log", f"mode={mode} autocycle={autocycle}")
```

Inputs persist per browser session by widget id. Use explicit ids.

## Updating Widgets

Give the target widget an id:

```python
lcars.metric("Core Output", "87%", status="ok", id="core-output")
lcars.progress("Shield Grid", 74, id="shield-grid")

if lcars.button("Recharge Shields", id="recharge-shields"):
    lcars.update("shield-grid", value=88)
```

`update` patches an existing widget. It does not create widgets. Updating a missing id has
no visible browser effect.

Common fields:

| Widget | Fields |
| --- | --- |
| `metric` | `value`, `status`, `label`, `color` |
| `progress` | `value`, `label`, `color`, `show_label` |
| `gauge` | `value`, `unit`, `warn_threshold`, `crit_threshold`, `color` |
| `text` and `markdown` | `content`, `color` |
| `toggle` and `checkbox` | `checked` |
| `select`, `radio`, `radio_toggle`, `text_input`, `number_input` | `value` |

## Logs

```python
lcars.log("ops-log", title="Operations Log", max_lines=100, id="ops-log-widget")
lcars.append_log("ops-log", "line routed by stream id")
```

The stream id is `ops-log`; the widget id is `ops-log-widget`.

## Notifications

```python
lcars.notify("Command acknowledgement recorded.")
lcars.notify("Audio processing failed", level="error")
```

Valid levels: `info`, `error`.

## Alert Condition

```python
if lcars.button("Red Alert", color="red", id="red-alert"):
    lcars.set_alert_condition("red")

if lcars.button("Stand Down", color="anakiwa", id="stand-down"):
    lcars.set_alert_condition("normal")
```

Valid levels: `normal`, `yellow`, `red`.

## Theme Switching

```python
theme = lcars.radio_toggle("Theme", ["galaxy", "tng", "nemesis"], value="galaxy", id="theme")

if lcars.button("Apply Theme", id="apply-theme"):
    if theme in {"galaxy", "tng", "nemesis"}:
        lcars.set_theme(theme)
```

## Forms

Forms submit several child inputs together. During form submit handling, child values are
hydrated into session state before `ui()` reruns.

```python
with lcars.form("Composite Form", action_id="commit", submit_label="Commit", id="ops-form"):
    lcars.text_input("Form Text", placeholder="entry", id="form-text")
    lcars.number_input("Form Number", value=3, min=0, max=10, id="form-number")
    lcars.toggle("Form Toggle", value=False, id="form-toggle")
```

Current caveat: `lcars.form()` is a context manager and does not return `submitted=True`.
Use normal inputs plus a button when you need a direct Python branch.

```python
operator = lcars.text_input("Operator Code", id="operator-code")
threshold = lcars.number_input("Threshold", value=5, min=0, max=10, id="threshold")

if lcars.button("Commit", color="orange", id="commit"):
    lcars.append_log("ops-log", f"{operator=} {threshold=}")
```

## Live Polling

```python
@lcars.live(interval=2.0)
def poll() -> None:
    lcars.update("core-output", value="89%", status="ok")
    lcars.append_log("ops-log", "live telemetry frame")
```

Only one live callback is supported per app. Keep it small and handle unreliable sources.

## Transport Fallbacks

The browser uses WebSocket when available, SSE for downstream fallback, and HTTP endpoints
for action/input/form fallbacks. App code normally does not need to care; the same handler
model runs either way.
