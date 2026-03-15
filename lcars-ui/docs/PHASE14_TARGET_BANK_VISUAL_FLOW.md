# Phase 14 Target-Bank Visual Flow

## Purpose
This document defines the Phase 14 target-bank comparison harness as of Phase 5.

Phase 2 established the comparison path. Phase 3 promoted Seismographic into the first active family-recipe acceptance path. Phase 4 extended that same flow to Holodeck. Phase 5 adds the dense-repetition Periodic Table target.

Renderer bake-off note:
- this document describes the current canonical Phase 14 acceptance harness,
- it does not define the neutral cross-renderer bake-off contract,
- the bake-off contract is frozen separately in `docs/RENDERER_BAKEOFF_CONTRACT.md`.

Post-bake-off note:
- this harness is now the repository's confirmed acceptance / fixture engine,
- it remains separate from the live product renderer,
- the next phase is primitive extraction from this oracle path into `legacy_strict`, not replacement of this harness.

## Entry mode
The frontend app now supports a deterministic fixture-manifest mode for Phase 14 target scenes:

```text
http://127.0.0.1:4173/?fixtureManifest=phase14&target=<target_id>
```

The fixture mode:
- bypasses `/lcars/manifest` HTTP fetches,
- bypasses live transport wiring,
- loads a deterministic fixture for the requested canonical target,
- surfaces fixture metadata on `.lcars-ui` via:
  - `data-fixture-manifest="phase14"`
  - `data-phase14-target-id="<target_id>"`
  - `data-phase14-target-family="<family_id>"`

For accepted family targets, fixture mode now renders dedicated family scenes instead of the generic app shell and generic strict page bands.

That direct family-scene routing is current acceptance behavior. It is not neutral evidence that the other contenders have already been compared fairly.

## Catalog-driven viewport rule
Visual tests must read viewports from `targets/phase14_target_catalog.json`.

No Phase 14 target comparison test is allowed to hardcode viewport dimensions independently of the catalog.

## Artifact set
The comparison flow writes the following artifacts per target:
- `rendered.png`
- `target.png`
- `diff.png`
- `metadata.json`

Current implementation writes these under Playwright's per-test output directory.

`metadata.json` now records:
- exact-pixel mismatch counts,
- a structural mismatch ratio based on a lightly blurred comparison,
- mean channel difference values for debugging.

## Canonical artifact contract
Phase 6 promotes the following as the required artifact contract for canonical runs:
- one artifact directory per canonical `target_id`,
- `rendered.png` for the code-rendered output,
- `target.png` copied from the target bank for the compared frame,
- `diff.png` showing mismatch pixels,
- `metadata.json` containing at least:
  - `target_id`
  - `rendered_path`
  - `target_path`
  - `output_dir`
  - `total_pixels`
  - `mismatch_pixels`
  - `mismatch_ratio`
  - `structural_mismatch_pixels`
  - `structural_mismatch_ratio`
  - `mean_abs_diff`

CI and operator guidance must treat this artifact contract as the canonical evidence set for LCARS-ready runs.

The exact-pixel diff remains useful for investigation, but the active family gate uses the structural mismatch ratio because browser text rasterization and one-pixel edge shifts would otherwise dominate the signal.

## Current Phase 5 test behavior
- One visual test confirms every canonical target can be loaded through fixture mode using catalog-defined viewport dimensions.
- One blocking visual test compares the accepted family targets against the target bank, writes artifacts, and enforces per-target thresholds.
- Accepted family set in Phase 5:
  - `seismo_scan_a`
  - `seismo_scan_b`
  - `holodeck_programming_a`
  - `holodeck_programming_b`
  - `periodic_table_matrix`

## Operator command
Run the Phase 14 visual harness:

```bash
cd lcars-ui/frontend
npm run test:visual
```

Legacy self-golden visual checks are still available only as transitional regressions:

```bash
cd lcars-ui/frontend
npm run test:visual:legacy
```

## Interpretation
- A passing fixture-load test means the harness can address canonical target IDs and lock the browser to catalog-defined viewports.
- A passing accepted-family comparison means the current family recipes are active, catalog-driven, and judged against target-bank frames rather than repo-generated goldens.
- A failing accepted-family comparison means at least one accepted family recipe has drifted or its active thresholds are no longer being met.
- A passing `npm run test:visual:legacy` run does not establish LCARS-ready status; it only preserves transitional regression visibility for old specimen-driven paths.
