# Primitive Widgets

Primitive widgets cover text, markdown, status, alert, progress, and LCARS section header surfaces.

![Display widget states](images/display-widgets-states.png)

## `text`

Use `text` for plain content. Supported sizes are `h1`, `h2`, `body`, and `mono`.

```python
lcars.text("LCARS H1 SAMPLE", size="h1", color="pale-canary")
lcars.text("LCARS H2 SAMPLE", size="h2", color="anakiwa")
lcars.text("Body text sample with operational copy.")
lcars.text("MONO 1701-D // 47.23", size="mono", color="lilac")
```

If you plan to update text later, pass an explicit id. Generated text ids come from the
first 30 characters of the content, so copy edits can change the id.

## `markdown`

Use `markdown` for sanitized rich text blocks.

```python
lcars.markdown("### Markdown Panel\n\n- Rendered markdown\n- Sanitized HTML")
```

For updates, pass `id=` and update the `content` field:

```python
lcars.markdown("### Report\n\nPending", id="report")

if lcars.button("Refresh Report", id="refresh-report"):
    lcars.update("report", content="### Report\n\nComplete")
```

## `metric`

Use `metric` for compact state readouts. Supported status values are `ok`, `warn`, and `crit`.

```python
lcars.metric("Ready", "TRUE", status="ok")
lcars.metric("Thermal", "CAUTION", status="warn")
lcars.metric("Fault Bus", "LOCKED", status="crit")
```

## `alert`

Use `alert` for high-visibility banners. Supported levels are `yellow` and `red`.

```python
lcars.alert("Yellow alert simulation channel armed.", level="yellow")
lcars.alert("Red alert banner sample.", level="red", blink=True)
```

Use `lcars.set_alert_condition("yellow")` or `lcars.set_alert_condition("red")` when the
whole interface should move into an alert state. Use `alert` for a local banner inside a
panel.

## `progress`

Use `progress` for 0 to 100 segmented progress values.

```python
lcars.progress("Decode", 42, color="golden-tanoi")
lcars.progress("Shield Grid", 74, color="anakiwa")
```

Pass values in the 0 to 100 range. The DSL converts the value to `float`; choose your own
clamping if the source can go outside that range.

## `header`

Use `header` for LCARS section headers inside larger containers.

```python
lcars.header("Operational Summary", size="h3", color="pale-canary")
```
