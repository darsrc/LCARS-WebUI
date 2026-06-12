# Troubleshooting

This page collects common LCARS-WebUI problems and the shortest reliable fixes.

## Install Problems

### `ModuleNotFoundError: No module named 'lcars_ui'`

Install the package from `lcars-ui/`:

```bash
cd LCARS-WebUI/lcars-ui
pip install -e ".[dev]"
```

When running examples from the source tree without installing, set `PYTHONPATH=src`:

```bash
PYTHONPATH=src python examples/dashboard.py
```

### Port already in use

Choose another port:

```python
lcars.run(ui, port=8010)
```

Or with examples that read `LCARS_PORT`:

```bash
LCARS_PORT=8010 PYTHONPATH=src python examples/dashboard.py
```

## Widget Problems

### Button branch never runs

Likely causes:

- The button id changed.
- A custom client sent the wrong action id.
- The code checks the wrong button result.

Fix:

```python
if lcars.button("Refresh", id="refresh"):
    lcars.notify("Refresh clicked.")
```

Use an explicit stable `id`.

### Input keeps resetting

Likely cause: the widget id changes between runs, often because the label changed and no
explicit `id` was provided.

Fix:

```python
gain = lcars.number_input("Sensor Gain", value=5.0, id="sensor-gain")
```

### Duplicate widget id error

Each widget id must be unique in a single UI function call.

```python
lcars.metric("Core", "OK", id="core-status")
lcars.progress("Core Load", 72, id="core-load")
```

### `lcars.update` appears to do nothing

Check that:

- The target widget exists in the manifest.
- The target has an explicit id.
- The update is inside a button branch or live callback.
- The field name matches the widget model, such as `value`, `status`, `content`, or `checked`.

```python
lcars.metric("Core Output", "87%", id="core-output")

if lcars.button("Refresh", id="refresh"):
    lcars.update("core-output", value="91%")
```

### Notification appears on unrelated actions

Effects at top level can run during any action rerun. Put them under the relevant action.

```python
if lcars.button("Acknowledge", id="ack"):
    lcars.notify("Acknowledged.")
```

## Form Problems

### `lcars.form() can only contain input widgets`

Forms can contain input widgets only. Move text, charts, metrics, and logs outside the
form.

```python
lcars.text("Configure warp parameters")

with lcars.form("Warp", action_id="warp-submit", id="warp-form"):
    lcars.number_input("Warp Factor", id="warp-factor")
```

### Need to run code when a form is submitted

Current caveat: `lcars.form()` does not return a submit flag. If you need direct Python
handler logic, use normal inputs and a button.

```python
warp = lcars.number_input("Warp Factor", value=5.0, id="warp-factor")

if lcars.button("Commit Warp", id="commit-warp"):
    lcars.append_log("ops-log", f"warp={warp:.2f}")
```

## Data Problems

### Chart data fails

`chart` and `sparkline` accept numeric lists, dictionaries of numeric lists, pandas
`DataFrame`, or pandas `Series`.

```python
lcars.chart([1, 2, 3], title="Valid")
lcars.chart({"A": [1, 2], "B": [2, 3]}, title="Also Valid")
```

Strings in a chart list raise a type error.

### Table columns are missing

For `list[dict]`, headers come from the first row's keys. Extra keys in later rows are
ignored.

Make the first row include every column you want:

```python
rows = [
    {"System": "Warp Core", "State": "Nominal", "Load": "87%"},
    {"System": "Computer", "State": "Synced", "Load": "42%"},
]
```

## Live Update Problems

### Second `@lcars.live` raises `RuntimeError`

Only one live callback is supported. Combine periodic work into one function.

```python
@lcars.live(interval=5.0)
def poll() -> None:
    update_core()
    update_log()
```

### Live callback errors are hard to see

Keep live callbacks small and catch failures around unreliable sources.

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

## Browser and Deployment Problems

### Mic button does not work

Microphone access requires HTTPS except on localhost. Deploy behind HTTPS and make sure
the upload route is allowed by your proxy.

### WebSocket does not connect

Verify the reverse proxy forwards WebSocket upgrades for `/lcars/ws`. The browser can use
SSE and HTTP fallbacks, but WebSocket should be available for the best experience.

### Browser shows old frontend behavior

If you changed frontend source, rebuild package assets:

```bash
cd lcars-ui
make frontend-bundle
```

Then restart the app and hard-refresh the browser.
