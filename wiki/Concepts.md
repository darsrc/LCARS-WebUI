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
    apply_gain = lcars.button("Apply Gain", id="apply-gain")

    if apply_gain:
        lcars.append_log("ops-log", f"gain={gain:.1f}")
```

## Calls, Returns, and `with`

LCARS-WebUI uses two Python styles:

- Layout containers use `with` because nested widgets need a parent region.
- Leaf widgets are normal function calls.
- Input widgets return values, so assigning them to variables is the clearest style once
  the handler gets more than one line.

```python
with lcars.control_panel("Commands", id="commands"):
    red_alert = lcars.button("Red Alert", color="red", id="red-alert")
    stand_down = lcars.button("Stand Down", color="anakiwa", id="stand-down")
    auto_balance = lcars.toggle("Auto Balance", value=True, id="auto-balance")
    operator = lcars.text_input("Operator", placeholder="OPS-01", id="operator")

    if red_alert:
        lcars.set_alert_condition("red")
        lcars.append_log("ops-log", f"red alert by {operator or 'OPS-DEFAULT'}")

    if stand_down:
        lcars.set_alert_condition("normal")

    if auto_balance:
        lcars.update("balance-state", value="AUTO")
```

Display widgets usually return `None`, so assign the data you want to display rather than
the widget call:

```python
core_output = "87%"
core_status = "ok"
lcars.metric("Core Output", core_output, status=core_status, id="core-output")
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

## Live Streaming (WebSocket Push)

`@lcars.live(interval=...)` registers an autonomous server-side tick. The server pushes
`widget_update` / `log_chunk` messages to every connected browser over the open
WebSocket — the browser does not poll or refetch anything.

```python
@lcars.live(interval=5.0)
def tick() -> None:
    lcars.update("core-output", value="88%", status="ok")
    lcars.append_log("ops-log", "[LIVE] core 88%")
```

Register the callback inside `if __name__ == "__main__":`, right before `lcars.run(...)`.
Only one live callback is supported per app, and registering it at module level means
every import (including by tests) adds another one.

Only one live callback is supported per app.

---

**See Also:** [Layouts](Layouts) · [Widgets](Widgets) · [Actions and State](Actions-and-State) · [Reference](Reference)
