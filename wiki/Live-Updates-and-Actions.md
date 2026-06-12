# Live Updates and Actions

LCARS-WebUI apps are declared once, then handle browser actions through the same Python function. Widgets can update client-side state with `update`, emit notifications with `notify`, and append log lines with `append_log`.

## Action Handling

Input widgets return their current value when a browser action is being handled. Buttons
are different from stateful inputs: a button returns `True` only for the rerun caused by
that button click.

```python
if lcars.button("Refresh Telemetry", color="anakiwa", id="refresh"):
    lcars.update("core-output", value="91%", status="warn")
    lcars.append_log("ops-log", "Telemetry refresh requested")
    lcars.notify("Telemetry refreshed.")
```

Stateful controls return their stored value for the current browser session:

```python
autocycle = lcars.toggle("Autocycle", value=True, id="autocycle")
mode = lcars.select("Mode", ["Cruise", "Alert", "Diagnostics"], value="Cruise", id="mode")

if lcars.button("Commit", id="commit"):
    lcars.append_log("ops-log", f"mode={mode} autocycle={autocycle}")
```

Keep side effects inside the branch that should trigger them. A top-level `notify`,
`append_log`, or `update` can run during any action rerun.

## Widget Updates

Use stable ids for anything you plan to update.

```python
lcars.metric("Core Output", "87%", status="ok", id="core-output")
lcars.progress("Shield Grid", 74, id="shield-progress")

if lcars.button("Recharge Shields", id="recharge-shields"):
    lcars.update("shield-progress", value=88)
```

`update` patches fields on an existing widget in the browser. It does not create widgets;
if the id is missing from the current manifest, there is no visible browser change.

Common update fields:

| Widget | Useful fields |
| --- | --- |
| `metric` | `value`, `status`, `label`, `color` |
| `progress` | `value`, `label`, `color` |
| `gauge` | `value`, `unit`, `warn_threshold`, `crit_threshold`, `color` |
| `text` / `markdown` | `content`, `color` |
| Inputs | `value` or `checked`, depending on widget type |

## Log Streams

```python
lcars.append_log("ops-log", "ACKNOWLEDGE command accepted")
lcars.log("ops-log", title="Operations Log", max_lines=8)
```

The first argument to `append_log` is a stream id, not a widget id. It should match the
first argument to `lcars.log(...)`.

## Notifications

```python
lcars.notify("Command acknowledgement recorded.")
lcars.notify("Audio processing failed", level="error")
```

Valid levels are `info` and `error`.

## Live Polling

Use `@lcars.live` when data should update without a direct browser action.

```python
@lcars.live(interval=5.0)
def poll() -> None:
    lcars.update("shield-progress", value=72)
```

Only one `@lcars.live` callback is supported per app. Registering another raises
`RuntimeError`. Keep the callback small, and handle failures inside the callback when the
source can be unavailable.

## HTTP and WebSocket Fallback

The browser sends actions over WebSocket when available and falls back to HTTP endpoints
when needed. App code usually does not need to care; both paths drive the same handler
rerun and return an action acknowledgement.

For lower-level protocol behavior and validation boundaries, see
[[Usage Patterns and Edge Cases|Usage-Patterns-and-Edge-Cases]].
