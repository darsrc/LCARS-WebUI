# LCARS WebUI

Turn a Python script into a live, Star Trek-style **LCARS** dashboard — no web development experience required.

```python
import lcars_ui as lcars

def ui():
    lcars.config("Bridge Operations", subtitle="NCC-1701-D")
    with lcars.page("Main View", layout="console"):
        with lcars.data_panel("Telemetry"):
            lcars.chart([82, 84, 87, 91, 95], title="Warp Field")
            lcars.metric("Shields", "100%", status="ok")
        with lcars.control_panel("Actions"):
            if lcars.button("Red Alert", color="red"):
                lcars.set_alert_condition("red")   # flashes the whole console red

lcars.run(ui)
```

You write Python; the library builds a versioned JSON manifest, serves it over FastAPI + WebSocket, and renders it in the browser with a bundled React frontend. Every click reruns your function so it can react.

## Adaptive layout (v2.0)

You declare panels — the renderer composes them into an **authentic, viewport-filling LCARS console**, not a scrolling page. An intelligent layout engine picks a *layout archetype* and places each panel into a zone (a primary data lane, a side readout rail, a control dock, or a cell grid):

- **`console`** — primary data lane + side readouts + control dock (the everyday dashboard)
- **`telemetry`** — one dominant data scope + a readout rail
- **`grid`** — a periodic-table-style wall of equal cells
- **`menu`** — a sparse selection screen with generous negative space

Pin one with `lcars.page("Ops", layout="telemetry")`, or leave it `auto` and the engine chooses by content. Override any single panel with `zone="primary" | "side" | "dock"`. The console fills the screen — overflow lives inside a panel, never the whole page.

## Screenshots

LCARS WebUI ships with switchable themes (`galaxy`, `nemesis`, `tng`) and an authentic LCARS bracket shell — elbows, nav rail, and footer — driven entirely by your widget tree.

| Galaxy theme | Nemesis theme |
| --- | --- |
| ![Galaxy theme overview](docs/screenshots/overview-galaxy.png) | ![Nemesis theme](docs/screenshots/theme-nemesis.png) |

| TNG theme | Layout recipes (PADD, sweep, columns) |
| --- | --- |
| ![TNG theme](docs/screenshots/theme-tng.png) | ![Layout recipes](docs/screenshots/layouts.png) |

## Status (June 2026)

- **Python library, server, and contract — solid and tested.** This is the core. You can author dashboards in pure Python today.
- **Frontend renderer — adaptive console shipped (v2.0).** The viewport-filling bracket shell, the archetype layout engine (console / telemetry / grid / menu) with smart auto-placement, theme switching, per-widget color, live WebSocket streaming, and live alert conditions are all live and verified end-to-end. Continued refinement against the canonical reference frames in `LCARS_TRUTH/` is ongoing.

## Where the project lives

The package is in **[`lcars-ui/`](lcars-ui/)**. Install, quickstart, the full widget reference, and the API all live in its README:

→ **[lcars-ui/README.md](lcars-ui/README.md)**

```bash
cd lcars-ui
python -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
python examples/lcars_console/app.py      # opens http://127.0.0.1:8000
```

## Design law — read before touching visuals

LCARS is a composition language, not a color scheme. Two specs define it, and they win over taste:

- **[LCARS_PORTING_SPEC.md](LCARS_PORTING_SPEC.md)** — semantic source of truth
- **[STRICT_LCARS_VISUAL_SPEC.md](STRICT_LCARS_VISUAL_SPEC.md)** — visual law, defined at screenshot-level pass/fail
- **`LCARS_TRUTH/`** — canonical Star Trek LCARS reference frames to measure renders against

## Repository layout

```text
LCARS-WebUI/
├── README.md                     # this file (repo overview)
├── LCARS_PORTING_SPEC.md         # semantic source of truth
├── STRICT_LCARS_VISUAL_SPEC.md   # strict-mode visual law
├── LCARS_TRUTH/                  # canonical LCARS reference frames
└── lcars-ui/                     # the package
    ├── README.md                 # install, quickstart, full reference
    ├── src/lcars_ui/             # Python library (DSL, server, contract)
    ├── frontend/                 # React/TypeScript renderer (bundled into the package)
    ├── tests/                    # backend tests
    ├── examples/                 # runnable example dashboards
    └── docs/                     # user reference (quickstart, DSL, widgets, deployment)
```

## Contributing & policies

[CONTRIBUTING.md](CONTRIBUTING.md) · [AGENTS.md](AGENTS.md) (parity guardrails) · [SECURITY.md](SECURITY.md)
