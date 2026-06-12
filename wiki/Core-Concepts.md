# Core Concepts

LCARS-WebUI is not a template system and not a frontend component library. It is a
Python DSL that builds a dashboard manifest and reacts to browser events by rerunning your
Python declaration function.

## The Moving Parts

| Part | What it does |
| --- | --- |
| Python DSL | Functions such as `lcars.page`, `lcars.metric`, and `lcars.button` declare the UI. |
| Manifest | Versioned JSON generated from the DSL. The frontend renders this. |
| FastAPI server | Serves the manifest, static assets, WebSocket, SSE, and HTTP fallback endpoints. |
| Browser frontend | Renders LCARS geometry and sends user actions back to the server. |
| Event bus | Sends updates, notifications, logs, and acknowledgements to connected clients. |

## App Lifecycle

On startup, `lcars.run(ui)` calls your `ui` function in build mode. Widget calls add
entries to the manifest. Input widgets return defaults in this phase.

When a browser action arrives, the same `ui` function runs again in handle mode. Inputs
return the current browser-session values. `button()` returns `True` only for the click
currently being handled.

Live polling is separate. An optional `@lcars.live(interval=...)` function can publish
updates on a timer without a user action.

```python
def ui() -> None:
    lcars.metric("Core Output", "87%", status="ok", id="core-output")

    if lcars.button("Refresh", id="refresh"):
        lcars.update("core-output", value="91%", status="warn")
        lcars.notify("Telemetry refreshed.")


@lcars.live(interval=5.0)
def poll() -> None:
    lcars.update("core-output", value="88%", status="ok")
```

## Widget IDs

Widget ids are the most important operational detail in LCARS-WebUI. They are used for:

- Routing button clicks and input changes.
- Persisting input values per browser session.
- Targeting `lcars.update(...)`.
- Form child hydration.

If you omit `id`, the DSL derives one from the label. That is acceptable for throwaway
experiments, but real apps should use explicit ids for anything interactive or updated.

```python
# Good for real apps.
gain = lcars.number_input("Sensor Gain", value=5.0, id="sensor-gain")

if lcars.button("Apply Gain", id="apply-gain"):
    lcars.append_log("ops-log", f"gain={gain:.1f}")
```

Changing an auto-generated label changes the generated id and resets state. Reusing an
explicit id twice in one `ui()` call raises `ValueError`.

## Pages and Navigation

Create pages with `lcars.page`. Link to them with `lcars.nav`.

```python
lcars.nav("Overview", page="overview", color="pale-canary")
lcars.nav("Diagnostics", page="diagnostics", color="anakiwa")

with lcars.page("Overview", id="overview", layout="console"):
    ...

with lcars.page("Diagnostics", id="diagnostics", layout="telemetry"):
    ...
```

`page=` on `lcars.nav` should match the page `id`. If you omit `page`, navigation derives
an id from the label.

## Layout Archetypes

Pages use an adaptive LCARS layout archetype. Set it with `layout=` or leave it as
`"auto"`.

| Layout | Shape | Use for |
| --- | --- | --- |
| `auto` | Renderer chooses from content | Most apps while prototyping |
| `console` | Main lane, side rail, control dock | Operational dashboards |
| `telemetry` | Dominant data view plus readout rail | Big chart or monitor pages |
| `grid` | Equal panel cells | Many similar subsystems |
| `menu` | Sparse page field | Selection or menu screens |

At page level, prefer LCARS containers such as `data_panel`, `control_panel`, `box`,
`console`, `padd`, `diagnostic`, `sweep`, and `bracket`.

## Effects

Effects publish events to the browser. They are no-ops during the initial build, so they
belong in button branches or live callbacks.

| Function | Purpose |
| --- | --- |
| `lcars.update(widget_id, **fields)` | Patch a widget already in the manifest. |
| `lcars.notify(message, level="info")` | Show a notification. Use `level="error"` for failures. |
| `lcars.append_log(stream_id, *lines)` | Append lines to an `lcars.log(...)` stream. |
| `lcars.set_alert_condition(level)` | Set global alert tint: `normal`, `yellow`, or `red`. |
| `lcars.set_theme(theme)` | Switch theme live: `galaxy`, `tng`, or `nemesis`. |

## Session State

Input state is keyed by browser session and widget id. `value=` is an initial fallback,
not a command to overwrite user state on every rerun.

```python
enabled = lcars.toggle("Auto Balance", value=True, id="auto-balance")
```

If the user turns that toggle off, the same session keeps returning `False` until the
session ends or the id changes.

The public DSL does not currently expose a direct session reset helper. If you need
resettable domain state, keep it in your own data source and render inputs from that
source.

## Strict LCARS Guardrails

Parity UI should be code-rendered LCARS geometry and content. Do not include screenshot
backdrops or rasterized target screenshots in parity UI paths. Use LCARS containers and
geometry instead of image inclusion.

For visual guidance, see [[Themes and Visual Language|Themes-and-Visual-Language]].
