# LCARS WebUI

Turn a Python script into a live, Star Trek-style **LCARS** dashboard — no web development experience required.

```python
import lcars_ui as lcars

def ui():
    lcars.config("Bridge Operations", subtitle="NCC-1701-D")
    with lcars.console("Ship Systems"):
        with lcars.data_panel("Telemetry"):
            lcars.metric("Shields", "100%", status="ok")
        with lcars.control_panel("Actions"):
            if lcars.button("Red Alert"):
                lcars.notify("Battle stations!", level="error")

lcars.run(ui)
```

You write Python; the library builds a versioned JSON manifest, serves it over FastAPI + WebSocket, and renders it in the browser with a bundled React frontend. Every click reruns your function so it can react.

## Status (June 2026)

- **Python library, server, and contract — solid and tested.** This is the core. You can author dashboards in pure Python today.
- **Frontend renderer — being rebuilt.** The current rendering does **not** yet match authentic LCARS. A faithful renderer, measured against the canonical reference frames in `LCARS_TRUTH/` and the visual spec, is the active line of work. Treat the visuals as a work in progress until that lands.

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
