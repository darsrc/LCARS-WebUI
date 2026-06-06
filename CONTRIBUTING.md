# Contributing

Keep contributions scoped, truthful, and reviewable.

## Before you change the visuals

LCARS is a composition language, not a color scheme — and the renderer is actively being rebuilt to match authentic LCARS. Anything touching the look is measured against (these win over taste):

- `STRICT_LCARS_VISUAL_SPEC.md` — visual law, screenshot-level pass/fail
- `LCARS_PORTING_SPEC.md` — semantic source of truth
- `LCARS_TRUTH/` — canonical reference frames

Never embed reference screenshots (or derivatives) in UI output. See `AGENTS.md` for the full parity guardrails.

## Scope and validation

- Keep pull requests single-purpose; separate docs cleanup from product changes.
- Backend/library changes: run `pytest tests/` and `make contracts-check`.
- Frontend changes: run `cd frontend && npx vitest run`, then `make frontend-bundle` to rebuild the bundle.
- In the PR, say what changed, why, and which checks you actually ran.
