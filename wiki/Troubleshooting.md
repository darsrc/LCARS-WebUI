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

## `from lcars_ui import ui` shadows a local `def ui()`

This is the single most confusing failure this migration produced, because the error it
raises never names the cause — and it's exactly the mistake the *old* documented idiom
(name your page-building function `ui`, then call `lcars.run(ui)`) sets you up to make.

If a leftover `def ui() -> None:` from that era is still sitting in your module, and you
add `from lcars_ui import ui` above it (or below it — order doesn't matter, whichever
binding executes last wins, silently, for the rest of the module):

```python
from lcars_ui import App, ui

app = App()


def ui() -> None:          # <- leftover from the old lcars.run(ui) idiom
    pass


@app.page("Bridge", id="bridge")
def bridge() -> None:
    ui.text("hello", id="greeting")
```

`app.build_manifest()` (or `app.serve()`, or `lcars check`) fails with:

```
AttributeError: 'function' object has no attribute 'text'
```

This never says the word `ui`, never says "shadowed," and never points at the
`def ui():` line — only at whichever call site happened to touch the broken name first.
(Reproduced verbatim while writing this page.)

**The fix:** rename the old page-building function — it doesn't get passed to a `run()`
call any more, so it doesn't need to be called `ui`:

```python
@app.page("Bridge", id="bridge")
def bridge_page() -> None:      # <- was `def ui():`
    ui.text("hello", id="greeting")
```

If `ruff`/`pyflakes` flags "redefinition of unused `ui`," that warning *is* this bug,
caught before runtime — rename the function rather than silencing it. Full context:
[docs/migration.md](https://github.com/darsrc/LCARS-WebUI/blob/main/lcars-ui/docs/migration.md#the-def-ui-trap).

## A `color=` value validates but renders untinted

Only 15 named tokens resolve to a themed accent color (`COLOR_VAR` in
`frontend/src/widgets/rendererShared.ts`): `orange`, `golden-tanoi`, `pale-canary`,
`neon-carrot`, `atomic-tangerine`, `blue`, `anakiwa`, `mariner`, `bahama-blue`, `lilac`,
`hopbush`, `eggplant`, `red`, `yellow`, `white`. A hex code (`"#f89800"`) always renders
exactly that color.

Other Okuda-era names the schema still accepts — `purple`, `indigo`, `husk`, `rust`,
`tamarillo`, and others — pass validation and will not raise:

```python
ui.button("Test", color="purple", id="test-btn")   # builds fine, renders with no tint
```

but the widget renders with its default role color, not `purple`. This is current,
intentional-for-now behavior, not a bug to work around — if a widget looks untinted,
check its `color=` against the 15-token list in
[Reference](Reference#color-tokens) before assuming something else is wrong. A theme
switch (`ctx.set_theme(...)`) changes the palette every named token maps into, not the
list of names that map to anything.

## An action handler appears not to fire

The single most common cause: the widget's `id=` doesn't match the string passed to
`@app.action(...)`.

```python
ui.button("Engage", id="engage-button")     # <- id is "engage-button"

@app.action("engage")                        # <- but this listens for "engage"
def engage(ctx: ActionContext[None]) -> None:
    ctx.notify("Engaged")
```

Nothing raises. The button still renders, still dispatches an action when clicked, and
the browser still gets an acknowledgement — there is simply no registered handler for
`"engage-button"`, so no `ctx.notify(...)` ever runs. (Reproduced with
`app.test_client()` while writing this page: dispatching the mismatched id produced only
an `action_ack` effect — no `notification`.)

Check, in order:

1. The literal string in `@app.action("...")` matches the widget's `id=` exactly
   (case-sensitive, no typo).
2. The handler is actually registered before `app.build_manifest()`/`app.serve()` runs —
   decorators must execute at import time, so a handler defined inside an `if` that never
   runs, or in a module that's never imported, never registers.
3. For a form, the *form's* `action_id=` fires the handler — not any individual child
   input's `id`.
4. For an enhanced table's state events, the handler is registered on the table's own
   `id` (or its `options.interaction.action_id`), not a made-up name.

## Input keeps resetting

Likely cause: the widget's `id` changes between manifest builds (e.g. it was left to be
derived from a label that changed, or is built from something non-stable like a loop
index that reorders).

```python
ui.number_input("Sensor Gain", value=5.0, id="sensor-gain")   # give it a fixed id
```

## Duplicate widget id

Every widget id must be unique across the **whole application** — every page combined,
not just the one you're writing — within a single manifest build:

```python
ui.metric("Core", "OK", id="core-status")
ui.progress("Core Load", 72, id="core-load")
```

```
ValueError: Duplicate widget id 'core-status'. Each widget must have a unique id within
a single ui_fn call.
```

The message's own wording ("within a single `ui_fn` call") undersells the actual scope —
in practice this is checked once per `app.build_manifest()` call, across every
`@app.page(...)` function it runs, not just the current one. (Reproduced while writing
this page: the same id declared in two different `@app.page` functions collided.) A
fresh build — a server restart, or a new `client.session()` in a test — gets its own
registry, so the same id reappearing in a *later* build is fine.

## `ctx.update(...)` does nothing

Check that:

- The target widget exists in the current manifest.
- The target has an explicit `id=`.
- `ctx.update(...)` is called inside the `@app.action` handler for the widget that
  should trigger it (not somewhere it never runs).
- The field name matches the widget model (`value=`, not e.g. `text=` for a metric).

```python
ui.metric("Core Output", "87%", id="core-output")

@app.action("refresh")
def refresh(ctx: ActionContext[None]) -> None:
    ctx.update("core-output", value="91%")
```

Outside a handler (an `@app.live` job), use the plain function instead:
`lcars_ui.update("core-output", value="91%")` — `ctx` only exists inside a handler.

## An effect fires on every matching action, not just the case you meant

A handler's whole body runs on every action that matches its id — there's no implicit
gating the way there was under the old rerun (where a stray top-level `notify()` outside
any `if` fired on every unrelated rerun). The v7 equivalent mistake is forgetting to
guard a conditional effect inside the handler itself:

```python
@app.action("ack")
def ack(ctx: ActionContext[None]) -> None:
    ctx.notify("Acknowledged.")   # fires every single time "ack" fires - fine here
```

If the notification should only fire under some condition, add the `if` inside the
handler, around the effect call — the handler function is the whole scope now, so there
is nowhere else for a stray unconditional call to hide.

## Form rejects a widget

Forms can contain input widgets only. Move display widgets outside:

```python
ui.text("Configure warp parameters", id="warp-intro")

with ui.form("Warp", action_id="warp-submit", id="warp-form"):
    ui.number_input("Warp Factor", id="warp-factor")
```

(The rejection — `ValueError: lcars.form() can only contain input widgets.` — was
reproduced while writing this page; note the message still says `lcars.form()` even
though the call is `ui.form()`.)

## Need code to run on form submit

Forms have a real submit action now — no button-plus-inputs workaround needed:

```python
with ui.form("Commit", action_id="commit-warp", id="warp-form"):
    ui.number_input("Warp Factor", value=5.0, id="warp-factor")

@app.action("commit-warp")
def commit(ctx: ActionContext[dict]) -> None:
    ctx.append_log("ops-log", f"warp={ctx.value['warp-factor']:.2f}")
```

`ctx.value` is a `dict` keyed by each child's own `id` (or a parsed Pydantic model, for a
model-backed form — see [Widgets](Widgets#model-backed-forms)).

## Chart data fails

Valid:

```python
ui.chart([1, 2, 3], title="Valid")
ui.chart({"A": [1, 2], "B": [2, 3]}, title="Also Valid")
```

Chart lists must be numeric. (Both forms above executed while writing this page.)

## Table columns missing

For `list[dict]`, table headers come from the first row. Put every desired column in the
first row.

```python
rows = [
    {"System": "Warp Core", "State": "Nominal", "Load": "87%"},
    {"System": "Computer", "State": "Synced", "Load": "42%"},
]
```

## Live job errors are hard to see

Catch unreliable sources yourself — an unhandled exception inside an `@app.live` job
doesn't surface in the browser:

```python
import lcars_ui

@app.live(interval=5.0)
def poll() -> None:
    try:
        value = read_sensor()
    except Exception as exc:
        lcars_ui.append_log("ops-log", f"sensor read failed: {exc}")
        return
    lcars_ui.update("sensor", value=str(value))
```

An app can register more than one `@app.live(...)` job — each runs independently, on its
own `interval` — so a failure in one doesn't need to block the others; give each its own
try/except rather than combining unrelated periodic work into one job "to be safe."

## Mic button does not work

Microphone access requires HTTPS except on localhost. Make sure `/lcars/upload/audio` is
allowed by your proxy.

## File upload action never fires, or `ctx.value` is empty

The registered `@app.action(widget_id)` handler for a `file_upload()` fires once, after a
completed upload, with `ctx.value` as `list[UploadedFile]`:

```python
ui.file_upload("Data", id="data-upload")

@app.action("data-upload")
def on_upload(ctx: ActionContext[list]) -> None:
    for uploaded in ctx.value:
        save_upload(uploaded.name, uploaded.data)
```

Check the widget's `max_bytes`/`max_files`, the server's
`LCARS_MAX_FILE_UPLOAD_BYTES`, proxy body limits, and access to `/lcars/upload/files`.
Bytes are not retained past that one handler call — persist them there if needed later.

## Three.js scene does not load

Pass the module directory to `app.serve(...)` and use the mounted URL:

```python
advanced.three_scene("scenes/scene.js", id="scene")

if __name__ == "__main__":
    app.serve(assets_dir="./assets")
```

Verify the module exists under that directory and inspect the inline scene error. The
mount is read-only and will not serve paths outside its root.

## Rich hint has no content, or `ctx.show_hint(...)` does nothing

A hint attaches after its target widget and, with no explicit `target=`, defaults to the
most recently declared widget:

```python
ui.button("Inspect", id="inspect")
with ui.hint("inspect", trigger="click"):
    ui.text("Detail", id="inspect-detail")
```

For a manual hint, `ctx.show_hint(...)`/`ctx.hide_hint(...)` take the hint's **target**
widget's id — a hint has no `id=` of its own:

```python
ui.button("Inspect", id="inspect")
with ui.hint("inspect", trigger="manual"):
    ui.text("Detail", id="inspect-detail")

@app.action("show-briefing")
def show_briefing(ctx: ActionContext[None]) -> None:
    ctx.show_hint("inspect")     # the button's id, not a separate hint id
```

## A knowledge-graph widget rejects data

`support_panel` and `tri_state` validate enum values and required nested fields. Check
the payload against [Knowledge Graph](Knowledge-Graph), or construct the exported typed
model (`SupportData`, `TriStateData`) close to the data source to surface validation
errors earlier.

Remember the intentional empty states: no support is `"environments": []`,
support-independent is `"environments": [{"atoms": []}]`.

## `lcars check` fails

`lcars check [TARGET]` imports the application, runs every declared page, and validates
the manifest — nothing is served, no port is bound. Its exit code tells you which phase
failed:

| Exit code | Meaning |
| --- | --- |
| `0` | Manifest built and validated successfully. |
| `1` | The application was found and imported, but `app.build_manifest()` raised — a declaration error (duplicate id, a `form()` given a display widget, an invalid option, the `def ui()` trap above, and so on). |
| `2` | The application itself could not be found or imported — wrong path/module, no `app`/`App` instance discoverable, or an import-time exception in the target module. |

(Both exit codes reproduced directly while writing this page: a target with no
discoverable app exits `2`; a target that imports fine but declares a duplicate widget id
exits `1`.) When discovery fails (`2`), the error names every location it searched:

```
lcars check: error: no LCARS application found under .
searched:
  ./app.py
  ./main.py
  ./src/<package>/app.py
  ./<package>/app.py
pass an explicit target instead, for example: lcars check src/myapp/app.py, or lcars check myapp.app:app
```

Pass an explicit target (`lcars check src/myapp/app.py`, `lcars check myapp.app:app`)
when the default search order (`./app.py`, `./main.py`, `./src/<package>/app.py`,
`./<package>/app.py`) doesn't find your layout. For a *behavior* regression that
`lcars check` can't see (it doesn't run action handlers), see
`app.test_client()` in [Actions and State](Actions-and-State#testing-actions).

## `lcars migrate` finds more than expected, or seems to find nothing

`lcars migrate path/to/app.py` is a static AST scan — it never imports or executes your
code, so it's safe to run against an app that no longer boots. It typically finds *more*
call sites than a manual `grep 'if lcars\.'` would, because it also flags retained return
values used later (`mode = lcars.select(...)` read three lines down, not just an `if`) —
see [docs/migration.md](https://github.com/darsrc/LCARS-WebUI/blob/main/lcars-ui/docs/migration.md#why-the-count-surprises-people)
for the real numbers from this repository's own port. It exits `0` with zero findings,
`1` while findings remain, `2` on a scan error such as a bad path or unparseable syntax.

## Action acks succeed but manifest never changes

Every `/lcars/*` route except `/lcars/schema` is session-scoped: each browser tab (or
each independent HTTP client) has its own server-issued session holding its widget
state and private effects. Plain HTTP requests — `/lcars/manifest`,
`/lcars/action/{id}`, `/lcars/input/{id}`, `/lcars/form/{id}`, and the upload routes —
carry the session token in an `X-Lcars-Session` request header (`/lcars/ws` and
`/lcars/events` carry it as a `?session=` query parameter instead, since the browser's
native `WebSocket`/`EventSource` APIs cannot set custom headers).

The trap: a request with no token, or a token the server doesn't recognize, is **not
rejected**. It silently succeeds under a brand-new, disposable session instead — there
is nothing to grep for, no error, no warning. `POST /lcars/action/{id}` without the
header still returns a normal `action_ack` with `"status": "ok"`, but the handler's
private `ctx.update(...)` effect lands in the session that call just minted (and will
never be visited again). A follow-up `GET /lcars/manifest` — with no header, or a
different/stale token — mints or resolves yet *another* session and never sees the
change.

Reproduced against `examples/bridge_ops/app.py` on port 8077 (its `bridge-shields`
action calls `ctx.update("bridge-shieldstatus", value=..., status=..., color=...)`):

```bash
$ curl -sS -X POST http://127.0.0.1:8077/lcars/action/bridge-shields \
    -H "Content-Type: application/json" -d '{"value": false}'
{"v":"2.0","ts":1787971393.6426632,"type":"action_ack","payload":{"action_id":"bridge-shields","status":"ok"}}
```

`"status": "ok"` — looks fine. But that call carried no `X-Lcars-Session` header, so it
minted its own session and the update went nowhere anyone will ever check. A manifest
fetch under the *original* session token still shows the pre-toggle state
(`value='ACTIVE' status='ok' color='blue'`, not `'DOWN' 'warn' 'yellow'`).

**The fix:** capture the token `GET /lcars/manifest` hands back in its `X-Lcars-Session`
*response* header, and send that same value back as the `X-Lcars-Session` *request*
header on every call that should affect (or read) that session:

```bash
TOKEN=$(curl -sS -D - http://127.0.0.1:8077/lcars/manifest -o /dev/null \
  | grep -i '^x-lcars-session:' | awk '{print $2}' | tr -d '\r')

curl -sS -X POST http://127.0.0.1:8077/lcars/action/bridge-shields \
  -H "X-Lcars-Session: $TOKEN" -H "Content-Type: application/json" -d '{"value": false}'

curl -sS -H "X-Lcars-Session: $TOKEN" http://127.0.0.1:8077/lcars/manifest   # now reflects it
```

The bundled frontend does this automatically (`sessionStorage`, one token per tab) — this
only bites a manual curl/HTTP-fallback client that skips it. See the [README's server
routes section](https://github.com/darsrc/LCARS-WebUI/blob/main/lcars-ui/README.md#server-routes)
for the full worked example, and
[docs/deployment.md](https://github.com/darsrc/LCARS-WebUI/blob/main/lcars-ui/docs/deployment.md)
if a reverse proxy sits in front — one that strips unrecognized headers breaks session
continuity the same silent way, since every individual request still returns `200`.

## WebSocket does not connect

Verify the reverse proxy forwards upgrades for `/lcars/ws`. SSE and HTTP fallbacks can
keep the app usable, but WebSocket should be available.

## GitHub Wiki looks stale

GitHub Wikis are separate git repositories. Updating a checked-in `wiki/` directory in
the main repo does not update the live Wiki tab. Push to:

```bash
https://github.com/darsrc/LCARS-WebUI.wiki.git
```

---

**See Also:** [Getting Started](Getting-Started) · [Deployment](Deployment) · [Reference](Reference)
