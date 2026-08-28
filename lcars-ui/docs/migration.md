# Migrating from v6 to v7

v7 removes the Streamlit-style rerun. This is the single change everything else in this
guide follows from, so read this paragraph twice if you skim the rest.

In v6, `lcars.run(ui)` called your `ui()` function once to build the page, then called it
again, in full, on every browser action — inputs came back with their current values,
`button()` returned `True` only on the rerun its own click caused, and you read results
by branching on return values (`if lcars.button("Engage"): ...`). In v7, `ui()`-as-rerun
is gone. You declare each page's widgets **once**, inside a function registered with
`@app.page(...)`, and you handle actions **explicitly**, inside a function registered
with `@app.action("widget-id")`. A page function never runs again after startup; an
action handler runs once per matching action and receives the event's value on
`ctx.value`.

This is not a rename. `if lcars.button(...):` still imports, still declares a button, and
still parses — it simply never becomes true again, because nothing reruns it. Nothing
raises, no test fails by itself, the button still renders. The feature it guarded just
stops working, silently. That is what `lcars migrate` exists to find before your users do.

## Step 1: run the scanner

```bash
lcars migrate path/to/your_app.py
# or a whole project:
lcars migrate src/
```

It is purely static — an AST walk, never an import, never an execution of your code — so
it is safe to run against an application that no longer boots. It exits `0` when there is
nothing left to change, `1` while findings remain, and `2` on a scan error (bad path,
syntax error it can still report on, etc.).

Here is real output, captured from a small v6-shaped file:

```console
$ lcars migrate v6_app.py
v6_app.py:
  9:5 [app_lifecycle_call] lcars.config("Bridge Ops", theme="galaxy", subtitle="NCC-1701-D")
    Replacement: Create `app = App()` and move this application configuration into the v7 App lifecycle.
  10:5 [app_lifecycle_call] lcars.nav("Overview", page="overview", color="pale-canary")
    Replacement: Register the destination with `@app.page(..., nav=True)`; App page registration owns v7 navigation.
  12:10 [app_lifecycle_call] with lcars.page("Overview", id="overview", layout="console"):
    Replacement: Replace the context-manager page with a function decorated by `@app.page("...", path="/...", nav=True)` and author its body through `ui`.
  13:14 [flat_widget_call] with lcars.data_panel("Telemetry", id="telemetry"):
    Replacement: Inside an `@app.page(...)`, replace this call with `ui.data_panel(...)`.
  14:13 [flat_widget_call] lcars.metric("Shields", "100%", status="ok", id="shields")
    Replacement: Inside an `@app.page(...)`, replace this call with `ui.metric(...)`.
  15:13 [flat_widget_call] lcars.chart([82, 84, 87, 91, 95], title="Warp Field")
    Replacement: Inside an `@app.page(...)`, replace this call with `ui.chart(...)`.
  17:14 [flat_widget_call] with lcars.control_panel("Commands", id="commands"):
    Replacement: Inside an `@app.page(...)`, replace this call with `ui.control_panel(...)`.
  18:22 [flat_widget_call] factor = lcars.number_input(
    Replacement: Inside an `@app.page(...)`, replace this call with `ui.number_input(...)`.
  18:22 [rerun_return_value] factor = lcars.number_input(
    Replacement: Declare `ui.number_input(..., id="...")` in an `@app.page(...)`, then move the return-value-dependent logic into `@app.action("...")` (read the event value from `ctx.value` when needed).
  21:16 [flat_widget_call] if lcars.button("Engage", id="engage"):
    Replacement: Inside an `@app.page(...)`, replace this call with `ui.button(...)`.
  21:16 [rerun_return_value] if lcars.button("Engage", id="engage"):
    Replacement: Declare `ui.button(..., id="...")` in an `@app.page(...)`, then move the return-value-dependent logic into `@app.action("...")` (read the event value from `ctx.value` when needed).
  25:2 [module_global_live] @lcars.live(interval=2.0)
    Replacement: Create `app = App()` and replace this decorator with `@app.live(interval=..., audience="all")` (choose `"session"` instead when updates must be session-scoped).
  31:5 [run_call] lcars.run(ui)
    Replacement: Create `app = App()`, register declarative functions with `@app.page(...)`, author their contents through `ui`, and serve the v7 App lifecycle instead of calling `run(ui)`.

Summary: 13 finding(s)
  run_call: 1
  module_global_live: 1
  app_lifecycle_call: 3
  flat_widget_call: 6
  rerun_return_value: 2
```

`--json` emits the same findings as stable, machine-readable JSON (`schema_version`,
one entry per file, a `summary.by_kind` count) if you want to drive your own port or a CI
gate from it.

Once every finding is gone:

```console
$ lcars migrate examples/bridge_ops/app.py
No LCARS UI v7 migration findings.
Summary: 0 finding(s)
```

### What each finding kind means

| Kind | What it found | What you do |
| --- | --- | --- |
| `removed_import` | `from lcars_ui import button, page, run, ...` — a name that no longer lives at the package root | Import `ui`, `advanced`, and/or `App` instead (see the split below) |
| `run_call` | `lcars.run(ui_fn)` | Create `app = App()`, register pages with `@app.page`, call `app.serve()` |
| `module_global_live` | a module-level `@lcars.live(...)` decorator | Create `app = App()` and use `@app.live(interval=..., audience=...)` |
| `app_lifecycle_call` | `lcars.config(...)`, `lcars.nav(...)`, or a top-level `with lcars.page(...):` | Move it onto `app.config(...)` / `@app.page(..., nav=True)` |
| `flat_widget_call` | any ordinary or specialist widget called off the package root | Prefix it with `ui.` or `advanced.` (see the split below) |
| `rerun_return_value` | a widget call whose **return value is used** — not just declared and discarded | Declare the widget in `@app.page`, then move whatever used the old value into `@app.action("widget-id")` and read it from `ctx.value` |
| `parse_error` | the file has a syntax error and could not be parsed at all | Fix the syntax error; the scanner cannot see past it |

`lcars migrate` never rewrites your code. Converting `if lcars.button(...):` into an
action handler is a control-flow change — the scanner can point at every site, but only
you know what the branch was supposed to do once it fired.

## Why the count surprises people

If you migrate by eye, you will grep for `lcars.run(` and `if lcars.button(`, fix those,
and believe you are done. You are not. `lcars migrate` was built as the actual instrument
for porting this repository's own 15 bundled examples (`examples/`, including
applications shaped like real products — a trading dashboard, a coding-assistant console,
a game-planning tool — alongside smaller internal demos), and its first inventory found
**113 rerun-dependent call sites** against a **hand-grep estimate of 76**. The 37-site gap
was not a bug in the scanner — every one of the 113 was real. It is retained return
values: not just `if lcars.button(...):`, but `mode = lcars.select(...)` where `mode` gets
read three lines later, or embedded in an f-string, or stored in a dict, or passed to
another function. None of those match a `grep 'if lcars\.'` pattern, and all of them are
just as dead as the `if` after the rerun is gone.

A real one, from this repository's own port — `examples/bridge_ops/app.py`, inside its
"Tactical Actions" panel, **before** (v6):

```python
mode = lcars.select(
    "Tactical Mode", ["Passive", "Active", "Combat"], value="Passive", id="bridge-mode"
)
lcars.metric("Active Mode", mode.upper(), color="blue", id="bridge-activemode")
```

There is no `if`, no branch, nothing a return-value grep would flag — `mode` is simply
used two lines later, the way any ordinary local variable is. That is precisely the shape
`lcars migrate` catches and eyeballing misses. **After** (v7, commit `cb115ec`):

```python
# in the @app.page function — declares the widget with its starting value:
ui.select(
    "Tactical Mode", ["Passive", "Active", "Combat"], value="Passive", id="bridge-mode"
)
ui.metric("Active Mode", "PASSIVE", color="blue", id="bridge-activemode")

# elsewhere in the same module — handles what changing it does:
@app.action("bridge-mode")
def tactical_mode(ctx: ActionContext[str]) -> None:
    ctx.update("bridge-activemode", value=ctx.value.upper())
```

The widget's declaration keeps its static starting value; the logic that used to run on
every rerun moves into a handler that runs once, when the selection actually changes, and
reaches the new value through `ctx.value` instead of a captured local.

For the complete picture, see the two commits that did this repository's own port:
`git show 4dcc66a` (wave 1e, removes the rerun — "Its first inventory found 113
rerun-dependent sites against a hand-grep estimate of 76") and `git show cb115ec` (wave
1f, splits the flat namespace into `ui`/`advanced`).

## The `def ui()` trap

This deserves its own section because the error it produces does not name the cause, and
it is exactly the mistake the v6 docs' own idiom sets you up to make.

v6's documented convention was to name your page-building function `ui`:

```python
def ui() -> None:
    ...

if __name__ == "__main__":
    lcars.run(ui)
```

v7 gives you a module also called `ui` — `lcars_ui.ui`, home of `text`, `button`,
`data_panel`, and the rest of the ordinary widget vocabulary:

```python
from lcars_ui import App, ui
```

Import that into a module that still has `def ui() -> None:` sitting in it, and Python
does exactly what Python always does with two module-level bindings of the same name:
whichever one executes last wins, silently, for the rest of the module. Nothing warns
you. The file imports cleanly. It is only when some *other* function in the module tries
to call `ui.text(...)` that it discovers `ui` is not the module it imported — it is that
leftover function, still sitting there from the rerun era:

```console
Traceback (most recent call last):
  ...
  File "ui_trap.py", line 22, in bridge
    ui.text("hello", id="greeting")
    ^^^^^^^
AttributeError: 'function' object has no attribute 'text'
```

`'function' object has no attribute 'text'` never says the word `ui`, never says
"shadowed," and never points at the `def ui():` line — only at the call site that
happened to be first to touch the broken name. During this library's own v7 port this
broke seven test files and one example before anyone noticed the pattern.

**The fix:** rename the old page-building function. It is no longer special — it doesn't
get passed to `run()` any more, so it doesn't need to be called `ui`:

```python
from lcars_ui import App, ui

app = App()

@app.page("Bridge", id="bridge")
def bridge_page() -> None:      # <- was `def ui():`
    ui.text("hello", id="greeting")
```

If your editor or `ruff`/`pyflakes` flags "redefinition of unused `ui`," that warning
*is* this bug, caught before runtime — do not silence it, rename the function.

## The namespace split

v7 replaces the 196-name flat root namespace with two curated modules:

- **`lcars_ui.ui`** (33 names) — what an ordinary operations app needs: panels, text,
  readouts, the common controls, tables, charts, forms.
- **`lcars_ui.advanced`** (27 names) — composition, the Surface Engine, graph workspaces,
  specialist media (`three_scene`, `shader`, `mic_button`, `video_hls`), and the
  surviving knowledge-graph widgets (`support_panel`, `tri_state`).

`lcars migrate` tells you which of the two a given removed name belongs in — that
classification is exactly `ADVANCED_CALLS` vs. `UI_CALLS` in `src/lcars_ui/migration.py`,
kept in sync with the real `lcars_ui.advanced.__all__` / `lcars_ui.ui.__all__`. If you are
not sure whether something is `ui.` or `advanced.`, trust the scanner's replacement text
over memory or the old docs.

Effects stay importable from the package root, unchanged: `update`, `notify`,
`append_log`, `set_theme`, `set_alert_condition`. They are not widgets, so
`lcars migrate` never flags them.

## Recipe: porting one page

1. **Create the App once**, near the top of the module: `app = App()`.
2. **Move `lcars.config(...)` to `app.config(...)`** (same keyword arguments).
3. **Turn each `with lcars.page("Title", id="...", ...):` block into a function**
   decorated with `@app.page("Title", id="...", ...)`. `path=` and `nav=` move here too —
   `lcars.nav(...)` calls disappear; pass `nav=True` (the default) or `nav=False` on the
   page itself.
4. **Prefix every widget call** with `ui.` or `advanced.`, per `lcars migrate`'s
   replacement text.
5. **Find every widget whose return value was used** (not just declared). For each one:
   - Keep the declaration in the page function, with its starting/default value.
   - Move whatever consumed the old return value into a new function decorated with
     `@app.action("that-widget's-id")`, taking `ctx: ActionContext[T]`.
   - Read the event's value from `ctx.value` instead of the old local variable.
   - Replace `lcars.update(...)`, `lcars.notify(...)`, `lcars.append_log(...)`,
     `lcars.set_theme(...)`, `lcars.set_alert_condition(...)` calls inside the handler
     with `ctx.update(...)`, `ctx.notify(...)`, etc. — the `ActionContext` methods route
     the effect privately to the session that triggered it by default (pass
     `audience="all"` to broadcast instead).
6. **Move a module-level `@lcars.live(...)` job** to `@app.live(interval=..., audience=...)`.
   Inside it, the plain root-level effect functions (`lcars_ui.update`, `.notify`, ...)
   still work as before — a live job has no `ActionContext`, since it isn't triggered by
   one session's action.
7. **Replace `lcars.run(ui)`** with `app.serve(host=..., port=..., open_browser=...)`,
   normally inside `if __name__ == "__main__":`.
8. **Re-run `lcars migrate`** on the file. Keep going until it reports zero findings.
9. **Run `lcars check`** to build the manifest and catch anything the AST scan can't see
   (an `AttributeError` from the `def ui()` trap above, a missing action handler, etc.).

## Forms

If you had `with lcars.form(label, action_id, ...):` wrapping a block of inputs, that
pattern still exists in v7 as `with ui.form(label, action_id=..., ...):` — port it the
same way as any other container. If the values it collected map onto a Pydantic model,
consider switching to the new model-backed form instead: `ui.form(YourModel,
action_id=...)` generates and validates the fields for you. See
[quickstart.md](quickstart.md#testing-forms) for a runnable example.

## Testing the result

`app.test_client()` dispatches real actions — through the same registry, event bus, and
acknowledgement path a browser would use — without a socket or a browser. It is the
fastest way to confirm a ported page and handler actually do what the old rerun branch
used to do. See [quickstart.md](quickstart.md#test-your-app) for a full example; the
short version:

```python
with app.test_client() as client:
    session = client.session()
    session.action("bridge-mode", "active")
    assert session.widget("bridge-activemode").value == "ACTIVE"
```

## When you're done

`lcars migrate your_app.py` reports zero findings, `lcars check your_app.py` builds and
validates the manifest, and your tests exercise every action through
`app.test_client()`. None of the three replaces the other two: the scanner only proves the
old API surface is gone, `check` only proves the manifest still builds, and your own
tests are the only thing that proves the behavior survived the port.
