# Phase 15 Implementation Plan

## Current repository state
The repository is no longer in a renderer-selection phase.

- The active product renderer base is `legacy_strict`. Live strict pages in `lcars-ui/frontend/src/App.tsx` route through `lcars-ui/frontend/src/components/strict/LegacyStrictPageRenderer.tsx`, and `joern` requests are downgraded to a deprecation notice outside bake-off mode.
- The active acceptance and visual-oracle engine is `phase14_family`. Canonical target runs route accepted targets directly into `lcars-ui/frontend/src/components/phase14/SeismographicFamilyScene.tsx`, `HolodeckFamilyScene.tsx`, and `PeriodicTableFamilyScene.tsx`, driven by `targets/phase14_target_catalog.json` and `lcars-ui/frontend/tests/visual/phase14_target_bank.spec.ts`.
- `joern_strict` is present only as a deprecated compatibility and bake-off artifact path. `lcars-ui/docs/RENDERER_BAKEOFF_PHASE4_ROLE_ASSIGNMENT.md` and `lcars-ui/docs/PHASE14_TRANSITION_BOUNDARIES.md` both already lock that decision.
- Shared primitive extraction has already started. `lcars-ui/frontend/src/components/primitives/lcarsGeometryPrimitives.tsx` is now used by both `phase14_family` scenes and `legacy_strict`, and `LegacyStrictPageRenderer.test.tsx` already verifies adoption of extracted oracle segment and capsule rhythm helpers. `lcars-ui/docs/PHASE14_FAMILY_REUSE_LEDGER.md` also records that Phase 14 scenes already share reusable scene primitives instead of remaining isolated per-target code.
- The repository already has serious guardrails and acceptance infrastructure:
  - target-bank catalog and selection metadata in `targets/phase14_target_catalog.json`
  - canonical Playwright acceptance in `lcars-ui/frontend/playwright.phase14.config.ts` and `lcars-ui/frontend/tests/visual/phase14_target_bank.spec.ts`
  - artifact generation in `lcars-ui/scripts/write_target_bank_artifacts.py`
  - frontend target-bank guardrails in `lcars-ui/frontend/src/test/targetBankGuardrails.test.ts`
  - raster and screenshot anti-cheat guardrails in `lcars-ui/frontend/src/test/overviewParityGuardrails.test.ts` and `lcars-ui/frontend/src/test/joernGuardrails.test.ts`
  - backend catalog, artifact, and promotion tests in `lcars-ui/tests/unit/test_phase14_*`
  - policy constraints in `AGENTS.md`, `STRICT_LCARS_VISUAL_SPEC.md`, `LCARS_PORTING_SPEC.md`, and the Phase 14 docs
- Transitional subsystems still exist and matter:
  - `LcarsSweepControl.tsx` still contains overview/systems parity routing
  - `LineChartWidget.tsx` still contains parity-ID chart hooks
  - deterministic fixture manifests in `lcars-ui/frontend/src/fixtures/phase14TargetFixtures.ts` still act as a transport-oriented fallback layer even though accepted-family fidelity now lives in the dedicated Phase 14 scenes
- The real gap is not acceptance. The real gap is that product rendering still learns LCARS grammar too slowly and too heuristically compared with the oracle path.

## Phase 15 objective
Phase 15 will turn the current oracle-to-product bridge into an explicit renderer-development path: promote reusable visual and geometry primitives from `phase14_family` into shared modules and teach `legacy_strict` to render through those promoted primitives and explicit LCARS contracts, without collapsing the oracle into the live product route.

## What Phase 15 preserves
- `legacy_strict` as the only active live product renderer base.
- `phase14_family` as the canonical acceptance and visual-oracle engine.
- The catalog-driven target-bank gate in `make ci`, `make canonical-acceptance`, and `npm run test:visual`.
- AGENTS anti-cheat rules and the no-raster, no-target-bank-runtime policy.
- The strict Python normalization path in `lcars-ui/src/lcars_ui/dsl/_normalize.py` and strict-by-default contract settings in the backend models and DSL.
- Shared geometry extraction already landed in `lcars-ui/frontend/src/components/primitives/lcarsGeometryPrimitives.tsx`.
- Phase 14 family-local scene ownership where grammar is still genuinely family-local.
- Deterministic fixture manifests as transport and harness scaffolding, not as the fidelity source of truth.

## What Phase 15 de-prioritizes or removes from active strategy
- Any framing that treats the codebase as three co-equal renderer philosophies.
- Any attempt to reopen the bake-off or compare `legacy_strict`, `phase14_family`, and `joern_strict` as future options.
- `joern_strict` as an architecture driver, public strategy, or product-direction input.
- Overview/systems specimen parity as a forward fidelity strategy.
- Widget-ID or page-ID keyed fidelity logic in active product code.
- Legacy self-golden screenshot checks as a definition of LCARS-ready.
- Product work that optimizes for one accepted screenshot without yielding reusable primitives or contracts.
- Collapsing `phase14_family` scenes directly into live app routing as a shortcut around product-renderer learning.

## Phase 15 architecture direction
Phase 15 should treat `phase14_family` as the oracle that proves LCARS grammar and `legacy_strict` as the manifest-native renderer that must learn that grammar.

The direction for this phase is:

- Keep canonical target acceptance separate and honest. The accepted family scenes remain the measurement oracle.
- Promote only real reusable forms upward from the oracle path. Shared geometry, repeated segment runs, pill/capsule behavior, text-row blocks, chart/matrix framing, and other cross-family primitives should move into shared modules when at least two concrete use sites justify them.
- Upgrade the product path through manifest-native contracts, not target-specific scene imports. `legacy_strict` should gain explicit composition inputs and reusable strict subcomponents so that it stops depending on row/column heuristics, widget ordering, and specimen IDs for LCARS behavior.
- Leave family-local scene code inside `phase14_family` until a primitive is proven reusable. Phase 15 is extraction, not forced unification.
- Use acceptance scenes to identify the next primitive to promote, then implement that primitive once in shared code and consume it from both sides where appropriate.

This means the bridge is:

1. oracle family scene proves a form,
2. shared primitive layer captures that form,
3. strict manifest/compiler gains the contract to express it,
4. `legacy_strict` adopts it for real product pages.

## Workstreams

### 1. Oracle Primitive Promotion Boundary
Objective: turn the current partial extraction work into a formal shared primitive boundary between `phase14_family` and `legacy_strict`.

Likely files/systems touched: `lcars-ui/frontend/src/components/primitives/lcarsGeometryPrimitives.tsx`, `lcars-ui/frontend/src/components/phase14/phase14Primitives.tsx`, `lcars-ui/frontend/src/components/phase14/*FamilyScene.tsx`, `lcars-ui/frontend/src/components/phase14/*FamilyData.ts`, `lcars-ui/docs/PHASE14_FAMILY_REUSE_LEDGER.md`.

Deliverables: a named promoted-primitive inventory; clear ownership rules for shared vs family-local code; shared primitives for currently duplicated or ad hoc forms; tests proving both oracle and product code use the same promoted geometry helpers where reuse is real.

Out of scope: genericizing every family scene, replacing family-local payload code, or routing live product pages through `phase14_family`.

Success criteria: shared primitive modules become the default home for reused LCARS forms; new product work stops re-deriving oracle geometry independently; the reuse ledger becomes an engineering boundary instead of a historical note.

Failure signals: copy-paste from `phase14_family` into product renderers, new geometry math duplicated under `strict/` or `containers/`, or promotion decisions made without multiple real use sites.

### 2. Strict Composition Contract Upgrade
Objective: give the product path explicit manifest-native ways to express promoted LCARS grammar so `legacy_strict` no longer depends on broad heuristic partitioning for fidelity.

Likely files/systems touched: `lcars-ui/src/lcars_ui/core/models.py`, `lcars-ui/src/lcars_ui/dsl/_normalize.py`, `lcars-ui/src/lcars_ui/dsl/_builder.py`, `lcars-ui/src/lcars_ui/dsl/api.py`, `lcars-ui/frontend/src/types/contract.ts`, `lcars-ui/frontend/src/components/WidgetRenderer.tsx`.

Deliverables: stricter composition contracts for promoted primitives and regions; normalized manifest structures that explicitly encode the product-side layout intent learned from the oracle; contract tests on both Python and TypeScript sides.

Out of scope: schema redesign for its own sake, breaking classic mode, or adding target-family IDs to the manifest contract.

Success criteria: product fidelity decisions move from widget-mix inference to explicit strict contracts; `normalize_manifest_for_strict` becomes the place where LCARS composition intent is encoded; renderer behavior becomes easier to reason about and harder to special-case.

Failure signals: more product behavior is still inferred from widget order and type mixes alone; new fidelity work requires page IDs or widget IDs; contract additions are so target-shaped that they only fit one accepted family.

### 3. Legacy Strict Renderer Convergence
Objective: refactor the active product renderer to consume promoted primitives and stricter contracts, starting with structural chrome and then moving into repeated payload framing.

Likely files/systems touched: `lcars-ui/frontend/src/components/strict/LegacyStrictPageRenderer.tsx`, `lcars-ui/frontend/src/components/containers/LcarsSweepControl.tsx`, `lcars-ui/frontend/src/components/containers/LcarsBoxControl.tsx`, `lcars-ui/frontend/src/components/containers/LcarsHeaderControl.tsx`, `lcars-ui/frontend/src/components/containers/LcarsBracketControl.tsx`, `lcars-ui/frontend/src/components/charts/LineChartWidget.tsx`, `lcars-ui/frontend/src/styles/lcars/*.css`, `lcars-ui/frontend/src/theme/geometryTokens.ts`.

Deliverables: shared strict scaffold subcomponents; reduced heuristic band assembly in `LegacyStrictPageRenderer`; product-side adoption of promoted bar, capsule, pill, rail, and repeated-cell or frame primitives where warranted; removal of active specimen-coupled fidelity branches from product code once replacements exist.

Out of scope: direct port of accepted target scenes into the product router, screenshot-oriented one-off parity tuning, or broad visual cleanup unrelated to promoted primitives.

Success criteria: live strict pages render more LCARS-native geometry through reusable components; product containers and widgets stop carrying legacy parity baggage; fidelity improvements come from shared primitives rather than more conditional logic.

Failure signals: `legacy_strict` gains new target-specific branches, imports `phase14` family scenes directly, or keeps both old heuristics and new primitives alive in parallel without reducing the old path.

### 4. Transitional Path Fencing and Retirement
Objective: make architectural drift mechanically harder by fencing deprecated paths and scheduling removals only after product replacements land.

Likely files/systems touched: `lcars-ui/frontend/src/App.tsx`, `lcars-ui/frontend/src/components/containers/paritySweepSpec.ts`, `lcars-ui/frontend/src/components/strict/JoernStrictPageRenderer.tsx`, `lcars-ui/frontend/src/test/*.test.ts`, `lcars-ui/frontend/tests/visual/*`, `lcars-ui/docs/PHASE14_TRANSITION_BOUNDARIES.md`, `lcars-ui/docs/OVERVIEW_PARITY_ARCHITECTURE.md`, `lcars-ui/docs/RENDERER_BAKEOFF_PHASE4_ROLE_ASSIGNMENT.md`.

Deliverables: explicit guardrails that keep joern archived and parity specimen logic transitional; tests that forbid product imports from target-bank assets and accepted-family scenes except in approved acceptance paths; removal sequence for old parity hooks once product replacements are live.

Out of scope: deleting historical artifacts that still serve bake-off evidence, or removing compatibility regressions before replacement coverage exists.

Success criteria: the repo’s commands, docs, and tests all reinforce one direction; deprecated paths can no longer quietly regain architecture influence; removals happen only after replacement coverage is in place.

Failure signals: `joern` still shapes frontend contracts, legacy parity tests regain default status, or new docs imply that acceptance and product routing are being merged as a shortcut.

## Recommended implementation order
Start with Workstream 1, then Workstream 2, then Workstream 3, and finish with Workstream 4.

This order is correct because:

1. The primitive boundary has to be named before product refactors can be coherent. Without that, Phase 15 will just produce another round of duplicate geometry code.
2. The strict contract upgrade has to happen before major renderer convergence. `legacy_strict` cannot learn reusable oracle behavior cleanly if the manifest still underspecifies that behavior.
3. Renderer convergence should happen only after the shared primitive layer and manifest contract are both ready. That is what prevents fidelity work from collapsing back into heuristics.
4. Retirement and hard fencing should happen after replacements are proven, not before. Guardrail additions should begin immediately, but actual path removal should follow successful convergence.

## Guardrails and testing
Phase 15 should be governed by the existing anti-cheat and acceptance rules, plus stronger architecture-boundary tests.

- Keep `make ci`, `make canonical-acceptance`, and `npm run test:visual` mapped to the canonical Phase 14 target-bank run.
- Keep AGENTS anti-cheat rules fully binding. No raster embedding, no reference-image rendering, no target-bank runtime imports, no screenshot-backed shortcuts.
- Preserve the current frontend and backend target-bank guardrails and extend them to cover any new shared primitive modules.
- Add tests that product strict code does not import accepted-family scene components as a shortcut.
- Add tests that new promoted primitives are reused across oracle and product code before family-local code is retired.
- Add tests that the strict manifest/compiler path encodes new LCARS composition contracts explicitly rather than through widget IDs or target IDs.
- Keep acceptance artifacts mandatory for canonical runs. Any threshold changes should be tied to documented primitive or contract work, not to subjective screenshot tuning.
- Keep legacy visual regression checks only as secondary compatibility smoke tests. They must never become the acceptance gate again.

## Definition of success
Phase 15 succeeds if the repository ends the phase with one clear development loop: `phase14_family` proves LCARS grammar, shared primitives capture the reusable parts, and `legacy_strict` renders more of that grammar through explicit manifest contracts and shared components.

Concretely, success means:

- the shared primitive layer is materially larger and clearly owned,
- `legacy_strict` has less heuristic LCARS behavior and less specimen-specific baggage,
- product-side strict composition is more explicit in the backend and frontend contracts,
- canonical target-bank acceptance remains green and remains separate from live product routing,
- `joern_strict` and legacy parity no longer influence forward architecture decisions.

## Definition of failure
Phase 15 fails if the repository keeps the current split indefinitely: a strong oracle path that stays isolated, a product renderer that continues to rely on heuristics, and a growing pile of transitional branches that never retire.

Concretely, failure means:

- new product fidelity work depends on page IDs, widget IDs, or target-shaped branches,
- `phase14_family` remains an isolated acceptance silo with little or no primitive promotion into product code,
- product rendering starts importing acceptance scenes directly instead of learning from them,
- the manifest contract remains too vague to express promoted LCARS composition rules,
- `joern_strict` or overview parity re-enters architectural discussion as an active alternative,
- the team spends effort improving screenshots without shrinking the architecture gap.

## Recommended first implementation pass
The first implementation pass should formalize and extend the current shared scaffold extraction by promoting the existing oracle-derived segment-run, capsule-bar, text-row, and pill behavior into a stricter shared primitive layer, then refactoring `LegacyStrictPageRenderer.tsx`, `LcarsHeaderControl.tsx`, `LcarsSweepControl.tsx`, and `LcarsBoxControl.tsx` to consume that layer under new reuse and anti-regression tests while leaving `phase14_family` routing unchanged.

## Phase 15 audit status (2026-03-19)
Status legend: `Completed` | `In Progress` | `Uncompleted`.

### Confidence gate status
| Completion gate | Status | Evidence summary |
| --- | --- | --- |
| the shared primitive layer is now materially larger and clearly central | Completed | Shared primitive surface is broad (`lcarsGeometryPrimitives`, `lcarsSharedScaffoldPrimitives`, `lcarsChartFramePrimitives`, `lcarsStrictTitlePrimitives`) and now enforced as a boundary through `phase15PrimitiveInventory.ts`, `phase15PrimitiveBoundaryGuardrails.test.ts`, and the updated reuse ledger ownership/retirement rules. |
| `legacy_strict` has substantially less heuristic behavior, not just less in a few hotspots | Completed | Frontend strict runtime removed duplicated type-set heuristic role routing (`STRICT_*_WIDGET_TYPES`, `MAIN_ZONE_TYPES`), backend wrapper classification is role-first (`_classify_group_by_strict_role`) with isolated legacy fallback, and box/sweep reassignment now enforces explicit region/role precedence behind explicit compatibility gates and tests. |
| product strict composition is more explicit across the contract boundary, not just in selected areas | Completed | Contract carries `strict_role`, `strict_title`, and explicit container regions; frontend strict composition consumes roles directly; backend page-level grouping and box/sweep routing now honor authored strict intent before any compatibility fallback. |
| `phase14_family` is clearly teaching the product renderer in a repeatable pattern | Completed | Product strict now follows the same repeatable promotion loop (oracle-derived primitives + explicit strict composition + bounded compatibility fallback), with backend normalization tests proving authored role/region intent is preserved deterministically. |
| old parity/specimen logic is no longer meaningfully steering product behavior | Completed | Parity/specimen runtime steering was removed from product code (`paritySweepSpec` removed, `LcarsSweepControl` no longer routes by specimen IDs, parity chart ID hooks removed from `LineChartWidget`), and transition docs/tests now fence the retired path as archived regression scaffolding only. |
| the next phase is genuinely a new phase, not just “more extraction because the current phase isn’t done yet” | Completed | `docs/PHASE16_BOUNDARY_STATEMENT.md` now locks a non-overlapping Phase 16 target-bank scale-out scope, explicit non-goals, and entry/exit gates that treat Phase 15 extraction/contract closure as completed baseline. |

### Workstream status
#### 1. Oracle Primitive Promotion Boundary
- Completed
  - Shared scaffold/frame/title primitives are in place and reused by both oracle scenes and product strict components.
  - Reuse boundary is now closed as a hard engineering boundary with a binding promoted-primitive inventory and enforcement tests (`phase15PrimitiveInventory.ts`, `phase15PrimitiveBoundaryGuardrails.test.ts`).
  - Ownership and retirement criteria are explicitly documented in `docs/PHASE14_FAMILY_REUSE_LEDGER.md`.

#### 2. Strict Composition Contract Upgrade
- Completed
  - Backend/frontend contract supports explicit strict composition (`strict_role`, `strict_title`, explicit strict container regions).
- Completed
  - Normalization and renderer paths prefer explicit regions when present.
  - Frontend strict runtime now treats `strict_role` as the composition source of truth and no longer keeps local widget-type role sets.
  - Backend group wrapper classification is now role-first with explicit legacy fallback boundaries.
  - Backend box/sweep normalization now preserves authored region/role intent before any legacy input-type reassignment.
  - Compatibility fallback is now explicitly bounded to implicit manifests and guarded by tests that prevent silent expansion.

#### 3. Legacy Strict Renderer Convergence
- Completed
  - `LegacyStrictPageRenderer` and strict controls/charts adopt promoted scaffold/frame/title primitives.
- Completed
  - Product strict composition has stronger explicit-path handling in containers and controls.
  - Duplicated frontend heuristic role sets were removed from `LegacyStrictPageRenderer`, `strictContainerPlacement`, and `LcarsBracketControl` in favor of shared strict-role resolution.
  - Backend page-level wrapper grouping now uses strict roles as the first classification boundary.
  - Backend box/sweep region routing now keeps explicit author intent (`main/side`, `left/right`, authored roles) ahead of compatibility reassignment.
  - Implicit-manifest compatibility behavior remains available but constrained behind explicit backend fallback gates.

#### 4. Transitional Path Fencing and Retirement
- Completed
  - Joern deprecation, anti-cheat guardrails, and acceptance-role boundaries are documented and tested.
  - Specimen/parity runtime hooks were removed from product runtime and no longer steer sweep/chart behavior by ID.
  - Transitional parity path is fenced and explicitly treated as archived regression scaffolding only; `PHASE14_TRANSITION_BOUNDARIES.md` and `test_phase14_acceptance_promotion.py` enforce legacy-command-only entrypoints and historical-only parity architecture wording.

### Exit decision
Phase 15 phase-close status: `Completed`.

All six confidence gates in this section are now `Completed`.

### Phase 16 handoff
Phase 16 starts from a locked baseline:
- Scope is defined in `docs/PHASE16_BOUNDARY_STATEMENT.md` (target-bank scale-out only).
- Phase 15 extraction/contract closure items are closed and not treated as carry-over.
- Existing anti-cheat, primitive-boundary, strict-role, and parity-retirement guardrails remain binding.

### Verification run for this audit snapshot
- `npm run test -- src/components/strict/LegacyStrictPageRenderer.test.tsx src/components/containers/LcarsSweepControl.test.tsx src/components/containers/LcarsBoxControl.test.tsx src/components/containers/LcarsBracketControl.test.tsx src/test/strictRoleHeuristicGuardrails.test.ts` (pass).
- `npm run test -- src/test/phase15PrimitiveBoundaryGuardrails.test.ts src/test/overviewParityGuardrails.test.ts src/test/joernGuardrails.test.ts src/test/targetBankGuardrails.test.ts src/test/parityRetirementGuardrails.test.ts` (pass).
- `pytest -q lcars-ui/tests/unit/test_phase13_normalize.py` (pass; includes role-first wrapper coverage, explicit box/sweep authored-region preservation, and implicit compatibility fallback boundaries).
- `pytest -q lcars-ui/tests/unit/test_phase14_acceptance_promotion.py` (pass; includes canonical-vs-legacy command fencing, archived parity-boundary wording checks, and Phase 16 boundary-statement/Phase 15 closure assertions).
