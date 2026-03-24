# Release Notes

## What this build is
- Current publication package for the repository's closed Phase 18 baseline.
- Package metadata in the repo currently declares `lcars-ui` version `0.7.0`.
- Product shape: a Python-first LCARS dashboard framework that compiles a Python DSL into a manifest, serves it through FastAPI, and renders it through the bundled React frontend.

## Architecture truth
- Active product renderer: `legacy_strict`
- Active oracle / acceptance engine: `phase14_family`
- Deprecated compatibility path: `joern_strict`

The renderer-role split remains intentional. This publication package does not claim that product rendering and oracle rendering were merged.

## Acceptance basis
- The current release claim is tied to the canonical acceptance bundle at [lcars-ui/artifacts/release_readiness_2026-03-23/canonical_acceptance/](lcars-ui/artifacts/release_readiness_2026-03-23/canonical_acceptance/).
- The canonical catalog markers are `phase14-v3` and `phase16-closeout`.
- The closed acceptance scope is 7 canonical targets across 4 canonical families.
- Full validation details and per-target results live in [lcars-ui/docs/RELEASE_READINESS_2026-03-23.md](lcars-ui/docs/RELEASE_READINESS_2026-03-23.md).

## Known caveats
- The strict security audit is not clean on the current dependency/advisory state.
- Legacy visual smoke coverage remains intentionally partial; canonical target-bank acceptance is the release gate.
- WebSocket integration validation required a real local run outside the sandbox because loopback port binding is blocked inside the sandbox.

## What is intentionally not claimed
- This is not a claim of global LCARS fidelity beyond the closed canonical target bank.
- This is not a claim that `joern_strict` is revived or supported as a shipping path.
- This is not a claim that the dependency set is free of advisories.
- This is not a claim that historical bake-off paths or self-golden baselines define release readiness.

## Companion docs
- [CURRENT_STATE.md](CURRENT_STATE.md)
- [lcars-ui/docs/PHASE18_CLOSEOUT.md](lcars-ui/docs/PHASE18_CLOSEOUT.md)
- [lcars-ui/docs/RELEASE_READINESS_2026-03-23.md](lcars-ui/docs/RELEASE_READINESS_2026-03-23.md)
- [GITHUB_PUBLICATION_CHECKLIST.md](GITHUB_PUBLICATION_CHECKLIST.md)
