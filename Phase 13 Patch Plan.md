# Phase 13 Patch Plan

## Status
This is a post-Phase-13 patch planning document. It does not replace the full implementation plan; it defines what must be corrected first so a credible patch implementation plan can be written next.

## Depends on
- `Phase 13 Implementation Plan.md`.
- Current repository state as verified in code, tests, examples, and visual goldens.
- Note: `Implementation Plan.md` was requested for review but is not present at the repository root (`find` returned no file by that name). This dependency remains unresolved and is treated as a documentation gap.

## Why this patch exists
Phase 13 was declared complete, but the current strict-mode output still reads as a dashboard/app shell with LCARS chrome, not an LCARS-native composition system. The gap is architectural and compositional, not a simple styling shortfall.

## What Phase 13 achieved
- Added LCARS-first recipe/helper API surface in `lcars-ui/src/lcars_ui/dsl/api.py` and `lcars-ui/src/lcars_ui/dsl/_recipes.py` (`console`, `padd`, `diagnostic`, `data_panel`, `control_panel`, `input_column`, `raw`).
- Expanded strict normalizer behavior in `lcars-ui/src/lcars_ui/dsl/_normalize.py` (page-title sweep injection, group classification, smart wrapping, raw bypass).
- Added strict-mode container/shell/control renderer assets in frontend:
  - `lcars-ui/frontend/src/components/containers/*`
  - `lcars-ui/frontend/src/components/controls/Lcars*Control.tsx`
  - `lcars-ui/frontend/src/styles/lcars/geometry.css`
  - `lcars-ui/frontend/src/styles/lcars/controls.css`
- Added geometry token mirrors in `lcars-ui/frontend/src/theme/geometryTokens.ts`.
- Added Phase 13 backend/unit coverage (`lcars-ui/tests/unit/test_phase13_*`) and visual screenshot specs (`lcars-ui/frontend/tests/visual/*.spec.ts`).
- Added canonical examples (`lcars-ui/examples/lcars_console/app.py`, `lcars-ui/examples/lcars_padd/app.py`) and migrated `lcars-ui/examples/bridge_ops/app.py` to recipe usage.

## What Phase 13 missed
- It added LCARS-shaped components and wrappers, but did not replace the core layout truth with an LCARS-first composition model.
- It improved strict control rendering for many inputs, but left major rendering paths and layout behavior fundamentally widget-card/grid oriented.
- It introduced visual regression artifacts, but current baselines and gate conditions do not reliably enforce target-faithful LCARS output.
- Net result: Phase 13 completed a refactor pass, not the full transformation to a Python analogue in an LCARS-native direction.

## Verified failure modes in the current codebase
- **1) Dashboard-first core model (verified: yes).**
  - `lcars-ui/src/lcars_ui/core/models.py` still defines `Page -> Row -> Column -> Widget` as the contract.
  - `lcars-ui/src/lcars_ui/dsl/_builder.py` still auto-creates page/row/col (`_ensure_default_page`) and accumulates widgets in that grid hierarchy.
  - `lcars-ui/frontend/src/App.tsx` renders pages by iterating rows/columns and applying grid styles directly.
  - Drift impact: LCARS containers are additional widget types inside a dashboard grammar, not the grammar itself.

- **2) Sweep semantics are weakened (verified: yes).**
  - `lcars-ui/src/lcars_ui/widgets/containers.py` defines `LcarsSweep` as title/color/sidebar-width/children only.
  - `lcars-ui/frontend/src/components/containers/LcarsSweepControl.tsx` renders a top bar + left rail + generic content region.
  - Drift impact: sweep functions mostly as a framed panel with a side rail, not a structurally meaningful LCARS sweep composition primitive with strong dual-region behavior.

- **3) Containers frame more than they compose (verified: yes).**
  - `LcarsBoxControl` and `LcarsSweepControl` primarily map child widgets into stacks/grids (`lcars-ui/frontend/src/components/containers/*.tsx`).
  - `lcars-ui/frontend/src/styles/lcars/containers.css` mainly defines framing geometry and spacing.
  - `normalize_manifest_for_strict()` in `lcars-ui/src/lcars_ui/dsl/_normalize.py` wraps top-level column groups, but does not make containers enforce deeper interior LCARS layout semantics.
  - Drift impact: containers provide chrome and slots; interior composition logic remains generic and widget-driven.

- **4) Interior widgets still carry dashboard DNA (verified: partial-yes).**
  - Phase 13 did add strict controls for button/toggle/select/radio/text/table/metric/gauge/progress in `lcars-ui/frontend/src/components/controls/Lcars*Control.tsx`.
  - But `WidgetRenderer` strict mode still routes several types through generic card paths: `line_chart`, `sparkline`, `markdown`, `alert`, `log_viewer`, `video_hls`, and `form` (`lcars-ui/frontend/src/components/WidgetRenderer.tsx`).
  - `.lcars-widget` remains the common wrapper model (`lcars-ui/frontend/src/styles/lcars/widgets-core.css`).
  - Drift impact: LCARS controls exist, but the overall interior rendering system is still predominantly widget-card centric.

- **5) Proportion/density behavior remains dashboard-like (verified: yes).**
  - Shell/content still prioritize full-viewport fill and fluid expansion (`lcars-ui/frontend/src/styles/lcars/shell.css`, `base.css`, `responsive.css`).
  - Row/column layout remains stretch-oriented via CSS grid in `App.tsx` + `.lcars-row/.lcars-column`.
  - Committed visual goldens (`lcars-ui/frontend/tests/visual/golden/*.png`) show large black voids with sparse structural bars in sampled reference images.
  - Drift impact: weak constrained composition; too much empty space and not enough deliberate LCARS density/asymmetry.

- **6) Visual regression likely locked a weak baseline (verified: yes, with one uncertainty).**
  - Visual specs only wait for `.lcars-content-frame` visibility before screenshot (`lcars-ui/frontend/tests/visual/*.spec.ts`).
  - They do not assert structural interior readiness (for example, expected container/widget counts per page).
  - `lcars-ui/Makefile` `ci` target does not include `visual-regression`, so screenshot drift is not a default release gate.
  - Golden naming is inconsistent with screenshot args (specs use `*_*.png` names with underscores; committed files use hyphenated names), which suggests stale/misaligned baselines.
  - Uncertainty: this mismatch could be historical naming drift rather than immediate runtime breakage, but it is a clear gate-integrity risk.

- **7) Recipes/helpers exist but do not dominate output semantics (verified: partial-yes).**
  - Recipes are present and used in examples (`lcars-ui/examples/*.py`), and strict normalizer adds wrappers.
  - But `row()/col()` remain first-class and only trigger advisory warnings in strict mode (`_warn_strict_page_level_layout` in `lcars-ui/src/lcars_ui/dsl/api.py`).
  - The frontend render core remains page/row/column traversal (`lcars-ui/frontend/src/App.tsx`).
  - Drift impact: LCARS-native primitives are available but not authoritative in composition truth.

## Patch goals
- Establish a verified, code-backed diagnosis of exactly where strict mode stays dashboard-first.
- Define a narrow strict-mode patch path that makes LCARS-first composition semantics authoritative in key rendering paths.
- Repair sweep/container semantics so they structurally compose interior layout, not just frame it.
- Define how to de-dashboard remaining interior widget paths that still bypass LCARS-native treatment.
- Reset visual baselines and gate criteria so goldens represent target-faithful LCARS output, not just current consistency.

## Patch principles
- Preserve manifest-first, server-driven architecture.
- Verify behavior in code and rendered output before claiming LCARS fidelity.
- Patch composition truth before polishing shell chrome.
- In strict mode, reference fidelity and composition constraints outrank generic responsive stretch behavior.
- Target-faithful baselines outrank self-consistent but weak baselines.
- Keep classic mode compatibility unless strict-mode fidelity requires explicit separation.

## Patch scope
This patch plan scopes diagnosis corrections and patch categories needed before detailed implementation planning:
- composition truth and lowering behavior,
- sweep/container semantic corrections,
- interior de-dashboarding boundaries,
- visual gate/baseline correction.

It does not provide implementation-level function-by-function edits yet.

## Out of scope
- Full rewrite of the manifest contract or frontend architecture.
- Broad feature expansion unrelated to LCARS-native composition fidelity.
- Classic-mode redesign beyond protecting compatibility.
- Adding unrelated new widgets that do not directly support strict-mode LCARS-first composition.

## Patch workstreams
### P13-P1: Composition Truth Audit Patch
Intent: pin down where strict-mode output still follows dashboard row/column truth over LCARS-first composition.
Touches: `lcars-ui/src/lcars_ui/core/models.py`, `lcars-ui/src/lcars_ui/dsl/_builder.py`, `lcars-ui/src/lcars_ui/dsl/_normalize.py`, `lcars-ui/frontend/src/App.tsx`.
Fixed enough means: strict-mode composition decision points are explicitly mapped, including where LCARS containers are optional vs authoritative.

### P13-P2: Sweep Semantics Patch
Intent: move sweep from rail-decorated panel toward structurally meaningful LCARS sweep behavior in strict mode.
Touches: `lcars-ui/src/lcars_ui/widgets/containers.py`, `lcars-ui/frontend/src/components/containers/LcarsSweepControl.tsx`, `lcars-ui/frontend/src/styles/lcars/containers.css`, strict normalization hooks.
Fixed enough means: sweep semantics are defined as structural composition rules, not only visual rails and title bars.

### P13-P3: Container-Owned Interior Composition Patch
Intent: make box/sweep/bracket own interior LCARS layout behavior for reference compositions.
Touches: strict normalizer, container controls, and strict container CSS.
Fixed enough means: containers do more than wrap; they actively govern interior regioning/placement for at least the canonical strict reference layouts.

### P13-P4: Interior Widget De-Dashboarding Patch
Intent: identify and patch remaining strict-mode widget paths that still render as generic cards/widgets.
Touches: `lcars-ui/frontend/src/components/WidgetRenderer.tsx`, `lcars-ui/frontend/src/components/controls/*`, `lcars-ui/frontend/src/styles/lcars/widgets-core.css`, `lcars-ui/frontend/src/styles/lcars/controls.css`.
Fixed enough means: strict-mode reference layouts no longer rely on generic dashboard card behavior for key interior surfaces.

### P13-P5: Reference Composition + Golden Reset Patch
Intent: replace weak/stale visual baselines with target-faithful strict references.
Touches: `lcars-ui/examples/bridge_ops/app.py`, `lcars-ui/examples/lcars_console/app.py`, `lcars-ui/examples/lcars_padd/app.py`, `lcars-ui/frontend/tests/visual/*.spec.ts`, `lcars-ui/frontend/tests/visual/golden/*`.
Fixed enough means: goldens are regenerated from verified target-faithful reference states, with filename/spec alignment and explicit review criteria.

### P13-P6: Validation Hardening Patch
Intent: ensure strict-mode fidelity checks cannot pass on shell-only or hollow renders.
Touches: visual specs, CI invocation paths (`lcars-ui/Makefile`), and Phase 13 test expectations where needed.
Fixed enough means: strict-mode validation requires interior composition checks and visual-regression execution in the release gate path.

## Files and systems affected
- **Planning/docs context**
  - `README.md`
  - `CONTEXT.md`
  - `LCARS UI Specification.md`
  - `Phase 13 Implementation Plan.md`
  - `Implementation Plan.md` (missing at repository root; dependency gap)
- **DSL/builder/normalizer/model**
  - `lcars-ui/src/lcars_ui/dsl/api.py`
  - `lcars-ui/src/lcars_ui/dsl/_builder.py`
  - `lcars-ui/src/lcars_ui/dsl/_normalize.py`
  - `lcars-ui/src/lcars_ui/dsl/_recipes.py`
  - `lcars-ui/src/lcars_ui/core/models.py`
- **Widget schemas**
  - `lcars-ui/src/lcars_ui/widgets/containers.py`
  - `lcars-ui/src/lcars_ui/widgets/inputs.py`
  - `lcars-ui/src/lcars_ui/widgets/primitives.py`
  - `lcars-ui/src/lcars_ui/widgets/data.py`
- **Frontend render/core**
  - `lcars-ui/frontend/src/App.tsx`
  - `lcars-ui/frontend/src/components/WidgetRenderer.tsx`
  - `lcars-ui/frontend/src/components/shell/LcarsFrame.tsx`
  - `lcars-ui/frontend/src/components/shell/LcarsElbow.tsx`
  - `lcars-ui/frontend/src/components/containers/LcarsBoxControl.tsx`
  - `lcars-ui/frontend/src/components/containers/LcarsSweepControl.tsx`
  - `lcars-ui/frontend/src/components/containers/LcarsBracketControl.tsx`
  - `lcars-ui/frontend/src/components/containers/LcarsHeaderControl.tsx`
  - `lcars-ui/frontend/src/components/controls/Lcars*Control.tsx`
- **Frontend styling/tokens**
  - `lcars-ui/frontend/src/styles/lcars/shell.css`
  - `lcars-ui/frontend/src/styles/lcars/containers.css`
  - `lcars-ui/frontend/src/styles/lcars/primitives.css`
  - `lcars-ui/frontend/src/styles/lcars/widgets-core.css`
  - `lcars-ui/frontend/src/styles/lcars/controls.css`
  - `lcars-ui/frontend/src/styles/lcars/geometry.css`
  - `lcars-ui/frontend/src/styles/lcars/responsive.css`
  - `lcars-ui/frontend/src/theme/colorTokens.ts`
  - `lcars-ui/frontend/src/theme/geometryTokens.ts`
- **Examples/tests/visual gates**
  - `lcars-ui/examples/bridge_ops/app.py`
  - `lcars-ui/examples/lcars_console/app.py`
  - `lcars-ui/examples/lcars_padd/app.py`
  - `lcars-ui/tests/unit/test_phase12_visual_language.py`
  - `lcars-ui/tests/unit/test_phase13_input_column.py`
  - `lcars-ui/tests/unit/test_phase13_normalize.py`
  - `lcars-ui/tests/unit/test_phase13_recipes.py`
  - `lcars-ui/tests/integration/test_dsl_roundtrip.py`
  - `lcars-ui/frontend/tests/visual/*.spec.ts`
  - `lcars-ui/frontend/tests/visual/golden/*`
  - `lcars-ui/frontend/playwright.config.ts`
  - `lcars-ui/Makefile`

## Validation strategy
- **Code inspection verification**
  - Re-verify composition truth path from DSL build to frontend render (`_builder`, `_normalize`, `App.tsx`, `WidgetRenderer.tsx`).
  - Confirm strict mode behavior using actual manifests from canonical examples, not docs alone.

- **Target reference comparison criteria**
  - Validate strict-mode output against LCARS-first composition criteria: sweep/box/bracket primitives drive structure, clear region semantics, constrained proportions, deliberate asymmetry, reduced dashboard-card feel.
  - Use “Python analogue”/“LCARS-native direction” criteria, not parity claims.

- **Visual regression hardening**
  - Replace shell-only readiness checks. Current specs only wait for `.lcars-content-frame`; this is insufficient and currently allows hollow-looking captures.
  - Add pre-screenshot assertions for expected interior structure (for example, expected container/widget presence within content regions).
  - Align screenshot names with committed goldens and remove stale/mismatched baselines.

- **Golden reset policy**
  - Treat existing goldens as provisional if they are weak, stale, or non-target-faithful.
  - Regenerate goldens only after reference composition criteria pass.
  - Require human review against LCARS-native composition criteria before baseline acceptance.

- **Gate enforcement**
  - Move visual-regression into default release gating path; `ci` currently omits it.
  - Do not accept passing screenshots solely because shell chrome is visible.

## Risks
- This patch could degrade into another cosmetic pass that preserves dashboard composition truth.
- The team could overfit fixes to one demo page and miss composition drift in other strict layouts.
- Backward-compat pressure could preserve too much row/column dashboard DNA in strict mode.
- Goldens could again cement a non-target-faithful baseline if reset criteria stay weak.
- Recipes could be treated as sufficient while renderer lowering still routes through generic layout logic.
- Missing `Implementation Plan.md` context could hide prior assumptions unless reconciled before implementation planning.

## Exit criteria
- A verified, file-grounded diagnosis exists for where and why LCARS drift occurs in strict mode.
- Patch workstreams are narrow and concrete enough to drive a full patch implementation plan.
- Weak/stale visual baselines are explicitly identified and marked for replacement, with hardened gate criteria defined.
- The path to LCARS-native strict mode is materially narrower and clearer than in the original Phase 13 completion state.
- This document is accepted as pre-implementation patch scope, not as proof that rendering is already fixed.
