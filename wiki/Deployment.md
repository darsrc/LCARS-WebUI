# Deployment

`lcars.run(...)` serves a FastAPI application with a bundled frontend. Local defaults
favor convenience; an internet-facing deployment should explicitly configure TLS,
authentication, CORS, limits, and streaming proxy behavior.

## Local application

```python
if __name__ == "__main__":
    lcars.run(ui, host="127.0.0.1", port=8000, open_browser=True)
```

`lcars.run` arguments are Python arguments, not built-in environment variables. If the
application should be configurable through the environment, read and forward values:

```python
import os

lcars.run(
    ui,
    host=os.getenv("LCARS_HOST", "127.0.0.1"),
    port=int(os.getenv("LCARS_PORT", "8000")),
    open_browser=os.getenv("LCARS_OPEN_BROWSER", "0") == "1",
)
```

## Production checklist

1. Terminate TLS and serve the dashboard over HTTPS.
2. Set `LCARS_AUTH_REQUIRED=true` and configure scoped tokens.
3. Replace wildcard CORS with explicit trusted origins.
4. Preserve WebSocket upgrades and long-lived SSE responses.
5. Set JSON, WebSocket, audio, file, and rate limits appropriate to the application.
6. Forward authorization information and protect application asset/media routes.
7. Run lint, tests, contract validation, frontend tests, and the security audit.

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
`file_upload(max_bytes=...)` limit and the server aggregate limit are both relevant; use
the stricter intended value.

## Reverse proxy requirements

The proxy must:

- upgrade `/lcars/ws` to WebSocket and allow long-lived connections;
- avoid buffering `/lcars/events` and allow long-lived SSE responses;
- forward `Authorization` headers and query strings;
- permit appropriately sized multipart bodies for audio and file upload;
- preserve the application base path expected by the bundled client.

Routes:

| Route | Purpose |
| --- | --- |
| `/` | Bundled browser application. |
| `/assets/...` | Bundled frontend assets. |
| `/lcars/assets/...` | Optional read-only app assets from `run(assets_dir=...)`. |
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

`file_upload()` accepts bounded multipart data, normalizes each filename to its basename,
and dispatches `UploadedFile` objects to the HANDLE rerun. LCARS does not permanently
persist the bytes. Consume or move them to application-owned storage in that rerun.
Only metadata is sent over the real-time protocol.

`mic_button()` submits to the audio endpoint. Browser microphone APIs require HTTPS
except on localhost. A custom speech-to-text adapter or upload URL can own downstream
processing.

## Application assets and Three.js

Pass a local directory to mount it read-only at `/lcars/assets/`:

```python
lcars.run(ui, assets_dir="./assets", open_browser=False)
```

`three_scene()` modules and their application-owned resources can resolve from that
mount. Static-file serving rejects paths outside the configured directory. Treat scene
modules as executable frontend code and deploy only trusted assets.

## Build and pre-deploy checks

Dashboard consumers use the bundled frontend and do not need Node.js. Renderer changes
must rebuild that bundle:

```bash
cd lcars-ui
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
