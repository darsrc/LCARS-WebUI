# CURRENT_STATE

## Active architecture
- Current product renderer: `legacy_strict`.
- Current acceptance / oracle renderer: `phase14_family`.
- Deprecated renderer paths: `joern_strict` is deprecated and retained only for compatibility, archived comparison, and frozen bake-off paths.
- Current architecture shape: one frontend app with a two-role renderer system. Product rendering and canonical acceptance are separate on purpose.

## Current repository truth
- The repository is closed through Phase 16 in the current working tree.
- The stable baseline is the post-Phase-15 primitive/contract boundary plus the post-Phase-16 catalog-driven target-bank acceptance contract.
- The stable acceptance scope is seven canonical targets across four canonical families, with catalog-owned thresholds and policy metadata.
- The stable product/oracle split is:
  - `legacy_strict` for live product pages
  - `phase14_family` for canonical target-bank acceptance and oracle scenes
  - `joern_strict` as a deprecated compatibility path only
- Transitional pieces still exist, but they are fenced:
  - deterministic fixture manifests remain transport scaffolding
  - the renderer bake-off harness remains frozen historical evidence
  - legacy visual-regression commands remain secondary smoke checks, not the acceptance oracle
- Historical phase labels still appear in component and document names. That naming is historical; it does not mean those phases are still open.
- The deepest docs and tests already reflect newer truth than the root/public docs did before this sync pass.

## Phase status audit
- `historical/Phase 14 Implementation Plan.md`: superseded.
  - Phase 14 is historical as a phase plan.
  - Its outputs still matter, especially the `phase14_family` naming and target-bank acceptance family work.
- `lcars-ui/docs/PHASE14_ACCEPTANCE_PROMOTION.md`: complete.
- `lcars-ui/docs/PHASE14_TARGET_BANK_VISUAL_FLOW.md`: active current acceptance-harness reference.
- `lcars-ui/docs/PHASE14_TRANSITION_BOUNDARIES.md`: active current architecture-boundary reference.
- `historical/Phase 15 Implementation Plan.md`: complete.
  - Phase 15 is the closed baseline for primitive promotion, explicit strict-role contracts, parity retirement, and boundary guardrails.
- `lcars-ui/docs/PHASE16_BOUNDARY_STATEMENT.md`: complete historical boundary record.
- `Phase 16 Implementation Plan.md`: complete.
- `lcars-ui/docs/PHASE16_ADGE_INTRO_EVALUATION.md`: complete.
- `lcars-ui/docs/PHASE16_CLOSEOUT.md`: complete.

## Is Phase 16 actually complete?
Yes.

Phase 16 is closed in the current working tree because:
- `targets/phase14_target_catalog.json` closes as `phase14-v3` / `phase16-closeout`
- canonical acceptance derives targets, viewports, and thresholds from the catalog
- the family-state policy is enforced in frontend and backend tests
- `periodic_table_matrix` is explicitly documented as a source-limited singleton family
- `adge_intro` has a completed evaluation record and two real canonical targets
- the frozen renderer bake-off probe contract was not reopened

## What is genuinely accomplished
- The repo is no longer in renderer selection.
- The live product renderer base is `legacy_strict`.
- The canonical acceptance/oracle engine is `phase14_family`.
- Shared primitive promotion and strict-role boundary guardrails from Phase 15 are real and enforced.
- Product runtime no longer uses overview/systems parity steering or parity chart-ID hooks.
- Canonical target-bank acceptance is the default LCARS-ready gate in CI and frontend visual commands.
- The canonical target bank is now explicitly closed at seven targets across four families.
- ADGE onboarding is real and limited to the shell-compatible `adge_intro_a` / `adge_intro_b` pair.

## What is still unresolved
- Root/public documentation can still drift again unless current-state truth stays anchored at the repo root.
- The product renderer is still not the oracle renderer. That is intentional architecture, not unfinished Phase 16 work.
- Compatibility fallback still exists for older implicit manifests inside the product strict path.
- Deterministic target fixtures are still manually authored scaffolding and must stay aligned with the closed catalog.

## Documentation truth-sync status
- Root-level truth is now anchored here in `CURRENT_STATE.md`.
- `README.md`, `CONTEXT.md`, and `lcars-ui/README.md` have been updated to match the current two-role architecture and the closed Phase 15/16 state.
- Package-level acceptance and closeout docs were already ahead of the root docs and remain the detailed source of truth for acceptance policy.
- Historical phase plans remain in the repo as historical records and should not be read as the active roadmap.

## Recommended next move
Keep the repository in truth-sync state and do not open a new implementation phase until new work is explicitly planned against the closed Phase 16 baseline.

## Recommended next roadmap file
no new phase yet, keep repository truth synchronized first
