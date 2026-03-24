# Phase 13 Coverage

Historical note:
- This document is retained as a Phase 13 record.
- Its visual-regression references were superseded by Phase 14 canonical target-bank acceptance in Phase 6.

## Scope

Phase 13 shifts strict mode from LCARS-themed dashboard rendering to LCARS-native composition architecture.

## Implemented

- Strict layout compiler upgraded from bracket-only auto-wrap to smart auto-paneling:
  - input groups -> `lcars_box` with `right_inputs`
  - data groups -> `lcars_box` with `children`
  - mixed groups -> `lcars_bracket` (`orientation="both"`)
  - single widgets -> `lcars_bracket` (`orientation="left"`)
- Strict page-title sweep injection for titled pages (`lcars_sweep` top row).
- Strict sweep regioning (`header_children`, `rail_children`, `content_children`) with compatibility mirror to `children`.
- Strict container interior ownership:
  - `lcars_box`: input widgets authored in content are moved to side input rails before content placement
  - `lcars_bracket`: interior split into main/stack zones in frontend control
- `lcars.raw()` scope added to bypass strict auto-paneling for local subtrees.
- DSL additions:
  - `console()`, `padd()`, `diagnostic()`
  - `data_panel()`, `control_panel()`
  - `input_column(side="left"|"right")`
- Strict-mode advisory warning when `row()` / `col()` are used at page level.
- Geometry token layer added (`styles/lcars/geometry.css`, `theme/geometryTokens.ts`) and consumed by shell/container primitives.
- Strict control component set added and wired in `WidgetRenderer`:
  - button, toggle/checkbox, select, radio/radio_toggle
  - text/number input
  - table, metric, gauge, progress
- `VisualLanguageContext` added to drive strict/classic rendering branches cleanly.
- New reference compositions added:
  - `examples/lcars_console/app.py`
  - `examples/lcars_padd/app.py`
  - `examples/bridge_ops/app.py` migrated to LCARS-first composition
- Golden references added in `docs/golden/*.png`.
- Visual regression suite hardened with interior structure readiness checks and aligned screenshot names.
- At Phase 13 time, `make ci` included `visual-regression` as a default gate. Phase 14 later replaced that default with canonical target-bank acceptance.
- Control snapshot coverage added in `frontend/src/components/controls/__snapshots__/`.

## Tests Added/Updated

- Backend unit tests:
  - `tests/unit/test_phase13_recipes.py`
  - `tests/unit/test_phase13_normalize.py`
  - `tests/unit/test_phase13_input_column.py`
- Backend integration extension:
  - `tests/integration/test_dsl_roundtrip.py` (Phase 13 manifest-structure coverage)
- Frontend unit tests:
  - New tests for each strict control component
  - Snapshot suite: `LcarsControls.snapshot.test.tsx`
- Frontend visual tests:
  - `tests/visual/console.spec.ts`
  - `tests/visual/padd.spec.ts`
  - `tests/visual/bridge_ops.spec.ts`

## Verification Targets

- Backend quality: `ruff check src tests`, `mypy src`, `make contracts-check`
- Backend Phase 13 tests:
  - `pytest tests/unit/test_dsl_builder.py tests/unit/test_phase13_recipes.py tests/unit/test_phase13_normalize.py tests/unit/test_phase13_input_column.py`
- Frontend:
  - `cd frontend && npm run test`
  - `cd frontend && npm run build`
- Visual regression:
  - Historical Phase 13 command: `make visual-regression`
  - Current canonical command: `make canonical-acceptance`
