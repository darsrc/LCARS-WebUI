# Target-Bank Acceptance

## Purpose
This document defines how the Phase 14 target bank is allowed to influence LCARS-WebUI.

The target bank is an acceptance oracle. It is not a rendering asset source, not a fixture pack for UI output, and not a shortcut around code-rendered geometry.

## Raw target-bank rules
- `targets/` is immutable reference material.
- Raw target PNGs may be inspected, measured, and compared against rendered output.
- Raw target PNGs must not be imported, fetched, embedded, or rendered by frontend or Python runtime paths.
- Canonical acceptance is driven by the catalog file at `targets/phase14_target_catalog.json`.
- The catalog is the only first-wave source of truth for which target-bank frames block acceptance.

## First-wave canonical scope
The first-wave canonical target set is fixed to five targets:

| target_id | family_id | source_path | viewport | why it is canonical |
| --- | --- | --- | --- | --- |
| `seismo_scan_a` | `seismographic_scan` | `targets/LCARS_TNG_A_Matter_Of_Time_Seismographic_Scan_frames/frame_000001.png` | `984x750` | establishes title bar, left numeric rail, long sweep bars, chart frame |
| `seismo_scan_b` | `seismographic_scan` | `targets/LCARS_TNG_A_Matter_Of_Time_Seismographic_Scan_frames/frame_000432.png` | `984x750` | same family, different payload mode; prevents one-state overfitting |
| `holodeck_programming_a` | `holodeck_programming` | `targets/LCARS_TNG_The_Outrageous_Okona_Holodeck_Selection_frames/frame_000001.png` | `1388x1080` | establishes large elbow/header grammar and pill-control composition |
| `holodeck_programming_b` | `holodeck_programming` | `targets/LCARS_TNG_The_Outrageous_Okona_Holodeck_Selection_frames/frame_000118.png` | `1388x1080` | same family, list-heavy state; prevents one-arrangement tuning |
| `periodic_table_matrix` | `periodic_table_matrix` | `targets/LCARS_TNG_Rascals_Periodic_Table_of_Elements_frames/frame_000001.png` | `1476x1080` | establishes dense repeated LCARS matrix grammar |

Deferred family for first-wave implementation:
- `adge_intro`

## Canonical target selection rule
A target may be canonical only if it forces one of the following:
- a reusable LCARS primitive,
- a reusable family-level composition rule,
- a second-state proof for an already chosen family.

A target is not canonical merely because it is visually impressive or because it is easy to compare.

## What Phase 1 locks
Phase 1 locks the following and does not reopen them later without an explicit catalog change:
- the five first-wave canonical targets,
- the three first-wave blocking families,
- the deferred status of `adge_intro`,
- the requirement that family coverage matters more than raw frame count.

## Intended use by later phases
- Phase 2 will use the catalog to drive viewport selection and target comparison artifacts.
- Phases 3 through 5 will use the catalog to define deterministic renderer fixtures and family-level acceptance.
- Phase 6 will promote this catalog-driven flow into the main LCARS-ready acceptance gate.
- The separate renderer bake-off contract is frozen in `docs/RENDERER_BAKEOFF_CONTRACT.md`; that bake-off reuses this catalog as canonical reference material but does not redefine the catalog.

Post-bake-off role note:
- `phase14_family` is the active acceptance/fixture engine that owns this oracle path.
- `legacy_strict` is the separate product renderer base.
- The next renderer phase is primitive extraction from the oracle path into the product path, not collapse of the oracle into product routing.

## Phase 6 promotion
As of Phase 6, the catalog-driven canonical target-bank flow is the authoritative LCARS-ready acceptance standard for this repo.

LCARS-ready now means:
- all five canonical targets are exercised through the catalog-driven acceptance harness,
- three blocking families are covered,
- at least one family proves multi-state reuse,
- the runtime still contains no target-bank cheating path,
- acceptance artifacts are written for each canonical target run.

The following no longer define LCARS-ready on their own:
- overview-first specimen checks,
- self-generated repo goldens,
- parity-ID routing checks,
- legacy console/padd/bridge screenshot baselines.

This also means:
- the current canonical Phase 14 visual flow is the active acceptance oracle,
- but it is not yet the neutral bake-off harness for comparing all renderer contenders.
- after the bake-off, it remains the accepted oracle rather than a provisional candidate path.

## Forbidden uses
The following are explicit failures:
- importing a raw target PNG into frontend or Python runtime code,
- serving raw target PNGs as part of app output,
- copying target-bank assets into bundled frontend output,
- replacing code-rendered fidelity work with target-image overlays or backdrops,
- treating old self-generated goldens as more authoritative than the canonical target catalog.
