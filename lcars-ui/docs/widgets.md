# Widgets Reference

LCARS UI supports 18 widget types plus 4 LCARS container widgets.

## Primitive/Data Widgets

- `text(content, size="body", color=None, id=None)`
- `markdown(content, color=None, id=None)`
- `metric(label, value, status="ok", color=None, id=None)`
- `alert(message, level="yellow", blink=False, id=None)`
- `progress(label, value, color=None, show_label=True, id=None)`
- `chart(data, title=None, color=None, id=None)`
- `sparkline(data, title=None, id=None)`
- `gauge(label, value, min=0.0, max=100.0, unit=None, color=None, warn_threshold=None, crit_threshold=None, id=None)`
- `table(data, title=None, id=None)`
- `log(stream_id, max_lines=1000, title=None, id=None)`

## Input Widgets

- `button(label, color=None, id=None) -> bool`
- `toggle(label, value=False, color=None, id=None) -> bool`
- `checkbox(label, value=False, color=None, id=None) -> bool`
- `radio(label, options, value=None, color=None, id=None) -> str`
- `radio_toggle(label, options, value=None, color=None, id=None) -> str`
- `select(label, options, value=None, color=None, id=None) -> str`
- `text_input(label, placeholder="", password=False, id=None) -> str`
- `number_input(label, value=0.0, min=None, max=None, step=1.0, placeholder=None, id=None) -> float`
- `with form(label, action_id, submit_label="Submit", color=None, id=None): ...`

## Container Widgets

- `lcars_box`
- `lcars_sweep`
- `lcars_bracket`
- `lcars_header`

## Strict vs Classic Rendering (Phase 13)

Manifest widget types are unchanged, but strict mode uses dedicated LCARS-native renderers:

- `button` -> `LcarsButtonControl` (bar geometry)
- `toggle` / `lcars_checkbox` -> `LcarsToggleControl`
- `select` -> `LcarsSelectControl` (stack/cycle bars)
- `lcars_radio` / `lcars_radio_toggle` -> `LcarsRadioControl`
- `text_input` / `number_input` -> `LcarsTextInputControl`
- `table` -> `LcarsTableControl`
- `status_tile` -> `LcarsMetricControl`
- `gauge` -> `LcarsGaugeControl` (segmented horizontal readout)
- `progress_bar` -> `LcarsProgressControl` (segmented fill)

Classic mode preserves legacy renderer behavior.

## Update Pattern

Use `lcars.update(widget_id, **fields)` for real-time updates:

```python
lcars.update("prog_repair", value=67.0)
lcars.update("gauge_shields", value=91.2)
lcars.update("md_report", content="## Updated")
```
