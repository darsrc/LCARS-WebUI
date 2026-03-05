# lcars-ui

Contract-first Python backend library for LCARS-style server-driven UI.

## Phase 2/3/4 status

This repository now includes:

- `GET /lcars/manifest` returning `fixtures/golden/manifest.v1.json`.
- `GET /lcars/schema` returning `fixtures/golden/schema.v1.json`.
- `WS /lcars/ws` for protocol v1.0 realtime envelopes.
- `POST /lcars/action/{widget_id}` as HTTP upstream fallback action path.
- `GET /lcars/events` as SSE downstream fallback stream.
- `POST /lcars/upload/audio` for asynchronous audio processing with realtime notifications.

## Quickstart

```bash
python -m venv .venv
source .venv/bin/activate
make install
make lint
make test
make contracts-check
```

## Run the app (Phase 2)

```bash
make dev
```

Smoke checks (requires project installed with dev dependencies):

```bash
make install
make smoke
```

Frontend workflow (reproducible installs):

```bash
cd frontend
npm ci
npm run build
```

Use `npm ci` (not `npm install`) when developing locally or in CI to ensure lockfile-based, reproducible dependency installs.

Manual endpoint checks:

```bash
curl http://localhost:8000/lcars/manifest
curl http://localhost:8000/lcars/schema
```

## Environment configuration

- `LCARS_CORS_ORIGINS`: Comma-separated CORS origin list. Defaults to `*`.
- `LCARS_FIXTURES_DIR`: Optional override directory for golden artifacts. When omitted, defaults to `fixtures/golden` in the repository.

## Restricted-network fallback

If your environment cannot access package indexes/proxies, `make install` automatically falls back to
an editable install without dependency resolution so scaffold validation can still run.


## Realtime protocol (Phase 3)

Envelope shape:

```json
{
  "v": "1.0",
  "ts": 1715432000.123,
  "type": "action",
  "payload": {"id": "btn_1", "value": null}
}
```

Supported upstream event `type` values:
- `action`
- `input`
- `form_submit`

Supported downstream event `type` values:
- `manifest_update`
- `widget_update`
- `log_chunk`
- `notification`
- `action_ack`

HTTP fallback action example:

```bash
curl -X POST http://localhost:8000/lcars/action/btn_1 \
  -H 'content-type: application/json' \
  -d '{"value": null}'
```

WebSocket validation behavior:
- unsupported protocol version (`v` != `1.0`): connection closed with code `1002` (`unsupported_protocol`)
- malformed envelope: connection closed with code `1003` (`invalid_envelope`)
- unsupported/invalid upstream type: connection closed with code `1003` (`invalid_upstream_type`)
- valid upstream intent: server emits deterministic `action_ack`


## Phase 4 media/audio

Audio upload example:

```bash
curl -X POST http://localhost:8000/lcars/upload/audio \
  -F "file=@sample.webm"
```

SSE fallback example:

```bash
curl -N http://localhost:8000/lcars/events
```
