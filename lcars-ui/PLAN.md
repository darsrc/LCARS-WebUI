# PLAN — v6.0 Surface Engine

STATUS: [ ] pending · [~] in progress · [x] done · [!] blocked · [-] paused

## Milestone 1 — Surface Foundation
[x] COMPLETE, shipped as v5.4.0 (commits 0acffcb, 82ffb7a, 33213b0, bff90ed). `lcars.surface()` +
`.rect/.rounded_rect/.capsule/.circle/.ellipse()` + `.region()`, rendered by `SurfaceControl.tsx` as
SVG geometry + percentage-positioned HTML content. Every fleet dispatch in this milestone needed
real hand-fixing after review (wrong base class, missing re-export, missing container_context push,
dropped color= kwarg, skipped overlap-check, unrequested scope creep, a rendering phase with no
actual SVG output, a missing import, forbidden contract.ts edits) - always read the diff, not just
the passing gate. Full detail in git log and `~/.claude/plans/uploaded-documents-list-logical-volcano.md`.

## Milestone 2 — Arc / Polar Geometry (in progress)
Radial dials, rings, wedges, polar layout tracks - the DS9 helm console / radial-scanner family.

### Phase 2.1 — Arc/ring/wedge path math
[x] DONE. Written directly by the orchestrator, not delegated (per the plan: algorithmically
subtle, correctness-critical). `frontend/src/widgets/surfaceGeometry.ts`: `polarToCartesian`,
`arcPath` (open stroke), `annulusSegmentPath`/`ringPath`/`wedgePath` (closed fill, innerR<=0
collapses to a true pie slice). Angle convention: degrees, 0=east (+x), increasing clockwise.
Handles zero-span (returns ""), full-360deg (two half-arcs; a full ring with a hole emits TWO
independent evenodd subpaths - renderer MUST use fill-rule="evenodd"), and large-arc-flag
correctness across the 180deg boundary and the 0/360 wrap. 18 unit tests in
`surfaceGeometry.test.ts`, all passing; npm typecheck/test both clean.

### Phase 2.2 — Contract + Python surface for arc/ring/wedge
[x] DONE. Dispatched to the (freshly hardened) fleet, then fixed by the orchestrator after review -
the contract-type additions (both Python and TypeScript Widget unions, correctly ordered and
complete) were genuinely correct this time, a real improvement. But the DSL methods were not: the
fleet added `arc`/`ring`/`wedge` as methods on the WRONG class (`_NoOpSurfaceContext`, the non-BUILD
no-op stub class) instead of `_SurfaceContext` (the real one used by `lcars.surface()` in BUILD
mode) - so the actual feature didn't exist at all. The methods were also missing `self` as their
first parameter (a guaranteed crash - Python silently absorbs the first real argument as `self`
instead), and used field names (`cx`/`cy`/`r`) that don't match what was actually defined on
ArcNode/RingNode/WedgeNode (`center_x`/`center_y`/`radius`) - another guaranteed crash. None of this
was mentioned in the fleet's own report. Orchestrator rewrote both classes' arc/ring/wedge methods
directly, added the missing `ArcNode, RingNode, WedgeNode` import (also missing), tightened
`inner_radius`'s validation bound (`ge=-1` -> `ge=0`, harmless but sloppy), and verified end-to-end
in both BUILD and HANDLE mode before trusting it. Golden fixtures regenerated and `make
contracts-check` clean. **Do not lower the bar on diff review just because a hardened fleet pass
"looks" more careful in one area (the contract types) - verify every piece independently.**

### Phase 2.3 — Wire arc/ring/wedge into the renderer
[x] DONE. Written directly by the orchestrator (small, precise extension of code already written in
Phases 2.1/2.3 - faster to do than to write a careful dispatch prompt and review it). SurfaceControl
.tsx's GeometryNode switch now handles arc (stroked path, fill="none", stroke={color},
strokeWidth=4), ring/wedge (filled path, fill-rule="evenodd", using surfaceGeometry.ts's
ringPath/wedgePath). Verified with two vitest smoke tests asserting the actual rendered SVG
attributes (path count, fill-rule, stroke vs fill) - live screenshot check deferred to Phase 2.5's
gauntlet examples, npm typecheck/test/build all clean (441 tests).

### Phase 2.4 — Polar layout / track system
[x] DONE. Written directly by the orchestrator, NOT delegated - turned out less trivial than
originally scoped ("simple arithmetic - safe to delegate" was wrong; the track-to-rectangle
bounding-box math and its interaction with the existing overlap check had real subtlety, see below).
`_SurfaceContext.polar(center_x=, center_y=, inner_radius=, outer_radius=, start_angle=, end_angle=,
tracks=, gap_deg=0, id=)` (in dsl/api.py) returns a `_PolarContext` whose `.track(index, span=1, ...)`
computes that track's angle range (same normalized-span convention as surfaceGeometry.ts: degrees,
0=east, clockwise, (0,360]) then an axis-aligned bounding box from the wedge's 4 corner points
(start/end angle x inner/outer radius) - a documented, deliberate simplification: a track spanning
across a 0/90/180/270deg compass point gets a slightly loose box there, not a tight one.
**Real bug caught by testing, not by reasoning about the code**: the generic `.region()` rectangle
overlap check produces FALSE POSITIVES for concentric polar rings at different radius bands (the
core intended use case - e.g. an inner ring of tracks at radius 100-300 and an outer ring at
350-400) because their loose bounding boxes can overlap in x/y even though the actual wedges (at
different radii) never touch. Fixed by refactoring `.region()`'s body into a private `_region(...,
check_overlap: bool)` helper; `.track()` calls it with `check_overlap=False` since a rectangle
overlap check isn't meaningful for polar geometry. `tests/unit/test_surface_polar.py` (7 tests,
including one hand-verified bounding-box value and a concentric-rings-don't-collide regression
test) plus `make test` (405 passed) all green.

### Phase 2.5 — Gauntlet + release
[x] DONE, shipped as v5.5.0. Two new screens in examples/surface_gauntlet/app.py
(`LCARS_GAUNTLET_SCREEN=annular_helm` / `=polar_scan`): mirrored polar-dial lobes (ring + wedge
pointer + fanned polar-track readouts + a spine bar) and a full-bleed polar visualization
(concentric rings + radial spoke wedges + core + polar-track compass labels).

**The single most important finding of Milestone 2, found only by actually screenshotting the
result, not by any amount of code review or unit testing**: `annulusSegmentPath`'s washer-segment
case (ring/wedge with `inner_radius > 0` and a partial, non-360deg span - exactly the "6 thin radial
spokes" gauntlet use case) had TWO separate real bugs, both invisible to the 18 unit tests written
alongside the original Phase 2.1 code:
1. The inner (reverse-direction) arc recomputed its own large-arc-flag from swapped start/end
   angles, which for a short span gives the ~358deg COMPLEMENT span instead of the same short span
   traversed backward. Fixed by computing `largeArc` once from the true forward span and passing it
   explicitly to both the outer and inner `arcSegment()` calls.
2. **The actual dominant cause of the visible bug** (fixing #1 alone did not change the rendered
   output at all): after the outer arc, the pen sits at radius outerR. Starting the inner-radius arc
   command directly from there - without an explicit `L` line first moving the pen to the true
   inner-radius point - gives SVG two arc endpoints that cannot both lie on a radius-innerR circle.
   Per the SVG spec, the renderer then silently RESCALES the arc's effective radius upward until a
   solution exists, ballooning a thin 2deg wedge into a huge lens/petal shape. Fixed by inserting the
   missing `L` command between the outer arc and the inner arc.
Diagnosing this took direct DOM inspection (fetching the live-rendered `<path d>` and `fill-rule`
attributes via a throwaway Playwright script) after code review, hand-verified math, and even a
fresh unit test all failed to explain a screenshot that didn't match the code - the lesson: **when a
live visual result contradicts verified-correct-looking code, inspect the actual rendered DOM
output directly rather than continuing to reason about the source.** Both bugs are now covered by
regression tests in `surfaceGeometry.test.ts` (matching large-arc-flags, and an explicit check that
the `L` command to the correct inner-radius point sits between the two arc commands).
MILESTONE 2 COMPLETE.

## Milestone 3 — Path Geometry, Elbows, Connectors (DONE, v5.6.0)
Arbitrary polygons/paths, elbow-as-path, routed connectors, text-on-path, tick repeaters.

### Phase 3.1 — Elbow-as-path + polygon/path primitives
[x] DONE. `Elbow.tsx` turned out to have NO JS geometry to port at all - the existing renderer
builds the LCARS elbow bracket with a pure CSS trick (an outer rounded block plus a smaller,
offset-inset rounded `::after` cutout). The equivalent SVG path was derived from scratch, by hand,
for all 4 corner orientations independently (not by mirroring one canonical case - a coordinate
reflection silently flips which rotational direction is "the short way" for every arc, exactly the
class of bug that shipped in Milestone 2). Before writing any unit tests, the 4 corners were
rendered in a real throwaway Playwright+Chromium HTML page and visually confirmed correct (proper
convex outer corner, concave inner notch, on the first attempt) - given the M2 lesson, code review
and hand-verified math alone were not trusted this time. `elbowPath`, `polygonPath`,
`pathFromCommands` (+ `PathCommand`/`ElbowCorner` types) added to `surfaceGeometry.ts`, 15 new
unit tests (36 total in the file). Contract types (ElbowNode, PolygonNode, PathNode + 4
MoveCommand/LineCommand/ArcCommand/CloseCommand models, all added to both Widget unions) and DSL
methods (`surface.elbow/.polygon/.path()`) were written directly by the orchestrator, NOT
delegated - the fleet's `opencode run` dispatch hung indefinitely (verified the underlying Ollama
backend was healthy and responding directly; the hang is in opencode's own dispatch pipeline,
likely related to the same session that hardened SCOUT/JUDGE also changing permission/agent config
- flagged for the user to have that session investigate, not something fixable from here).
`SurfaceControl.tsx`'s GeometryNode switch extended for the 3 new shapes (elbow/polygon both plain
fill; path fills too, using a small snake_case-to-camelCase command mapper since the wire format
matches the Python field names and the renderer's PathCommand type doesn't). `make test` (405
passed), npm typecheck/test/build (460 tests) all green; new vitest smoke tests assert the actual
rendered SVG path attributes for all three new shapes.

### Phase 3.2 — Connectors
[x] DONE. Written directly (fleet still hung - see Phase 3.1 note; confirmed still hung with a fresh
ping before starting this phase). Design correction from the original plan: connector endpoints are
resolved at PYTHON BUILD TIME, not render time - every surface node already lives in the same
absolute design-space coordinate system with no runtime layout pass, so there is nothing to defer to
the renderer. `_find_surface_child_by_id` (depth-first search of the surface's already-declared
children) + `_surface_anchor_of` (dispatches on whichever position fields a node actually has:
center_x/center_y, cx/cy, x/y/w/h bounding-box center, or polygon points bounding-box center) in
dsl/api.py resolve `from_`/`to` into concrete `from_x/from_y/to_x/to_y` embedded directly in the
ConnectorNode - the renderer (`connectorPath` in surfaceGeometry.ts) just draws a line between two
given points, no id-lookup concerns at all. Also did NOT reuse node_canvas's bezier code as
originally planned - it's `@xyflow/react`'s `getBezierPath`, tightly coupled to that library's
handle-position model, a poor fit and an unnecessary heavy dependency for two raw points. Wrote a
small standalone bezier (control points at the horizontal midpoint - no arc flags or radius
constraints, so none of the SVG-arc gotchas from ring/wedge apply) plus a simple orthogonal "elbow"
router. Referencing an id declared AFTER the connector, or an unknown id, raises a clear ValueError
at build time (fail fast, not a silent broken render) - endpoints must be declared before the
connector references them. 4 new connector tests in surfaceGeometry.test.ts, 7 new tests in
tests/unit/test_surface_connector.py (covering every anchor-resolution shape + both id-error cases
+ HANDLE-mode no-op), SurfaceControl.tsx wiring with a matching smoke test. `make test` (412
passed), npm typecheck/test/build (464 tests), `make contracts-check` all green.

### Phase 3.3 — Text-on-path + tick/segment repeater
[x] DONE. Written directly (fleet still hung on every check this milestone). `text_path`: a new
`TextPathNode` contract type (`path_ref`, `text`, `start_offset`) + `surface.text_path()`, which
validates `path_ref` at BUILD time against `_PATH_RENDERING_TYPES` (arc/ring/wedge/elbow/polygon/
path/connector - not rect/circle/ellipse, which render as native SVG shape elements rather than
`<path>`, so an SVG2 shape-referencing `<textPath>` would be a legal-but-inconsistent special case
not worth supporting yet) and rejects an unknown or not-yet-declared id, same pattern as
`connector()`. Required adding `id={node.id}` to every path-rendering `GeometryNode` case so
`<textPath href="#...">` has something to resolve against.

`ticks`, by contrast, needed NO new contract type at all - it turned out to be a pure Python
composing function (a loop calling the already-existing `.path()` and `.region()`+`text()`), not a
new geometry primitive, since "N evenly-spaced repeated marks with optional labels" is really just
composition of what already exists. This did surface one real gap: tick marks are short open line
segments (no enclosed area), so they need STROKE rendering, but `path()` only ever filled. Added a
`filled: bool = True` field to the existing `PathNode` (both contracts) rather than a new type -
`filled=False` renders as a stroked outline, matching how `arc`/`connector` already render. A float
vs `int` field-type mismatch (tick label positions are trig results, `region()`'s x/y are `int`)
was caught immediately by Pydantic validation at test time, not silently wrong - `round()`ed before
passing through. 16 new Python tests (7 text_path/connector-pattern validation, 9 ticks - mark
count, label-count mismatch, count<2, HANDLE-mode no-op), 1 new frontend smoke test verifying the
exact DOM (`id`, `href`, `startOffset`, text content) rather than just "something rendered." `make
test` (421 passed), npm typecheck/test/build (465 tests), `make contracts-check` all green.

### Phase 3.4 — Gauntlet + release
[x] DONE. Written directly (fleet dispatch still unavailable - `opencode run` hung on every check
throughout Milestone 3; flagged to the user for their other session to investigate the dispatch
pipeline itself, not something fixable from here). Two new gauntlet screens added to
`examples/surface_gauntlet/app.py`'s `SCREENS` tuple: `trapezoidal_frame` and `connector_diagram`.

`_connector_diagram()`: a central `circle` "core", a `ticks()` ring (12 marks, no labels) around it,
an `arc()` + `text_path()` label following the rim ("WARP FIELD DECOHESION"), and 5 peripheral
`rounded_rect` nodes each wired back to the core via `surface.connector()` with styles deliberately
mixed across straight/elbow/bezier to exercise all three routers in one screen. Built and rendered
correctly on the first attempt - no bugs found.

`_trapezoidal_frame()`: a `polygon()` trapezoid housing, an `elbow()` diagonal swoop accent, a
title/schematic/controls layout via `region()`, and a `ticks()` dial with labels. This one required
real iteration - not framework bugs, but genuine coordinate mistakes in the example's own layout
math, each one caught by the (working-as-intended) region-overlap ValueError or by an actual
screenshot rather than by a clean manifest build alone: tick label x going negative (wrong angular
quadrant for the chosen center), tick labels overlapping each other (angular span too tight for the
label box width), tick labels overlapping the schematic region, and - the one a clean build did NOT
catch - a `controls` region only 60px tall for 4 stacked buttons, which built without error but
visibly clipped 2 of the 4 buttons in the actual rendered screenshot. Fixed by widening/repositioning
`controls` to `h=140` clear of both the schematic block and the elbow swoop's bounding box. Re-
screenshotted after the fix and confirmed all 4 buttons visible with no remaining overlaps. This is
the concrete case for the standing rule "verify via rendered pixels, not just a clean manifest build" -
the overlap checker only reasons about declared region bounds, not about whether content actually
fits inside them.

Both screens confirmed via live Playwright screenshot against a real running server (not just a
manifest build). Full gate run: `make test` (421 passed, 89.74% cov), `npm test` (465 passed),
`npm run typecheck` (clean), `npm run build` (clean), `make contracts-update` + `make
contracts-check` (no drift - no contract fields changed this phase, gauntlet-only), `make
frontend-bundle` (clean rebuild synced into `_static/`). Version bumped to v5.6.0 in the 3 known
locations; wheel built; GitHub release created. **Milestone 3 complete.**
