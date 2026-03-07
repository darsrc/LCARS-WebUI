# Strict LCARS Visual Spec

## Status
This document defines strict-mode LCARS visual law for LCARS-WebUI. It is a visual specification, not an implementation plan and not a code patch.

## Depends on
- Semantic source of truth: `LCARS_PORTING_SPEC.md`.
- Current LCARS-WebUI strict renderer state (frontend shell, containers, widgets, strict lane/band composition, and visual tests/goldens).
- Reference implementation evidence in `../lcars` (README/vignette, `R/shiny*.R`, `man/*.Rd`, `inst/www/css/lcars.css`, and bundled screenshots/docs).

## Why this spec exists
Previous phases improved strict-mode structure and styling but still allowed major visual drift because LCARS was underspecified at the screenshot level. "More LCARS" language has been too vague and produced conflicting outcomes.

Future strict-mode work must be judged against explicit visual law in this file, not subjective taste or theme-only resemblance.

## Visual definition of strict-mode LCARS
Strict-mode LCARS is a composition language and instrument-panel visual system.

It is defined by:
- Purposeful asymmetry.
- Structural rails, bands, elbows, terminals, and zones.
- Dense but controlled data/control surfaces.
- Restraint: a few strong structures, not many weak decorations.

Strict-mode LCARS is not:
- A generic dashboard with LCARS colors/borders applied on top.
- A debug/scaffolding overlay exposing layout-engine internals.
- A shell-chrome billboard where content is secondary.

## Canonical visual principles
- Composition over theme: layout grammar is primary; color and border are secondary.
- Hierarchy over decoration: every strong shape must carry structural or informational role.
- Restraint over clutter: fewer dominant structures beat many noisy fragments.
- Negative space is active: black fields create rhythm and contrast, not filler void.
- Color is organizational: color marks rails/bands/terminals; it does not flood surfaces.
- Telemetry density is controlled: dense where operationally meaningful, quiet where intentional.
- Asymmetry is deliberate: side bias and terminal placement must look authored, not accidental.

## Canonical 1920x1080 Overview composition
This project uses one canonical fixed-viewport strict Overview composition at `1920x1080` as the visual benchmark.

Expected structure and hierarchy:

| Region | Visual role | Dominance order |
|---|---|---|
| Top header band | Global identity + state, thin and integrated | 4th |
| Upper quiet field | Low-noise context/status field with clear anchors | 3rd |
| Main telemetry/console region | Primary operational surface | 1st |
| Left control/input column | Attached command rail, narrow and dense | 2nd (with main region) |
| Center readout/chart/status field | Primary data body | 1st |
| Right metrics/status stack | Secondary readouts/alerts/progress | 2nd |
| Footer/status strip | Minimal transport/status confirmation | 5th |

Composition law:
- The main telemetry region must visually dominate the page.
- Left controls, center telemetry, and right readouts must read as one coupled composition, not separate cards.
- The upper quiet field may exist, but must remain intentional and bounded (anchored with at least one meaningful status/readout block).
- Footer is restrained and thin; it cannot compete with telemetry hierarchy.
- Asymmetry should mainly appear in control-column placement, sweep directionality, and right-side terminal/readout weighting.

Inference (from current `overview-1920x1080` golden and reference behavior):
- Main telemetry region should occupy roughly `55–70%` of content-frame height.
- Upper quiet field should stay roughly `15–25%` of content-frame height.
- Footer/status strip should stay roughly `<=10%` of content-frame height.
- Within the dominant telemetry region, left/control width should feel constrained, center data region dominant, right metrics narrower than center.

## Primitive-level visual expectations
| Primitive | Strict visual expectation |
|---|---|
| Page | Reads as an LCARS console composition, not card-grid traversal. Bands/rails structure the page; one region clearly owns primary attention. |
| Header | A thin LCARS bar grammar element (30px rhythm family in reference and strict tokens), used for identity and section anchoring, not slab-like mass. |
| Box | Must read as elbow-bar assembly with intentional side/input ownership. It cannot degrade into a generic framed card. Side/input zones must feel structurally attached. |
| Sweep | Must read as canonical sweep composition: distinct sweep column plus two adjacent content roles with explicit asymmetry. It is not just "left rail + panel" decoration. |
| Bracket | Canonical reference meaning is a top+bottom bracket pair for vertical grouping. Strict-mode target behavior should preserve that visual meaning; side-only rail framing is non-canonical and must not become dominant language. |
| Well (future) | Lightweight inset grouping surface for local content clusters; minimal chrome; never a pseudo-box substitute. |
| Input/control column | Vertical, narrow, and physically attached to box/sweep side structure. Controls must feel embedded in the rail system, not floating widgets. |

Primitive interaction law:
- Primitives must cooperate to form one hierarchy.
- Primitive chrome cannot compete with neighboring primitives for attention without a hierarchy reason.

## Typography and labeling rules
Allowed:
- Operator-facing labels, metrics, statuses, subsystem names, and actionable control text.
- Short all-caps labels for LCARS bar/terminal semantics when user-meaningful.

Disallowed (unless genuinely user-facing and operationally necessary, which should be rare):
- `BAND`
- `CORE`
- `TITLE`
- `DATA`
- `AUTO-ROW`
- `PHASE13`
- `B01`/`L01` style markers
- Similar rendering/meta/debug scaffolding text

Additional law:
- Rendering-engine structure names must not leak into user-visible UI.
- Text chrome is subordinate to data and control meaning; avoid repetitive structural micro-labels that add no operator value.

## Color, contrast, and negative space rules
- Black/near-black space is dominant baseline.
- Accent colors (orange/blue/yellow/purple family) organize structure and status emphasis.
- Large solid accent slabs are rare and must be compositionally justified.
- Contrast must support immediate hierarchy and legible readouts.
- Negative space must be intentional (quiet field), not empty framed dead area.
- Color variety without structural role is decorative noise and fails strict mode.

## Density and proportion rules
Verified constraints from reference and current token systems:
- Core bar rhythm: `30px` family.
- Box side widths and sweep/input column widths are constrained by reference semantics (`<=150px` guidance/limits for fidelity).
- Fixed-width composition is preferred for canonical strict baselines; stretch-first behavior is non-canonical.
- Very small-display fit is not a strict-fidelity priority in reference behavior.

Strict proportion law:
- No giant empty framed black rectangles.
- No stretch-to-fill choices that break elbow/rail coupling.
- Large regions must contain compositionally meaningful interior structure.
- Quiet regions must still include intentional anchors.
- Shell bands/rails must not outweigh primary telemetry surfaces.

Inference:
- For canonical strict 1920x1080 review, shell-only chrome should remain a minority of perceived visual weight relative to telemetry composition.

## Forbidden visual anti-patterns
Immediate fail conditions:
- Dashboard cards inside LCARS borders as primary content language.
- Giant header slabs.
- Giant footer slabs.
- Giant empty framed voids.
- Decorative towers/rails with no compositional purpose.
- Floating generic controls detached from side/input-column structure.
- Chrome count increasing while hierarchy does not improve.
- Debug/meta labels in visible UI.
- Layout-engine scaffolding visible on screen.
- Screenshot "improvements" that only add more bars/segments.
- Any screenshot that reads as either:
  - dashboard-with-LCARS-trim, or
  - LCARS-debug-overlay.

## Shell guidance
Because the reference package is not a web app shell system, LCARS-WebUI shell behavior is a local product constraint.

Shell law:
- Shell is subordinate to the primary console composition.
- Header/footer cannot dominate the viewport.
- Shell elements must use the same LCARS composition grammar as content primitives.
- Shell must not become billboard bands or generic app trays.
- Sidebar/navigation, if present, must feel structurally integrated, not floating card navigation.

## Screenshot validation rules
- One fixed viewport reference is mandatory: `1920x1080`.
- One canonical strict Overview screenshot is mandatory and treated as primary benchmark.
- Reviews must explicitly score hierarchy, density, proportion, primitive behavior, and anti-pattern violations.
- Passing screenshot tests cannot mean only "shell rendered" or "DOM structure exists".
- Goldens are not authoritative if they preserve weak baselines.
- A screenshot can fail even when internally consistent.
- Reject screenshots that read as dashboard-with-LCARS-trim or LCARS-debug-overlay.
- Reject screenshots with leaked structural/debug labels (including `BAND`, `CORE`, `TITLE`, `AUTO-ROW`, `PHASE13`, `B01`/`L01` style markers) unless genuinely operator-facing.

## Relationship to implementation work
- All strict-mode implementation plans must cite this file and `LCARS_PORTING_SPEC.md`.
- Visual decisions in strict mode defer to this file over vague taste arguments.
- This file constrains future strict-mode renderer, CSS, and golden updates.
- This file exists to reduce improvisation and baseline drift.

## Out of scope
This visual spec does not:
- Define backend contracts.
- Define low-level code patch steps.
- Redesign classic mode broadly.
- Require immediate full parity across every page/widget.
- Replace semantic/porting analysis.

## Acceptance criteria
This document is complete and usable when:
- Strict-mode LCARS is defined concretely enough for screenshot-level pass/fail review.
- Canonical `1920x1080` Overview composition is explicit enough to guide first true strict-fidelity port work.
- Forbidden anti-patterns are unambiguous and enforceable.
- Screenshot validation has concrete failure criteria beyond internal consistency.
- Future "make it more LCARS" requests can be resolved by citing this file rather than reinterpreting taste.
