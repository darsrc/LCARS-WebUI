# Reference

Compact reference for the public `lcars_ui` DSL.

## Import

```python
import lcars_ui as lcars
```

## Lifecycle

```python
lcars.config(name, theme="galaxy", subtitle=None, header_color="orange", sound_enabled=True, lang="en-US", force_uppercase=True, label_uppercase=True, lcars_font_headers=True, lcars_font_labels=True, lcars_font_text=False, visual_language="strict", strict_renderer="legacy")

lcars.run(ui_fn, host="127.0.0.1", port=8000, open_browser=True)

@lcars.live(interval=5.0)  # WebSocket push tick; register inside __main__ only
def tick() -> None: ...
```

## Pages

```python
lcars.nav(label, page=None, color=None, segments=None)

with lcars.page(title, id=None, layout="auto"):
    ...
```

Layouts: `auto`, `console`, `telemetry`, `grid`, `menu`.

## Containers

```python
with lcars.data_panel(title="Data", color="blue", id=None, zone=None): ...
with lcars.control_panel(title="Controls", color="orange", id=None, zone=None): ...
with lcars.console(title, color="orange", id=None, zone=None) as console: ...
with lcars.padd(title, color="orange", id=None, zone=None) as padd: ...
with lcars.diagnostic(title, color="blue", id=None, zone=None) as diagnostic: ...
with lcars.box(title=None, subtitle=None, color="orange", id=None, zone=None) as box: ...
with lcars.sweep(title=None, subtitle=None, color="orange", reverse=False, id=None, zone=None) as sweep: ...
with lcars.bracket(color="orange", orientation="both", id=None, zone=None): ...
```

Slots:

```python
with box.main(): ...
with box.side(): ...
with box.left_inputs(): ...
with box.right_inputs(): ...

with sweep.header(): ...
with sweep.column_inputs(): ...
with sweep.left(): ...
with sweep.right(): ...
```

Compatibility helpers:

```python
with lcars.row(height="auto"): ...
with lcars.col(width="1fr"): ...
lcars.columns(["2fr", "1fr"])
with lcars.section(label, color=None): ...
with lcars.input_column(side="left"): ...
with lcars.raw(reason=None): ...
```

Zones: `primary`, `side`, `readout`, `dock`, `rail`, `full`.

## Primitive Widgets

```python
lcars.header(text_value, size="h2", color=None, id=None)
lcars.text(content, size="body", color=None, id=None)
lcars.markdown(content, color=None, id=None)
lcars.metric(label, value, status="ok", color=None, id=None)
lcars.alert(message, level="yellow", blink=False, id=None)
lcars.progress(label, value, color=None, show_label=True, id=None)
```

Values:

- `text(size)`: `h1`, `h2`, `body`, `mono`
- `header(size)`: `h1` through `h6`
- `metric(status)`: `ok`, `warn`, `crit`
- `alert(level)`: `yellow`, `red`

## Data Widgets

```python
lcars.chart(data, title=None, color=None, id=None)
lcars.sparkline(data, title=None, id=None)
lcars.candlestick(data, *, title=None, markers=None, up_color=None, down_color=None, color=None, id=None)
lcars.renko(data, brick_size, *, title=None, markers=None, up_color=None, down_color=None, color=None, id=None)
lcars.shader(fragment_shader, *, title=None, uniforms=None, aspect_ratio=None, color=None, id=None)
lcars.gauge(label, value, min=0.0, max=100.0, unit=None, color=None, warn_threshold=None, crit_threshold=None, id=None)
lcars.table(data, title=None, id=None)
```

`chart`/`sparkline` data: numeric list, dictionary of named numeric lists, pandas `DataFrame`, or pandas `Series`.

`candlestick` data: `list[dict]` with `time/open/high/low/close` keys, or pandas `DataFrame` with those columns.

`renko` data: `list[float]`, `list[dict]` with `"close"` or `"price"` key, or pandas `Series`. `brick_size` is the price movement per brick.

`shader` `fragment_shader`: GLSL ES 1.00 `void main()` body. Built-in uniforms: `u_time` (float), `u_resolution` (vec2), `v_uv` (varying vec2). Custom uniforms via `uniforms` dict.

Table data: list of dictionaries, list of lists or tuples, flat list, or pandas `DataFrame`.

## Input Widgets

```python
clicked = lcars.button(label, color=None, id=None)
checked = lcars.toggle(label, value=False, color=None, id=None)
checked = lcars.checkbox(label, value=False, color=None, id=None)
choice = lcars.select(label, options, value=None, color=None, id=None)
choice = lcars.radio(label, options, value=None, color=None, id=None)
choice = lcars.radio_toggle(label, options, value=None, color=None, id=None)
text = lcars.text_input(label, placeholder="", password=False, id=None)
number = lcars.number_input(label, value=0.0, min=None, max=None, step=1.0, placeholder=None, id=None)

with lcars.form(label, action_id, submit_label="Submit", color=None, id=None): ...
```

Input widgets are meant to be assigned:

```python
execute_clicked = lcars.button("Execute", id="execute")
mode = lcars.select("Mode", ["Cruise", "Alert"], value="Cruise", id="mode")

if execute_clicked:
    lcars.append_log("ops-log", f"mode={mode}")
```

Display widgets return `None`; use ids and `lcars.update(...)` when you need to change
them later.

## Media

```python
lcars.log(stream_id, max_lines=1000, title=None, id=None)
lcars.video_hls(src, title=None, autoplay=False, muted=False, color=None, id=None)
lcars.mic_button(action_id, title=None, upload_url="/lcars/upload/audio", timeout_ms=5000, color=None, id=None)
```

## Effects

```python
lcars.update(widget_id, **fields)
lcars.notify(message, level="info")
lcars.append_log(stream_id, *lines)
lcars.set_alert_condition(level)
lcars.set_theme(theme)
```

Values:

- `notify(level)`: `info`, `error`
- `set_alert_condition(level)`: `normal`, `yellow`, `red`
- `set_theme(theme)`: `galaxy`, `tng`, `nemesis`

## Themes and Colors

Themes: `galaxy`, `tng`, `nemesis`.

Common color names:

- Warm: `orange`, `orange-peel`, `atomic-tangerine`, `golden-tanoi`, `sandy-brown`
- Yellow: `pale-canary`, `tanoi`, `husk`, `yellow`
- Blue: `anakiwa`, `mariner`, `bahama-blue`, `danub`, `near-blue`, `navy-blue`
- Purple: `lilac`, `melrose`, `lavender-purple`, `purple`
- Red: `red`, `hopbush`, `chestnut-rose`, `red-damask`, `tamarillo`

Hex colors such as `#ff9933` are accepted.

---

**See Also:** [Widgets](Widgets) · [Actions and State](Actions-and-State) · [Recipes](Recipes) · [Deployment](Deployment)
