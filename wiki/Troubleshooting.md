# Troubleshooting

## `ModuleNotFoundError: No module named 'lcars_ui'`

Install from `lcars-ui/`:

```bash
cd LCARS-WebUI/lcars-ui
pip install -e ".[dev]"
```

Or run source examples with:

```bash
PYTHONPATH=src python examples/dashboard.py
```

## Port Already in Use

```python
lcars.run(ui, port=8010)
```

For examples:

```bash
LCARS_PORT=8010 PYTHONPATH=src python examples/dashboard.py
```

## Button Branch Never Runs

Use a stable explicit id:

```python
if lcars.button("Refresh", id="refresh"):
    lcars.notify("Refresh clicked.")
```

Check that custom clients send the same action id.

## Input Keeps Resetting

Likely cause: the widget id changed between runs.

```python
gain = lcars.number_input("Sensor Gain", value=5.0, id="sensor-gain")
```

## Duplicate Widget ID

Every widget id must be unique in one `ui()` call.

```python
lcars.metric("Core", "OK", id="core-status")
lcars.progress("Core Load", 72, id="core-load")
```

## `lcars.update` Does Nothing

Check that:

- The target widget exists in the current manifest.
- The target has an explicit id.
- The update is inside a button branch or live callback.
- The field name matches the widget model.

```python
lcars.metric("Core Output", "87%", id="core-output")

if lcars.button("Refresh", id="refresh"):
    lcars.update("core-output", value="91%")
```

## Notification Appears on Unrelated Actions

Move effects under the relevant action branch:

```python
if lcars.button("Acknowledge", id="ack"):
    lcars.notify("Acknowledged.")
```

## Form Rejects a Widget

Forms can contain input widgets only. Move display widgets outside.

```python
lcars.text("Configure warp parameters")

with lcars.form("Warp", action_id="warp-submit", id="warp-form"):
    lcars.number_input("Warp Factor", id="warp-factor")
```

## Need Code on Form Submit

`lcars.form()` does not currently return a submit flag. Use inputs and a button.

```python
warp = lcars.number_input("Warp Factor", value=5.0, id="warp-factor")

if lcars.button("Commit Warp", id="commit-warp"):
    lcars.append_log("ops-log", f"warp={warp:.2f}")
```

## Chart Data Fails

Valid:

```python
lcars.chart([1, 2, 3], title="Valid")
lcars.chart({"A": [1, 2], "B": [2, 3]}, title="Also Valid")
```

Chart lists must be numeric.

## Table Columns Missing

For `list[dict]`, table headers come from the first row. Put every desired column in the
first row.

```python
rows = [
    {"System": "Warp Core", "State": "Nominal", "Load": "87%"},
    {"System": "Computer", "State": "Synced", "Load": "42%"},
]
```

## Second `@lcars.live` Raises `RuntimeError`

Only one live callback is supported. Combine periodic work.

```python
@lcars.live(interval=5.0)
def poll() -> None:
    update_core()
    update_log()
```

## Live Callback Errors Are Hard to See

Catch unreliable sources yourself:

```python
@lcars.live(interval=5.0)
def poll() -> None:
    try:
        value = read_sensor()
    except Exception as exc:
        lcars.append_log("ops-log", f"sensor read failed: {exc}")
        return
    lcars.update("sensor", value=str(value))
```

## Mic Button Does Not Work

Microphone access requires HTTPS except on localhost. Make sure `/lcars/upload/audio` is
allowed by your proxy.

## WebSocket Does Not Connect

Verify the reverse proxy forwards upgrades for `/lcars/ws`. SSE and HTTP fallbacks can
keep the app usable, but WebSocket should be available.

## GitHub Wiki Looks Stale

GitHub Wikis are separate git repositories. Updating a checked-in `wiki/` directory in
the main repo does not update the live Wiki tab. Push to:

```bash
https://github.com/darsrc/LCARS-WebUI.wiki.git
```

---

**See Also:** [Getting Started](Getting-Started) · [Deployment](Deployment) · [Reference](Reference)
