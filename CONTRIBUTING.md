# Contributing

Keep contributions scoped, truthful, and reviewable. This repository is being published from a closed Phase 18 baseline, so drive-by changes should not quietly reopen renderer strategy, acceptance scope, or release claims.

## Before you change architecture or acceptance
- Read `CURRENT_STATE.md`, `RELEASE_NOTES.md`, `lcars-ui/docs/PHASE18_CLOSEOUT.md`, and `lcars-ui/docs/TARGET_BANK_ACCEPTANCE.md`.
- Preserve the current renderer-role truth:
  - `legacy_strict` is the active product renderer
  - `phase14_family` is the active oracle / acceptance engine
  - `joern_strict` is deprecated
- Treat target-bank assets as comparison material only. Do not import or render raw target screenshots in runtime UI paths.

## Scope expectations
- Keep pull requests single-purpose.
- Separate docs/publication cleanup from product or renderer work.
- Open an issue or discussion before making changes that would alter acceptance scope, renderer roles, or the public release claim.

## Validation
- Docs-only changes: verify the links and paths you touch.
- Backend/library changes: run the relevant `pytest` and contract checks.
- Frontend/acceptance changes: run the relevant frontend tests and `make canonical-acceptance` when the change can affect release claims.
- Release/publication changes: keep `README.md`, `CURRENT_STATE.md`, `RELEASE_NOTES.md`, and the current closeout/readiness docs consistent.

## Pull request notes
- Explain what changed and why.
- List the validation you actually ran.
- Call out any caveats, skipped checks, or release-doc updates.
