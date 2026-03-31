# Renderer Bake-Off Contract

## Purpose
This document freezes the Phase 1 comparison contract for the renderer bake-off.

Historical note:
- the bake-off is closed,
- final role assignment lives in `docs/RENDERER_BAKEOFF_PHASE4_ROLE_ASSIGNMENT.md`,
- this document remains only as the frozen contract that governed the comparison.

The purpose of the bake-off is not to crown a winner by taste. The purpose is to force the repo to answer three separate questions with one fixed comparison frame:
- which current renderer path best matches the new target-bank images,
- which current renderer path is the best foundation for a reusable LCARS system,
- which path should become product base, acceptance engine, or transitional/removal work.

This document is Phase 1 only. It does not build the neutral harness, adapt renderers, or execute scoring.

## What this contract freezes

### Contenders
There are exactly three contenders:

1. `legacy_strict`
   - Primary path:
     - `frontend/src/components/strict/LegacyStrictPageRenderer.tsx`
   - Included internal parity branch:
     - `frontend/src/components/containers/LcarsSweepControl.tsx`
     - `frontend/src/components/containers/paritySweepSpec.ts`
   - Important rule:
     - the parity sweep branch is not a fourth contender; it is scored as part of legacy strict.

2. `joern_strict`
   - Primary path:
     - `frontend/src/components/strict/JoernStrictPageRenderer.tsx`
     - `frontend/src/components/strict/joern/*`
     - `frontend/src/styles/lcars/joern-bridge.css`

3. `phase14_family`
   - Primary path:
     - `frontend/src/components/phase14/*`
   - Shared family-scene primitives included:
     - `frontend/src/components/phase14/phase14Primitives.tsx`

No other renderer family is in scope for this bake-off.

### Probe set
The comparison probe set is fixed to seven probes.

Primary canonical probes:
- `seismo_scan_a`
- `seismo_scan_b`
- `holodeck_programming_a`
- `periodic_table_matrix`

Withheld audit probe:
- `holodeck_programming_b`

Product-smoke probes:
- `overview`
- `systems`

### Source of truth for probes
- Canonical target metadata, family IDs, and viewports come from `targets/phase14_target_catalog.json`.
- Product-smoke probes come from the current manifest-driven console specimen in `examples/lcars_console/app.py`.

This bake-off does not expand to every target-bank frame. It does not broaden product-smoke probes beyond `overview` and `systems`.

## Current repo facts this contract acknowledges
- `frontend/src/App.tsx` currently routes accepted Phase 14 targets directly to family scenes and bypasses both strict page renderers.
- `frontend/src/fixtures/phase14TargetFixtures.ts` still emits deterministic manifests with `strict_renderer: "legacy"`, even though accepted canonical targets now render through Phase 14 family scenes in fixture mode.
- `frontend/src/components/strict/JoernStrictPageRenderer.tsx` explicitly supports `overview` only and returns a visible unsupported page state for other pages.
- `frontend/tests/visual/phase14_target_bank.spec.ts` is the current canonical acceptance harness for Phase 14 family scenes. It is not the neutral renderer bake-off harness.

These asymmetries are not bugs in this document. They are the reason the bake-off needs a frozen contract before any Phase 2 harness work.

## External comparison contract
The shared external comparison contract is fixed to:

`renderer_id + probe_id -> rendered | unsupported | error + artifacts`

### Required external fields
- `renderer_id`
- `probe_id`
- `status`
  - `rendered`
  - `unsupported`
  - `error`
- `artifact_root`
- `rendered.png`
- `metadata.json`

### Required canonical-probe artifacts
For the five canonical target probes only:
- `target.png`
- `diff.png`
- target-bank diff metadata written through the existing artifact flow in `scripts/write_target_bank_artifacts.py`

### Contract rule
All contenders must be judged through the same external contract even if they require different internal adapters in Phase 2.

This contract does not require identical internal inputs. It requires identical observable outputs and statuses.

## Hard rules and disqualifiers

### Non-negotiable rules
- `AGENTS.md` anti-cheat rules remain in force.
- Target-bank images remain reference and acceptance material only.
- No contender may silently fall back to another contender and still claim support.
- Explicit `unsupported` is allowed. Hidden fallback is not.
- Crashing where an explicit unsupported state should exist is a bake-off failure.

### Immediate disqualifiers
- Runtime target-bank asset coupling in frontend or Python runtime paths.
- Raster-backed cheating paths.
- Hidden renderer swapping or fallback.
- Probe-specific special casing that pretends to be a neutral harness.

## Role-assignment rules

### Acceptance/fixture engine eligibility
A contender is eligible only if it:
- renders all four primary canonical probes,
- survives the withheld audit probe without post-hoc probe-specific retuning,
- wins the bake-off on fidelity.

### Product implementation base eligibility
A contender is eligible only if it:
- renders both `overview` and `systems` through a real product path,
- wins the bake-off on reusable-system viability.

### Loser rule
Any contender that wins neither role becomes transitional, deprecated, or removed. The bake-off does not permit three equal first-class renderer philosophies to remain afterward.

## What this contract explicitly forbids
- Treating the parity sweep path as a separate contender.
- Treating placeholder Phase 14 fixture manifests as proof that legacy strict is the canonical acceptance renderer.
- Declaring the current Phase 14 visual harness to be the neutral bake-off harness.
- Expanding the probe set because one contender is weak on the fixed probes.
- Conflating canonical target fidelity with product-page viability.

## Relationship to Phase 2
Phase 2 is responsible for building a neutral comparison harness that honors this contract.

Phase 2 is not allowed to change:
- contender definitions,
- the 4 primary canonical probes,
- the 1 withheld audit probe,
- the 2 product-smoke probes,
- the external comparison contract,
- the role-assignment rules.

## Related documents
- `docs/RENDERER_BAKEOFF_SCORING_RUBRIC.md`
- `docs/RENDERER_BAKEOFF_CONTENDER_CAPABILITY_TABLE.md`
- `docs/PHASE14_TRANSITION_BOUNDARIES.md`
- `docs/OVERVIEW_PARITY_ARCHITECTURE.md`
