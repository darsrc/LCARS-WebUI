# Phase 14 Transition Boundaries

## Purpose
This document records which current renderer subsystems are permanent, which are transitional, and which must be removed after replacement exists.

These boundaries were introduced in Phase 1. Phase 6 now makes the target-bank acceptance flow authoritative and demotes the old overview/self-golden oracle accordingly.
Renderer bake-off Phase 4 now finalizes the active renderer roles in:
- `docs/RENDERER_BAKEOFF_PHASE4_SCORECARD.md`
- `docs/RENDERER_BAKEOFF_PHASE4_ROLE_ASSIGNMENT.md`
- `docs/RENDERER_BAKEOFF_FIXED_PROBE_ANSWER_SHEET.md`

Renderer bake-off Phase 1 now freezes the comparison contract in:
- `docs/RENDERER_BAKEOFF_CONTRACT.md`
- `docs/RENDERER_BAKEOFF_SCORING_RUBRIC.md`
- `docs/RENDERER_BAKEOFF_CONTENDER_CAPABILITY_TABLE.md`

Those documents are now the binding rules for comparing `legacy_strict`, `joern_strict`, and `phase14_family`.
That comparison is now closed. This document records post-bake-off transition status. It does not reopen the bake-off.

## Preserve permanently

| subsystem | paths | keep reason | replacement rule |
| --- | --- | --- | --- |
| Product renderer base | `frontend/src/components/strict/LegacyStrictPageRenderer.tsx`, strict-manifest product path in `frontend/src/App.tsx` | Final bake-off decision: `legacy_strict` owns real product pages. | Keep and extend through reusable primitive extraction from `phase14_family`; do not replace it with Joern. |
| Acceptance / fixture engine | `frontend/src/components/phase14/*`, `frontend/tests/visual/phase14_target_bank.spec.ts`, `targets/phase14_target_catalog.json` | Final bake-off decision: `phase14_family` owns canonical target-bank acceptance and visual oracle work. | Keep as the canonical oracle while primitives are extracted into product code. |
| Anti-cheat policy | `AGENTS.md` | Non-negotiable renderer integrity rule. | Never replaced. May only be strengthened. |
| Frontend raster-ban guardrails | `frontend/src/test/overviewParityGuardrails.test.ts`, `frontend/src/test/joernGuardrails.test.ts` | Existing enforcement against screenshot-backed rendering is directly compatible with target-bank acceptance. | Keep and expand; do not downgrade. |
| Strict compiler and region ownership | `src/lcars_ui/dsl/_normalize.py` | This is the strongest current LCARS-first foundation in the repo. | Keep as transport/composition base even as fidelity layers change. |
| Manifest strict defaults | `src/lcars_ui/core/models.py`, `src/lcars_ui/dsl/_builder.py` | Strict remains the default mode and should stay the main LCARS path. | Keep; do not move acceptance back to classic or dashboard-first paths. |
| Shell/frame primitives and geometry tokens | `frontend/src/components/shell/*`, `frontend/src/styles/lcars/*`, `frontend/src/theme/geometryTokens.ts` | Reusable geometry is part of the real renderer foundation. | Keep; refine only through reusable primitive work. |
| LCARS-native controls already in strict mode | `frontend/src/components/controls/Lcars*Control.tsx`, strict branches in `frontend/src/components/WidgetRenderer.tsx` | These are real code-rendered UI primitives, not screenshot scaffolds. | Keep; extend instead of reintroducing card-first controls. |
| Policy docs | `STRICT_LCARS_VISUAL_SPEC.md`, `LCARS_PORTING_SPEC.md`, `docs/OVERVIEW_PARITY_ARCHITECTURE.md` | These constrain future work and explain why screenshot-backed parity is not acceptable. | Keep; update only when the new target-bank acceptance path supersedes assumptions. |

## Preserve as transitional

| subsystem | paths | why transitional | exit condition |
| --- | --- | --- | --- |
| Old parity sweep family | `frontend/src/components/containers/paritySweepSpec.ts`, parity branch in `frontend/src/components/containers/LcarsSweepControl.tsx` | Useful proof of spec-driven geometry, but coupled to `overview_*` and `systems_*` IDs. Phase 1 bake-off rules freeze this inside `legacy_strict`; it is not a separate contender. | Transitional until target-family recipes replace active fidelity routing or legacy strict is explicitly de-scoped from fidelity ownership. |
| Parity histogram chart hooks | parity branch in `frontend/src/components/charts/LineChartWidget.tsx` | Useful as a local learning artifact, but widget-ID keyed fidelity is not acceptable long-term. | Remove or rewrite once family recipes own chart/frame behavior. |
| Legacy visual-regression harness | `frontend/playwright.config.ts`, `frontend/tests/visual/*` | The harness remains useful for compatibility smoke checks, but its baselines are not the canonical target-bank oracle. | Keep only under explicitly legacy commands; remove after compatibility coverage is replaced. |
| Example-hosted strict pages | `examples/lcars_console/app.py`, `examples/bridge_ops/app.py`, `examples/lcars_padd/app.py` | Useful local hosts for renderer verification, but not valid as the long-term acceptance oracle. | Transitional until deterministic target fixtures exist for canonical families. |

## Deprecated / fenced

| subsystem | paths | why deprecated | fence rule |
| --- | --- | --- | --- |
| Joern strict renderer experiment | `frontend/src/components/strict/JoernStrictPageRenderer.tsx`, `frontend/src/components/strict/joern/*`, `frontend/src/styles/lcars/joern-bridge.css` | Bake-off loser. It does not own a winning role and must not continue as a third renderer direction. | Keep only for archived evidence, explicit compatibility fencing, and anti-cheat guardrails. Do not route live product pages through it or describe it as a future strategy. |

## Preserve but demote

| subsystem | paths | demotion reason | allowed use after demotion |
| --- | --- | --- | --- |
| Old visual goldens | `frontend/tests/visual/golden/*`, `docs/golden/*` | Existing screenshots do not represent the new acceptance oracle. | Temporary regression aids only. They must not define LCARS-ready. |
| Current console/bridge/padd visual assertions | `frontend/tests/visual/console.spec.ts`, `frontend/tests/visual/bridge_ops.spec.ts`, `frontend/tests/visual/padd.spec.ts` | Useful smoke coverage, but not target-bank acceptance. | May remain as transitional regression checks only under the legacy visual command. |

## Replace or de-prioritize

| subsystem | paths | why replaced | replacement target |
| --- | --- | --- | --- |
| Explicit parity routing by specimen IDs | `frontend/src/components/containers/paritySweepSpec.ts`, `frontend/src/components/containers/LcarsSweepControl.tsx`, associated tests | Acceptance cannot stay keyed to `overview` and `systems`. | Family recipe keyed rendering driven by target catalog. |
| Widget-ID keyed parity charts | `frontend/src/components/charts/LineChartWidget.tsx` | Widget identity is the wrong fidelity unit. | Family-owned scene primitives or recipe-owned chart framing. |
| Overview-first acceptance logic | visual tests and docs that assume one primary specimen | The target bank makes multi-family coverage mandatory. | Canonical target-bank acceptance. |
| Self-generated screenshots as source of truth | current goldens and screenshot references | They measure current output, not source material. | Target-bank frame comparison artifacts. |

## Must remove later

| subsystem | paths | removal trigger |
| --- | --- | --- |
| Explicit overview/systems parity ID assertions | `frontend/src/components/containers/LcarsSweepControl.test.tsx` portions that freeze `overview_*` and `systems_*` routing | Remove once target-family routing replaces these specimen-specific branches. |
| Parity-only metadata that describes the old stacked-sweep path as the main fidelity route | `docs/OVERVIEW_PARITY_ARCHITECTURE.md` sections that still imply overview-led acceptance | Rewrite when target-bank acceptance becomes authoritative. |
| Old parity-oracle assumptions in docs and tests | any doc/test claiming overview or repo goldens are the canonical acceptance oracle | Remove when target-bank acceptance is wired into CI. |

## Boundary enforcement rule
During Phase 14 work:
- code-rendered LCARS primitives are permanent,
- specimen-coupled parity branches are transitional,
- any path that keeps acceptance centered on `overview` or raw repo goldens is scheduled for removal once a target-bank-backed replacement exists.

During the renderer bake-off:
- `legacy_strict`, `joern_strict`, and `phase14_family` are the only contenders,
- parity/specimen branches are evaluated only inside `legacy_strict`,
- current `App.tsx` routing is acknowledged as biased toward `phase14_family` for canonical targets and must not be mistaken for the neutral bake-off harness,
- current fixture manifests defaulting to legacy strict must not be mistaken for proof that legacy strict is the canonical acceptance path.

During and after Phase 6:
- `make ci` and `npm run test:visual` must resolve to the canonical target-bank acceptance flow,
- legacy overview/self-golden checks may run only under explicitly legacy commands,
- docs may describe old parity paths only as transitional regressions, never as the LCARS-ready oracle.

After the bake-off:
- `legacy_strict` is the only active product renderer strategy,
- `phase14_family` is the only active acceptance/fixture strategy,
- `joern_strict` is deprecated and must not be described as a third future direction,
- the next renderer effort is primitive extraction from `phase14_family` into `legacy_strict`, not another renderer replacement cycle.
