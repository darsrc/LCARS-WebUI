# DSL Reference

## App lifecycle

- `lcars.config(name, theme="galaxy", subtitle=None, header_color="orange", sound_enabled=True, lang="en-US")`
- `lcars.run(ui_fn, host="127.0.0.1", port=8000, open_browser=True)`
- `@lcars.live(interval=5.0)`

## Navigation and layout

- `lcars.nav(label, page=None, color=None)`
- `with lcars.page(title, id=None): ...`
- `with lcars.row(height="auto"): ...`
- `with lcars.col(width="1fr"): ...`
- `lcars.columns(["2fr", "1fr"])`
- `with lcars.section(label, color=None): ...`

## Forms

- `with lcars.form(label, action_id, submit_label="Submit", color=None, id=None): ...`

In BUILD mode, child inputs are attached to the form widget.
In HANDLE mode, `form()` is a no-op context manager and child values resolve from per-session state.

## Widgets

- Display: `text`, `markdown`, `metric`, `alert`, `progress`, `chart`, `sparkline`, `gauge`, `table`, `log`
- Inputs: `button`, `toggle`, `select`, `text_input`, `number_input`

## Effects

- `lcars.update(widget_id, **fields)`
- `lcars.notify(message, level="info")`
- `lcars.append_log(stream_id, *lines)`

## Session state model

Input state is session-scoped by WebSocket connection ID.

- WebSocket clients: isolated state per browser tab/session
- HTTP fallback: shared `session_id="http_fallback"`
