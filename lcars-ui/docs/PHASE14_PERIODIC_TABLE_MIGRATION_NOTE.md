# Phase 14 Periodic Table Migration Note

## Scope
This note records the Phase 5 migration boundary for the dense repetition target:
- `periodic_table_matrix`

## What Phase 5 now supersedes
- The active fidelity path for the Periodic Table acceptance target is now the dedicated family recipe in:
  - `frontend/src/components/phase14/PeriodicTableFamilyScene.tsx`
  - `frontend/src/components/phase14/periodicTableFamilyData.ts`
- Dense repeated cell rendering is now owned by the shared Phase 14 primitive:
  - `frontend/src/components/phase14/phase14Primitives.tsx` via `Phase14MatrixCell`

## What remains transitional
- The generic strict renderer remains the compatibility path for non-accepted families and non-Phase-14 app pages.
- The old placeholder fixture manifest for `periodic_table_matrix` remains a transport fallback only; it is not the active acceptance renderer.
- The Seismographic and Holodeck family renderers remain unchanged and continue to own their own family-local grammar.

## Required Phase 5 rule
- Dense repetition must be expressed as reusable LCARS matrix-cell primitives and repeated family composition, not as generic grid/cards with LCARS colors.

## Failure condition
- If future dense-family work falls back to generic table/grid controls for the active acceptance path, or starts introducing target-specific DOM/card layouts instead of repeated matrix-cell primitives, that is regression against Phase 5.
