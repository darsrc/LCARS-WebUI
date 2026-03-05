# lcars-ui

`lcars-ui` is a Python library for building Star Trek-style LCARS dashboards with a contract-first backend and a generic frontend renderer.

The backend defines UI state as data (manifest + protocol events). The frontend reads that data and renders the interface.

## Current Status

Implemented and verified:

- Phase 0: project scaffold and tooling
- Phase 1: contract/schema freeze
- Phase 2: FastAPI manifest/schema endpoints
- Phase 3: WebSocket realtime protocol + HTTP fallback action route
- Phase 4: audio upload + SSE fallback stream
- Phase 5: plugin discovery/merge + verification
- Phase 6: Python DSL (`import lcars_ui as lcars`) and rerun model
- Phase 7: full frontend runtime (all v1 widgets, WS/SSE fallback, tests, mobile/desktop checks)
- Phase 8: security/hardening (auth scopes, WS/SSE access control, rate limits, payload limits, secure headers, security audit gate)

Planned next:

- Phase 9: production readiness/release closure

Reference docs:

- `../Implementation Plan.md`
- `../LCARS UI Specification.md`
- `docs/phase7_coverage.md`
- `docs/phase8_coverage.md`

## Who This Is For

You can use this project even if you are new to software development. If you can run commands in a terminal and edit a Python file, you can build a dashboard with this library.

## Prerequisites

Install these first:

- Git
- Python `3.10+`
- Node.js `18+` and npm
- `make` (recommended, but not required)

Check installed versions:

```bash
python --version
node --version
npm --version
```

## Quick Start (Beginner Friendly)

Use these exact steps.

### 1) Clone and enter the repo

```bash
git clone https://github.com/darsrc/LCARS-WebUI.git
cd LCARS-WebUI/lcars-ui
```

### 2) Create a Python virtual environment

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

### 3) Install backend dependencies

```bash
make install
```

If your network blocks package indexes, `make install` already includes a restricted-network fallback.

If you do not have `make`, use:

```bash
pip install --no-build-isolation -e ".[dev]"
```

### 4) Install frontend dependencies

```bash
cd frontend
npm ci
cd ..
```

### 5) Start the backend (Terminal A)

```bash
python examples/bridge_ops/app.py
```

This starts the LCARS server on `http://127.0.0.1:8000`.

### 6) Start the frontend (Terminal B)

```bash
cd frontend
npm run dev
```

Open the printed local URL (usually `http://127.0.0.1:5173`).

### 7) Confirm it works

You should see an LCARS dashboard with nav, widgets, and live interactions.

Optional API checks:

```bash
curl http://127.0.0.1:8000/lcars/manifest
curl http://127.0.0.1:8000/lcars/schema
```

### Optional: run in secured mode (Phase 8)

If you want authentication/authorization enabled, start Terminal A with environment variables:

```bash
export LCARS_AUTH_REQUIRED=true
export LCARS_CORS_ORIGINS=http://127.0.0.1:5173
export LCARS_AUTH_TOKENS='{"reader-token":["lcars.read","lcars.stream"],"writer-token":["lcars.read","lcars.stream","lcars.write"]}'
python examples/bridge_ops/app.py
```

Then run frontend with a token (Terminal B):

```bash
cd frontend
VITE_LCARS_TOKEN=writer-token npm run dev
```

## Build, Test, and CI Commands

Run these from `lcars-ui/` unless noted.

### Backend checks

```bash
make lint
make test
make contracts-check
make smoke
```

Without `make`:

```bash
ruff check src/ tests/
mypy src/
pytest tests/ -v
pytest tests/contracts/ --check-golden
python scripts/run_smoke_test.py
```

### Frontend checks

```bash
make frontend-ci
```

This runs frontend install + unit/integration tests + production build.

### Frontend end-to-end tests

```bash
make frontend-e2e
```

This target installs Playwright Chromium and runs desktop + mobile browser tests.

### Full project CI simulation

```bash
make ci
```

### Security audit gate (Phase 8)

```bash
make security-audit
```

## Use the Library in Your Own Python File

Create `my_dashboard.py`:

```python
import lcars_ui as lcars


def ui() -> None:
    lcars.config("My First LCARS App", subtitle="Learning Mode")
    lcars.nav("Main", page="main")

    with lcars.page("Main", id="main"):
        lcars.metric("Warp Core", "Nominal", status="ok")
        if lcars.button("Ping"):
            lcars.notify("Pong from backend", level="info")


if __name__ == "__main__":
    lcars.run(ui, host="127.0.0.1", port=8000)
```

Run it:

```bash
python my_dashboard.py
```

## How to Expand the Project

### 1) Expand your dashboard app (easiest path)

Edit `examples/bridge_ops/app.py` or your own script:

- Add pages with `lcars.page(...)`
- Add widgets (`metric`, `chart`, `table`, `button`, `toggle`, `select`, `text_input`, `log`)
- Emit updates with `lcars.update(...)`, `lcars.notify(...)`, `lcars.append_log(...)`

### 2) Expand frontend rendering behavior

Primary frontend extension points:

- `frontend/src/components/WidgetRenderer.tsx`
- `frontend/src/runtime/transport.ts`
- `frontend/src/runtime/manifest.ts`

After changes:

```bash
make frontend-ci
make frontend-e2e
```

### 3) Expand backend/library internals

Common backend extension points:

- models/contracts: `src/lcars_ui/core/` and `src/lcars_ui/widgets/`
- runtime/server: `src/lcars_ui/server/`
- plugin system: `src/lcars_ui/plugins/loader.py`

When changing contract shapes:

```bash
make contracts-update
make contracts-check
make ci
```

## Realtime Protocol and Endpoints

Core endpoints:

- `GET /lcars/manifest`
- `GET /lcars/schema`
- `WS /lcars/ws`
- `GET /lcars/events` (SSE fallback)
- `POST /lcars/action/{widget_id}` (upstream fallback)
- `POST /lcars/upload/audio`

Upstream event types:

- `action`
- `input`
- `form_submit`

Downstream event types:

- `manifest_update`
- `widget_update`
- `log_chunk`
- `notification`
- `action_ack`

## Environment Variables

- `LCARS_CORS_ORIGINS`: comma-separated CORS origin list (default `*`)
- `LCARS_FIXTURES_DIR`: override path for golden artifacts
- `LCARS_AUTH_REQUIRED`: `true` enables strict auth enforcement
- `LCARS_AUTH_TOKENS`: token-to-scopes map (JSON or CSV `token:scope1|scope2`)
- `LCARS_MAX_JSON_BODY_BYTES`: max size for JSON request bodies
- `LCARS_MAX_AUDIO_UPLOAD_BYTES`: max size for uploaded audio payloads
- `LCARS_MAX_WS_MESSAGE_BYTES`: max websocket message size
- `LCARS_RATE_LIMIT_WINDOW_SECONDS`: sliding-window duration for rate limits
- `LCARS_RATE_LIMIT_MAX_REQUESTS`: max requests/messages allowed in the window
- `LCARS_SECURE_HEADERS_ENABLED`: attach secure HTTP response headers when enabled
- `VITE_LCARS_TOKEN` (frontend): optional bearer token used for HTTP + WS/SSE auth

## Troubleshooting

### `npm run test:e2e` fails with missing browser

Run:

```bash
cd frontend
npx playwright install chromium
```

### Port already in use

Use a different port when running your app:

```python
lcars.run(ui, port=8010)
```

### Microphone features do not work

Browser microphone APIs require secure context (`https`) or localhost. This is a browser restriction.

### All `/lcars/*` calls return 401 in secure mode

Set a valid token:

```bash
export LCARS_AUTH_REQUIRED=true
export LCARS_AUTH_TOKENS='{"writer-token":["lcars.read","lcars.stream","lcars.write"]}'
VITE_LCARS_TOKEN=writer-token npm run dev
```
