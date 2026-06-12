# Usage Patterns and Edge Cases

This page explains the parts of LCARS-WebUI that affect almost every app: reruns,
widget ids, input state, live updates, and the edge cases that are easiest to miss.

## Execution Model

An LCARS-WebUI app starts with a Python function that declares the interface. That UI
function is called for the initial build and for browser action handling; `@lcars.live`
callbacks run separately for autonomous updates.

| Mode | When it happens | What widget calls do |
| --- | --- | --- |
| Build | `lcars.run(ui)` starts the app | Build the manifest and return defaults |
| Handle | A browser action/input/form submit arrives | Re-run the function and return current input values |
| Live | An `@lcars.live` callback fires | Publish updates, logs, and notifications |

Because the UI function can rerun, keep declarations deterministic. Declare the same
widgets with the same ids on each run, then put effects inside the matching action branch.

```python
def ui() -> None:
    lcars.metric("Core Output", "87%", status="ok", id="core-output")

    if lcars.button("Refresh", id="refresh"):
        lcars.update("core-output", value="91%", status="warn")
        lcars.notify("Telemetry refreshed.")
```

## Stable Widget IDs

Widget ids drive three things: action routing, session state, and `lcars.update(...)`
targets. If you do not pass `id`, the DSL derives one from the label.

```python
lcars.toggle("Autocycle")  # derived id: "autocycle"
```

Generated ids are useful while sketching, but explicit ids are better for real apps:

```python
autocycle = lcars.toggle("Autocycle", value=True, id="engine-autocycle")
```

Use stable explicit ids when:

- The widget handles a button click or input change.
- The value should survive label copy edits.
- Another handler calls `lcars.update` for that widget.
- The widget is inside a form.

Duplicate explicit ids in one UI function call raise `ValueError`. Label-derived ids get a
numeric suffix when there is a collision, such as `status` and `status-2`.

## Inputs and Session State

Stateful inputs persist per browser session by widget id. `value=` is the initial fallback,
not a forced value on every rerun.

```python
armed = lcars.toggle("Armed", value=False, id="armed")

if lcars.button("Commit", id="commit"):
    lcars.append_log("ops-log", f"armed={armed}")
```

If the user flips `armed` to true, future reruns for that browser session return `True`
even though the declaration still says `value=False`.

The public DSL does not currently expose a direct session-state reset helper. To reset a
control, intentionally change its id or keep resettable application state in your own data
source and render from that source.

## Buttons Are Momentary

A button does not store state. It returns `True` only during the handler rerun for that
click.

```python
if lcars.button("Red Alert", color="red", id="red-alert"):
    lcars.set_alert_condition("red")
    lcars.notify("Red Alert!", level="error")
```

If code later needs to know whether a mode is enabled, use a `toggle`, `checkbox`, or a
separate application state source. Do not rely on a button returning `True` after the click
has been handled.

## Effects and Updates

Effects are only meaningful outside the initial build:

- `lcars.update(widget_id, **fields)` patches an existing widget in the browser.
- `lcars.notify(message, level="info")` shows a notification; use `level="error"` for failures.
- `lcars.append_log(stream_id, *lines)` appends to an `lcars.log(...)` stream.
- `lcars.set_alert_condition("normal"|"yellow"|"red")` changes the global alert tint.

Keep effects under an action branch or inside a live callback. If an effect is at top level,
it can run for any action rerun.

```python
# Good: effect belongs to one command.
if lcars.button("Acknowledge", id="ack"):
    lcars.append_log("ops-log", "ACKNOWLEDGE command accepted")

# Risky: this runs during every action rerun, not only one specific action.
lcars.append_log("ops-log", "some action happened")
```

`lcars.update` should target a widget id that exists in the current manifest. Updating a
missing id has no visible result in the browser.

## Forms

Use `lcars.form(...)` when the browser should submit several child inputs together.

```python
with lcars.form("Configure Warp", action_id="warp-submit", submit_label="Commit", id="warp-form"):
    warp = lcars.number_input("Warp Factor", value=5.0, min=0, max=9.99, id="warp-factor")
    dampeners = lcars.toggle("Inertial Dampeners", value=True, id="dampeners")
```

On submit, the child values are written into session state before the UI function reruns.
The child input calls then return the submitted values.

Current API caveat: `lcars.form()` does not return a submit flag. If you need a direct
Python branch for commit logic, place the inputs normally and use a `button`.

## Validation Boundaries

LCARS-WebUI validates widget schemas and protocol envelopes, but your app should still
validate domain rules.

| Input | Built-in behavior | App-level validation to consider |
| --- | --- | --- |
| Toggle/checkbox | Browser sends booleans | Reject custom-client strings like `"false"` |
| Select/radio | Browser offers declared options | Check returned value is still in your allowed list |
| Text input | Returns a string, default `""` | Trim, require, length-limit, or pattern-check |
| Number input | Converts to `float`, clamps submitted min/max | Enforce integer-only or business-specific ranges |
| Form | Hydrates child state | Check all required fields before acting |

## Live Updates

Use one `@lcars.live(interval=...)` callback for autonomous updates.

```python
@lcars.live(interval=2.0)
def poll() -> None:
    lcars.update("core-output", value="89%", status="ok")
    lcars.append_log("ops-log", "live telemetry frame")
```

Only one live callback is supported per app. Registering a second one raises
`RuntimeError`. Live callbacks should be small and defensive because they run repeatedly in
the server process.

## Layout Edge Cases

Strict LCARS pages work best when page-level content is made of LCARS containers such as
`data_panel`, `control_panel`, `box`, `console`, `padd`, `diagnostic`, `sweep`, or
`bracket`.

```python
with lcars.page("Bridge", id="bridge", layout="console"):
    with lcars.data_panel("Telemetry", id="telemetry"):
        lcars.chart([1, 3, 5, 8], title="EPS Flow")

    with lcars.control_panel("Command", id="command"):
        lcars.button("Acknowledge", id="ack")
```

Page-level primitive widgets in strict mode can render, but containers give the adaptive
layout engine enough structure to place primary content, side readouts, and control docks.

Use `zone=` only when auto-placement makes the wrong call:

```python
with lcars.data_panel("Readouts", zone="side", id="readouts"):
    lcars.metric("Core Output", "87%", status="ok")
```

## Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| Button branch never runs | Button id does not match the browser action | Pass an explicit stable `id` |
| Input keeps resetting | Generated id changed or browser session changed | Use explicit ids and stable page structure |
| Notification appears on unrelated actions | `notify` is outside a specific action branch | Move it under `if lcars.button(...)` or into `@lcars.live` |
| `lcars.update` appears to do nothing | Target id is missing or changed | Add an explicit id to the target widget |
| Form cannot contain a widget | Forms only accept input widgets | Move display widgets outside the form |
| Select/radio returns unexpected text | Custom client sent an arbitrary payload | Validate against the declared options |
