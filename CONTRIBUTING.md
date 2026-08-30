# Contributing

Keep contributions scoped, truthful, and reviewable.

## Start in the right place

- Application authors: read `llms.txt`, then `lcars-ui/docs/quickstart.md` and
  `lcars-ui/docs/widgets.md`.
- Contributors changing the runtime: read `lcars-ui/CONTEXT.md` and
  `lcars-ui/DESIGN.md` before editing.
- v6 ports: read `lcars-ui/docs/migration.md` and run `lcars migrate PATH`.

The package lives in `lcars-ui/`, supports Python 3.10+, and uses
`lcars-ui/.venv`. Keep backend code compatible with Python 3.10; do not introduce
Python 3.11+ syntax or standard-library APIs.

## Before you change the visuals

LCARS is a composition language, not a color scheme. Anything touching the look is measured against (these win over taste):

- `STRICT_LCARS_VISUAL_SPEC.md` — visual law, screenshot-level pass/fail
- `LCARS_PORTING_SPEC.md` — semantic source of truth
- `LCARS_TRUTH/` — canonical reference frames

Never embed reference screenshots (or derivatives) in UI output. See `AGENTS.md` for the full parity guardrails.

## Scope and validation

- Keep pull requests single-purpose; separate docs cleanup from product changes.
- Backend/library changes: run `pytest tests/` and `make contracts-check`.
- Frontend changes: run `cd frontend && npx vitest run`, then `make frontend-bundle` to rebuild the bundle.
- Contract changes: run `make contracts-update`, keep handwritten TypeScript no wider than the generated schema, and prove compatibility when the change is intended to be additive.
- Run `make ci` from `lcars-ui/` before requesting review when the full local toolchain is available.
- In the PR, say what changed, why, and which checks you actually ran.
