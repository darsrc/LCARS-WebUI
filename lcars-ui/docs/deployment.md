# Deployment Guide

## Serving your application

`app.serve(host=..., port=..., open_browser=...)` is the ordinary way to run an
application in production — it builds the manifest and hands it to uvicorn in one
process, so application code never has to import FastAPI or uvicorn itself. The `lcars`
CLI wraps the same thing: `lcars run --host 0.0.0.0 --port 8077` discovers your `App`
and calls `serve()` for you; `lcars check` builds and validates the manifest without
binding a port, which is what a CI job should run before deploying.

`app.serve()` takes `assets_dir=` directly, so a `three_scene` scene module needs
nothing special. To sit behind an existing ASGI server, build the FastAPI app
yourself and serve that instead:

```python
from lcars_ui.app import create_app
import uvicorn

server = create_app(manifest=app.build_manifest(), app=app, assets_dir="./assets")
uvicorn.run(server, host="0.0.0.0", port=8077)
```

**Session state is in-process.** Each `App` keeps its sessions, widget state, and scoped
services in memory — there is no external session store. Running more than one worker
process (`uvicorn --workers N`, multiple containers, etc.) means a session's state lives
on whichever worker first resolved its token; route a given client's requests and
WebSocket connection to the same worker (session affinity / sticky sessions at your load
balancer) if you scale beyond one process, or a reconnect can land on a worker that has
never heard of that session's token and will silently mint a new one.

## Production checklist

1. Enable TLS/HTTPS.
2. Set strict CORS origins.
3. Configure auth tokens/scopes.
4. Set payload/rate limits.
5. Run lint/tests/contracts/security audit before deploy.

## Required environment variables

- `LCARS_AUTH_REQUIRED=true`
- `LCARS_CORS_ORIGINS=https://your-frontend.example.com`
- `LCARS_AUTH_TOKENS='{"token":["lcars.read","lcars.stream","lcars.write"]}'`

Recommended hardening:

- `LCARS_MAX_JSON_BODY_BYTES`
- `LCARS_MAX_WS_MESSAGE_BYTES`
- `LCARS_MAX_AUDIO_UPLOAD_BYTES`
- `LCARS_MAX_FILE_UPLOAD_BYTES` (default `25000000`; aggregate multipart file bytes)
- `LCARS_RATE_LIMIT_WINDOW_SECONDS`
- `LCARS_RATE_LIMIT_MAX_REQUESTS`
- `LCARS_SECURE_HEADERS_ENABLED=true`

## MicButton requirement

Browser microphone access requires HTTPS (or localhost for local development).

## File upload handling

`ui.file_upload()` defaults to `POST /lcars/upload/files`. The endpoint requires
`lcars.write` when authentication is enabled, sanitizes client filenames, and sends
the browser only file metadata — never the bytes. The registered `@app.action(widget_id)`
handler receives the raw bytes once, on `ctx.value["files"][i]["data"]`; consume or
persist them inside that handler call, since nothing is retained afterward. LCARS itself
does not persist uploads; the ASGI multipart implementation may temporarily spool larger
request parts while parsing them.

## Reverse proxy notes

- Forward websocket upgrades for `/lcars/ws`
- Preserve `Authorization` headers
- Set long-lived timeouts for streaming endpoints (`/lcars/ws`, `/lcars/events`)

## Build and bundle frontend

```bash
make frontend-ci
make frontend-bundle
```

This copies production assets into `src/lcars_ui/_static` for FastAPI serving.

## Frontend runtime notes (LCARS Authentic UI)

- Theme rendering is manifest-driven from `meta.theme`: `galaxy` (default), `nemesis`,
  `tng`, `outpost`, `cardassian`, `klingon`, `romulan`, `ferengi`, `gruvbox`.
- Sidebar geometry is manifest-driven from `layout.sidebar.position` (`left`, `right`, `hidden`).
- Sound effects are controlled by `meta.sound_enabled`.
- LCARS layout is designed for larger control surfaces; minimum supported viewport is `360px`.
