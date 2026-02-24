# lcars-ui

Contract-first Python backend library for LCARS-style server-driven UI.

## Phase 2 status

This repository now includes the Phase 2 FastAPI surface for serving frozen contract artifacts:

- `GET /lcars/manifest` returns `fixtures/golden/manifest.v1.json`.
- `GET /lcars/schema` returns `fixtures/golden/schema.v1.json`.

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
