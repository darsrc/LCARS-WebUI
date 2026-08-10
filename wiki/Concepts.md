# Concepts

LCARS-WebUI separates Python authoring, a typed wire contract, and browser rendering.

## Architecture

| Part | Responsibility |
| --- | --- |
| Python DSL | Declares pages, containers, widgets, actions, and effects. |
| Pydantic models | Define the manifest, widgets, option objects, state, and protocol. |
| FastAPI server | Serves the app, schema, WebSocket, SSE, HTTP fallbacks, and uploads. |
| React renderer | Validates the manifest and renders responsive LCARS geometry. |
| Event bus | Broadcasts direct updates, notifications, logs, and acknowledgements. |

The Pydantic contract generates JSON Schema, TypeScript types, the standalone browser
validator, and golden fixtures. Contract checks make drift visible.

## BUILD, HANDLE, and LIVE

On startup, `lcars.run(ui)` executes `ui()` in **BUILD** mode. Widget declarations form
the manifest; input widgets return defaults; effect calls do nothing.

After an action, the same function executes in **HANDLE** mode. The triggering widget's
action ID and value are active, inputs read per-session state, and effects are queued for
the browser.

One optional `@lcars.live(interval=...)` callback runs in **LIVE** mode. It is independent
of user actions and can publish direct widget and log updates.

```python
def ui() -> None:
    gain = lcars.number_input("Sensor Gain", value=5.0, id="sensor-gain")
    if lcars.button("Apply", id="apply-gain"):
        lcars.append_log("ops-log", f"gain={gain:.1f}")
```

## IDs are the operational contract

Widget IDs route actions, retain session values, hydrate form children, preserve client
interaction state, and target effects.

Use explicit IDs for:

- every button and input in durable application code;
- widgets patched with `lcars.update()`;
- form children and form action IDs;
- log widgets and their stream IDs;
- any widget whose label may change.

Omitted IDs are derived from labels. That is convenient for experiments, but a label
change then changes state identity. Duplicate IDs in one BUILD raise `ValueError`.

## Return values and context managers

- Containers use `with` to establish a nested region.
- Display widgets usually return `None`.
- Inputs return their current values.
- Interactive displays return typed state when server interaction is enabled.
- `frontier()` and `commitment_selector()` return validated clicked IDs.
- `tri_state(..., on_escalate="EXACT")` returns `True` for its escalation action.

```python
with lcars.control_panel("Commands", id="commands"):
    mode = lcars.select("Mode", ["Cruise", "Alert"], id="mode")
    if lcars.button("Apply", id="apply"):
        lcars.notify(f"Mode: {mode}")
```

## Pages and layout

`nav(page=...)` points to `page(id=...)`. Page archetypes are `auto`, `console`,
`telemetry`, `grid`, and `menu`.

Top-level containers are classified from their content and packed into `primary`,
`side`, `dock`, or `full` zones. Optional `span`, `weight`, `aspect`, `group`, and
`sizing` hints refine the mosaic without abandoning the LCARS layout grammar.

The browser's Arrange mode stores a manual layout locally per page and screen class. It
does not mutate the manifest or send arrangement state to Python.

## Session state and client state

Python input state is stored per browser session and widget ID. A widget's `value=` is an
initial fallback, not a forced value on every action.

Richer display behavior—table sorting, graph viewport, media position, container
collapse—is normally local to the browser. Use `InteractionOptions(mode="server")` when
Python must receive typed state. Tables can retain client operations and still emit
events with `emit_state_changes=True`.

## Effects

Effects are ignored during BUILD and publish during HANDLE or LIVE:

| Function | Effect |
| --- | --- |
| `update(widget_id, **fields)` | Patch an existing rendered widget. |
| `notify(message, ...)` | Add a notification. |
| `append_log(stream_id, *lines)` | Append lines to a log stream. |
| `show_hint(widget_id)` / `hide_hint(widget_id)` | Control a manual hint. |
| `set_alert_condition(level)` | Set `normal`, `yellow`, or `red` global treatment. |
| `set_theme(theme)` | Switch to `galaxy`, `tng`, or `nemesis`. |

Keep effect calls inside the branch or live callback that should cause them. A top-level
effect executes on every action rerun.

## Transport and fallbacks

`/lcars/ws` is the primary bidirectional channel. It carries actions upstream and
updates, logs, notifications, and acknowledgements downstream. If WebSocket is
unavailable, the client uses `/lcars/events` for SSE downstream and HTTP action/input/
form endpoints upstream.

The browser receives a full manifest when it connects. Direct updates patch only the
addressed widget or manifest field; they do not refetch or reload the page.

## Local preferences

`settings_page=True` adds an Options destination for theme, motion, sound, casing, and
body typography. Preferences and manual arrangements live in browser storage and are not
application data.

---

**See also:** [Layouts](Layouts) · [Widgets](Widgets) ·
[Actions and State](Actions-and-State) · [Reference](Reference)
