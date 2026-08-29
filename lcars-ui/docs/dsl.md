# Layout & Composition Reference

This document covers how pages are declared and laid out: the `App`/page lifecycle in
brief, the adaptive mosaic layout system (archetypes and zones), the authored/Surface
Engine escape hatches for exact topology, containers, forms, effects, and the real
session model. For the per-widget catalog (what each widget accepts and what its action
delivers), see [widgets.md](widgets.md). For a first-time walkthrough, see
[quickstart.md](quickstart.md).

## App lifecycle (brief)

```python
from lcars_ui import ActionContext, App, ui

app = App()
app.config(
    name, theme="galaxy", subtitle=None, header_color="orange", sound_enabled=True,
    lang="en-US", force_uppercase=True, label_uppercase=True, lcars_font_headers=True,
    lcars_font_labels=True, lcars_font_text=False, settings_page=True,
)

@app.page(title, *, path="/", nav=True, id=None, layout="auto", chrome="console",
          fillers=True, sizing="fill")
def page_fn() -> None: ...

@app.action(widget_id)
def handler(ctx: ActionContext[T]) -> None: ...

@app.live(interval=5.0, audience="all")
def live_fn() -> None: ...

@app.session_start
def on_session_start(ctx: ActionContext[None]) -> None: ...

app.serve(host="127.0.0.1", port=8000, open_browser=False)
```

`settings_page=True` (the default) adds a renderer-owned **Options** page and navigation
item for theme, motion, sound, uppercase, and body-type preferences; these stay local to
the viewer's browser. Pass `settings_page=False` to remove it — small demo/test apps
generally should, since it adds a page you didn't declare.

`page_fn` runs exactly once per `app.build_manifest()` call (including the build done
when `serve()` starts or an `app.test_client()` is constructed). Sessions created from
one test client receive independent deep copies of that one built manifest.
There is no rerun: nothing calls `page_fn` again when a browser action arrives. See
[quickstart.md](quickstart.md) for the full picture and
[migration.md](migration.md) if this is unfamiliar because you know v6.

## Services

`app.provide(ServiceType, factory, scope="app")` registers a factory for type-based
injection into action handlers. Declare a parameter annotated with the registered type
and the app resolves (and, for a context-manager factory, enters/exits) it automatically
— no manual lookup:

```python
app.provide(Database, lambda: Database(), scope="app")   # or scope="session"

@app.action("log")
def log(ctx: ActionContext[None], db: Database) -> None:
    ctx.notify(f"call #{db.record()}")
```

`scope="app"` resolves the factory once and reuses it for the process lifetime;
`scope="session"` resolves once per session. A factory may be sync or async, and may
return a context manager (sync or async) — it is entered on first resolution and exited
on `App.shutdown()` (app-scoped) or when the owning session's state is cleared
(session-scoped). The example above — `app.provide`, the annotated handler parameter, and
two dispatched actions incrementing a shared counter — was executed while writing this
guide.

## Navigation and pages

`@app.page(title, id=..., nav=True)` both declares a page and (when `nav=True`, the
default) adds it to the sidebar, labeled with `title`. `path=` is retained as routing
metadata for future routing work; today's manifest still identifies pages by `id`. There
is no separate `nav()` call in v7 — a page opts into or out of navigation itself.

## Adaptive Layout (Archetypes & Zones)

`@app.page(title, layout=...)` selects the page's LCARS archetype. Each top-level panel
is then auto-placed into a screen zone based on its content, or pinned with `zone=`.

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
- `"authored"` — exactly one explicit `composition()` whose topology is never inferred

### Authored composition

Use authored layout when spatial topology is data and the adaptive mosaic would change
its meaning:

```python
@app.page("Exact", id="exact", layout="authored", chrome="none")
def exact() -> None:
    with advanced.composition(
        columns=[advanced.px(120), advanced.fr(1), advanced.fr(2)],
        rows=[advanced.px(72), advanced.fr(1)],
        design_size=(1440, 900),
        narrow="scroll",
    ) as stage:
        with stage.area("title", row=1, column=2, column_span=2):
            ui.text("EXACT SURFACE", size="display")
        with stage.area("rail", row=2, column=1, decorative=True):
            ui.bar(color="orange", caps="both", thickness=28)
```

(Executed while writing this guide — `app.build_manifest()` succeeds and produces the
`exact` page.)

An authored page requires exactly one top-level composition plus optional pop-ups.
Tracks accept validated CSS sizing strings; `advanced.px`, `advanced.fr`, `advanced.auto`,
and `advanced.minmax` construct the common forms. Areas use one-based placement, row/column
spans, alignment, a stacking layer, and an optional `decorative` flag. Same-layer overlap
is rejected.

Narrow behavior is `scroll`, `scale`, or `adaptive`. Adaptive mode sends only
non-decorative area children through the standard mosaic. `chrome="none"` suppresses the
ordinary console frame. `ui.bar()` and data-tile `ui.button()` presentation remain normal,
code-rendered widgets; no screenshot or raster backdrop is involved.

### Authored surface

`advanced.surface()` is the third layout regime alongside the adaptive mosaic and
`advanced.composition()`. Use it for arbitrary LCARS topology that a rectangular grid
cannot express, such as arcs, polygonal frames, radial instruments, routed diagrams, and
mirrored consoles; it combines SVG geometry with absolutely positioned HTML regions for
ordinary widgets.

See the [Surface Engine reference](surface.md) for shapes, constraints, fluid narrow
layouts, transform groups, animation effects, and nested compositions or surfaces.

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
(`ui.box`, `advanced.sweep`, `advanced.bracket`, `advanced.console`, `ui.data_panel`,
`ui.control_panel`, `advanced.diagnostic`, `advanced.padd`):
`zone="primary" | "side" | "dock" | "full"`.

```python
@app.page("Telemetry", id="telemetry", layout="telemetry")
def telemetry() -> None:
    with ui.data_panel("Scope"):
        ui.chart([1, 2, 3])              # -> primary (dominant viz)
    with ui.data_panel("Lock Status", zone="side"):
        ui.metric("Target", "Enterprise")
```

(Executed while writing this guide.)

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
@app.page("Ops", id="ops", sizing="fill")
def ops() -> None:
    with ui.data_panel("Warp Field", weight=11, aspect="wide"):
        ui.chart([1, 2, 3])                        # anchors the field
    with ui.data_panel("Coolant", group="eps"):
        ui.gauge("Coolant", 50)                     # packed beside...
    with ui.control_panel("EPS", group="eps"):
        ui.button("Purge")                         # ...its controls
```

(Executed while writing this guide.)

Pass `@app.page(..., fillers=False)` to suppress the decorative blocks on a
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

## LCARS-First Layout Primitives

- `with ui.data_panel(title="Data", color="blue", id=None): ...`
- `with ui.control_panel(title="Controls", color="orange", id=None): ...`
- `with ui.box(title, color="orange", id=None): ...`
- `with advanced.console(title, color="orange", id=None): ...`
- `with advanced.padd(title, color="orange", id=None): ...`
- `with advanced.diagnostic(title, color="blue", id=None): ...`
- `with advanced.input_column(side="left"|"right"): ...`
- `with advanced.raw(reason=None): ...` (strict-mode escape hatch; bypasses smart
  auto-paneling for that subtree)

```python
@app.page("Bridge", id="bridge")
def bridge() -> None:
    with advanced.console("Bridge Operations"):
        with ui.data_panel("Telemetry"):
            ui.metric("Shields", "100%", status="ok")
        with ui.control_panel("Actions"):
            ui.button("Red Alert")
```

(Executed while writing this guide.)

## Grid Layout (Compatibility / Escape Hatch)

- `with ui.row(height="auto"): ...`
- `with ui.col(width="1fr"): ...`
- `ui.columns(["2fr", "1fr"])`
- `with ui.section(label, color=None): ...`

`row()`/`col()` still work. Using them directly at page level emits an advisory warning
and output is still structurally lowered by the strict compiler — prefer the semantic
containers above.

## Container Primitives

- `with ui.box(...): ...`
- `with advanced.sweep(...): ...`
- `with advanced.bracket(...): ...`

## Forms

```python
with ui.form(label, action_id=..., submit_label="Submit", color=None, id=None): ...
```

A form's children are declared once, like every other widget — there is no BUILD/HANDLE
distinction any more. Submitting it fires the `action_id`'s handler with `ctx.value` set
to a dict keyed by each child's own `id`. Pass a Pydantic model instead of a label to
generate and validate the fields from it; see
[Model-backed forms](quickstart.md#7-model-backed-forms) for a complete, executed
example. Full per-widget detail lives in [widgets.md](widgets.md#inputs-and-forms-ui).

## Effects

Effects are how a handler tells connected browsers what changed. Inside an
`@app.action`/`@app.session_start` handler, call them as methods on `ctx`:

```python
ctx.update(widget_id, *, audience=None, **fields)
ctx.notify(message, *, level="info", title=None, duration_ms=None,
           dismissible=True, movable=True, audience=None)
ctx.append_log(stream_id, *lines, audience=None)
ctx.set_theme(theme, *, audience=None)
ctx.set_alert_condition(level, *, audience=None)
ctx.show_hint(widget_id)
ctx.hide_hint(widget_id)
```

Every one of these defaults to **private** delivery — only the session whose action
triggered the handler sees the effect — except `set_theme` and `set_alert_condition`,
which default to **`audience="all"`** (shipwide, since a theme or alert condition is a
ship-wide concept). Pass `audience="all"` or `audience="session"` explicitly to override
either default.

Outside a handler — most commonly inside an `@app.live(...)` job, which has no
triggering session to be private to — call the same names as plain functions imported
from the package root instead:

```python
import lcars_ui

lcars_ui.update(widget_id, **fields)
lcars_ui.notify(message, level="info")
lcars_ui.append_log(stream_id, *lines)
lcars_ui.set_theme(theme)
lcars_ui.set_alert_condition(level)
```

A live job's own `audience=` (set once, on `@app.live(interval=..., audience="all")`,
default `"all"`) governs these calls when made from inside it.

`update(widget_id, **fields)` merges `fields` onto the widget's current serialized state
— pass whatever keyword arguments the widget's own type accepts (`value=`, `status=`,
`content=`, `rows=`, and so on).

## Strict Compiler Behavior

Every build normalizes the manifest for strict LCARS composition
(`normalize_manifest_for_strict`, `dsl/_normalize.py`):

- Page-title sweep injection for titled pages.
- Smart auto-paneling:
  - input groups -> `lcars_box` with `right_inputs`
  - data groups -> `lcars_box` with `children`
  - mixed groups -> `lcars_bracket` (`orientation="both"`)
  - single widgets -> `lcars_bracket` (`orientation="left"`)
- `advanced.raw()` widget subtrees bypass auto-paneling.

## Sessions

Each browser tab that connects gets a real, server-issued session: an opaque token
(never logged; stored by the browser, presented back on every request) resolving to a
server-internal session id. Session state — widget interaction state, scoped services,
what a live job has sent it — is retained for **30 minutes** after the tab disconnects,
so a reload or a brief network blip reconnects into the same session rather than
starting over; after that window it is purged and released. A cloned tab (the same token
presented by a second live connection) is treated as a new session rather than sharing
one — `resolve_session(..., live=True)` mints it a fresh token.

On connect (including a reconnect), the server sends a `session_hydration` envelope
carrying the **current** merged state — the shared manifest plus whatever this session's
own private `audience="session"` effects have already changed — instead of replaying the
original build-time manifest and every effect since. Log streams hydrate the same way,
via `log_snapshot`, which a client applies by *replacing* its buffer for that stream
rather than appending (unlike the ordinary `log_chunk` effect). This is why reconnecting
mid-session shows you where things actually are, not a decayed replay.

`@app.session_start` registers a hook that runs once per session, before hydration, the
first time it connects — useful for per-viewer setup that shouldn't run again on a
reconnect:

```python
@app.session_start
def welcome(ctx: ActionContext[None]) -> None:
    ctx.notify("Welcome aboard.")
```

None of this needs configuring for an ordinary application; it is what makes "private by
default, `audience=\"all\"` to broadcast" (see [Effects](#effects) above) actually work
per browser tab rather than per process.
