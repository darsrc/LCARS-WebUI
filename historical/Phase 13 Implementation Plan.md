# Phase 13 Implementation Plan

## Status
- `state`: ready for execution
- `source`: `Phase 13 Patch Plan.md`
- `target`: strict mode renders as LCARS-native composition, not dashboard-first layout

## Objective
Deliver a strict-mode architecture where LCARS containers and composition semantics are authoritative across DSL lowering, manifest normalization, frontend rendering, and visual gates.

## In Scope
- Strict-mode composition truth and lowering behavior.
- Sweep/container semantics as structural layout primitives.
- Removal of remaining dashboard-card rendering paths in strict mode.
- Reference composition updates and visual baseline reset.
- CI and test hardening for strict-mode fidelity.

## Out of Scope
- Full manifest contract rewrite.
- Classic mode redesign.
- New unrelated widget categories.

## Workstream Plan

### P13-I1: Composition Truth Refactor
**Goal:** strict mode composition decisions are LCARS-first at DSL/normalizer/renderer boundaries.

**Files**
- `lcars-ui/src/lcars_ui/core/models.py`
- `lcars-ui/src/lcars_ui/dsl/_builder.py`
- `lcars-ui/src/lcars_ui/dsl/_normalize.py`
- `lcars-ui/frontend/src/App.tsx`

**Tasks**
1. Map current strict composition path from builder output to frontend traversal.
2. Define strict-only lowering contract for top-level layout decisions.
3. Update normalization/lowering so strict output favors LCARS container structure over generic row/column grouping.
4. Keep classic mode and manifest compatibility intact.

**Deliverables**
- Design note in code comments/docstrings for strict lowering rules.
- Updated strict manifest normalization behavior with deterministic grouping.
- Tests asserting strict-mode structural output shape.

**Acceptance**
- Strict example manifests are explainable by LCARS-first lowering rules.
- Top-level strict rendering is no longer dependent on generic dashboard traversal assumptions.

### P13-I2: Sweep Semantics Correction
**Goal:** `lcars_sweep` behaves as a structural composition primitive in strict mode.

**Files**
- `lcars-ui/src/lcars_ui/widgets/containers.py`
- `lcars-ui/frontend/src/components/containers/LcarsSweepControl.tsx`
- `lcars-ui/frontend/src/styles/lcars/containers.css`
- strict normalizer hooks in `lcars-ui/src/lcars_ui/dsl/_normalize.py`

**Tasks**
1. Define sweep region semantics (header/rail/content behavior) in strict mode.
2. Align widget schema and renderer behavior with those semantics.
3. Update CSS so sweep drives layout structure, not just visual framing.

**Deliverables**
- Documented strict sweep semantics.
- Updated sweep renderer and style rules.
- Tests verifying sweep structure for canonical strict compositions.

**Acceptance**
- Sweep layouts materially affect composition/placement, not only title bar and rail visuals.

### P13-I3: Container-Owned Interior Composition
**Goal:** box/sweep/bracket own interior placement rules for canonical strict layouts.

**Files**
- `lcars-ui/src/lcars_ui/dsl/_normalize.py`
- `lcars-ui/frontend/src/components/containers/LcarsBoxControl.tsx`
- `lcars-ui/frontend/src/components/containers/LcarsBracketControl.tsx`
- `lcars-ui/frontend/src/components/containers/LcarsSweepControl.tsx`
- `lcars-ui/frontend/src/styles/lcars/containers.css`

**Tasks**
1. Add strict container interior regioning rules (content vs side controls vs stacked zones).
2. Ensure interior child placement follows container semantics before generic widget wrappers.
3. Remove container paths that default to plain stack/grid behavior for strict reference layouts.

**Deliverables**
- Updated container render contracts.
- CSS changes for strict interior layout behavior.
- Regression tests on canonical container compositions.

**Acceptance**
- Canonical strict layouts remain LCARS-structured without relying on generic grid/card composition.

### P13-I4: Interior Widget De-Dashboarding
**Goal:** eliminate remaining strict-mode fallback routes to generic dashboard card rendering.

**Files**
- `lcars-ui/frontend/src/components/WidgetRenderer.tsx`
- `lcars-ui/frontend/src/components/controls/Lcars*Control.tsx`
- `lcars-ui/frontend/src/styles/lcars/widgets-core.css`
- `lcars-ui/frontend/src/styles/lcars/controls.css`

**Tasks**
1. Inventory strict-mode widget types still routed through generic card rendering.
2. Add strict-specific control renderers or wrappers for unsupported paths.
3. Narrow or remove `.lcars-widget` assumptions that preserve card-first behavior in strict mode.

**Deliverables**
- Updated strict render routing matrix by widget type.
- New/updated strict control components where needed.
- Unit/snapshot coverage for affected control paths.

**Acceptance**
- Key strict reference pages render without visually dominant generic card wrappers.

### P13-I5: Reference Composition and Golden Reset
**Goal:** replace weak/stale strict visual baselines with target-faithful references.

**Files**
- `lcars-ui/examples/bridge_ops/app.py`
- `lcars-ui/examples/lcars_console/app.py`
- `lcars-ui/examples/lcars_padd/app.py`
- `lcars-ui/frontend/tests/visual/*.spec.ts`
- `lcars-ui/frontend/tests/visual/golden/*`

**Tasks**
1. Update canonical examples to represent target strict composition criteria.
2. Align screenshot names/spec references with committed goldens.
3. Regenerate goldens only after structural and visual criteria pass.

**Deliverables**
- Canonical strict examples reflecting LCARS-native composition.
- Synchronized visual specs and baseline assets.
- Golden review checklist documented in test notes.

**Acceptance**
- Goldens match current spec naming and target strict composition quality.
- No stale or mismatched baseline artifacts remain.

### P13-I6: Validation and CI Hardening
**Goal:** strict-mode fidelity cannot pass on shell-only/hollow renders.

**Files**
- `lcars-ui/frontend/tests/visual/*.spec.ts`
- `lcars-ui/Makefile`
- `lcars-ui/tests/unit/test_phase13_normalize.py`
- `lcars-ui/tests/unit/test_phase13_recipes.py`
- `lcars-ui/tests/unit/test_phase13_input_column.py`
- `lcars-ui/tests/integration/test_dsl_roundtrip.py`

**Tasks**
1. Add pre-screenshot structural readiness assertions (beyond `.lcars-content-frame` visibility).
2. Move visual regression into default CI/release gate path.
3. Expand backend/frontend tests where strict composition rules changed.

**Deliverables**
- Hardened visual specs with interior-structure assertions.
- CI pipeline includes visual regression in default gate.
- Updated Phase 13 tests aligned with strict lowering semantics.

**Acceptance**
- CI fails on structural regressions or shell-only strict renders.
- Visual tests are first-class release criteria.

## Sequencing
1. `P13-I1` composition truth refactor (foundation).
2. `P13-I2` sweep semantics and `P13-I3` container-owned interiors.
3. `P13-I4` strict widget de-dashboarding.
4. `P13-I5` example update and golden reset.
5. `P13-I6` gate hardening and final verification.

## Milestones
- `M1`: strict lowering contract implemented and tested (`P13-I1` complete).
- `M2`: containers/sweep enforce interior structure (`P13-I2`, `P13-I3` complete).
- `M3`: strict widget routing no longer card-first (`P13-I4` complete).
- `M4`: canonical references and goldens reset (`P13-I5` complete).
- `M5`: CI blocks non-fidelitous strict output (`P13-I6` complete).

## Validation Matrix
- Backend structure:
  - strict normalization output tests
  - DSL recipe/input-column tests
  - integration roundtrip checks
- Frontend structure:
  - renderer path coverage by widget type
  - container/control snapshot coverage
- Visual fidelity:
  - canonical strict examples
  - screenshot comparison with hardened readiness checks
- CI gating:
  - visual regression included in default release path

## Risks and Mitigations
- `risk`: cosmetic-only drift fix.
  - `mitigation`: enforce structural acceptance criteria before golden reset.
- `risk`: overfitting to one demo layout.
  - `mitigation`: validate all canonical examples (`bridge_ops`, `lcars_console`, `lcars_padd`).
- `risk`: strict/classic behavior bleed.
  - `mitigation`: strict-only branches and compatibility tests.
- `risk`: stale baseline recementing.
  - `mitigation`: naming alignment + explicit baseline review checklist.

## Definition of Done
Phase 13 is complete when:
1. Strict mode lowering and rendering are demonstrably LCARS-first in structure.
2. Sweep and containers act as composition primitives, not framing wrappers.
3. Remaining strict widget paths are de-dashboarded.
4. Canonical examples and goldens represent target-faithful strict output.
5. CI gate includes visual regression and structural strict checks.
6. Classic mode remains compatible.
