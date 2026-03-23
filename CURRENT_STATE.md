# CURRENT_STATE

## Active architecture
- Current product renderer: `legacy_strict`.
- Current acceptance / oracle renderer: `phase14_family`.
- Deprecated renderer path: `joern_strict` is deprecated and retained only for compatibility, archived comparison, and frozen bake-off paths.
- Current architecture shape: one frontend app with an intentional two-role renderer split. Product rendering and canonical acceptance remain separate on purpose.

## Current repository truth
- The repository is closed through Phase 18 in the current working tree.
- Phase 15 remains the closed baseline for shared primitive boundaries, explicit `strict_role`, explicit box / sweep region contracts, parity retirement, and architecture-boundary guardrails.
- Phase 16 remains the closed baseline for catalog-driven canonical acceptance: seven canonical targets across four canonical families, catalog-owned thresholds, and an explicit singleton-family policy.
- Phase 17 is complete / closed. The product-side strict renderer now consumes more explicit scaffold and surface intent, shared primitive promotion wave 2 is landed across oracle and product paths, and repo-local HTTP plus WebSocket app-backed validation is restored under the current toolchain.
- Phase 18 is complete / closed. The active strict DSL path now emits explicit strict-contract metadata, compatibility repair for older implicit manifests is fenced to ingest, explicit-manifest runtime heuristics are retired, and shared elbow-scaffold reuse is active across oracle and product paths.
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
- `Phase 18 Implementation Plan.md`: complete historical implementation record for explicit strict-contract closure, compatibility fencing, and shared elbow-scaffold promotion.
- `lcars-ui/docs/PHASE16_CLOSEOUT.md`: complete historical acceptance closeout record.
- `lcars-ui/docs/PHASE17_CLOSEOUT.md`: historical closeout summary for the post-Phase-17 architecture baseline.
- `lcars-ui/docs/PHASE18_CLOSEOUT.md`: current closeout summary for the post-Phase-18 architecture baseline.
- `lcars-ui/docs/PHASE14_TARGET_BANK_VISUAL_FLOW.md`: active current acceptance-harness reference.
- `lcars-ui/docs/PHASE14_TRANSITION_BOUNDARIES.md`: active renderer-role and architecture-boundary reference.
- `lcars-ui/docs/TARGET_BANK_ACCEPTANCE.md`: active current canonical acceptance-scope reference.

## Is Phase 18 actually complete?
Yes.

Phase 18 is closed in the current working tree because:
- `strict_contract_level="explicit"` now marks the active strict manifest path across DSL output and golden/schema fixtures,
- explicit-manifest normalization now fails closed on missing authored strict metadata instead of falling back to legacy runtime inference,
- compatibility repair for older implicit manifests is centralized at manifest ingest rather than spread across runtime helpers,
- shared elbow-scaffold reuse remains active across oracle and product paths without changing the renderer-role split or canonical target-bank scope,
- focused frontend guardrails, the frontend build, the Phase 14 visual target bank, golden/schema drift checks, and repo-local HTTP plus WebSocket app-backed validation remain runnable under the current toolchain,
- remaining open work inside Phase 18 scope is none.

## What Phase 18 actually accomplished
- Added explicit strict-contract metadata to the active strict manifest path and locked that contract in golden/schema fixtures.
- Retired explicit-manifest runtime heuristics by fencing compatibility repair for older implicit manifests to one ingest-time upgrade path.
- Preserved the active two-role architecture while promoting shared elbow-scaffold reuse across oracle and product paths.
- Kept repo-local validation active under the current toolchain for frontend build / visual checks, contract drift checks, HTTP app-backed tests, WebSocket app-backed tests, and frontend guardrails.
- Kept the active architecture stable: `legacy_strict` stayed product, `phase14_family` stayed oracle / acceptance, and `joern_strict` stayed deprecated.

## What remains intentionally true
- The product renderer is still not the oracle renderer. That is intentional architecture, not unfinished Phase 18 work.
- Compatibility fallback still exists for older implicit manifests inside the product strict path. It is bounded legacy support, not evidence that renderer strategy is open again.
- Canonical acceptance scope remains fixed to the closed `phase14-v3` / `phase16-closeout` catalog: seven canonical targets across four canonical families.
- Deterministic target fixtures remain scaffolding and must stay aligned with the closed catalog. They are not promoted to acceptance truth.
- The frozen renderer bake-off record remains historical evidence only.

## Documentation truth-sync status
- Root and package-facing truth docs now describe the repository as closed through Phase 18.
- `README.md`, `CONTEXT.md`, and `lcars-ui/README.md` now align with the active two-role renderer architecture and the closed Phase 18 baseline.
- `lcars-ui/docs/PHASE18_CLOSEOUT.md` records the current closeout summary that public/root docs can point to without reopening implementation scope.
- `lcars-ui/docs/PHASE17_CLOSEOUT.md` remains historical rather than the current closeout anchor.
- Historical phase plans remain in the repo as records and should not be read as the active roadmap.

## Next frontier
The next frontier is planning the next scoped phase against the closed Phase 18 baseline.

That future planning can decide whether any additional product-side convergence, contract work, or acceptance-scope changes are worth doing, but this pass does not open that phase, continue convergence work, or reopen renderer strategy.

## Next roadmap file
No new implementation-phase file is opened in this truth-sync pass. `lcars-ui/docs/PHASE18_CLOSEOUT.md` is the current closeout anchor, and any future roadmap should start from the closed Phase 18 baseline.
