# Input Widgets

Input widgets return values during action handling and optimistically update the browser state.

Initial state:

![Input widgets initial state](images/input-widgets-initial.png)

Active state:

![Input widgets active state](images/input-widgets-active-states.png)

## Buttons

`button` returns `True` when the matching action is handled.

```python
if lcars.button("Execute", color="orange", id="execute"):
    lcars.notify("Execute pressed.")
```

## Boolean Controls

Use `toggle` for ON/OFF state and `checkbox` for LCARS checkbox state.

```python
armed = lcars.toggle("Autocycle", value=True, color="hopbush")
enabled = lcars.checkbox("Safety Interlock", value=True, color="lilac")
```

## Choice Controls

Use `select`, `radio`, or `radio_toggle` depending on density and visual treatment.

```python
mode = lcars.select(
    "Operating Mode",
    ["Cruise", "Alert", "Diagnostics"],
    value="Cruise",
)

band = lcars.radio("Band", ["A", "B", "C"], value="B")
gain = lcars.radio_toggle("Gain", ["Low", "Mid", "High"], value="Mid")
```

## Text and Number Inputs

```python
operator = lcars.text_input("Operator Code", placeholder="operator code")
threshold = lcars.number_input("Threshold", value=5.5, min=0, max=9.99, step=0.1)
```

## Forms

Forms group input payloads and submit through a single action id.

```python
with lcars.form("Composite Form", action_id="commit", submit_label="Commit"):
    lcars.text_input("Form Text", placeholder="entry", id="form-text")
    lcars.number_input("Form Number", value=3, min=0, max=10, id="form-number")
    lcars.toggle("Form Toggle", value=False, id="form-toggle")
    lcars.select("Form Select", ["One", "Two"], value="One", id="form-select")
```

