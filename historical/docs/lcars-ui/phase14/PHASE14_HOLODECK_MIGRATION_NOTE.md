# Phase 14 Holodeck Family Migration Note

## Scope
This note records the Phase 4 migration boundary for the Holodeck canonical targets:
- `holodeck_programming_a`
- `holodeck_programming_b`

## What Phase 4 now supersedes
- The active fidelity path for Holodeck acceptance is now the dedicated family recipe in:
  - `frontend/src/components/phase14/HolodeckFamilyScene.tsx`
  - `frontend/src/components/phase14/holodeckFamilyData.ts`
- Shared scene mechanics are now owned by:
  - `frontend/src/components/phase14/phase14Primitives.tsx`

## What remains transitional
- The generic strict renderer remains the compatibility path for non-accepted families and non-Phase-14 app pages.
- The old parity sweep path remains a learning artifact only; it is not part of Holodeck acceptance.
- The Joern renderer remains unchanged and unsupported for this family.

## Required Phase 4 rule
- Differences between `holodeck_programming_a` and `holodeck_programming_b` must be expressed through shared family-scene data and payload mode, not through separate renderer branches.

## Failure condition
- If future Holodeck work reintroduces page IDs, widget IDs, or target-specific renderer files for the two canonical Holodeck targets, that is regression against Phase 4.
