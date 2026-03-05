# Widgets Reference

LCARS UI currently supports 18 widget types.

## Primitive Widgets

- `text(content, size="body", color=None, id=None)`
- `markdown(content, color=None, id=None)`
- `metric(label, value, status="ok", color=None, id=None)`
- `alert(message, level="yellow", blink=False, id=None)`
- `progress(label, value, color=None, show_label=True, id=None)`

## Data Widgets

- `chart(data, title=None, color=None, id=None)`
- `sparkline(data, title=None, id=None)`
- `gauge(label, value, min=0.0, max=100.0, unit=None, color=None, warn_threshold=None, crit_threshold=None, id=None)`
- `table(data, title=None, id=None)`
- `log(stream_id, max_lines=1000, title=None, id=None)`

## Input Widgets

- `button(label, color=None, id=None) -> bool`
- `toggle(label, value=False, color=None, id=None) -> bool`
- `select(label, options, value=None, color=None, id=None) -> str`
- `text_input(label, placeholder="", password=False, id=None) -> str`
- `number_input(label, value=0.0, min=None, max=None, step=1.0, placeholder=None, id=None) -> float`
- `with form(label, action_id, submit_label="Submit", color=None, id=None): ...`

## Media Widgets

- `video_hls` (manifest-level widget model)
- `mic_button` (manifest-level widget model)

## Update Pattern

Any widget can be updated in real time using:

```python
lcars.update("widget_id", value=75.0)
```

Examples:

- Progress: `lcars.update("prog_repair", value=67.0)`
- Gauge: `lcars.update("gauge_shields", value=91.2)`
- Markdown: `lcars.update("md_report", content="## Updated")`
