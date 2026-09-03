# Actions and State

LCARS-WebUI action handling is explicit: a page function declares widgets once, and a
separate `@app.action(widget_id)` function reacts to what one of them did. There is no
rerun — see [Concepts](Concepts) if this is unfamiliar.

## Button handlers

```python
ui.metric("Core Output", "87%", status="ok", id="core-output")
ui.button("Refresh Telemetry", color="anakiwa", id="refresh")


@app.action("refresh")
def refresh(ctx: ActionContext[None]) -> None:
    ctx.update("core-output", value="91%", status="warn")
    ctx.append_log("ops-log", "Telemetry refresh requested")
    ctx.notify("Telemetry refreshed.")
```

`ctx.value` is `None` for a plain button — there is nothing else to carry. The handler
runs exactly once per matching action; register one `@app.action(...)` per widget id you
need to react to.

(Executed via `app.test_client()` while writing this page: `session.action("refresh")`
produced `widget_update`, `log_chunk`, `notification`, then `action_ack`, in that order,
and `session.widget("core-output").value == "91%"` afterward.)

## Stateful inputs

```python
ui.toggle("Autocycle", value=True, id="autocycle")
ui.select("Mode", ["Cruise", "Alert", "Diagnostics"], value="Cruise", id="mode")


@app.action("mode")
def on_mode(ctx: ActionContext[str]) -> None:
    ctx.append_log("ops-log", f"mode={ctx.value}")
```

Each input widget gets its own handler, keyed by its own `id`. `ctx.value` is that
widget's new value — a `mode` action never sees `autocycle`'s value and vice versa. If a
handler genuinely needs several controls' current values together, group them with
`ui.form(...)` instead (see [Forms](#forms) below) so they arrive as one action.

(Executed while writing this page.)

## Updating widgets

Give the target widget an id, then patch it from a handler with `ctx.update(...)`:

```python
ui.progress("Shield Grid", 74, id="shield-grid")
ui.button("Recharge Shields", id="recharge-shields")


@app.action("recharge-shields")
def recharge(ctx: ActionContext[None]) -> None:
    ctx.update("shield-grid", value=88)
```

`ctx.update(widget_id, **fields)` merges keyword fields onto the widget's current
serialized state — it does not create widgets, and updating a missing id has no visible
browser effect. Outside a handler (an `@app.live` job, which has no triggering session),
call `lcars_ui.update(...)` instead — see [Live updates](#live-updates) below.

(Executed while writing this page: `session.widget("shield-grid").value == 88` after the
action.)

## Enhanced table state and events

The enhanced table separates **where data operations run** from **whether state changes
are reported to Python**:

| Option | Effect |
| --- | --- |
| `data_mode="client"` (default) | LCARS sorts, filters and paginates locally. |
| `data_mode="server"` | Those operations are manual; Python supplies pre-processed rows. |
| `emit_state_changes=True` | Emit a typed action on every state change (works with either data mode). |
| `interaction=InteractionOptions(mode="server")` | Legacy shorthand for `data_mode="server"` + `emit_state_changes=True`. |

When enabled, a state change fires an action on the table's own `id` (or its
`interaction.action_id`), whose `ctx.value` is:

```python
{"kind": "selection" | "expansion" | "sort" | "filter" | "page", "state": { ...TableState... }}
```

```python
import lcars_ui

ui.table(rows, id="repos", options=lcars_ui.TableOptions(
    data_mode="client", emit_state_changes=True,
    selection=lcars_ui.TableSelection(mode="single"),
    interaction=lcars_ui.InteractionOptions(action_id="repos"),
))


@app.action("repos")
def on_table_event(ctx: ActionContext[dict]) -> None:
    if ctx.value["kind"] == "expansion":
        for repo_id in ctx.value["state"]["expansion"]["expanded_ids"]:
            ...  # fetch child files, then ctx.update("repos", data=...) with loaded content
```

(Executed while writing this page — dispatching a `{"kind": "selection", ...}` action
through `app.test_client()` reached the handler with exactly that shape.)

**Reconciliation semantics.** The renderer treats the manifest as authoritative:

- Changing `selection.selected_ids`, `expanded_ids`, `sort`, `filters` or `pagination`
  in a later `ctx.update(...)` **programmatically** selects/expands/sorts the table.
- A plain data refresh that leaves those options unchanged **preserves** the reader's
  in-progress selection, expansion and sort.
- Row ids that disappear from the dataset are **pruned** from selection and expansion;
  swapping datasets never retains state for rows that no longer exist.
- Selection is keyed by stable `TableRow.id`, never by visual row index, so highlighting
  survives sorting, filtering, pagination and page navigation.

Common `ctx.update(...)` fields by widget:

| Widget | Fields |
| --- | --- |
| `metric` | `value`, `status`, `label`, `color` |
| `progress` | `value`, `label`, `color`, `show_label` |
| `gauge` | `value`, `unit`, `warn_threshold`, `crit_threshold`, `color` |
| `text` and `markdown` | `content`, `color` |
| `toggle` and `checkbox` | `value` |
| `select`, `radio`, `radio_toggle`, `text_input`, `number_input` | `value` |

## Logs

```python
ui.log("ops-log", title="Operations Log", max_lines=100, id="ops-log-widget")

@app.action("ack")
def ack(ctx: ActionContext[None]) -> None:
    ctx.append_log("ops-log", "line routed by stream id")
```

The stream id is `ops-log`; the widget id is `ops-log-widget`. `session.logs("ops-log")`
returns retained lines, in arrival order, in a test.

## Notifications

```python
ctx.notify("Command acknowledgement recorded.", level="success")
ctx.notify(
    "Audio processing failed",
    level="error",
    title="Voice Input",
    duration_ms=8000,
    dismissible=True,
    movable=True,
)
```

Valid levels: `info`, `success`, `warning`, `error`. Notifications appear in a movable,
dockable browser stack. `duration_ms=None` uses the renderer default. `ctx.notify(...)`
is private to the triggering session by default; pass `audience="all"` to broadcast.

## Manual hints

Declare the hint once, then open and close it as an effect keyed by its **target
widget's** id (a hint has no id of its own):

```python
ui.button("Inspect", id="inspect")
with ui.hint("inspect", trigger="manual", title="Telemetry"):
    ui.metric("Core", "87%", status="ok", id="inspect-core")

ui.button("Show Briefing", id="show-briefing")
ui.button("Hide Briefing", id="hide-briefing")


@app.action("show-briefing")
def show_briefing(ctx: ActionContext[None]) -> None:
    ctx.show_hint("inspect")


@app.action("hide-briefing")
def hide_briefing(ctx: ActionContext[None]) -> None:
    ctx.hide_hint("inspect")
```

(Executed while writing this page.)

## Alert condition

```python
@app.action("red-alert")
def red_alert(ctx: ActionContext[None]) -> None:
    ctx.set_alert_condition("red")


@app.action("stand-down")
def stand_down(ctx: ActionContext[None]) -> None:
    ctx.set_alert_condition("normal")
```

Valid levels: `normal`, `yellow`, `red`. `set_alert_condition` defaults to
`audience="all"` (it's a ship-wide concept), unlike most other effects.

## Theme switching

```python
ui.radio_toggle("Theme", ["galaxy", "tng", "nemesis"], value="galaxy", id="theme-picker")
ui.button("Apply Theme", id="apply-theme")


@app.action("apply-theme")
def apply_theme(ctx: ActionContext[None]) -> None:
    ctx.set_theme("tng")
```

`set_theme` accepts a bundled ID or a valid filename ID from the app's `themes/*.toml`
directory; see [Reference](Reference#themes) for the file format. It also defaults to
`audience="all"`. (Executed while writing this page — the action produced a
`manifest_update` effect.)

## Forms

Forms submit several child inputs together as one action. This complete example shows
the three payload shapes:

```python
from pydantic import BaseModel, Field
from lcars_ui import ActionContext, App, ui

app = App()
received: dict[str, object] = {}


class Course(BaseModel):
    destination: str = "Vulcan"
    speed: int = Field(default=5, ge=1, le=9)


@app.page("Orders", id="orders")
def orders() -> None:
    with ui.form("Identity", action_id="save-identity", id="identity-form"):
        ui.text_input("Officer", id="officer-name")

    ui.form(Course, action_id="set-course", id="course-form")
    ui.command_input("Command", action_id="send-command", id="composer")


@app.action("save-identity")
def save_identity(ctx: ActionContext[dict[str, object]]) -> None:
    received["identity"] = ctx.value["officer-name"]


@app.action("set-course")
def set_course(ctx: ActionContext[Course]) -> None:
    received["course"] = ctx.value


@app.action("send-command")
def send_command(ctx: ActionContext[dict[str, object]]) -> None:
    received["command"] = ctx.value["composer-value"]


with app.test_client() as client:
    session = client.session()
    session.submit("identity-form", {"officer-name": "Tuvok"})
    session.submit("course-form", {"destination": "Risa", "speed": 7})
    session.submit("composer", {"composer-value": "STATUS"})

    assert received["identity"] == "Tuvok"
    assert received["course"] == Course(destination="Risa", speed=7)
    assert received["command"] == "STATUS"

    session.submit("course-form", {"speed": 12})
    assert received["course"] == Course(destination="Risa", speed=7)
    assert session.widget("course-form-speed").options.feedback.state == "error"
```

The hand-built form is keyed by child widget ids only. The model-backed form accepts its
generated widget ids (`course-form-destination`, `course-form-speed`) or plain model field
names (`destination`, `speed`) and gives the handler a parsed `Course`. `command_input()`
is itself a one-field form: its value remains a dictionary under the generated
`{id}-value` key, not a bare string. If `action_id` is omitted, its generated action id is
`{id}-submit`.

Handlers never bind those field names directly as parameters. Their first parameter is
the `ActionContext`; later annotated parameters are registered services. If model
validation fails, as in the last submission, `set_course` is not called again. The user
instead sees the Pydantic message beside the invalid field, or on the form for a
model-level/cross-field error.

(This complete block was executed through `app.test_client()` while writing this page.)

## File upload actions

`file_upload()`'s action delivers `ctx.value` as `{"files": [...]}`. Each file entry is
a dictionary with `name`, `size`, `content_type`, and request-scoped raw `data` bytes:

```python
ui.file_upload(
    "Data Files",
    accept=[".json", "application/json"],
    max_files=4,
    max_bytes=10_000_000,
    id="data-files",
)


@app.action("data-files")
def data_files(ctx: ActionContext[dict]) -> None:
    for uploaded in ctx.value["files"]:
        ingest(uploaded["name"], uploaded["data"])
        ctx.append_log(
            "ops-log", f"received {uploaded['name']} ({uploaded['size']} bytes)"
        )
```

The built-in endpoint keeps bytes only long enough to dispatch this one action's handler.
Persist them inside the handler if the application needs them later. The real-time
protocol receives metadata, not file bytes.

## Knowledge-graph actions

`tri_state`'s optional escalation is the one knowledge-graph instrument that fires an
action — like every other widget, it declares in place and reports back through
`@app.action(widget_id)`, not a return value:

```python
advanced.tri_state(result_data, on_escalate="EXACT", id="support-query-n07")

@app.action("support-query-n07")
def escalate(ctx: ActionContext[str]) -> None:
    if ctx.value == "EXACT":
        run_exact_query()
```

See [Knowledge Graph](Knowledge-Graph) for payload shapes and the complete surviving
instrument family (`support_panel` has no action of its own — it's display-only).

## Live updates

`@app.live(interval=...)` is a server-side background task that pushes updates to
connected browsers on its own schedule — not client polling — over the same WebSocket
connection used for actions.

```python
import lcars_ui

if __name__ == "__main__":
    @app.live(interval=2.0)
    def tick() -> None:
        lcars_ui.update("core-output", value="89%", status="ok")
        lcars_ui.append_log("ops-log", "live telemetry frame")

    app.serve(port=8077)
```

A live job has no triggering session, so it calls the plain root-level effect functions
(`lcars_ui.update`, `lcars_ui.append_log`, ...) instead of `ctx.*` methods. Its own
`audience=` — set once on `@app.live(interval=..., audience="all")`, default `"all"` —
governs those calls; pass `audience="session"` only when you also give the job a way to
target one session.

An app can register more than one `@app.live(...)` job — each runs as its own
independent, cancellable task, on its own `interval`. Register them inside
`if __name__ == "__main__":` (never at module level) so importing the module — e.g. from
a test — doesn't also start them; a test that wants live-job behavior should call
`app.start_live_jobs()`/`app.stop_live_jobs()` explicitly instead.

## Transport fallbacks

Actions, inputs, live updates, logs, and notifications all flow over one persistent
WebSocket connection (`/lcars/ws`) by default — this is the streaming path, including
everything `@app.live` pushes. If the browser can't open a WebSocket, downstream
messages fall back to Server-Sent Events (SSE) and upstream actions fall back to plain
HTTP endpoints (`/lcars/action/{id}`, etc.). App code does not need to care; the same
handler model runs either way.

## Testing actions

`app.test_client()` dispatches real actions through the same registry, event bus, and
acknowledgement path a browser action would use:

```python
with app.test_client() as client:
    session = client.session()

    effects = session.action("refresh")
    assert session.widget("core-output").value == "91%"

    session.submit("warp-form", {"warp-factor": 7.5, "dampeners": False})
```

`session.effects_since(mark, type="widget_update")` filters effects since a
`mark = len(session.effects)` checkpoint. Each `client.session()` call is independent,
with its own widget state — useful for asserting two browser tabs don't see each other's
private updates.

---

**See Also:** [Widgets](Widgets) · [Concepts](Concepts) · [Recipes](Recipes) · [Reference](Reference)
