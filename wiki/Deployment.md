# Deployment

`app.serve(...)` builds the manifest and serves a FastAPI application with a bundled
frontend, in one process, so application code never has to import FastAPI or uvicorn.
Local defaults favor convenience; an internet-facing deployment should explicitly
configure TLS, authentication, CORS, limits, and streaming proxy behavior.

See also: [docs/deployment.md](https://github.com/darsrc/LCARS-WebUI/blob/main/lcars-ui/docs/deployment.md)
for the exhaustive reference this page summarizes.

## Local application

```python
if __name__ == "__main__":
    app.serve(host="127.0.0.1", port=8077, open_browser=True)
```

`app.serve(...)` arguments are Python arguments, not built-in environment variables. If
the application should be configurable through the environment, read and forward values
yourself:

```python
import os

app.serve(
    host=os.getenv("LCARS_HOST", "127.0.0.1"),
    port=int(os.getenv("LCARS_PORT", "8077")),
    open_browser=os.getenv("LCARS_OPEN_BROWSER", "0") == "1",
)
```

`lcars run --host 0.0.0.0 --port 8077` (the CLI) discovers your `App` and calls
`serve()` for you; `lcars check` builds and validates the manifest without binding a
port — what a CI job should run before deploying.

## Production checklist

1. Terminate TLS and serve the dashboard over HTTPS.
2. Set `LCARS_AUTH_REQUIRED=true` and configure scoped tokens.
3. Replace wildcard CORS with explicit trusted origins.
4. Preserve WebSocket upgrades and long-lived SSE responses.
5. Set JSON, WebSocket, audio, file, and rate limits appropriate to the application.
6. Forward authorization information and protect application asset/media routes.
7. Run `lcars check`, lint, tests, contract validation, frontend tests, and the security
   audit (`make ci` runs the complete gate from `lcars-ui/`).

## Session state is in-process

Each `App` keeps its sessions, widget state, and scoped services in memory — there is no
external session store. Running more than one worker process (`uvicorn --workers N`,
multiple containers, etc.) means a session's state lives on whichever worker first
resolved its token; route a given client's requests and WebSocket connection to the same
worker (session affinity / sticky sessions at your load balancer) if you scale beyond one
process, or a reconnect can land on a worker that has never heard of that session's token
and will silently mint a new one.

**The session token itself travels as a header, not a cookie.** Every browser tab gets
its own opaque session token: plain HTTP requests (`/lcars/manifest`,
`/lcars/action/{id}`, `/lcars/input/{id}`, `/lcars/form/{id}`, the upload routes) carry
it in the `X-Lcars-Session` request header; `/lcars/ws` and `/lcars/events` carry it as a
`?session=` query parameter instead (the browser's native `WebSocket`/`EventSource` APIs
cannot set custom headers) — a separate parameter from the `?token=` auth bearer token
below. `GET /lcars/manifest` mints or rotates the token and returns it in the
`X-Lcars-Session` *response* header; store and resend it on every later call. A proxy
that strips unrecognized headers, or a manual HTTP client that never threads the token
through, silently lands on a fresh disposable session every request — see
[Troubleshooting](Troubleshooting#action-acks-succeed-but-manifest-never-changes) for
what that looks like.

## Authentication and scopes

```bash
export LCARS_AUTH_REQUIRED=true
export LCARS_CORS_ORIGINS=https://dashboard.example.com
export LCARS_AUTH_TOKENS='{"reader":["lcars.read","lcars.stream"],"operator":["lcars.read","lcars.stream","lcars.write"]}'
```

`LCARS_AUTH_TOKENS` accepts a JSON mapping, as above, or CSV entries such as
`token-a:lcars.read|lcars.stream,token-b:lcars.read|lcars.write`.

| Scope | Grants |
| --- | --- |
| `lcars.read` | Manifest, schema, and SSE reads. |
| `lcars.stream` | WebSocket connection. |
| `lcars.write` | Actions, inputs, forms, uploads, and upstream WebSocket events. |

HTTP clients may send `Authorization: Bearer <token>`. WebSocket and SSE connections also
accept `?token=<token>`, which is how the bundled client transports its configured token.
Use secret management; never commit real tokens.

Authentication defaults to off. When it is required, the server refuses to start with
no token mapping or wildcard CORS.

## CORS

`LCARS_CORS_ORIGINS` is a comma-separated list. With no value, the development default
is `*`. Production with authentication requires explicit origins:

```bash
export LCARS_CORS_ORIGINS=https://dashboard.example.com,https://ops.example.com
```

## Payload and rate limits

| Variable | Default | Applies to |
| --- | ---: | --- |
| `LCARS_MAX_JSON_BODY_BYTES` | `64000` | HTTP action/input/form JSON. |
| `LCARS_MAX_WS_MESSAGE_BYTES` | `64000` | Each WebSocket message. |
| `LCARS_MAX_AUDIO_UPLOAD_BYTES` | `5000000` | Microphone upload body. |
| `LCARS_MAX_FILE_UPLOAD_BYTES` | `25000000` | Aggregate file bytes in one multipart upload. |
| `LCARS_RATE_LIMIT_WINDOW_SECONDS` | `10` | Sliding rate-limit window. |
| `LCARS_RATE_LIMIT_MAX_REQUESTS` | `30` | Allowed requests/messages per identity and channel. |
| `LCARS_SECURE_HEADERS_ENABLED` | `true` | Security-header middleware. |

Invalid, zero, or negative numeric limit values fall back to defaults. The widget-level
`ui.file_upload(max_bytes=...)` limit and the server aggregate limit are both relevant;
use the stricter intended value.

## Reverse proxy requirements

The proxy must:

- upgrade `/lcars/ws` to WebSocket and allow long-lived connections;
- avoid buffering `/lcars/events` and allow long-lived SSE responses;
- forward `Authorization` headers and query strings;
- forward the `X-Lcars-Session` request/response header unmodified — see above;
- permit appropriately sized multipart bodies for audio and file upload;
- preserve the application base path expected by the bundled client.

Routes:

| Route | Purpose |
| --- | --- |
| `/` | Bundled browser application. |
| `/assets/...` | Bundled frontend assets. |
| `/lcars/assets/...` | Optional read-only app assets from `app.serve(assets_dir=...)`. |
| `/lcars/manifest` | Current manifest. |
| `/lcars/schema` | Manifest JSON Schema. |
| `/lcars/ws` | Primary bidirectional transport. |
| `/lcars/events` | SSE downstream fallback. |
| `/lcars/action/{widget_id}` | HTTP action fallback. |
| `/lcars/input/{widget_id}` | HTTP input fallback. |
| `/lcars/form/{widget_id}` | HTTP form fallback. |
| `/lcars/upload/audio` | Microphone upload. |
| `/lcars/upload/files` | Multipart file upload. |

## Upload lifecycle

`ui.file_upload()` accepts bounded multipart data, normalizes each filename to its
basename, and dispatches `UploadedFile` objects on `ctx.value` to the registered
`@app.action(widget_id)` handler, once, after a completed upload. LCARS does not
permanently persist the bytes — consume or move them to application-owned storage inside
that one handler call. Only metadata is sent over the real-time protocol.

`advanced.mic_button()` submits to the audio endpoint. Browser microphone APIs require
HTTPS except on localhost. A custom speech-to-text adapter or upload URL can own
downstream processing.

## Application assets and Three.js

Pass a local directory to `app.serve(...)` to mount it read-only at `/lcars/assets/`:

```python
app.serve(assets_dir="./assets", open_browser=False)
```

`advanced.three_scene()` modules and their application-owned resources resolve from that
mount. Static-file serving rejects paths outside the configured directory. Treat scene
modules as executable frontend code and deploy only trusted assets.

To sit behind an existing ASGI server instead of calling `app.serve()`, build the
FastAPI app directly — `assets_dir` is a keyword on `create_app` too:

```python
from lcars_ui.app import create_app
import uvicorn

server = create_app(manifest=app.build_manifest(), app=app, assets_dir="./assets")
uvicorn.run(server, host="0.0.0.0", port=8077)
```

## Build and pre-deploy checks

Dashboard consumers use the bundled frontend and do not need Node.js. Renderer changes
must rebuild that bundle:

```bash
cd lcars-ui
lcars check src/myapp/app.py
pytest tests/
cd frontend && npx vitest run
cd .. && make lint
make contracts-check
make security-audit
make frontend-bundle
```

`make ci` runs the complete project gate.

---

**See also:** [Getting Started](Getting-Started) · [Reference](Reference) ·
[Troubleshooting](Troubleshooting)
