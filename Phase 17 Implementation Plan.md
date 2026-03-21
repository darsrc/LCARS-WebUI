# Phase 17 Implementation Plan

## Current baseline
`legacy_strict` is the live product renderer and `phase14_family` is the oracle / acceptance engine. Phase 15 already closed the first shared-primitive boundary (`lcarsSharedScaffoldPrimitives`, `lcarsChartFramePrimitives`, `lcarsStrictTitlePrimitives`) and explicit `strict_role` plus explicit box / sweep region contracts. Phase 16 already closed the catalog-driven seven-target / four-family acceptance bank and the root/package docs are in sync. The remaining gap is product-side grammar: the strict compiler, container placement helpers, `LegacyStrictPageRenderer`, and generic `StrictSurface` paths still rely on bounded compatibility fallback or heuristic composition where the oracle already has clearer LCARS forms.

## Phase 17 objective
Make `legacy_strict` consume more of the oracle’s proven LCARS scaffold and surface grammar through additive manifest/compiler contracts and shared primitives, so recipe-authored strict pages render from explicit structural intent instead of row / column splits, generic strict surfaces, and compatibility heuristics.

## What Phase 17 preserves
- The two-role architecture: `legacy_strict` stays product, `phase14_family` stays oracle / acceptance.
- The closed Phase 15 primitive boundary and closed Phase 16 target-bank acceptance scope.
- Catalog-driven canonical acceptance, current thresholds, singleton policy, and anti-cheat rules.
- `joern_strict` as a deprecated compatibility/archive path only.
- Current docs as settled baseline, not a new truth-sync project.
- Bounded compatibility support for older implicit manifests until replacement coverage exists.

## What Phase 17 advances
- Explicit scaffold contract for strict bands, lanes, and surface variants.
- Second-wave shared primitive promotion from oracle scenes into product rendering.
- Retirement of remaining product heuristics where explicit contract data exists.
- Stronger schema, fixture, and guardrail coverage so convergence is measured structurally, not cosmetically.

## Architecture direction
Phase 17 keeps the same bridge: oracle family scenes prove reusable grammar, shared primitive modules capture it, the strict compiler emits it as manifest-native contract, and `legacy_strict` renders it. Product code must not import family scenes or target-specific data. Acceptance stays separate. The default path for recipe-authored strict pages should become explicit scaffold metadata first and compatibility fallback second.

## Workstreams
### 1. Scaffold contract promotion
- Objective: make page bands, lanes, recipe scaffolds, and surface intent explicit in the strict contract instead of inferred in `LegacyStrictPageRenderer` and container placement helpers.
- Likely files/systems touched: manifest models, strict compiler, DSL recipe builders, TypeScript contract validator, deterministic fixture manifests.
- Deliverables: additive strict-only metadata for band role, lane role, and scaffold/surface variant; compiler emission for page-title sweeps plus `console()`, `padd()`, `diagnostic()`, `data_panel()`, and `control_panel()`; schema/golden updates on both Python and TypeScript sides.
- Out of scope: new renderer families, classic-mode redesign, target-shaped contract fields.
- Success criteria: recipe-authored strict manifests carry enough structure that product rendering no longer has to guess their band/lane intent.
- Failure signals: new fields encode target/family IDs, duplicate the same semantics in multiple sources of truth, or still leave heuristics as the primary path for authored strict pages.

### 2. Shared primitive promotion wave 2
- Objective: promote oracle forms that already repeat across accepted families and product UI but still live in family-local scene code or generic strict surfaces.
- Likely files/systems touched: shared primitive modules, `phase14` scene primitives, primitive inventory, primitive boundary guardrails.
- Deliverables: shared scaffold/surface primitives for macro band runs, narrative/text-row blocks, and action-pill/rail stacks; oracle consumers switched to them; product consumers prepared to adopt them; Phase 15 primitive inventory extended.
- Out of scope: family-local payload logic such as Seismographic waveform/map internals, Periodic Table matrix population, or emblem-heavy ADGE geometry.
- Success criteria: every newly promoted primitive has both oracle and product consumers and replaces duplicated or generic product rendering.
- Failure signals: one-off family payloads are promoted without a second real use site, or product code keeps local copies of the same primitive math.

### 3. Legacy strict convergence
- Objective: refactor `legacy_strict` to consume explicit scaffold contracts and promoted primitives, replacing the remaining page / band / container heuristics and shrinking generic `StrictSurface` usage.
- Likely files/systems touched: `LegacyStrictPageRenderer`, `WidgetRenderer`, strict container placement, box / sweep / header controls, strict styles.
- Deliverables: contract-driven band / lane rendering, explicit precedence rules when authored metadata exists, LCARS-native surface variants for strict text / markdown / alert / log / video / chart shells, and narrower compatibility fallback for implicit manifests only.
- Out of scope: direct routing through `phase14_family`, target-ID / page-ID branching, screenshot-only polish passes.
- Success criteria: explicit scaffold metadata wins everywhere it exists, shared primitives become the default strict rendering vocabulary, and generic strict surfaces stop being the catch-all answer.
- Failure signals: count-based lane splits remain central, `StrictSurface` keeps expanding, or product code imports oracle scene/data modules.

### 4. Contract and acceptance hardening
- Objective: keep Phase 17 convergence honest without changing the oracle’s role.
- Likely files/systems touched: backend contract tests, frontend contract tests, strict guardrail tests, deterministic fixture manifests, phase-specific docs.
- Deliverables: unit tests proving compiler emission and frontend consumption of new scaffold fields, guardrails that explicit metadata suppresses heuristic fallback, fixture-manifest updates that keep transport scaffolding schema-valid, and doc updates limited to new contract / primitive behavior.
- Out of scope: threshold changes, catalog expansion, or reclassifying fixture manifests as acceptance truth.
- Success criteria: canonical target-bank acceptance remains unchanged and green while new product-side tests cover the contract bridge directly.
- Failure signals: catalog / threshold edits are used to mask product issues, or docs/tests drift back into a truth-sync task instead of implementation support.

## Recommended implementation order
1. Land scaffold contract fields and compiler emission first, because Phase 17 must move intent out of renderer guesses before it moves code.
2. Promote the next shared primitives against that contract surface, because renderer refactors should target stable shared modules rather than invent new local helpers.
3. Refactor `legacy_strict`, container controls, and generic strict surfaces to consume the new contract/primitives and delete the overlapping heuristic paths.
4. Finish by tightening schema / fixture / guardrail coverage and phase docs so the new bridge cannot silently regress.

## Guardrails and testing
- Keep canonical target-bank acceptance unchanged: same catalog, same thresholds, same anti-cheat, same separation between `phase14_family` and live product routing.
- Keep existing guardrails binding: primitive-boundary, strict-role heuristic, target-bank anti-cheat, overview parity anti-cheat, joern fencing, and Phase 16 catalog policy.
- Any schema change must update Pydantic models, the TypeScript manifest validator, golden schema / manifest fixtures, and deterministic Phase 14 fixture manifests in the same change.
- Add compiler and frontend tests that explicit scaffold metadata overrides fallback in `_normalize.py`, `LegacyStrictPageRenderer`, and container placement helpers.
- Required validation loop: `pytest -q lcars-ui/tests/unit/test_phase13_normalize.py lcars-ui/tests/unit/test_phase14_target_bank_catalog.py lcars-ui/tests/contracts/test_manifest_schema.py`; `cd lcars-ui/frontend && npm run test -- src/test/phase15PrimitiveBoundaryGuardrails.test.ts src/test/strictRoleHeuristicGuardrails.test.ts src/test/targetBankGuardrails.test.ts src/components/containers/LcarsSweepControl.test.tsx src/components/strict/LegacyStrictPageRenderer.test.tsx`; `cd lcars-ui/frontend && npm run test:visual`.
- Product-side convergence must be proven mainly by contract and fixture tests; the canonical visual harness remains the oracle exit gate, not a threshold-tuning tool.

## Definition of success
- `legacy_strict` renders recipe-authored strict pages from explicit scaffold intent instead of row / column guesswork.
- More oracle grammar is shared through primitives rather than reimplemented or approximated.
- Compatibility fallback survives only as a fenced legacy path for implicit manifests.
- Canonical acceptance stays separate, green, and unchanged in authority.

## Definition of failure
- Phase 17 turns into screenshot tuning, an architecture contest, or a hidden bake-off reboot.
- Product code starts importing oracle scenes/data or adding page/target-shaped branches.
- New contract fields are vague enough that the renderer still guesses, or duplicated enough that Python / TypeScript / fixtures drift apart.
- Catalog / threshold edits are used to compensate for product-renderer shortcomings.

## Recommended first implementation pass
Introduce additive strict band / lane scaffold metadata for recipe-authored strict pages and page-title sweeps, emit it from the strict compiler and recipe builders, mirror it in the TypeScript contract, and refactor `LegacyStrictPageRenderer` to consume it through a shared band-scaffold primitive instead of the current single-column split / count heuristics. Include schema / golden updates, fixture-manifest alignment, and tests proving explicit scaffold metadata suppresses heuristic lane composition.
