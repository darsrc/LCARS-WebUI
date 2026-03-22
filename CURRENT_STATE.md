# CURRENT_STATE

## Active architecture
- Current product renderer: `legacy_strict`.
- Current acceptance / oracle renderer: `phase14_family`.
- Deprecated renderer path: `joern_strict` is deprecated and retained only for compatibility, archived comparison, and frozen bake-off paths.
- Current architecture shape: one frontend app with an intentional two-role renderer split. Product rendering and canonical acceptance remain separate on purpose.

## Current repository truth
- The repository is closed through Phase 17 in the current working tree.
- Phase 15 remains the closed baseline for shared primitive boundaries, explicit `strict_role`, explicit box / sweep region contracts, parity retirement, and architecture-boundary guardrails.
- Phase 16 remains the closed baseline for catalog-driven canonical acceptance: seven canonical targets across four canonical families, catalog-owned thresholds, and an explicit singleton-family policy.
- Phase 17 is complete / closed. The product-side strict renderer now consumes more explicit scaffold and surface intent, shared primitive promotion wave 2 is landed across oracle and product paths, and repo-local HTTP plus WebSocket app-backed validation is restored under the current toolchain.
- The stable renderer-role split is unchanged:
  - `legacy_strict` for live product pages
  - `phase14_family` for canonical target-bank acceptance and oracle scenes
  - `joern_strict` as a deprecated compatibility path only
- Transitional or historical pieces still exist, but they are fenced:
  - deterministic fixture manifests remain transport scaffolding rather than acceptance truth
  - the renderer bake-off harness remains frozen historical evidence
  - legacy visual-regression commands remain secondary smoke checks, not the acceptance oracle
- Historical phase labels still appear in component and document names. That naming is historical and does not mean those phases remain open.

## Phase status audit
- `historical/Phase 14 Implementation Plan.md`: superseded as a phase plan. Phase 14 is historical even though the `phase14_family` namespace remains active as the oracle component family.
- `historical/Phase 15 Implementation Plan.md`: complete historical baseline for primitive promotion, explicit strict-role contracts, parity retirement, and boundary guardrails.
- `Phase 16 Implementation Plan.md`: complete historical closeout of the catalog-driven seven-target / four-family acceptance bank.
- `Phase 17 Implementation Plan.md`: complete historical implementation record for scaffold/surface convergence, shared primitive promotion wave 2, and validation restoration.
- `lcars-ui/docs/PHASE16_CLOSEOUT.md`: complete historical acceptance closeout record.
- `lcars-ui/docs/PHASE17_CLOSEOUT.md`: current closeout summary for the post-Phase-17 architecture baseline.
- `lcars-ui/docs/PHASE14_TARGET_BANK_VISUAL_FLOW.md`: active current acceptance-harness reference.
- `lcars-ui/docs/PHASE14_TRANSITION_BOUNDARIES.md`: active renderer-role and architecture-boundary reference.
- `lcars-ui/docs/TARGET_BANK_ACCEPTANCE.md`: active current canonical acceptance-scope reference.

## Is Phase 17 actually complete?
Yes.

Phase 17 is closed in the current working tree because:
- additive strict scaffold and surface intent landed and is consumed through the product strict path,
- the generic strict-surface catch-all path was replaced by stronger LCARS-native strict surface routes where the oracle already had proven forms,
- second-wave shared primitive promotion now covers narrative rows, segment runs, pill surfaces, shared readout-frame controls, and the remaining rail-stack family across oracle and product paths,
- focused frontend guardrails, the frontend build, the Phase 14 visual target bank, golden/schema drift checks, and repo-local HTTP plus WebSocket app-backed validation were rerun successfully,
- remaining open work inside Phase 17 scope is none.

## What Phase 17 actually accomplished
- Added explicit strict scaffold and surface intent so `legacy_strict` relies less on row / column heuristics and generic shell fallback.
- Broadened shared primitive reuse from oracle family scenes into strict product rendering without collapsing the product/oracle boundary.
- Converged strict product rendering on shared LCARS-native readout, title, pill, text-row, segment-run, and rail-stack primitives.
- Restored repo-local validation under the current toolchain for frontend build / visual checks, contract drift checks, HTTP app-backed tests, and WebSocket app-backed tests.
- Kept the active architecture stable: `legacy_strict` stayed product, `phase14_family` stayed oracle / acceptance, and `joern_strict` stayed deprecated.

## What remains intentionally true
- The product renderer is still not the oracle renderer. That is intentional architecture, not unfinished Phase 17 work.
- Compatibility fallback still exists for older implicit manifests inside the product strict path. It is bounded legacy support, not evidence that renderer strategy is open again.
- Deterministic target fixtures remain scaffolding and must stay aligned with the closed catalog. They are not promoted to acceptance truth.
- The frozen renderer bake-off record remains historical evidence only.

## Documentation truth-sync status
- Root and package-facing truth docs now describe the repository as closed through Phase 17.
- `README.md`, `CONTEXT.md`, and `lcars-ui/README.md` now align with the active two-role renderer architecture and the closed Phase 17 baseline.
- `lcars-ui/docs/PHASE17_CLOSEOUT.md` records the closeout summary that public/root docs can point to without reopening implementation scope.
- Historical phase plans remain in the repo as records and should not be read as the active roadmap.

## Next frontier
The next frontier is planning the next scoped phase against the closed Phase 17 baseline.

That future planning can decide whether any additional product-side convergence, contract work, or acceptance-scope changes are worth doing, but this pass does not open that phase, continue convergence work, or reopen renderer strategy.

## Next roadmap file
No new implementation-phase file is opened in this truth-sync pass. `lcars-ui/docs/PHASE17_CLOSEOUT.md` is the current closeout anchor, and any future roadmap should start from the closed Phase 17 baseline.
