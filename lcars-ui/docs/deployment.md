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
- `LCARS_RATE_LIMIT_WINDOW_SECONDS`
- `LCARS_RATE_LIMIT_MAX_REQUESTS`
- `LCARS_SECURE_HEADERS_ENABLED=true`

## MicButton requirement

Browser microphone access requires HTTPS (or localhost for local development).

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
