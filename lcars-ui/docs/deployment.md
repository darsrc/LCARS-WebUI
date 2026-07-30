# Deployment Guide

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

`lcars.file_upload()` defaults to `POST /lcars/upload/files`. The endpoint requires
`lcars.write` when authentication is enabled, retains bytes only for the action
rerun, sanitizes client filenames, and broadcasts file metadata rather than
payload bytes. Consume or persist each `UploadedFile` during that rerun.
LCARS itself does not persist uploads; the ASGI multipart implementation may
temporarily spool larger request parts while parsing them.

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

- Theme rendering is manifest-driven from `meta.theme` (`galaxy`, `tng`, `nemesis`).
- Sidebar geometry is manifest-driven from `layout.sidebar.position` (`left`, `right`, `hidden`).
- Sound effects are controlled by `meta.sound_enabled`.
- LCARS layout is designed for larger control surfaces; minimum supported viewport is `360px`.
