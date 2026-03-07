# LCARS Porting Spec

## Status
This is a porting/mapping specification, not an implementation plan.

## Reference source
Inspected reference implementation: `../lcars` (R package `lcars`, version `0.4.1` in `DESCRIPTION`).

Primary evidence used:
- `../lcars/README.md`, `../lcars/vignettes/lcars.Rmd`
- `../lcars/R/shiny.R`, `../lcars/R/shiny-box.R`, `../lcars/R/shiny-sweep.R`, `../lcars/R/shiny-rect.R`, `../lcars/R/shiny-button.R`
- `../lcars/man/lcarsPage.Rd`, `lcarsHeader.Rd`, `lcarsBox.Rd`, `lcarsSweep.Rd`, `lcarsBracket.Rd`, `lcarsWell.Rd`, `inputColumn.Rd`
- `../lcars/inst/www/css/lcars.css`

## Current target codebase
Target of this porting effort: LCARS-WebUI strict mode (`visual_language="strict"`) across:
- DSL/build/normalize (`lcars-ui/src/lcars_ui/dsl/*`)
- manifest models/widgets (`lcars-ui/src/lcars_ui/core/models.py`, `widgets/*`)
- frontend strict render path (`lcars-ui/frontend/src/*`)
- strict visual gates (`lcars-ui/frontend/tests/visual/*`)

## Why this spec exists
Prior phases improved LCARS styling, but strict mode still mixes LCARS containers with dashboard-era layout truth (row/column traversal, lane heuristics, generic surfaces, and stale/partial visual baselines). LCARS has too often been treated as chrome/theme rather than composition semantics. This spec defines what must map from the reference semantics so strict mode stops producing dashboard-first output with LCARS framing.

## Canonical primitives in the reference implementation
| Primitive | Structural meaning in `../lcars` | Composition/sizing rules in reference | Why it matters |
|---|---|---|---|
| `lcarsPage()` | Page/theme bootstrap wrapper around Shiny `bootstrapPage()`. Loads LCARS CSS/resources and text/casing/font policies. | Not a content compositor itself; sets global LCARS environment. | Establishes LCARS baseline; other primitives assume this environment. |
| `lcarsHeader()` | Horizontal LCARS header panel with endcaps + bar + title slot. | 30px header height, 45px endcaps, explicit left/right/none rounding, right-or-left title alignment, width argument. | Core horizontal bar grammar reused throughout box/sweep compositions. |
| `lcarsBox()` | Primary LCARS container: top/bottom elbow-bar assemblies + center panel + optional side rails/input columns. | `width_left`/`width_right` are constrained (`<=150` enforced in code). Top/bottom bars are 30px; elbow rows are 90px; side/input columns are narrow and intentional; fixed width is recommended. | This is the main structural primitive for LCARS composition, not just a border. |
| `lcarsSweep()` | Structural sweep (`S` or reverse-`S`) composed as adjacent content regions separated by a dedicated input column. | `column_width` constrained to `<=150`; `left_width` controls left/right content proportion; `reverse` flips sweep orientation; fixed width recommended. | Defines canonical asymmetrical LCARS composition and control-column relationship. |
| `lcarsBracket()` | Top-and-bottom bracket pair used to group content vertically. | `hollow` vs solid, width argument; bracket is top+bottom framing, not left/right rails. | Grouping primitive with distinct meaning from box/sweep. |
| `lcarsWell()` | Simple LCARS well panel wrapper for content blocks. | Border/background color wrapper; minimal structural container. | Lightweight interior grouping surface when full box/sweep is unnecessary. |
| `inputColumn()` | Vertical input stack meant to plug into `lcarsBox()` side panel slots. | Input widths should be `<=150px`, matching side panel widths. | Encodes control-column behavior and side-panel density expectations. |

## Current LCARS-WebUI equivalents
| Reference primitive | LCARS-WebUI equivalent(s) | Match status | Verified notes |
|---|---|---|---|
| `lcarsPage()` | `lcars.config()` + `lcars.page()` + frontend `LcarsFrame` shell + strict band/lane rendering in `App.tsx` | Partial / divergent | WebUI adds persistent shell concerns (transport/action/nav rails); strict layout is still row/column-derived before container rendering. |
| `lcarsHeader()` | `lcars.header()` -> `LcarsHeader` -> `LcarsHeaderControl` | Partial | Present as a primitive, but used inside broader lane/surface wrappers. |
| `lcarsBox()` | `lcars.box()` + `LcarsBox` model + `LcarsBoxControl` | Partial | Supports corners/sides/left-right inputs/widths, but frontend reclassifies children by widget type into telemetry/readout/control zones. |
| `lcarsSweep()` | `lcars.sweep()` + `LcarsSweep` (`header_children`/`rail_children`/`content_children`) + `LcarsSweepControl` | Partial / divergent | No direct `left_width` dual-content contract from reference; renderer infers/splits by widget type when explicit regions are absent. |
| `lcarsBracket()` | `lcars.bracket()` + `LcarsBracketControl` | Divergent | WebUI bracket is left/right rail orientation (`left|right|both`), not top/bottom bracket pair semantics from reference. |
| `lcarsWell()` | None | Missing | No strict primitive equivalent found. |
| `inputColumn()` | `lcars.input_column(side=...)` + `box.left_inputs()/right_inputs()` contexts | Partial | Routing exists and enforces enclosing `lcars.box()`, but width compatibility semantics (`<=150px`) are not encoded as explicit strict contract behavior. |
| (No direct reference primitive) | `console()`, `padd()`, `diagnostic()`, `data_panel()`, `control_panel()` recipes | WebUI-only | Useful recipes, but they are not canonical reference primitives and should not replace primitive parity checks. |

## Verified semantic gaps
| Gap | Reference behavior | Current LCARS-WebUI behavior | Why this yields “dashboard with LCARS chrome” |
|---|---|---|---|
| Dashboard-first layout truth | Primitive semantics (`lcarsBox`/`lcarsSweep`/`inputColumn`) are authoritative composition mechanisms. | Manifest remains row/column-first; strict mode adds wrappers (`normalize_manifest_for_strict`), then frontend composes strict bands/lanes from rows/columns and repartitions widgets (`App.tsx`). | LCARS primitives are post-hoc wrappers around generic layout traversal, so layout truth remains dashboard-like. |
| Weakened/fake sweep behavior | Sweep is two content regions plus a dedicated sweep column (`column_inputs`) with explicit proportional split (`left_width`) and constrained sweep column width. | `LcarsSweep` in WebUI uses `header/rail/content` regions; renderer infers regions and splits content into main/terminal by widget type. No reference-style `left_width` contract. | Sweep becomes a decorated panel with heuristic lanes, not the canonical sweep compositor. |
| Containers framing rather than composing | `lcarsBox` side/input behavior is explicit; content and side panels have specific structural rules tied to elbows/sides. | `LcarsBoxControl` and `LcarsSweepControl` perform type-based interior reassignment; strict page-level lane wrappers add another composition layer outside containers. | Containers can become visual shells around heuristic zoning rather than owning composition semantics directly. |
| Generic widgets inside LCARS shells | Reference controls are designed to fit LCARS geometry/columns and sizing limits. | Strict mode still routes several widget classes through generic `StrictSurface`/`.lcars-widget` surfaces (text/markdown/chart/log/video/mic paths). | Output keeps generic card/surface behavior inside LCARS borders. |
| Wrong density/proportion behavior | Reference repeatedly recommends fixed widths for fidelity; elbows/side widths are tightly constrained and not intended for very small displays. | Strict CSS enforces large minimum console widths (`--lcars-strict-min-console-width`) and overflow scrolling; responsive behavior still produces oversized slabs/voids and clipped tablet goldens. | Composition drifts into oversized frame members and empty interior zones, unlike dense LCARS proportioning. |
| Weak/misleading visual goldens | Fidelity should be judged against canonical primitive semantics and target-faithful references. | `bridge_ops.spec.ts` and `padd.spec.ts` are skipped; active visual checks are mostly one overview path plus structural counts; stale goldens with debug/meta artifacts remain committed. | Baselines can pass while semantic drift persists, reinforcing non-canonical output. |
| Primitive mismatch/missing | `lcarsBracket` is top/bottom pair; `lcarsWell` exists as a lightweight container. | WebUI bracket semantics differ fundamentally; well primitive absent. | Missing/misaligned vocabulary prevents faithful one-to-one semantic mapping. |

Unclear boundary to resolve in later planning (explicitly unclear):
- The reference package does not define an app-level shell equivalent to WebUI `LcarsFrame` (transport/action/nav rails). Whether those shell concerns remain in strict mode is a product decision, not resolved by reference parity alone.

## Geometry and proportion rules to preserve
Verified from `../lcars` docs/source/CSS:
- Favor fixed pixel widths for `lcarsBox()` and `lcarsSweep()`; `width="100%"` is allowed but explicitly documented as weaker/sluggish.
- Treat small-screen fit as non-goal for strict fidelity; reference docs state these widgets are not intended to scale arbitrarily to very small displays.
- Preserve `150px` side/sweep-column constraints where elbow scaling depends on them (`width_left`, `width_right`, `column_width` are constrained in code).
- Preserve side-input width expectations (`inputColumn` content should match side widths, typically `<=150px`).
- Preserve bar/elbow relationships from reference CSS (30px bar rhythm, 90px elbow row usage in box/sweep assemblies).
- Preserve deliberate asymmetry rules: optional corner/side inclusion, reverse sweep directionality, and explicit left/right composition roles.

Labeled inference (not explicit hard rule text, but strongly implied by repeated reference guidance):
- First strict-fidelity baselines should prioritize fixed-size compositions before responsive variants; stretch-to-fill first tends to destroy LCARS geometry coupling.

## Visual anti-patterns to forbid
- Giant header slabs that dominate content without composition purpose.
- Giant footer slabs that read as status dashboards rather than LCARS structure.
- Giant empty framed voids used as filler.
- Decorative towers/rails with no semantic role in composition.
- Debug/meta labels in user-facing UI (`B01`, `L01`, `PHASE13`, `AUTO-ROW`, transport diagnostics unless explicitly required).
- Floating generic controls disconnected from side/input-column semantics.
- Dashboard cards/surfaces nested inside LCARS borders as the primary content language.

## Porting priorities
1. Re-establish canonical `lcarsSweep` semantics (structure, width constraints, left/right composition roles, reverse behavior). This is the biggest semantic drift.
2. Re-establish `lcarsBox` + `inputColumn` side-panel semantics (ownership, widths, and interior density behavior).
3. Remove strict-mode reliance on page-level dashboard band/lane heuristics as composition authority.
4. Align primitive set and meaning gaps (`lcarsBracket` semantic parity, add/decide `lcarsWell` equivalent).
5. Replace generic strict surfaces with LCARS-native interior composition where primitives expect it.
6. Reset visual gates so they validate semantic fidelity, not self-referential current output.

## Recommended first-port targets
- Sweep semantics first: port reference sweep structure/constraints before further cosmetic changes.
- Box interior composition next: enforce side/input-column ownership and side-width fidelity.
- Input-column/control-column behavior: make control density and widths match reference assumptions.
- One canonical fixed-size overview composition: choose a single strict reference layout and lock proportions first.
- Visual gate reset: unskip stale suites, replace misleading baselines, and gate on semantic correctness plus screenshot fidelity.

## Validation and reference strategy
- Use one fixed reference viewport for first acceptance (desktop baseline), with fixed-size primitive compositions.
- Validate primitive semantics before screenshot comparison:
  - sweep structure and width-role constraints,
  - box side/input ownership and widths,
  - bracket/well primitive meaning.
- Compare against reference semantics and reference examples/docs, not against current LCARS-WebUI screenshots.
- Treat existing stale/skip-prone baselines as non-authoritative; rebuild only after semantic parity criteria are met.
- Prevent self-reinforcing baselines by requiring human review against reference behavior whenever structural primitives change.

## Notes on licensing and attribution
`../lcars` is a separate codebase licensed as `MIT + file LICENSE` (see its `DESCRIPTION`/`LICENSE`). If substantial code/assets/text are copied, preserve original license and attribution notices in the copied material. Also note the reference CSS contains embedded third-party attribution notices that must remain intact where applicable.
