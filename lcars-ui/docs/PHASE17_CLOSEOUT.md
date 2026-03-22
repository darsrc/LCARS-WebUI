# Phase 17 Closeout

## Status
Phase 17 is complete / closed in the current worktree.

This closeout records the repository truth after the Phase 17 implementation passes landed. It is a summary document, not a new implementation plan and not a request to reopen renderer strategy.

## Active architecture after closeout
- Product renderer: `legacy_strict`
- Oracle / acceptance engine: `phase14_family`
- Deprecated compatibility path: `joern_strict`

The architecture remains intentionally two-role. Phase 17 did not replace `legacy_strict` with the oracle path, and it did not reopen the historical renderer bake-off.

## What Phase 17 actually accomplished
- Added explicit strict scaffold intent in the product path through additive band / lane metadata and shared scaffold consumption.
- Added explicit strict shared-surface intent through additive `strict_surface_variant` contract metadata.
- Replaced more product-side heuristic and generic-shell behavior with LCARS-native strict surface and container routing.
- Completed shared primitive promotion wave 2 across both oracle and product paths:
  - shared text-row blocks
  - shared segment runs
  - shared pill surfaces
  - broader shared readout-frame control adoption
  - shared rail-stack helpers across oracle rails and stacked-option controls
- Restored repo-local validation under the current toolchain:
  - frontend build
  - canonical Phase 14 visual target-bank run
  - contract golden/schema drift checks
  - repo-local HTTP app-backed tests
  - repo-local WebSocket app-backed tests

## What Phase 17 preserved
- The active renderer-role split:
  - `legacy_strict` stays the live product renderer
  - `phase14_family` stays the canonical oracle / acceptance engine
  - `joern_strict` stays deprecated
- The closed Phase 15 primitive-boundary and strict-role baseline.
- The closed Phase 16 acceptance baseline: seven canonical targets across four canonical families, catalog-owned thresholds, and explicit singleton-family policy.
- Canonical target-bank acceptance as the LCARS-ready gate rather than legacy overview/self-golden comparison.

## Resulting repository baseline
After Phase 17 closeout, the repository baseline is:
- closed through Phase 17,
- product-side scaffold and surface intent are more explicit,
- shared primitive reuse is broader across oracle and product code,
- repo-local validation is restored under the current toolchain,
- root/package docs should describe the repo from this closed Phase 17 state rather than from the older Phase 16-only framing.

## What this closeout does not do
- It does not start a new implementation phase.
- It does not continue convergence work by itself.
- It does not reopen renderer strategy or the product/oracle role split.
- It does not change canonical acceptance scope or target-bank policy.

## Next frontier
The next frontier is planning the next scoped phase against this closed Phase 17 baseline.

That future planning can decide whether additional product-side convergence, contract work, acceptance-scope work, or truth-maintenance work is worth doing, but none of that is opened here.

## Detailed implementation record
For the full pass-by-pass implementation record, validation list, and completion criteria, see the root [Phase 17 Implementation Plan](../../Phase%2017%20Implementation%20Plan.md).
