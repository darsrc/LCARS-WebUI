# Deployment

LCARS-WebUI apps are FastAPI apps served by `lcars.run(...)`. Local development is
simple; internet-facing deployment needs HTTPS, auth, CORS, payload limits, and WebSocket
proxying.

## Local

```python
if __name__ == "__main__":
    lcars.run(ui, host="127.0.0.1", port=8000, open_browser=True)
```

```bash
python my_dashboard.py
```

## Production Checklist

1. Serve over HTTPS.
2. Enable authentication.
3. Restrict CORS origins.
4. Preserve WebSocket upgrades through the reverse proxy.
5. Set payload and rate limits.
6. Run tests, lint, contracts, and security audit before release.

## Authentication and CORS

```bash
export LCARS_AUTH_REQUIRED=true
export LCARS_CORS_ORIGINS=https://your-dashboard.example.com
export LCARS_AUTH_TOKENS='{"your-token":["lcars.read","lcars.stream","lcars.write"]}'
```

Use real secret management for production tokens. Do not commit tokens.

## Payload and Rate Limits

```bash
export LCARS_MAX_JSON_BODY_BYTES=1048576
export LCARS_MAX_WS_MESSAGE_BYTES=1048576
export LCARS_MAX_AUDIO_UPLOAD_BYTES=10485760
export LCARS_RATE_LIMIT_WINDOW_SECONDS=60
export LCARS_RATE_LIMIT_MAX_REQUESTS=120
export LCARS_SECURE_HEADERS_ENABLED=true
```

Tune values to your deployment.

## Reverse Proxy

The proxy must support:

- WebSocket upgrades for `/lcars/ws`.
- Long-lived streaming responses for `/lcars/events`.
- Forwarding `Authorization` headers.
- Larger request bodies if using `mic_button`.

Important routes:

| Route | Purpose |
| --- | --- |
| `/` | Browser app shell. |
| `/assets/...` | Bundled frontend assets. |
| `/lcars/manifest` | Manifest JSON. |
| `/lcars/schema` | Manifest schema. |
| `/lcars/ws` | Primary WebSocket transport. |
| `/lcars/events` | SSE fallback stream. |
| `/lcars/action/{widget_id}` | HTTP action fallback. |
| `/lcars/input/{widget_id}` | HTTP input fallback. |
| `/lcars/form/{widget_id}` | HTTP form fallback. |
| `/lcars/upload/audio` | Microphone upload endpoint. |

## Microphone

`lcars.mic_button(...)` uses browser microphone APIs. Browsers require HTTPS for
microphone access except on localhost.

## Frontend Bundle

Users running dashboards do not need Node.js. The package includes frontend assets.

If you change the frontend renderer, rebuild assets from `lcars-ui/`:

```bash
make frontend-ci
make frontend-bundle
```

## Pre-Deploy Checks

From `lcars-ui/`:

```bash
pytest tests/
make lint
make contracts-check
make security-audit
```

If you changed frontend code, also run the project frontend and visual checks.
