# Concepts

LCARS-WebUI separates Python authoring, a typed wire contract, and browser rendering.

## Architecture

| Part | Responsibility |
| --- | --- |
| `App` | Owns pages, actions, live jobs, configuration, services, and serving — the one entry point. |
| `lcars_ui.ui` / `lcars_ui.advanced` | Declare panels, widgets, and containers — ordinary vocabulary vs. specialist/composition/workspace vocabulary. |
| Pydantic models | Define the manifest, widgets, option objects, state, and protocol. |
| FastAPI server | Serves the app, schema, WebSocket, SSE, HTTP fallbacks, and uploads. |
| React renderer | Validates the manifest and renders responsive LCARS geometry. |
| Event bus | Broadcasts direct updates, notifications, logs, and acknowledgements. |

The Pydantic contract generates JSON Schema, TypeScript types, the standalone browser
validator, and golden fixtures. Contract checks make drift visible.

## No rerun: pages declare once, actions handle explicitly

`@app.page("Title", id="...")` registers a function that runs **exactly once per
manifest build** — including the build performed by `app.serve()` or when an
`app.test_client()` is constructed. Sessions from one test client receive independent
copies of that built manifest. A page never runs again when a browser action arrives;
there is no "current value" flowing back into it, and no branch inside it ever becomes
true a second time.

To react to something a widget did, register an explicit handler for its `id` with
`@app.action(...)`. It runs once per matching action and receives an `ActionContext[T]`:
`ctx.value` is the event's payload — `None` for a plain button, the new value for a
toggle/select/input, the parsed model for a form.

```python
from lcars_ui import ActionContext, App, ui

app = App()


@app.page("Sensors", id="sensors")
def sensors() -> None:
    with ui.control_panel("Commands", id="commands"):
        ui.select("Mode", ["Cruise", "Alert"], value="Cruise", id="mode")
        ui.button("Apply", id="apply")


@app.action("apply")
def apply_mode(ctx: ActionContext[None]) -> None:
    ctx.notify("Mode applied")
```

(Executed via `app.test_client()` while writing this page.)

One or more `@app.live(interval=..., audience="all")` jobs run independently of any
browser action, each on its own schedule, and can publish updates to every connected
session (or `audience="session"` to target one). See
[Actions and State](Actions-and-State#live-updates) for the full picture, and
[docs/migration.md](https://github.com/darsrc/LCARS-WebUI/blob/main/lcars-ui/docs/migration.md)
if "no rerun" is unfamiliar because you know an earlier version of this library or a
rerun-style Python UI framework.

## IDs are the operational contract

Widget IDs route actions, retain per-session state, hydrate form children, preserve
client interaction state, and target effects (`ctx.update(widget_id, ...)`).

Use explicit IDs for:

- every widget referenced by an `@app.action(...)` handler;
- widgets patched with `ctx.update()` / `lcars_ui.update()`;
- form children and form `action_id`s;
- log widgets and their stream IDs;
- any widget whose label may change (an omitted id is derived from the label, so a label
  change silently changes state identity).

IDs must be unique across the **whole application** — every page combined, not just the
one you're writing — within a single manifest build; a duplicate raises `ValueError` at
build time. Each fresh build (a server restart, an explicit `app.build_manifest()`, or a
new `app.test_client()`) gets its own registry, so the same id reappearing in a later
build is fine. `lcars check` catches a same-build collision before it reaches a browser.

## Declarations, namespaces, and return values

Every widget call **declares** its widget — it renders in place and returns the typed
object it just declared (a `Button`, a `Table`, and so on), not a click flag or the
current value. Most code discards the return value; nothing needs it, since `id=` is what
makes a widget referenceable later, from an action handler, a `hint=`, or `ctx.update()`.

```python
with ui.control_panel("Commands", id="commands"):
    ui.select("Mode", ["Cruise", "Alert"], id="mode")
    ui.button("Apply", id="apply")
```

Ordinary widgets, panels, text, and forms live in `lcars_ui.ui`; composition, the Surface
Engine, graph workspaces, and specialist media (`three_scene`, `shader`, `mic_button`,
`video_hls`) live in `lcars_ui.advanced`. Containers use `with` to establish a nested
region; everything else is a plain call.

## Pages and layout

`@app.page(title, id=..., nav=True)` both declares a page and (by default) adds it to the
sidebar, labeled with `title` — there is no separate `nav()` call. Page archetypes are
`auto`, `console`, `telemetry`, `grid`, `menu`, and `authored`.

Top-level containers are classified from their content and packed into `primary`,
`side`, `dock`, or `full` zones. Optional `span`, `weight`, `aspect`, `group`, and
`sizing` hints refine the mosaic without abandoning the LCARS layout grammar. See
[Layouts](Layouts) for the full picture.

The browser's Arrange mode stores a manual layout locally per page and screen class. It
does not mutate the manifest or send arrangement state to Python.

## Session state and client state

Each browser tab gets a real, server-issued session. Widget interaction state and
scoped services are retained per session for 30 minutes after the tab disconnects, so a
reload or brief network blip reconnects into the same session instead of starting over.
A widget's `value=` at declaration time is its starting value, not something forced back
onto it on a later build.

The bundled frontend manages the session token automatically; a manual HTTP client
(curl, a script) must thread it through itself — see [Reference's server routes
table](Reference#server-routes) for exactly how.

Richer display behavior — table sorting, graph viewport, media position, container
collapse — is normally local to the browser and never reaches Python. Add
`InteractionOptions(mode="server")` (or, for tables, `data_mode="server"` /
`emit_state_changes=True`) when Python must receive typed state.

## Effects

Effects are how a handler tells connected browsers what changed. Inside an
`@app.action`/`@app.session_start` handler they are methods on `ctx`; outside one — most
commonly inside an `@app.live(...)` job, which has no triggering session — call the same
names as plain functions imported from `lcars_ui`:

| `ctx.` method | Plain function | Effect |
| --- | --- | --- |
| `ctx.update(widget_id, **fields)` | `lcars_ui.update(...)` | Patch an existing rendered widget. |
| `ctx.notify(message, ...)` | `lcars_ui.notify(...)` | Add a notification. |
| `ctx.append_log(stream_id, *lines)` | `lcars_ui.append_log(...)` | Append lines to a log stream. |
| `ctx.show_hint(widget_id)` / `ctx.hide_hint(widget_id)` | — (handler-only) | Open/close a manual hint. |
| `ctx.set_alert_condition(level)` | `lcars_ui.set_alert_condition(...)` | Set `normal`, `yellow`, or `red` global treatment. |
| `ctx.set_theme(theme)` | `lcars_ui.set_theme(...)` | Switch the active theme (nine accepted names — see [Reference](Reference#themes)). |

Every effect defaults to **private** delivery — only the session whose action triggered
the handler sees it — except `set_theme` and `set_alert_condition`, which default to
`audience="all"` since a theme or alert condition is ship-wide. Pass `audience="all"` or
`audience="session"` explicitly to override either default.

## Transport and fallbacks

`/lcars/ws` is the primary bidirectional channel. It carries actions upstream and
updates, logs, notifications, and acknowledgements downstream. If WebSocket is
unavailable, the client uses `/lcars/events` for SSE downstream and HTTP action/input/
form endpoints upstream — application code does not need to care either way.

The browser receives a full manifest on connect (a `session_hydration` envelope
carrying the *current* merged state on reconnect, not a replay from scratch). Direct
updates patch only the addressed widget or manifest field; they do not refetch or reload
the page.

## Local preferences

`app.config(..., settings_page=True)` (the default) adds a renderer-owned Options
destination for theme, motion, sound, casing, and body typography. Preferences and
manual arrangements live in browser storage and are not application data. Small demo/test
apps generally pass `settings_page=False` since it adds a page you didn't declare.

## Testing

`app.test_client()` builds the real manifest and dispatches real actions through the
same registry, event bus, and acknowledgement path a browser would use — no socket, no
browser. See [Actions and State](Actions-and-State) for the full pattern.

---

**See also:** [Layouts](Layouts) · [Widgets](Widgets) ·
[Actions and State](Actions-and-State) · [Reference](Reference)
