# DSL Reference

## App Lifecycle

- `lcars.config(name, theme="galaxy", subtitle=None, header_color="orange", sound_enabled=True, lang="en-US", visual_language="strict", force_uppercase=True, label_uppercase=True, lcars_font_headers=True, lcars_font_labels=True, lcars_font_text=False)`
- `lcars.run(ui_fn, host="127.0.0.1", port=8000, open_browser=True)`
- `@lcars.live(interval=5.0)`

`visual_language="strict"` is the default and enables the Phase 13 LCARS layout compiler.

## Navigation and Pages

- `lcars.nav(label, page=None, color=None, segments=None)`
- `with lcars.page(title, id=None): ...`

## LCARS-First Layout Primitives (Phase 13)

- `with lcars.console(title, color="orange", id=None): ...`
- `with lcars.padd(title, color="orange", id=None): ...`
- `with lcars.diagnostic(title, color="blue", id=None): ...`
- `with lcars.data_panel(title="Data", color="blue", id=None): ...`
- `with lcars.control_panel(title="Controls", color="orange", id=None): ...`
- `with lcars.input_column(side="left"|"right"): ...`
- `with lcars.raw(reason=None): ...` (strict-mode escape hatch; bypasses smart auto-paneling for that subtree)

Example:

```python
with lcars.console("Bridge Operations"):
    with lcars.data_panel("Telemetry"):
        lcars.metric("Shields", "100%", status="ok")
    with lcars.control_panel("Actions"):
        lcars.button("Red Alert")
```

## Grid Layout (Compatibility / Escape Hatch)

- `with lcars.row(height="auto"): ...`
- `with lcars.col(width="1fr"): ...`
- `lcars.columns(["2fr", "1fr"])`
- `with lcars.section(label, color=None): ...`

`row()` / `col()` still work in both modes. In strict mode, using them directly at page level emits an advisory warning and output is still structurally lowered by the strict compiler.

## Container Primitives

- `with lcars.box(...): ...`
- `with lcars.sweep(...): ...`
- `with lcars.bracket(...): ...`

## Forms

- `with lcars.form(label, action_id, submit_label="Submit", color=None, id=None): ...`

BUILD mode: form children are serialized into `form.children`.
HANDLE mode: `form()` is a no-op context manager and values are read from session state.

## Widgets

- Display/data: `text`, `markdown`, `metric`, `alert`, `progress`, `chart`, `sparkline`, `gauge`, `table`, `log`, `header`
- Inputs: `button`, `toggle`, `checkbox`, `radio`, `radio_toggle`, `select`, `text_input`, `number_input`

## Effects

- `lcars.update(widget_id, **fields)`
- `lcars.notify(message, level="info")`
- `lcars.append_log(stream_id, *lines)`

## Strict Compiler Behavior

In strict mode, `normalize_manifest_for_strict()` applies:

- Page-title sweep injection for titled pages.
- Smart auto-paneling:
  - input groups -> `lcars_box` with `right_inputs`
  - data groups -> `lcars_box` with `children`
  - mixed groups -> `lcars_bracket` (`orientation="both"`)
  - single widgets -> `lcars_bracket` (`orientation="left"`)
- `lcars.raw()` widget subtrees bypass auto-paneling.

## Session State

Input state is keyed by session id:

- WebSocket clients: isolated per connection/tab
- HTTP fallback: shared `session_id="http_fallback"`
