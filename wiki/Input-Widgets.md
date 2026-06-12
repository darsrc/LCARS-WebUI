# Input Widgets

Input widgets are declared in the same Python function as display widgets, but they also
return values when the browser sends an action back to the server. The practical rule is:
declare every input on every run, give important inputs stable ids, and put side effects
inside the specific action branch that should trigger them.

Initial state:

![Input widgets initial state](images/input-widgets-initial.png)

Active state:

![Input widgets active state](images/input-widgets-active-states.png)

## Quick Reference

| Widget | Returns | Best for |
| --- | --- | --- |
| `button(label, id=...)` | `True` only for the click being handled | Momentary commands |
| `toggle(label, value=False, id=...)` | `bool` | Persistent ON/OFF state |
| `checkbox(label, value=False, id=...)` | `bool` | Persistent checked state |
| `select(label, options, value=None, id=...)` | `str` | Compact single choice |
| `radio(label, options, value=None, id=...)` | `str` | Visible single choice |
| `radio_toggle(label, options, value=None, id=...)` | `str` | Dense segmented choice |
| `text_input(label, placeholder="", password=False, id=...)` | `str` | Text entry |
| `number_input(label, value=0.0, min=None, max=None, step=1.0, id=...)` | `float` | Numeric entry |
| `form(label, action_id=...)` | context manager | Submit several inputs together |

## Widget Identity

Every input needs a stable widget id because the id is used for event routing and session
state. If you omit `id`, LCARS-WebUI derives one from the label:

```python
lcars.button("Refresh Telemetry")  # id becomes "refresh-telemetry"
```

That is convenient for prototypes, but production apps should pass explicit ids for
anything that handles actions, keeps state, or receives `lcars.update(...)`.

```python
if lcars.button("Refresh Telemetry", id="refresh-telemetry"):
    lcars.append_log("ops-log", "Telemetry refresh requested")
```

Changing a label changes the generated id and resets browser-session state. Reusing an
explicit id twice in one UI function call raises `ValueError`.

## Buttons

`button` is a momentary command. It returns `False` while the manifest is being built and
returns `True` only during the rerun caused by that specific click.

```python
if lcars.button("Execute", color="orange", id="execute"):
    lcars.notify("Execute pressed.")
    lcars.append_log("ops-log", "EXECUTE accepted")
```

Use a button when the user is asking the app to do something now. Do not use a button to
store ON/OFF state; use `toggle` or `checkbox` for that.

### Updating other widgets from a button

Give the target widget an id, then call `lcars.update` inside the button branch.

```python
lcars.metric("Core Output", "87%", status="ok", id="core-output")

if lcars.button("Refresh Telemetry", color="anakiwa", id="refresh-telemetry"):
    lcars.update("core-output", value="91%", status="warn")
    lcars.notify("Telemetry refreshed.")
```

`lcars.update`, `lcars.notify`, and `lcars.append_log` are no-ops during the initial build,
so they belong in action branches or `@lcars.live` callbacks.

## Boolean Controls

Use `toggle` for an ON/OFF switch and `checkbox` for a checked/unchecked LCARS control.
Both return the current boolean state and persist it per browser session by widget id.

```python
autocycle = lcars.toggle("Autocycle", value=True, color="hopbush", id="autocycle")
interlock = lcars.checkbox(
    "Safety Interlock",
    value=True,
    color="lilac",
    id="safety-interlock",
)

if lcars.button("Commit Mode", id="commit-mode"):
    lcars.append_log("ops-log", f"autocycle={autocycle} interlock={interlock}")
```

The `value=` argument is the initial fallback. Once a browser session changes the control,
the stored value wins until the session is cleared or the id changes.

For custom HTTP or WebSocket clients, send real JSON booleans (`true` or `false`). Strings
such as `"false"` are not a safe substitute for boolean payloads.

## Choice Controls

Use `select`, `radio`, or `radio_toggle` for a single string choice.

```python
mode = lcars.select(
    "Operating Mode",
    ["Cruise", "Alert", "Diagnostics"],
    value="Cruise",
    color="lilac",
    id="operating-mode",
)

band = lcars.radio("Band", ["A", "B", "C"], value="B", id="sensor-band")
gain = lcars.radio_toggle("Gain", ["Low", "Mid", "High"], value="Mid", id="gain")
```

When `value` is omitted, the first option is the default. If `options` is empty, the return
value is `""`.

The browser UI only offers the declared options, but the server-side DSL stores the action
payload it receives. If you accept input from custom clients, validate the returned value
before using it for important behavior.

```python
allowed_modes = ["Cruise", "Alert", "Diagnostics"]
mode = lcars.select("Operating Mode", allowed_modes, value="Cruise", id="mode")

if mode not in allowed_modes:
    mode = "Cruise"
```

## Text Input

`text_input` returns the current string value. `placeholder` only affects the browser hint;
the returned value is still `""` until the user enters text.

```python
operator = lcars.text_input(
    "Operator Code",
    placeholder="operator code",
    id="operator-code",
)

if lcars.button("Authenticate", id="authenticate"):
    code = operator.strip()
    if not code:
        lcars.notify("Operator code required.", level="error")
    else:
        lcars.append_log("ops-log", f"operator={code}")
```

`password=True` masks the field in the browser, but the submitted value still travels to
the server and is stored in the session state for that widget id. Do not treat it as
encrypted secret storage.

## Number Input

`number_input` returns a `float`. Invalid submitted values fall back to the previously
stored value. New submitted values are clamped to `min` and `max` when those bounds are set.

```python
threshold = lcars.number_input(
    "Threshold",
    value=5.5,
    min=0,
    max=9.99,
    step=0.1,
    id="threshold",
)

if lcars.button("Apply Threshold", id="apply-threshold"):
    lcars.append_log("ops-log", f"threshold={threshold:.1f}")
```

`step` controls browser increment behavior; it is not a server-side divisibility rule. If
you need only whole numbers or a fixed set of increments, validate or round the returned
float in your handler.

## Forms

Forms group input widgets into one submit action. A form can contain only input widgets;
putting text, charts, or other display widgets inside a form raises `ValueError`.

```python
with lcars.form("Composite Form", action_id="commit", submit_label="Commit", id="ops-form"):
    form_text = lcars.text_input("Form Text", placeholder="entry", id="form-text")
    form_number = lcars.number_input("Form Number", value=3, min=0, max=10, id="form-number")
    form_toggle = lcars.toggle("Form Toggle", value=False, id="form-toggle")
    form_select = lcars.select("Form Select", ["One", "Two"], value="One", id="form-select")
```

When the form is submitted, the child input payload is written into session state before
the UI function reruns. That means the child input calls above return the submitted values
during the form-submit rerun and on later reruns for the same session.

Current API caveat: `lcars.form()` is a context manager and does not return a `submitted`
boolean like `lcars.button()`. Use forms when you want grouped browser submission and
state hydration. Use a button plus individual input widgets when you need a clear Python
branch for side effects.

```python
operator = lcars.text_input("Operator Code", id="operator-code")
threshold = lcars.number_input("Threshold", value=5, min=0, max=10, id="threshold")

if lcars.button("Commit", color="orange", id="commit"):
    lcars.append_log("ops-log", f"{operator=} {threshold=}")
```

## Common Edge Cases

| Case | Behavior | Recommended handling |
| --- | --- | --- |
| Label changes with no explicit `id` | Generated id changes and state resets | Use explicit ids for stable controls |
| Duplicate explicit ids | Build raises `ValueError` | Keep ids unique in one `ui()` call |
| Button value needed later | Buttons do not persist state | Store the result elsewhere or use a toggle |
| Empty select/radio options | Returns `""` | Avoid empty options or handle the empty string |
| Choice payload not in options | Server stores the received string | Validate when accepting custom clients |
| Number payload is invalid | Previous numeric value is kept | Validate and notify if strict input is required |
| Number value outside bounds | New action values clamp to `min`/`max` | Still choose an initial `value` inside bounds |
| Effects outside action branches | Can run on any action rerun | Keep effects under `if lcars.button(...)` or `@lcars.live` |
