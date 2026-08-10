# Troubleshooting

## `ModuleNotFoundError: No module named 'lcars_ui'`

Install from `lcars-ui/`:

```bash
cd LCARS-WebUI/lcars-ui
pip install -e ".[dev]"
```

Or run source examples with:

```bash
PYTHONPATH=src python examples/bridge_ops/app.py
```

## Port Already in Use

```python
lcars.run(ui, port=8010)
```

For examples:

```python
lcars.run(ui, port=8010)
```

`LCARS_PORT` affects an application only if that application reads it and passes the
value to `lcars.run()`.

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

## File Upload Returns No Files

`file_upload()` returns files only during the action rerun triggered after a successful
upload. Iterate the return value in `ui()` and consume bytes immediately:

```python
files = lcars.file_upload("Data", id="data-upload")
for uploaded in files:
    save_upload(uploaded.name, uploaded.read())
```

Check the widget's `max_bytes`/`max_files`, the server's
`LCARS_MAX_FILE_UPLOAD_BYTES`, proxy body limits, and access to `/lcars/upload/files`.

## Three.js Scene Does Not Load

Pass the module directory to `run()` and use the mounted URL:

```python
lcars.three_scene("scenes/scene.js")
lcars.run(ui, assets_dir="./assets")
```

Verify the module exists under that directory and inspect the inline scene error. The
mount is read-only and will not serve paths outside its root.

## Rich Hint Has No Content

Attach a hint after its target. With no explicit target, `hint()` uses the most recently
declared widget:

```python
lcars.button("Inspect", id="inspect")
with lcars.hint("inspect", trigger="click"):
    lcars.text("Detail")
```

`show_hint()` and `hide_hint()` are intended for hints declared with
`trigger="manual"`.

## A The Web Widget Rejects Data

The Web widgets validate enum values and required nested fields. Check the payload against
[The Web](The-Web), or construct the exported typed model (`SupportData`, `FrontierData`,
and so on) close to the data source to surface validation errors earlier.

Remember the intentional empty states: no support is `environments=[]`,
support-independent is one empty environment, and `contenders=[]` is valid.

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
