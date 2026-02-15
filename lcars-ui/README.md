# lcars-ui

Contract-first Python backend library for LCARS-style server-driven UI.

## Phase 0 status

This repository includes the initial project skeleton, strict tooling configuration,
and task automation targets required to begin contract implementation.

## Quickstart

```bash
python -m venv .venv
source .venv/bin/activate
make install
make lint
make test
make contracts-check
```

### Restricted-network fallback

If your environment cannot access package indexes/proxies, `make install` automatically falls back to
an editable install without dependency resolution so Phase 0 scaffold validation can still run.
