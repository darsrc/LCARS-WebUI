# Live Updates and Actions

LCARS-WebUI apps are declared once, then handle browser actions through the same Python function. Widgets can update client-side state with `update`, emit notifications with `notify`, and append log lines with `append_log`.

## Action Handling

Input widgets return their current value when the matching browser action is being handled.

```python
if lcars.button("Refresh Telemetry", color="anakiwa", id="refresh"):
    lcars.update("core-output", value="91%", status="warn")
    lcars.append_log("ops-log", "Telemetry refresh requested")
    lcars.notify("Telemetry refreshed.")
```

## Widget Updates

Use stable ids for anything you plan to update.

```python
lcars.metric("Core Output", "87%", status="ok", id="core-output")
lcars.progress("Shield Grid", 74, id="shield-progress")

lcars.update("shield-progress", value=88)
```

## Log Streams

```python
lcars.append_log("ops-log", "ACKNOWLEDGE command accepted")
lcars.log("ops-log", title="Operations Log", max_lines=8)
```

## Notifications

```python
lcars.notify("Command acknowledgement recorded.")
lcars.notify("Audio processing failed", level="error")
```

## Live Polling

Use `@lcars.live` when data should update without a direct browser action.

```python
@lcars.live(interval=5.0)
def poll() -> None:
    lcars.update("shield-progress", value=72)
```

