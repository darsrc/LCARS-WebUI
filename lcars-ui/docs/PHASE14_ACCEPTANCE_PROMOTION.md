# Phase 14 Acceptance Promotion

## Purpose
This document records the Phase 6 promotion boundary where canonical target-bank acceptance became the authoritative LCARS-ready engineering gate.

## Authoritative gate
After Phase 6, the default acceptance commands are:
- `make ci`
- `make canonical-acceptance`
- `cd frontend && npm run test:visual`

These commands must execute the Phase 14 canonical target-bank flow for the five first-wave targets:
- `seismo_scan_a`
- `seismo_scan_b`
- `holodeck_programming_a`
- `holodeck_programming_b`
- `periodic_table_matrix`

## What LCARS-ready means now
LCARS-ready now means:
- the canonical target-bank harness passes for the blocking five-target set,
- three target families are covered,
- multi-state reuse is proven for Seismographic and Holodeck,
- dense repeated LCARS grammar is covered by the Periodic Table family,
- target-bank anti-cheat guardrails remain green.

Legacy overview/self-golden checks can still catch regressions, but they are not sufficient evidence for LCARS-ready status.

## Legacy path demotion
The following are now explicitly legacy:
- `make legacy-visual-regression`
- `cd frontend && npm run test:visual:legacy`
- `frontend/tests/visual/console.spec.ts`
- `frontend/tests/visual/bridge_ops.spec.ts`
- `frontend/tests/visual/padd.spec.ts`
- explicit overview/systems parity routing assertions in `frontend/src/components/containers/LcarsSweepControl.test.tsx`
- `docs/OVERVIEW_PARITY_ARCHITECTURE.md`

## Removal plan
Remaining cleanup should proceed in this order:
1. Remove explicit overview/systems parity routing from `LcarsSweepControl.tsx` once no compatibility host depends on it.
2. Remove `paritySweepSpec.ts` and any chart/widget parity hooks that still require specimen IDs.
3. Delete the legacy visual-regression goldens after replacement smoke coverage exists for any still-needed compatibility host pages.
4. Retire `docs/OVERVIEW_PARITY_ARCHITECTURE.md` once the legacy parity path is fully removed.

## Non-negotiable rule
No future doc, script, or CI entrypoint may describe the legacy overview/self-golden path as the default acceptance oracle unless the canonical target-bank gate has been explicitly removed and replaced.
