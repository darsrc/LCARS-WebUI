# LCARS WebUI

Turn Python scripts into live LCARS-style dashboards.

## Current Status

The project is implemented through **Phase 10**.

Completed highlights:

- Contract-first backend (`/lcars/manifest`, `/lcars/schema`)
- Realtime protocol (WebSocket primary, SSE fallback, HTTP action fallback)
- Security controls (token auth scopes, payload limits, rate limits, secure headers)
- Python DSL (`import lcars_ui as lcars`)
- Frontend renderer for the full widget catalog
- Phase 10 additions:
  - real chart rendering (Recharts)
  - new widgets: progress bar, gauge, markdown, number input
  - websocket reconnect + root manifest resync
  - session-isolated widget state
  - DSL ergonomics: `form`, `row`, `col`, `section`
  - MediaRecorder-based mic button flow

## Repository Layout

- `lcars-ui/`: main package, frontend, tests, docs
- `Phase 10 Implementation Plan.md`: implementation plan used for this phase
- `Implementation Plan.md`, `LCARS UI Specification.md`: overall planning/spec references

## Beginner Quick Start

No professional software experience required.

## 1) Install prerequisites

- Git
- Python 3.10+
- Node.js 18+
- `make` (optional but recommended)

Check versions:

```bash
python --version
node --version
npm --version
```

## 2) Clone and enter the project

```bash
git clone https://github.com/darsrc/LCARS-WebUI.git
cd LCARS-WebUI/lcars-ui
```

## 3) Create a virtual environment

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

## 5) Run example dashboard

Terminal A:

```bash
python examples/bridge_ops/app.py
```

Terminal B:

```bash
cd frontend
npm run dev
```

Open the frontend URL printed by Vite (usually `http://127.0.0.1:5173`).

## Build / Test / Verify

Run inside `lcars-ui/`.

```bash
make lint
make contracts-check
make frontend-ci
```

Optional:

```bash
make frontend-e2e
make security-audit
make ci
```

## Expand the Project

1. Add or modify dashboards with DSL functions in your Python app.
2. Extend backend models/runtime in `src/lcars_ui/`.
3. Extend frontend rendering/runtime in `frontend/src/`.
4. Regenerate contract artifacts after model changes:

```bash
make contracts-update
make contracts-check
```

## Documentation

Primary docs live in `lcars-ui/`:

- `lcars-ui/README.md`
- `lcars-ui/docs/quickstart.md`
- `lcars-ui/docs/widgets.md`
- `lcars-ui/docs/dsl.md`
- `lcars-ui/docs/deployment.md`
- `lcars-ui/docs/phase10_coverage.md`
