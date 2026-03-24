# Phase 14 Seismographic Family Migration Note

## Scope
This note records the Phase 3 migration boundary for the Seismographic canonical targets:
- `seismo_scan_a`
- `seismo_scan_b`

## What Phase 3 now supersedes
- The active fidelity path for Seismographic acceptance is now the dedicated family recipe in:
  - `frontend/src/components/phase14/SeismographicFamilyScene.tsx`
  - `frontend/src/components/phase14/seismographicFamilyData.ts`
- For these two canonical targets, the acceptance renderer no longer depends on:
  - `frontend/src/components/containers/paritySweepSpec.ts`
  - parity-specific branches in `frontend/src/components/containers/LcarsSweepControl.tsx`
  - overview/systems specimen IDs
  - generic strict-band heuristics in `frontend/src/components/strict/LegacyStrictPageRenderer.tsx`

## What remains transitional
- Old parity sweep work remains in the repo as a transitional learning source for other paths, but it is not the acceptance implementation for Seismographic.
- The generic strict renderer remains the compatibility path for non-Seismographic fixture targets and non-Phase-14 app pages.
- The Joern renderer remains unchanged and unsupported for this family.

## Required Phase 3 rule
- Differences between `seismo_scan_a` and `seismo_scan_b` must be expressed through family-scene data and payload mode, not through separate renderer branches.

## Failure condition
- If future Seismographic work reintroduces page IDs, widget IDs, or target-specific renderer branches outside the family-scene data layer, that is regression against Phase 3.
