# Release Notes

## Beta 1.0.0-beta.1

### What this build is
- **Beta 1.0 release** — first beta for the LCARS-WebUI library.
- Package metadata declares `lcars-ui` version `1.0.0-beta.1`.
- Product shape: a Python-first LCARS dashboard framework that compiles a Python DSL into a manifest, serves it through FastAPI, and renders it through the bundled React frontend.

### Beta 1.0 Widget Freeze
This release includes a frozen widget set with 24 stable widgets:

| Category | Widgets |
|----------|---------|
| Input (8) | button, toggle, checkbox, radio_toggle, select, text_input, number_input, form |
| Display (9) | text, alert, status_tile, progress, gauge, table, line_chart, sparkline, markdown |
| Streaming (1) | log_viewer |
| Container (4) | lcars_box, lcars_sweep, lcars_bracket, lcars_header |
| Media (2) | video_hls, mic_button |

### Beta 1.0 Breaking Changes
- **Removed `joern_strict` renderer**: Product now uses only `legacy_strict`
- **Removed oracle/acceptance infrastructure**: Oracle/acceptance infrastructure removed from product
- **Removed `classic` visual language**: Product now supports only `strict` mode
- **Removed oracle test files**: Frontend guardrail tests for legacy oracle paths removed

### Beta 1.0 Design Decisions
- **Visual language**: `strict` only (LCARS-first composition)
- **Renderer**: `legacy_strict` only
- **Default theme**: `galaxy` (TNG/DS9 orange + blue)
- **Supported themes**: `galaxy`, `tng`, `nemesis`
- **Min console width**: 900px
- **Python requirement**: 3.10+

### Known Beta Limitations
- No drag-and-drop support
- No widget-to-widget binding
- No internationalization (i18n)
- esbuild advisory in frontend toolchain (non-blocking for beta)
- Security audit may show pip advisory (documented limitation)

---

## What this build is
- Current publication package for the repository's closed Phase 18 baseline.
- Package metadata in the repo currently declares `lcars-ui` version `0.7.0`.
- Product shape: a Python-first LCARS dashboard framework that compiles a Python DSL into a manifest, serves it through FastAPI, and renders it through the bundled React frontend.

## Architecture truth
- Active product renderer: `legacy_strict`
- Deprecated compatibility path: `joern_strict`

The renderer-role split remains intentional. This publication package does not claim that product rendering and oracle rendering were merged.

## Acceptance basis
- The current release claim is tied to the canonical acceptance bundle published with the `v0.7.0` release asset `LCARS-WebUI-v0.7.0-canonical_acceptance-2026-03-23.tar.gz`.
- The canonical bundle is intentionally kept local-only in git; the local operator path is `lcars-ui/artifacts/release_readiness_2026-03-23/canonical_acceptance/`.
- The canonical catalog markers are `phase16-closeout`.
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
