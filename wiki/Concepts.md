# Concepts

LCARS-WebUI has a small mental model. Once this model is clear, the library becomes much
easier to use.

## Architecture

| Part | Purpose |
| --- | --- |
| Python DSL | Functions such as `lcars.page`, `lcars.metric`, and `lcars.button` declare the UI. |
| Manifest | JSON description of pages, rows, columns, panels, widgets, and metadata. |
| FastAPI server | Serves the app shell, manifest, schema, WebSocket, SSE, and HTTP fallback endpoints. |
| Browser frontend | Renders LCARS geometry and sends actions back to the server. |
| Event bus | Delivers updates, notifications, logs, and acknowledgements to connected clients. |

## Build and Handle

On startup, `lcars.run(ui)` calls your `ui` function in build mode. Widgets are added to
the manifest. Inputs return defaults.

When the browser sends an action, the same `ui` function runs again in handle mode. Input
widgets return current values for that browser session. `button()` returns `True` only
for the click currently being handled.

```python
def ui() -> None:
    gain = lcars.number_input("Sensor Gain", value=5.0, id="sensor-gain")

    if lcars.button("Apply Gain", id="apply-gain"):
        lcars.append_log("ops-log", f"gain={gain:.1f}")
```

## Widget IDs

Widget ids are the operational contract. They route actions, persist input state, target
updates, and hydrate form values.

Use explicit ids for:

- Buttons and inputs.
- Widgets you update with `lcars.update(...)`.
- Log widgets and form children.
- Anything whose label might change later.

```python
lcars.metric("Core Output", "87%", id="core-output")

if lcars.button("Refresh", id="refresh"):
    lcars.update("core-output", value="91%")
```

If you omit `id`, LCARS-WebUI derives one from the label. That is convenient for
experiments, but label changes will change the generated id and reset browser-session
state.

Duplicate explicit ids in one `ui()` call raise `ValueError`.

## Pages and Navigation

```python
lcars.nav("Overview", page="overview", color="pale-canary")
lcars.nav("Diagnostics", page="diagnostics", color="anakiwa")

with lcars.page("Overview", id="overview", layout="console"):
    ...

with lcars.page("Diagnostics", id="diagnostics", layout="telemetry"):
    ...
```

`page=` on `nav` should match the `id` on `page`.

## Layout Archetypes

| Layout | Shape | Best for |
| --- | --- | --- |
| `auto` | Renderer chooses from page content. | Prototyping. |
| `console` | Primary lane, side rail, control dock. | Operational dashboards. |
| `telemetry` | Dominant data area plus side readouts. | One large chart or monitor. |
| `grid` | Equal panel cells. | Many similar subsystem panels. |
| `menu` | Sparse command page. | Navigation or focused detail pages. |

At page level, use LCARS containers: `data_panel`, `control_panel`, `box`, `console`,
`padd`, `diagnostic`, `sweep`, and `bracket`.

## Effects

Effects publish events to the browser. They are no-ops during initial build and should be
called from button handlers or live callbacks.

| Function | Effect |
| --- | --- |
| `lcars.update(widget_id, **fields)` | Patch a widget in the current manifest. |
| `lcars.notify(message, level="info")` | Show a notification. |
| `lcars.append_log(stream_id, *lines)` | Append to a log stream. |
| `lcars.set_alert_condition(level)` | Set global alert tint: `normal`, `yellow`, `red`. |
| `lcars.set_theme(theme)` | Switch theme: `galaxy`, `tng`, `nemesis`. |

## Session State

Input state is per browser session and widget id. `value=` is an initial fallback, not a
forced value on every rerun.

```python
auto_balance = lcars.toggle("Auto Balance", value=True, id="auto-balance")
```

If the user turns it off, that session keeps returning `False` until the session ends or
the id changes.

## Live Polling

Use one `@lcars.live(interval=...)` callback for autonomous updates.

```python
@lcars.live(interval=5.0)
def poll() -> None:
    lcars.update("core-output", value="88%", status="ok")
    lcars.append_log("ops-log", "[LIVE] core 88%")
```

Only one live callback is supported per app.
