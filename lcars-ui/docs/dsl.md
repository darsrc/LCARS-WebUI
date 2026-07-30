# DSL Reference

## App Lifecycle

- `lcars.config(name, theme="galaxy", subtitle=None, header_color="orange", sound_enabled=True, lang="en-US", visual_language="strict", force_uppercase=True, label_uppercase=True, lcars_font_headers=True, lcars_font_labels=True, lcars_font_text=False, settings_page=True)`
- `lcars.run(ui_fn, host="127.0.0.1", port=8000, open_browser=True)`
- `@lcars.live(interval=5.0)`

`visual_language="strict"` is the default and enables the Phase 13 LCARS layout compiler.
`settings_page=True` adds a renderer-owned **Options** page and navigation item for
theme, motion, sound, uppercase, and body-type preferences. Preferences stay local
to the browser. Pass `settings_page=False` to remove the page entirely.

## Navigation and Pages

- `lcars.nav(label, page=None, color=None, segments=None)`
- `with lcars.page(title, id=None, layout="auto", fillers=True, sizing="fill"): ...`

## Adaptive Layout (Archetypes & Zones)

`lcars.page(title, layout=...)` selects the page's LCARS archetype. Each
top-level panel is then auto-placed into a screen zone based on its content,
or pinned with `zone=`.

### Archetypes (`layout=`)

- `"auto"` (default) — picked from the panel mix:
  - 6+ panels with at most one data panel -> `grid`
  - 1-2 panels with at least one data panel -> `telemetry`
  - otherwise -> `console`
- `"console"` — primary lane (data/text) + side rail (readouts) + bottom dock (controls)
- `"telemetry"` — same grammar as `console` but the side rail is narrower so the
  data viz dominates
- `"grid"` — every panel becomes an equal-sized cell in a wrapping cell wall
- `"menu"` — sparse layout with generous spacing, for option/landing pages

### Zones (`zone=`)

Panels are classified by their dominant content and, in `console`/`telemetry`,
placed accordingly:

| Panel contains | Kind | Default zone |
|---|---|---|
| `chart`, `sparkline`, `table`, `log`, `video_hls` | data | `primary` |
| `text`, `markdown`, `alert` (or mixed content) | text | `primary` |
| `button`, `toggle`, `select`, `text_input`, `form`, ... | control | `dock` |
| `metric`/`status_tile`, `gauge`, `progress` | readout | `side` |

`grid` puts every panel in a `full`-width cell; `menu` puts everything in
`primary` except controls, which go to `dock`. If a page would otherwise end
up with no `primary` panel, one is promoted automatically so the main lane is
never empty.

Override the automatic placement with `zone=` on any top-level panel
(`box`, `sweep`, `bracket`, `console`, `data_panel`, `control_panel`,
`diagnostic`, `padd`): `zone="primary" | "side" | "dock" | "full"`.

```python
with lcars.page("Telemetry", layout="telemetry"):
    with lcars.data_panel("Scope"):
        lcars.chart(...)                    # -> primary (dominant viz)
    with lcars.data_panel("Lock Status", zone="side"):
        lcars.metric("Target", "Enterprise")
```

### The mosaic

Zones are not columns. Every panel is packed onto a single grid cut to the
shape of the actual screen, and the zone acts as a *region constraint* on that
grid — `side` panels are confined to the right-hand strip, `dock` panels settle
below the instruments they drive. A panel's footprint comes from what it
carries (a chart claims a quadrant, a status tile a chip), panels grow to
consume free space, and whatever is genuinely left over is decorated with LCARS
reference blocks. On a narrow or portrait screen the regions collapse and
everything joins one flow.

Row heights are solved per page from what the panels actually contain, measured
off the rendered deck rather than guessed. The distinction the solver draws is
between panels that are *content-sized* and panels that *fill*:

- Pages use `sizing="fill"` by default. Expanded panels share the usable deck,
  with tables, logs, charts and video receiving the strongest appetite because
  every extra pixel there reveals more data.
- Set `sizing="content"` on a page or one top-level panel to keep it at its
  intrinsic height. Where a taller neighbour shares its row, the remainder is
  cut off as an LCARS trim block instead of padding the panel.
- A collapsed panel always reduces to its title band, regardless of its former
  span or sizing mode, and the freed surface is reassigned to expanded panels.

The practical effect is that the deck reaches every edge by default without
making a collapsed panel look expanded. Panels are not scrolled by the layout —
a scrollbar inside a panel means its content genuinely exceeds the screen, not
that the deck mis-sized it.

Nothing here needs configuring — but five optional hints are available on any
top-level panel when the automatic choice is wrong:

| Hint | Meaning |
|---|---|
| `span=(cols, rows)` | pin an exact footprint |
| `weight=1..12` | importance; heavier panels anchor first and are sized up |
| `aspect="wide" \| "tall" \| "square" \| "flex"` | override the inferred shape |
| `group="name"` | pack these panels adjacent to each other |
| `sizing="fill" \| "content"` | override the page's free-space policy |

```python
with lcars.page("Ops", sizing="fill"):
    with lcars.data_panel("Warp Field", weight=11, aspect="wide"):
        lcars.chart(...)                              # anchors the field
    with lcars.data_panel("Coolant", group="eps"):
        lcars.gauge(...)                              # packed beside...
    with lcars.control_panel("EPS", group="eps"):
        lcars.button("Purge")                         # ...its controls
```

Pass `lcars.page(..., fillers=False)` to suppress the decorative blocks on a
dense page where they would compete with data.

### Arrange mode (beta)

The **Arrange** button on the nav rail lets a viewer rearrange the deck by hand.
It needs nothing from the Python side — it is a renderer feature, stored in the
browser's local storage per page and per screen size, and it never reaches the
manifest or the protocol.

Dragging a panel onto another is edge-aware, because "put this beside that" and
"put this under that" are different intentions:

| Released over | Result |
|---|---|
| the left or right edge of a panel | lands beside it, in the same row band |
| the top or bottom edge of a panel | lands above or below it, on its own band |
| the middle of a panel | inserts immediately after it |
| any panel while **Swap next** is armed | the two positions are exchanged once |

The toolbar adds structure that has nowhere else to come from — **+ Row**,
**+ Column** and **+ Section** each open a persistent space, and a section is a
named band whose label can be edited in place. Spaces can be selected, resized,
dragged like panels, or removed. Dropping a panel into one places the panel
there and carries the space back to the panel's old position. Panel footprints
can be resized with the same width/height controls. **Reset** returns the page
to the automatic layout.

A hand-arranged page is packed by flow rules rather than by the automatic
tessellation: bands stack down the field, columns divide a band across it, and
panels stack down a column. That is what keeps a panel where it was dropped
instead of letting the packer pull it into whatever hole it finds. Content
sizing still applies, so an arranged deck is still cut to its screen.

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
- Inputs: `button`, `toggle`, `checkbox`, `radio`, `radio_toggle`, `select`, `text_input`, `number_input`, `file_upload`

## File uploads

`lcars.file_upload()` renders a drag/drop picker and returns request-scoped
`UploadedFile` objects on the rerun caused by a successful upload:

```python
files = lcars.file_upload(
    "Training Data",
    accept=[".json", "application/json"],
    max_files=4,
    max_bytes=10_000_000,
    id="training-data",
)
for uploaded in files:
    ingest(uploaded.name, uploaded.read())
```

The built-in endpoint is `/lcars/upload/files`. It applies the server-wide
`LCARS_MAX_FILE_UPLOAD_BYTES` aggregate limit, sanitizes names, sends bytes only
to the Python handler, and emits metadata over the realtime protocol. It does
not persist files after the rerun (the multipart runtime may temporarily spool
large parts while parsing). A custom `upload_url=` may implement another storage
policy.

## Pop-up windows and notifications

`lcars.popup()` is a top-level overlay and never consumes a mosaic cell:

```python
with lcars.popup(
    "Transfer Details",
    modal=False,
    draggable=True,
    resizable=True,
    close_action_id="close-transfer",
):
    lcars.text("Payload accepted.")
```

Windows remain inside the viewport after movement, resizing, or rotation and
support keyboard arrow movement as well as pointer gestures. `lcars.notify()`
accepts `info`, `success`, `warning`, and `error`, plus optional `title`,
`duration_ms`, `dismissible`, and `movable` settings. The browser presents
notifications in a movable, dockable stack.

## Hints (floating tooltips & popovers)

Every widget accepts `hint=`. Pass a string for a plain tooltip:

```python
lcars.button("Engage", id="engage", hint="Initiates warp drive")
```

For anything richer, open a `lcars.hint()` block **after** the widget. Widgets
declared inside become the hint body, so a hint can hold whatever a page can —
text, a chart, a video:

```python
lcars.button("Red Alert", id="red")

with lcars.hint("red", trigger="click", placement="right", title="Briefing"):
    lcars.text("Sets shipwide alert condition to RED.")
    lcars.sparkline(pressure, title="Core Pressure")
    lcars.video_hls(src="/media/core.m3u8")
```

`lcars.hint()` attaches to the most recently declared widget when you omit the
target id. Options:

| Option | Default | Meaning |
| --- | --- | --- |
| `trigger` | `["hover", "focus"]` | `hover`, `focus`, `click` (tap to pin), `press` (long-press), `always` (pinned open), `manual` (server-driven) |
| `placement` | `"auto"` | `auto`, `top`, `bottom`, `left`, `right` — always flips and shifts to stay on screen |
| `delay_ms` | `250` | Hover open delay |
| `hide_delay_ms` | `120` | Grace period so the pointer can travel into the hint |
| `max_width` | stylesheet | px cap on hint width |
| `dismissible` | `True` | Show a close affordance when pinned |

Hints are full popovers: controls inside one fire real actions, `Esc` closes,
and clicking away dismisses a pinned hint. With `trigger="manual"` you drive it
from Python:

```python
lcars.show_hint("engage")
lcars.hide_hint("engage")
```

Hints take `color=` from their widget, so they tint like every other surface.

## Voice input (mic_button)

`lcars.mic_button(action_id, ...)` adds a microphone control to your page.
There are two modes:

**Push-to-talk (default).** The user clicks the button to start recording
and clicks again (or waits `timeout_ms`, default 5 seconds) to stop. The
recorded clip is uploaded automatically and your `action_id` handler fires
once the upload completes.

**Hands-free / continuous (`continuous=True`).** The user clicks once to
"arm" the mic, and after that no further clicks are needed: the widget
listens continuously and automatically detects when someone starts and
stops talking (this is called voice activity detection, or VAD — it just
means the browser watches the microphone's volume level). Each time it
detects a pause in speech lasting `silence_ms` (default 900 milliseconds),
it treats that as the end of one "utterance," uploads it, and immediately
starts listening for the next one — no further clicks required.

Two settings control timing in continuous mode:

- `silence_ms` — how long a pause must last before the widget decides the
  person is done talking. Lower values (e.g. 500) feel snappier but may cut
  off mid-sentence if the speaker pauses to think. Higher values (e.g. 1500)
  are more forgiving of pauses but add latency before the next response.
- `timeout_ms` — a safety cap. If someone talks continuously for longer than
  this without ever pausing, the widget force-stops and uploads anyway, so a
  single very long utterance can't block the mic forever. This is the same
  field used for the push-to-talk auto-stop timeout; in continuous mode it
  must be set to at least `silence_ms`.

Example:

```python
lcars.mic_button(
    "voice-command",
    title="Hands-Free Listening",
    continuous=True,
    silence_ms=900,
)
```

The widget still uploads to whatever `upload_url` you configure (default
`/lcars/upload/audio`), so if you're integrating with your own speech-to-text
backend, point `upload_url` at your own endpoint exactly as you would for
push-to-talk — continuous mode just changes how often and how automatically
uploads happen, not where they go.

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
