# lcars-ui

`lcars-ui` is a Python library for building LCARS-style dashboards with a contract-first backend and a reusable React frontend renderer.

## Current Status

Implemented through **Phase 10**:

- Phase 0: project scaffold/tooling
- Phase 1: contract/schema freeze
- Phase 2: FastAPI manifest/schema endpoints
- Phase 3: websocket realtime protocol + HTTP action fallback
- Phase 4: audio upload + SSE stream fallback
- Phase 5: plugin discovery/merge + validation
- Phase 6: Python DSL (`import lcars_ui as lcars`)
- Phase 7: full frontend runtime and widget renderer
- Phase 8: security hardening (auth/scopes/rate limits/payload limits/security audit)
- Phase 9: production readiness closure
- Phase 10: chart rendering, new widgets, reconnect hardening, session state isolation, DSL ergonomics, MediaRecorder mic flow, docs refresh

Phase coverage docs:

- [Phase 7](./docs/phase7_coverage.md)
- [Phase 8](./docs/phase8_coverage.md)
- [Phase 10](./docs/phase10_coverage.md)

## Beginner Install and Run

These steps are for users with no professional software experience.

## 1) Install prerequisites

- Python 3.10+
- Node.js 18+
- Git
- `make` (optional but recommended)

Check versions:

```bash
python --version
node --version
npm --version
```

## 2) Clone repository

```bash
git clone https://github.com/darsrc/LCARS-WebUI.git
cd LCARS-WebUI/lcars-ui
```

## 3) Create a Python virtual environment

macOS/Linux:

```bash
python -m venv .venv
source .venv/bin/activate
```

Windows PowerShell:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

## 4) Install dependencies

```bash
make install
cd frontend && npm ci && cd ..
```

## 5) Start backend and frontend

Terminal A:

```bash
python examples/bridge_ops/app.py
```

Terminal B:

```bash
cd frontend
npm run dev
```

Open the local frontend URL printed by Vite (typically `http://127.0.0.1:5173`).

## Build / Test / Verify

Run from `lcars-ui/`.

Backend:

```bash
make lint
make contracts-check
pytest tests/ -v
```

Frontend:

```bash
make frontend-ci
```

Optional E2E browser tests:

```bash
make frontend-e2e
```

Security audit:

```bash
make security-audit
```

Full project pipeline:

```bash
make ci
```

## Use the Library in Your Own File

Create `my_dashboard.py`:

```python
import lcars_ui as lcars


def ui() -> None:
    lcars.config("My LCARS App", subtitle="Learning Mode")

    with lcars.page("Main", id="main"):
        lcars.metric("Shields", "100%", status="ok")
        lcars.progress("Repair Progress", 42.0)

        with lcars.row():
            with lcars.col("2fr"):
                speed = lcars.number_input("Warp Factor", value=5.0, min=1.0, max=9.99, step=0.01)
                if lcars.button("Engage"):
                    lcars.notify(f"Warp command accepted: {speed:.2f}")
            with lcars.col("1fr"):
                lcars.gauge("Core Output", 87.2, unit="%")


if __name__ == "__main__":
    lcars.run(ui)
```

Run:

```bash
python my_dashboard.py
```

## Documentation

- [Quickstart](./docs/quickstart.md)
- [Widgets Reference](./docs/widgets.md)
- [DSL Reference](./docs/dsl.md)
- [Deployment Guide](./docs/deployment.md)

## How to Expand the Project

1. Expand your dashboard app

- Add new pages with `lcars.page(...)`
- Add widgets (`metric`, `progress`, `gauge`, `chart`, `table`, `markdown`, etc.)
- Add interactions (`button`, `toggle`, `select`, `text_input`, `number_input`, `form`)
- Publish effects (`lcars.update`, `lcars.notify`, `lcars.append_log`)

2. Expand frontend rendering/runtime

Main extension files:

- `frontend/src/components/WidgetRenderer.tsx`
- `frontend/src/runtime/transport.ts`
- `frontend/src/runtime/manifest.ts`

3. Expand backend contract/runtime

Main extension directories:

- `src/lcars_ui/widgets/`
- `src/lcars_ui/core/`
- `src/lcars_ui/server/`
- `src/lcars_ui/dsl/`

When changing contract models:

```bash
make contracts-update
make contracts-check
```

## Realtime Endpoints

- `GET /lcars/manifest`
- `GET /lcars/schema`
- `WS /lcars/ws`
- `GET /lcars/events` (SSE fallback)
- `POST /lcars/action/{widget_id}` (HTTP fallback)
- `POST /lcars/upload/audio`

## Important Deployment Notes

- MicButton recording requires HTTPS (or localhost during local development)
- Set auth/CORS/rate-limit environment variables before internet-facing deployment
- Keep websocket upgrade forwarding enabled in your reverse proxy
