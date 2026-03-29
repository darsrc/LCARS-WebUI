# Widgets Reference

> **Beta 1.0 Widget Freeze** — This document reflects the supported widget set for Beta 1.0 release. All listed widgets are stable and fully supported.

LCARS UI supports 20 widget types plus 4 LCARS container widgets.

## Beta 1.0 Supported Widgets

### Primitives (5)
| Widget | Description | Returns |
|--------|-------------|---------|
| `text(content, size)` | Plain text block | — |
| `markdown(content)` | Rendered markdown | — |
| `metric(label, value, status)` | Status tile with color dot | — |
| `alert(message, level, blink)` | Banner alert (yellow/red) | — |
| `progress(label, value)` | Segmented progress bar 0–100 | — |

### Data Display (4)
| Widget | Description | Returns |
|--------|-------------|---------|
| `chart(data, title)` | Line chart (list or dict) | — |
| `sparkline(data, title)` | Mini sparkline | — |
| `gauge(label, value, min, max)` | Segmented LCARS gauge readout | — |
| `table(data, title)` | Data table (list of dicts) | — |

### Inputs (9)
| Widget | Description | Returns |
|--------|-------------|---------|
| `button(label)` | Clickable button | `True` on click |
| `toggle(label, value)` | On/off switch | `bool` |
| `checkbox(label, value)` | LCARS checkbox | `bool` |
| `select(label, options)` | Dropdown selector | `str` |
| `radio(label, options)` | Radio group | `str` |
| `radio_toggle(label, options)` | Segmented radio toggle | `str` |
| `text_input(label)` | Text field | `str` |
| `number_input(label, value)` | Numeric field | `float` |
| `form(label, action_id)` | Form container | context |

### Media (3)
| Widget | Description | Returns |
|--------|-------------|---------|
| `log(stream_id)` | Live log window | — |
| `video_hls(src)` | HLS video playback | — |
| `mic_button(upload_url)` | Push-to-talk mic | — |

### Containers (4)
| Widget | Description | Returns |
|--------|-------------|---------|
| `lcars_box` | Composable LCARS container | context |
| `lcars_sweep` | LCARS sweep container | context |
| `lcars_bracket` | LCARS bracket grouping | context |
| `lcars_header` | LCARS section header | — |

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
