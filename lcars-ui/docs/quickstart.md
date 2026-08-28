# Quickstart

`lcars-ui` is a Python library for building live, browser-rendered LCARS applications.
You write pure Python — pages, widgets, and handlers — and the library builds a typed
manifest, serves it with FastAPI, and renders it with a bundled React frontend. You never
write JavaScript, CSS, or FastAPI routes.

If you have used a rerun-style Python UI framework before: **forget the rerun.** Pages
here are declared once, at startup, and stay declared. Actions are handled explicitly by
functions you register. If this is confusing later, [migration.md](migration.md) exists
specifically to unlearn that habit — worth a skim even if you have never used v6.

## 1) Prerequisites

- Python 3.10+
- Node.js is **not** required to use the library — only if you plan to edit the bundled
  frontend's source.

## 2) Install

```bash
python -m venv .venv
source .venv/bin/activate          # Windows: .\.venv\Scripts\Activate.ps1
pip install lcars-ui
```

## 3) Scaffold a project

The `lcars` command line ships with the package. `lcars new` writes a ready-to-run project
— two pages, one action handler, and one test — with nothing left as a placeholder:

```console
$ lcars new bridge-ops
Created /home/you/bridge-ops
  pyproject.toml
  README.md
  .gitignore
  src/bridge_ops/__init__.py
  src/bridge_ops/app.py
  tests/test_app.py

Next:
  cd bridge-ops
  pip install -e '.[dev]'
  pytest -q
  lcars dev            # http://127.0.0.1:8077/
```

Follow its own next steps:

```bash
cd bridge-ops
pip install -e '.[dev]'
pytest -q          # passes with no editing — see step 5
lcars dev           # serves on http://127.0.0.1:8077/, reloads on save
```

`src/bridge_ops/app.py` is a complete, runnable application. Read it before writing your
own — every pattern in this guide appears in it.

## 4) Anatomy of an application

An `App` instance owns everything: pages, actions, live jobs, configuration, and serving.
There is no other entry point.

```python
from lcars_ui import ActionContext, App, ui

app = App()
app.config("Bridge Ops", subtitle="NCC-1701-D", theme="galaxy")


@app.page("Overview", id="overview", layout="console")
def overview() -> None:
    with ui.data_panel("Telemetry", id="telemetry"):
        ui.metric("Shields", "100%", status="ok", id="shields")
        ui.chart([82, 84, 87, 91, 95], title="Warp Field", color="anakiwa")

    with ui.control_panel("Commands", id="commands"):
        ui.number_input(
            "Warp Factor", value=5.0, min=1.0, max=9.99, step=0.01, id="warp-factor"
        )
        ui.button("Engage", color="orange", id="engage")


@app.action("engage")
def engage(ctx: ActionContext[None]) -> None:
    ctx.notify("Warp command accepted.", level="success")
    ctx.update("shields", value="97%", status="warn")


if __name__ == "__main__":
    app.serve(port=8077, open_browser=True)
```

Four things to notice, since they are the whole model:

- **`@app.page("Title", id="...")`** registers a function that runs exactly once, at
  startup (and again each time you call `app.build_manifest()`, e.g. in a test). It
  declares the page's widgets and never runs again after that — there is no rerun. Give
  every widget you will reference later an explicit `id=`.
- **`ui.*`** is where ordinary widgets live — panels, text, readouts, the common
  controls, tables, charts, forms. `lcars_ui.advanced` holds everything more
  specialist: authored/surface layouts, graph workspaces, `three_scene`, `shader`,
  `mic_button`, `video_hls`, and the two surviving knowledge-graph widgets. Together they
  replace what used to be one 196-name flat namespace.
- **`@app.action("engage")`** registers a handler for one exact widget id. It runs once,
  each time that widget fires an action (a button click, a changed toggle, a form
  submit), and receives an `ActionContext[T]` — `ctx.value` is the event's value (`None`
  for a plain button, the new value for a toggle/select/input, the parsed model for a
  form).
- **Effects are methods on `ctx`**, not free functions, inside a handler: `ctx.update(...)`,
  `ctx.notify(...)`, `ctx.append_log(...)`, `ctx.set_theme(...)`,
  `ctx.set_alert_condition(...)`. By default they are private to the session that
  triggered the action; pass `audience="all"` to broadcast to every connected browser
  instead. (Outside a handler — inside an `@app.live` job, which has no triggering
  session — use the same names as plain functions imported from `lcars_ui`:
  `lcars_ui.update(...)`, `lcars_ui.notify(...)`, and so on.)

## 5) Test your app

`app.test_client()` is not an afterthought bolted on later — it is how you find out
whether the app you just wrote actually does what you think, without a browser, a socket,
or a running server. Build it into your workflow from the first page you write.

It builds the real manifest and dispatches real actions through the same registry, event
bus, and acknowledgement path a browser action would use:

```python
def test_engage_updates_shields() -> None:
    with app.test_client() as client:
        session = client.session()

        assert session.pages[0] == "overview"

        effects = session.action("engage")

        assert [e.type for e in effects] == ["notification", "widget_update", "action_ack"]
        assert session.widget("shields").value == "97%"
```

Run it like any other pytest test. This exact assertion was executed against the exact
`overview`/`engage` example above while writing this guide — it passes.

Useful `Session` members beyond `.action(widget_id, value)`:

- `session.widget(widget_id)` — the widget's current rendered state, effects applied.
- `session.submit(form_id, {...})` — submit a declared form through the real validation
  path (see [Testing forms](#testing-forms) below).
- `session.logs(stream_id)` — retained log lines, in arrival order.
- `session.effects_since(mark, type="widget_update")` — effects since a
  `mark = len(session.effects)` checkpoint, optionally filtered by type.

Each `client.session()` call creates an independent session with its own widget state —
useful for asserting that two browser tabs don't see each other's private updates.

## 6) The `color=` palette

Every widget that renders visually accepts `color=`. Two kinds of value work:

- **A hex code**, `"#f89800"` or `"#f80"` — always renders exactly that color.
- **A named LCARS token** — renders as that token's themed accent color, and shifts
  automatically when the active theme changes. These are the names guaranteed to render
  as a distinct accent in every bundled theme:

| Token | Reads as |
| --- | --- |
| `orange` | primary Okuda orange (the default accent) |
| `golden-tanoi` | warm gold |
| `pale-canary` | pale yellow |
| `neon-carrot` | sunflower/amber |
| `atomic-tangerine` | orange (alias of `orange`) |
| `blue` | Okuda periwinkle-blue |
| `anakiwa` | Okuda periwinkle-blue (alias of `blue`) |
| `mariner` | deep blue-violet |
| `bahama-blue` | deep blue-violet (alias of `mariner`) |
| `lilac` | Okuda lilac |
| `hopbush` | dusty rose/salmon |
| `eggplant` | Okuda lilac (alias of `lilac`) |
| `red` | alert red |
| `yellow` | sunflower/amber (alias of `neon-carrot`) |
| `white` | near-white |

A handful of other names (`purple`, `indigo`, `husk`, `rust`, `tamarillo`, and other
Okuda-era names) are also *accepted* — they pass validation and will not raise — but do
not currently resolve to a themed accent color; a widget given one of them renders with
its default role color instead, with no visible tint. Stick to the table above, or a hex
code, when you need the color you set to actually show up. Use `set_theme(...)` (see
[layout & composition](dsl.md#effects)) to change the whole application's palette rather
than fighting individual widget colors — `theme=` in `app.config(...)` accepts `"galaxy"`
(default), `"nemesis"`, `"tng"`, `"outpost"`, `"cardassian"`, `"klingon"`, `"romulan"`,
`"ferengi"`, or `"gruvbox"`.

## 7) Model-backed forms

Pass a Pydantic model to `ui.form()` instead of a label string, and its fields are
generated from the model's own metadata — descriptions become help text, `ge`/`le`
become bounds, defaults become initial values — then validated against that same model
on submit:

```python
from pydantic import BaseModel, Field
from lcars_ui import ActionContext, App, ui

app = App()
app.config("Sensor Console", settings_page=False)


class ConfigureSensor(BaseModel):
    designation: str = Field(default="Array One", description="Operator-facing name.")
    gain: int = Field(default=4, ge=1, le=10, title="Signal Gain")
    enabled: bool = True


@app.page("Sensors", id="sensors")
def sensors() -> None:
    ui.form(ConfigureSensor, action_id="save-sensor", submit_label="Apply", id="sensor")


@app.action("save-sensor")
def save_sensor(ctx: ActionContext[ConfigureSensor]) -> None:
    ctx.notify(f"Gain set to {ctx.value.gain}")
```

`ctx.value` is a real `ConfigureSensor` instance, not a dictionary — an invalid submission
never reaches your handler at all. `str`, `bool`, `int`, `float`, `Enum`, `Literal`, and
`Optional` of those scalars are supported.

### Testing forms

```python
def test_sensor_form() -> None:
    with app.test_client() as client:
        session = client.session()

        session.submit("sensor", {"designation": "Array Six", "gain": 8})
        # a valid submission reached the handler and passed validation

        session.submit("sensor", {"gain": 99})
        feedback = session.widget("sensor-gain").options.feedback
        assert feedback.state == "error"
        assert feedback.message == "Input should be less than or equal to 10"
```

Both submissions above were run against the exact `sensors`/`save-sensor` example while
writing this guide: the first reaches the handler as `ConfigureSensor(designation='Array
Six', gain=8, enabled=True)`, and the second — `gain=99`, which violates `le=10` — never
reaches it; instead the `sensor-gain` field widget carries an error message drawn straight
from Pydantic's own validation error. Field widgets are named `{form_id}-{field_name}`,
and a submission may use either those ids or the plain field names, which is why the test
above can post `{"gain": 99}` directly.

## 8) Next steps

- [layout & composition](dsl.md) — the adaptive layout system (archetypes, zones), pages,
  containers, effects in full, hints, and the authored/Surface Engine layout regimes.
- [widgets.md](widgets.md) — the complete per-widget reference, typed capabilities, and
  enhanced tables.
- [migration.md](migration.md) — porting a v6 (`lcars.run(ui)`-shaped) application to v7.
- [deployment.md](deployment.md) — before putting this on the internet.
- [surface.md](surface.md) — arbitrary-topology screens (arcs, radial instruments,
  routed diagrams) that a rectangular grid can't express.
- [lcars_language.md](lcars_language.md) — why there is no dropdown, and what every
  control renders as instead.
