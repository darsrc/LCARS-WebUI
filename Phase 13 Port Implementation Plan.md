# Phase 13 Port Implementation Plan

## Status
This is a narrow implementation plan for the first LCARS-native strict-mode port wave. It follows the current semantic mapping in `LCARS_PORTING_SPEC.md` and the visual pass/fail law in `STRICT_LCARS_VISUAL_SPEC.md`.

## Depends on
- `LCARS_PORTING_SPEC.md`
- `STRICT_LCARS_VISUAL_SPEC.md`
- Verified current repository state across DSL/manifest/frontend/test paths
- Verified sibling reference repository `../lcars` (docs, man pages, R source, CSS)

## Goal
Deliver the first trustworthy strict-mode port slice, not a whole-project LCARS rewrite:
- achieve first real primitive parity for `sweep`, `box`, and input/control-column behavior
- resolve `bracket` direction for strict mode (implement or explicitly defer)
- produce one canonical fixed-size strict Overview page (`1920x1080`) that is semantically honest
- gate that page with a target-faithful visual baseline

## Why this plan is narrow
The current stack still carries known drift patterns:
- dashboard-with-LCARS-chrome risk: strict rendering still includes page-level band/lane composition logic in `frontend/src/App.tsx` (`lcars-strict-band`, `lcars-strict-lane`) on top of container rendering.
- LCARS-debug-overlay risk: current visual assertions and prior baselines are tied to internal scaffolding classes, not only primitive semantics.
- shell-first composition risk: `LcarsFrame` shell is always present and can visually dominate if container semantics are not authoritative.
- weak/self-reinforcing goldens risk: only `console.spec.ts` is active; `bridge_ops.spec.ts` and `padd.spec.ts` are skipped; multiple committed goldens are from older compositions and non-1920 captures.

A small, correct slice is required first to stop re-baselining drift.

## First-port targets
| Target | First-wave intent |
|---|---|
| `sweep` | Port to reference semantics: explicit sweep column + two adjacent content roles + constrained sweep column width + reverse behavior. |
| `box` | Port side/input ownership and width behavior; remove type-driven interior reinterpretation as source of truth. |
| input/control column | Enforce narrow attached column behavior matching box/sweep side semantics (reference guidance: side/input widths aligned, typically `<=150px`). |
| `bracket` | Make explicit first-wave decision: implement canonical top/bottom bracket semantics now, or defer explicitly if clean in-wave implementation is not achievable; if deferred, bracket is forbidden on the canonical Overview page in this wave. |
| canonical page | One fixed-size `1920x1080` strict Overview page as first fidelity target. |
| visual gate reset | Reset screenshot gate to this canonical page and replace weak baselines for that target. |

`well` is explicitly deferred unless needed to make the canonical page semantically honest.

## Architectural constraints
- Preserve manifest-first, server-driven architecture (`Manifest` + protocol flow).
- Preserve row/column transport compatibility in contract models; shift strict composition authority to LCARS primitives, not page-level heuristics.
- Prefer additive schema/DSL evolution over breaking redesign.
- Keep classic mode behavior out of this wave unless strict changes accidentally regress it.
- Avoid broad shell redesign; only make shell adjustments required to keep canonical strict hierarchy compliant.
- Do not generalize beyond the first strict Overview target.

## Implementation principles
- Port semantics before visual polish.
- Port one primitive family at a time and prove each slice before moving on.
- For the canonical strict page, fixed-fidelity geometry outranks responsive behavior.
- No strict implementation may contradict `STRICT_LCARS_VISUAL_SPEC.md`.
- Do not accept heuristic repartitioning as parity.
- Do not accept screenshot pass if semantic structure is wrong.

## Workstreams
| ID | Purpose | "Fixed enough" exit condition | Primary files/systems | Depends on |
|---|---|---|---|---|
| `P13-P1` | Sweep semantic port | Sweep can represent reference roles without type inference: dedicated sweep column, explicit left/right content roles, constrained column width behavior, reverse direction preserved. | `lcars-ui/src/lcars_ui/widgets/containers.py`, `lcars-ui/src/lcars_ui/dsl/api.py`, `lcars-ui/src/lcars_ui/dsl/_normalize.py`, `lcars-ui/src/lcars_ui/core/models.py`, `lcars-ui/frontend/src/types/contract.ts`, `lcars-ui/frontend/src/components/containers/LcarsSweepControl.tsx`, `lcars-ui/frontend/src/styles/lcars/containers.css` | none |
| `P13-P2` | Box + input/control-column semantic port | Box side rails and input columns are explicit owners; width behavior matches strict/reference assumptions; container no longer reclassifies interior by widget type as primary truth. | `lcars-ui/src/lcars_ui/widgets/containers.py`, `lcars-ui/src/lcars_ui/dsl/api.py`, `lcars-ui/src/lcars_ui/dsl/_normalize.py`, `lcars-ui/frontend/src/components/containers/LcarsBoxControl.tsx`, `lcars-ui/frontend/src/styles/lcars/containers.css`, `lcars-ui/frontend/src/components/WidgetRenderer.tsx` | `P13-P1` |
| `P13-P3` | Bracket resolution decision | Hard decision rule is encoded: implement canonical top/bottom bracket semantics in-wave, or explicitly defer and ban bracket usage on the canonical Overview page for this wave. No partial side-rail bracket parity is allowed. | `lcars-ui/src/lcars_ui/widgets/containers.py`, `lcars-ui/src/lcars_ui/dsl/api.py`, `lcars-ui/frontend/src/components/containers/LcarsBracketControl.tsx`, `lcars-ui/frontend/src/styles/lcars/containers.css`, unit tests touching bracket behavior | `P13-P1`, `P13-P2` |
| `P13-P4` | Canonical Overview composition implementation | `overview` is built from ported semantics (not cosmetic wrappers), with clear hierarchy matching strict visual spec at `1920x1080`, on the cleanest strict-mode example path available. | `lcars-ui/examples/lcars_console/app.py` (initial candidate), possibly repurposed/dedicated canonical example path, possibly `lcars-ui/src/lcars_ui/dsl/_recipes.py`, targeted strict rendering path in `lcars-ui/frontend/src/App.tsx`, shell weighting in `lcars-ui/frontend/src/components/shell/LcarsFrame.tsx` + `lcars-ui/frontend/src/styles/lcars/shell.css` (only if needed) | `P13-P1`-`P13-P3` |
| `P13-P5` | Visual gate and golden reset for canonical page | Visual test asserts concrete primitive-semantic readiness for Overview (sweep regions, attached constrained input column, explicit box ownership, no scaffolding-only criteria) and screenshot baseline is replaced with target-faithful `1920x1080` golden; weak baseline inheritance is blocked. | `lcars-ui/frontend/tests/visual/console.spec.ts`, `lcars-ui/frontend/tests/visual/assertStrictInterior.ts`, `lcars-ui/frontend/tests/visual/golden/overview-1920x1080.png` | `P13-P4` |

Sequencing rule: execute in order (`P13-P1` -> `P13-P5`), do not run all streams in parallel.

## File-by-file implementation targets
| File | Ownership in first wave | Likely change class |
|---|---|---|
| `lcars-ui/src/lcars_ui/dsl/api.py` | DSL surface for sweep/box/input-column/bracket semantics | Additive DSL evolution where current arguments cannot express reference semantics cleanly (planning-level only). |
| `lcars-ui/src/lcars_ui/dsl/_builder.py` | Container/input routing and strict build handoff | Keep manifest-first flow; only adjust if new primitive fields require builder routing support. |
| `lcars-ui/src/lcars_ui/dsl/_normalize.py` | Strict lowering rules | Remove/limit heuristic repartitioning where it fakes parity; compile explicit primitive regions. |
| `lcars-ui/src/lcars_ui/core/models.py` | Contract model union and compatibility | Additive model support only if new strict primitive fields are needed. |
| `lcars-ui/src/lcars_ui/widgets/containers.py` | Primitive schema semantics | Primary location for sweep/box/bracket semantic contract changes. |
| `lcars-ui/src/lcars_ui/widgets/inputs.py` | Input widget contract | Likely unchanged except if strict control-column behavior needs metadata support. |
| `lcars-ui/src/lcars_ui/widgets/primitives.py` | Primitive non-container widgets | Likely unchanged for this wave. |
| `lcars-ui/src/lcars_ui/widgets/data.py` | Data widget contract | Likely unchanged for this wave. |
| `lcars-ui/frontend/src/components/WidgetRenderer.tsx` | Strict widget routing and generic strict surface fallbacks | Reduce fallback paths that mask primitive semantics for canonical page. |
| `lcars-ui/frontend/src/components/shell/LcarsFrame.tsx` | Shell hierarchy | Keep shell subordinate; adjust only if required for canonical hierarchy compliance. |
| `lcars-ui/frontend/src/components/shell/LcarsElbow.tsx` | Geometry primitive | Likely unchanged unless sweep/box geometry alignment requires it. |
| `lcars-ui/frontend/src/components/containers/LcarsBoxControl.tsx` | Box interior ownership | Replace type-based telemetry/readout/control repartition as composition authority. |
| `lcars-ui/frontend/src/components/containers/LcarsSweepControl.tsx` | Sweep composition | Implement explicit sweep column + dual content-role rendering from semantic fields. |
| `lcars-ui/frontend/src/components/containers/LcarsBracketControl.tsx` | Bracket meaning | Implement canonical bracket semantics or constrain/defer explicitly. |
| `lcars-ui/frontend/src/components/containers/LcarsHeaderControl.tsx` | Header bar grammar | Keep thin header rhythm aligned with strict visual law. |
| `lcars-ui/frontend/src/styles/lcars/shell.css` | Shell visual weight | Tune only as needed to keep telemetry region dominant. |
| `lcars-ui/frontend/src/styles/lcars/containers.css` | Primitive geometry + region layouts | Main CSS ownership for sweep/box/bracket parity. |
| `lcars-ui/frontend/src/styles/lcars/primitives.css` | Shared bar/elbow primitives | Keep reference rhythm alignment (30px bar family) where required. |
| `lcars-ui/frontend/src/styles/lcars/widgets-core.css` | Strict surface/card behavior | Remove remaining card-first visuals that undermine primitive ownership. |
| `lcars-ui/frontend/src/theme/colorTokens.ts` | Color mapping | Likely unchanged; only touched if parity work requires strict token clarification. |
| `lcars-ui/examples/bridge_ops/app.py` | Non-canonical example | Not primary for first-wave acceptance; only touched if gate breakage requires consistency. |
| `lcars-ui/examples/lcars_console/app.py` | Initial canonical Overview candidate | Use if audit confirms it is the cleanest strict example; otherwise repurpose/create a dedicated canonical example path before golden reset. |
| `lcars-ui/frontend/tests/visual/console.spec.ts` | Canonical visual gate | Keep one strict Overview screenshot gate at `1920x1080`. |
| `lcars-ui/frontend/tests/visual/assertStrictInterior.ts` | Structural readiness gate | Retarget assertions from band/lane scaffolding toward primitive-semantic checks. |
| `lcars-ui/frontend/tests/visual/golden/overview-1920x1080.png` | Canonical golden baseline | Replace/reset only after semantic parity criteria are met. |

Uncertainty note: exact DSL/schema field names for sweep parity are intentionally not fixed here; they should be finalized during `P13-P1` based on minimum additive change.

## Canonical Overview page plan
- Canonical path selection rule: use the cleanest strict-mode example path available after audit.
- Initial candidate: `lcars-ui/examples/lcars_console/app.py`, page id `overview`.
- If the candidate is materially shaped by prior drift, repurpose/create a dedicated canonical example path before baseline reset.
- Verification viewport: fixed `1920x1080` only for first-wave acceptance.
- Primitive backbone:
  - top-level sweep as structural compositor (not decorative rail)
  - box containers for major interior regions
  - attached narrow input/control column behavior in box/sweep side regions
  - bracket is forbidden on this page unless `P13-P3` implements canonical bracket semantics in-wave
- Visual hierarchy target (from strict visual spec): main telemetry region dominates, control column is narrow/attached, secondary readouts are subordinate, footer remains restrained.
- Allowed shell concessions:
  - shell may remain, but header/footer/sidebar must not dominate visual weight over telemetry composition.
  - no shell-only acceptance; canonical page must prove primitive semantics in content region.
- Proof that this is not a style-only demo:
  - manifest and render tree must show sweep/box/input-column semantics driving placement
  - pass/fail includes semantic checks plus screenshot review, not screenshot alone

## DSL and manifest impact
Current shape is partially usable but not sufficient for honest sweep parity:
- `LcarsBox` already has explicit `left_inputs`/`right_inputs` + `children`; this can likely carry first-wave box semantics with behavior changes rather than wholesale schema redesign.
- `LcarsSweep` currently centers on `header_children`/`rail_children`/`content_children` plus a single `width_sidebar`; this does not directly encode reference `left_width` and dual left/right content roles.
- Bracket semantics are currently side-oriented (`left|right|both`) and conflict with reference top/bottom bracket meaning.

Planning-level recommendation:
- allow additive DSL/schema evolution for sweep if needed to encode dual content roles and width proportions explicitly
- keep backward compatibility bridges for existing strict manifests where practical
- do not force parity through renderer-only inference if schema cannot represent it cleanly

## Visual gate and golden strategy
- Fixed viewport target: `1920x1080`.
- Single canonical screenshot baseline: Overview from `lcars_console` (`overview-1920x1080.png`).
- Replace/reset strategy:
  - do not preserve prior weak baselines for canonical acceptance
  - regenerate Overview golden only after `P13-P1` to `P13-P4` semantic checks pass
- Semantic checks must be concrete and machine-assertable:
  - sweep render tree exposes distinct semantic regions (sweep column + left/right content roles), not type-inferred pseudo-regions
  - input/control column is physically attached to sweep/box side structure and constrained for canonical fidelity (`<=150px`)
  - box side ownership is explicit (`left_inputs`/`right_inputs`) and box content rendering is not re-owned by child-type inference
  - pass criteria must not rely on `.lcars-strict-band` / `.lcars-strict-lane` scaffolding class presence as a proxy for semantic correctness
- Failure criteria (must fail even if screenshot is internally consistent):
  - hierarchy/proportion violations against `STRICT_LCARS_VISUAL_SPEC.md`
  - sweep/box/input-column semantic violations in DOM structure
  - dashboard-card language inside LCARS containers as primary interior pattern
  - debug/meta label leakage (`BAND`, `CORE`, `TITLE`, `AUTO-ROW`, `PHASE13`, etc.)
- Explicit warnings:
  - shell visibility or frame render alone is not sufficient
  - do not bless legacy LCARS-adjacent goldens that encode known drift

## Risks and failure modes
- Recreating dashboard structure under better chrome.
- Recreating LCARS as debug-overlay clutter instead of composition law.
- Preserving shell dominance over telemetry hierarchy.
- Forcing sweep/box parity into incompatible manifest shape and compensating with renderer heuristics.
- Broadening scope into multi-page redesign before one page is trustworthy.
- Re-blessing weak screenshots and repeating baseline drift.

## Out of scope
- Total project rewrite.
- Broad classic-mode redesign.
- Full widget parity across all pages.
- General responsive redesign.
- Porting every example/page in the repository.
- Unrelated feature work.

## Definition of done
First-wave completion requires all of the following:
1. Sweep/box/input-column primitives are implemented far enough to support the canonical Overview honestly.
2. Bracket path is explicitly resolved for strict mode in this wave (implemented or deferred with constraints); no ambiguity remains.
3. Canonical Overview page is built from those semantics, not cosmetic wrappers or type-based repartitioning shortcuts.
4. Canonical Overview passes strict visual review against `STRICT_LCARS_VISUAL_SPEC.md` at `1920x1080`.
5. Visual gate and golden for Overview are reset to a target-faithful baseline and fail correctly on semantic drift.
6. The repository now has one trustworthy strict-mode reference page that is suitable as the base for later port waves.

This definition of done applies only to the first strict-mode port wave, not all of Phase 13.
