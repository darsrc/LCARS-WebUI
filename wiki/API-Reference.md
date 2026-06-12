# API Reference

This page is a compact reference for the public `lcars_ui` DSL. For examples and edge
cases, use the widget pages and recipes.

## Import

```python
import lcars_ui as lcars
```

## App Lifecycle

```python
lcars.config(
    name,
    theme="galaxy",
    subtitle=None,
    header_color="orange",
    sound_enabled=True,
    lang="en-US",
    force_uppercase=True,
    label_uppercase=True,
    lcars_font_headers=True,
    lcars_font_labels=True,
    lcars_font_text=False,
    visual_language="strict",
    strict_renderer="legacy",
)

lcars.run(ui_fn, host="127.0.0.1", port=8000, open_browser=True)

@lcars.live(interval=5.0)
def poll() -> None:
    ...
```

`visual_language="strict"` is the supported visual language. `@lcars.live` supports one
callback per app.

## Navigation and Pages

```python
lcars.nav(label, page=None, color=None, segments=None)

with lcars.page(title, id=None, layout="auto"):
    ...
```

Valid page layouts: `auto`, `console`, `telemetry`, `grid`, `menu`.

`segments` is an optional list of dictionaries:

```python
lcars.nav(
    "Ops",
    page="ops",
    segments=[
        {"label": "A", "color": "anakiwa"},
        {"label": "B", "color": "lilac"},
    ],
)
```

## Layout and Containers

```python
with lcars.data_panel(title="Data", color="blue", id=None, zone=None) as panel:
    ...

with lcars.control_panel(title="Controls", color="orange", id=None, zone=None) as panel:
    ...

with lcars.console(title, color="orange", id=None, zone=None) as console:
    ...

with lcars.padd(title, color="orange", id=None, zone=None) as padd:
    ...

with lcars.diagnostic(title, color="blue", id=None, zone=None) as diagnostic:
    ...
```

Explicit containers:

```python
with lcars.box(title=None, subtitle=None, color="orange", id=None, zone=None) as box:
    ...

with lcars.sweep(title=None, subtitle=None, color="orange", reverse=False, id=None, zone=None) as sweep:
    ...

with lcars.bracket(color="orange", orientation="both", id=None, zone=None):
    ...
```

Container slots:

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

Compatibility layout helpers:

```python
with lcars.row(height="auto"):
    with lcars.col(width="1fr"):
        ...

cols = lcars.columns(["2fr", "1fr"])
with cols[0]:
    ...
with cols[1]:
    ...

with lcars.section(label, color=None):
    ...
```

Strict-mode escape hatches:

```python
with lcars.input_column(side="left"):
    ...

with lcars.raw(reason="custom layout"):
    ...
```

Valid zones: `primary`, `side`, `readout`, `dock`, `rail`, `full`. The current adaptive
frontend primarily uses `primary`, `side`, `dock`, and `full`.

## Primitive Widgets

```python
lcars.header(text_value, size="h2", color=None, id=None)
lcars.text(content, size="body", color=None, id=None)
lcars.markdown(content, color=None, id=None)
lcars.metric(label, value, status="ok", color=None, id=None)
lcars.alert(message, level="yellow", blink=False, id=None)
lcars.progress(label, value, color=None, show_label=True, id=None)
```

Allowed values:

- `text(size=...)`: `h1`, `h2`, `body`, `mono`
- `header(size=...)`: `h1`, `h2`, `h3`, `h4`, `h5`, `h6`
- `metric(status=...)`: `ok`, `warn`, `crit`
- `alert(level=...)`: `yellow`, `red`

## Data Widgets

```python
lcars.chart(data, title=None, color=None, id=None)
lcars.sparkline(data, title=None, id=None)
lcars.gauge(label, value, min=0.0, max=100.0, unit=None, color=None, warn_threshold=None, crit_threshold=None, id=None)
lcars.table(data, title=None, id=None)
```

Accepted chart data:

- `list[float]`
- `dict[str, list[float]]`
- pandas `DataFrame`
- pandas `Series`

Accepted table data:

- `list[dict]`
- `list[list]` or `list[tuple]`
- flat `list`
- pandas `DataFrame`

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
```

Forms:

```python
with lcars.form(label, action_id, submit_label="Submit", color=None, id=None):
    lcars.text_input("Field", id="field")
```

Form children must be input widgets. `form()` is a context manager and does not return a
submit flag.

## Media Widgets

```python
lcars.log(stream_id, max_lines=1000, title=None, id=None)
lcars.video_hls(src, title=None, autoplay=False, muted=False, color=None, id=None)
lcars.mic_button(action_id, title=None, upload_url="/lcars/upload/audio", timeout_ms=5000, color=None, id=None)
```

`append_log` targets the log stream id, not the log widget id. Microphone capture requires
HTTPS in normal browsers, except for localhost development.

## Effects

Effects are meaningful in handle and live mode. They are no-ops during the initial build.

```python
lcars.update(widget_id, **fields)
lcars.notify(message, level="info")
lcars.append_log(stream_id, *lines)
lcars.set_alert_condition(level)
lcars.set_theme(theme)
```

Allowed values:

- `notify(level=...)`: `info`, `error`
- `set_alert_condition(level)`: `normal`, `yellow`, `red`
- `set_theme(theme)`: `galaxy`, `nemesis`, `tng`

## Named Themes and Colors

Themes: `galaxy`, `tng`, `nemesis`.

Common colors: `pale-canary`, `tanoi`, `golden-tanoi`, `neon-carrot`, `lilac`,
`anakiwa`, `mariner`, `hopbush`, `orange-peel`, `atomic-tangerine`, `danub`,
`indigo`, `lavender-purple`, `red-damask`, `sandy-brown`, `periwinkle`, `husk`,
`rust`, `tamarillo`, plus legacy aliases `orange`, `red`, `blue`, `purple`,
`white`, and `yellow`.

Hex colors such as `#ff9933` are also accepted by widget `color=` fields.
