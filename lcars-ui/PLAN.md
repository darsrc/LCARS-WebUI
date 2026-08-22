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

## Milestone 2 — Arc / Polar Geometry (DONE, v5.5.0)
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

## Milestone 4 — Constraint & Anchor Engine (DONE, v5.7.0)

Anchor-relative positioning (superset of Milestone 1's absolute-only x/y/w/h) plus a
`narrow="fluid"` policy for real reflow instead of uniform scaling. All 4 phases written
directly, without a fresh fleet-availability check this time - a prior diagnostic dispatch
this session (see `project_v6_surface_engine` memory, "fleet report") had already confirmed
the fleet's dispatch pipeline was slow and prone to giving up on small tasks rather than
delegating, and since Phase 4.1 was always going to be Claude-direct per the original plan
(the highest-risk phase in the whole 8-milestone plan) and 4.2-4.4 are all tightly coupled to
4.1's exact API shape, the whole milestone was kept direct rather than splitting dispatch
mid-stream. Worth a fresh fleet check before Milestone 5.

### Phase 4.1 — Constraint resolver core
[x] DONE. New `dsl/_surface_constraints.py`: `EdgeAnchor(target, edge, offset)` (target is
another node's id or the literal string `"parent"`), `PendingConstraint` (one per positionable
node - every `rect`/`rounded_rect`/`capsule`/`region` call registers one, unconditionally,
whether or not it uses anchors), and `resolve_surface_constraints()` - a real dependency-graph
resolver: Kahn's-algorithm topological sort over anchor/`match_width_of`/`match_height_of`
targets, per-axis resolution (near+far edges with no explicit size = fill the gap; near/far
edge + explicit size = pinned; center + size = centered; explicit x+w always short-circuits
and wins over any anchors on that axis), explicit `ValueError`s for an unknown target id, a
constraint cycle (self-reference and multi-node cycles both caught), and a non-positive
resolved size. 15 unit tests against the resolver in isolation (lightweight stub nodes, not
the full DSL) - **caught a real bug on first run**: the offset-direction logic was keyed off
which edge of the *target* an anchor pointed at, when it needed to be keyed off which side of
the *resolving node* (near vs far) the anchor was assigned to - `left=EdgeAnchor(x,"right",24)`
and `right=EdgeAnchor(x,"right",24)` need opposite offset signs even though both reference the
same target edge. Fixed and re-verified before touching the DSL at all, exactly the discipline
that caught M2's arc bug - test the module in isolation before wiring it anywhere.

### Phase 4.2 — Python API for constraints
[x] DONE. `surface.rect/rounded_rect/capsule/region()` gained `anchor_left/anchor_right/
anchor_top/anchor_bottom` (accepts either a plain int - shorthand for "N px in from the
surface's own edge" - or an explicit `lcars.edge_anchor(target, edge, offset=)` to anchor to
another node), `center_x/center_y`, and `match_width_of/match_height_of`. `x/y/w/h` became
optional (default `None`) rather than required positional args - existing positional call
sites (`rect(10, 20, 100, 50)`) are unaffected; absolute wins outright per-axis whenever both
position and size are given, exactly as planned. Region overlap checking moved from
declaration-time (comparing partial state - wrong once bounds can be anchor-dependent) to a
deferred pairwise sweep run once every node in the surface is fully resolved, at `surface()`
exit - `.track()`'s `check_overlap=False` polar tracks stay excluded from that sweep exactly
as before. 8 DSL-level integration tests (absolute-unaffected, plain-int parent shortcut,
`edge_anchor` to another node, forward-reference-before-declaration resolves correctly,
deferred overlap still fires, unknown-target error, `match_width_of`, HANDLE-mode no-op) -
all passed on the first run, since the resolver itself was already independently verified.

### Phase 4.3 — `"fluid"` narrow policy
[x] DONE. Took the plan's suggested "simpler two-pass" approach: `narrow` grew a third value
(`"fluid"`, alongside `scroll`/`scale`); `lcars.surface(narrow="fluid", narrow_design_size=)`
resolves the SAME constraint specs a second time against `narrow_design_size`, writing to new
`narrow_x/y/w/h` fields (added to `RectNode`/`RoundedRectNode`/`CapsuleNode`/`SurfaceRegion` in
both contracts) instead of `x/y/w/h` - the resolver's abs-short-circuit meant this needed zero
special-casing for absolute (non-anchored) nodes, they just resolve to the same values in both
passes automatically. `SurfaceControl.tsx`: below `min_width` under `narrow="fluid"`, the SVG
viewBox and every rect/rounded_rect/capsule/region's rendered bounds switch to
`narrow_design_width/height` and `narrow_x/y/w/h ?? x/y/w/h` - no client-side constraint
solving at all, exactly per the plan. 1 new frontend test mocks `HTMLElement.clientWidth` to
force the narrow branch and asserts the viewBox and a region's resolved `%` position/size
both switch correctly.

### Phase 4.4 — Gauntlet + release
[x] DONE. One example: `tactical_display` (Hathaway-style) - a full-width status bar (near+far
anchored directly to the surface, demonstrating the "fill" mode against the parent rather than
a sibling), two fixed-width instrument rails, and a central viewscreen anchored between the
rails' inner edges with no explicit width. **Caught a real bug in the example itself, not the
framework**, on the very first manifest build: the right rail was placed with a plain absolute
`x=1380`, which is off-canvas under the 800px-wide narrow design entirely - since it's
absolute, it doesn't reflow, so the viewscreen's `anchor_right` (pointing at the right rail's
left edge) silently kept resolving against the WIDE-design coordinate in the narrow pass too,
so the center never actually reflowed. Fixed by anchoring the right rail to the surface's own
right edge (`anchor_right=0`) with a fixed width instead of a raw absolute x - it now
repositions correctly in each pass while staying the same width, which is what let the
downstream viewscreen anchor resolve correctly per-pass as well. Confirmed via live screenshot
at both 1600px (wide: viewscreen 1112px) and 900px (narrow, below `min_width=1200`: viewscreen
312px, rails unchanged at 220px) - **first screenshot also caught a stale-bundle issue**
(`make frontend-bundle` hadn't been re-run after the Milestone 4 contract changes, so the
client-side AJV validator still had the old schema and rejected `narrow: "fluid"` outright as
an invalid manifest shape) and a cosmetic issue (rail buttons colored the same as their rail
backdrop, rendering as plain text instead of visible pill buttons) - both fixed and
re-verified before moving on.

Full gate: `make test` (446 passed, 89.96% cov), `npm test` (466 passed), `npm run typecheck`
(clean), `npm run build` (clean), `make contracts-update` + `make contracts-check` (no drift),
`make frontend-bundle`. Version bumped to v5.7.0; wheel built; GitHub release created.
**Milestone 4 complete.**

## Milestone 5 — Mirror / Repeat / Rotate Transform Groups (DONE, v5.8.0)

`surface.group()`: mirror/repeat_radial/repeat_linear/rotate, without bloating the manifest -
unlike Milestone 4, transforms here are deliberately NOT resolved server-side; the plan calls
for render-time expansion (SVG `<g transform="matrix(...)">` per copy) specifically to keep the
JSON payload small regardless of repeat count, so this milestone's core math lives in
TypeScript, not Python. Written fully direct (no fleet check attempted - Phase 4.1's diagnostic
findings on driver reliability still stand from last milestone).

### Phase 5.1-5.3 — Contract, Python API, rendering
[x] DONE, worked through together since the contract/DSL/renderer are small and tightly
coupled here. `frontend/src/widgets/surfaceTransforms.ts`: a real affine-matrix module
(`AffineMatrix {a,b,c,d,e,f}`, `mirrorMatrix`/`rotationMatrix`/`translationMatrix`/
`composeMatrix`/`transformPoint`/`matrixToCss`) plus `groupCopyTransforms()`, which turns a
group's spec into a list of per-copy matrices - mirror always yields exactly 2 copies
(identity + reflection), repeat_radial/repeat_linear yield `count` copies, and `rotate`
composes an extra rotation onto whichever of those is chosen (or stands alone as a single
copy). 19 unit tests written and passing BEFORE any wiring - unlike M2's arc bug and M4's
offset-direction bug, this math was correct on the first attempt, which is itself informative:
the "test the module standalone first" discipline catches both real bugs (most of the time)
and confirms correctness quickly when the derivation actually was right the first time.

Contract: new `MirrorSpec`/`RepeatRadialSpec`/`RepeatLinearSpec` + `SurfaceGroup`/
`SurfaceGroupWidget` (mirrors `Widget` union additions from every prior milestone) - the
group's `children: Widget[]` is a template, drawn once, never expanded server-side.
`lcars.surface().group(*, mirror=, mirror_axis=, repeat_radial=, repeat_linear=, rotate=,
rotate_pivot=)` yields `self` (the same `_SurfaceContext`), so `.rect()`/`.region()`/etc.
called inside a `with surface.group(...) as g:` block attach to the group via the SAME
`container_context` nesting `.region()` already relies on - no new plumbing needed, and
regions declared inside a group still go through Milestone 4's anchor/constraint resolver
automatically, for free. `repeat_radial`/`repeat_linear` take a plain dict rather than a typed
object (matches the plan's literal suggested signature); Pydantic validates the shape when the
spec model is constructed, so a malformed dict (missing key) still fails loudly with a clear
error. Mutual exclusivity (`mirror`/`repeat_radial`/`repeat_linear` - at most one) enforced
with an explicit `ValueError`.

`SurfaceControl.tsx`: `surface_group` needed its own rendering path, not just another
`GeometryNode` switch case, since a group mixes SVG-layer geometry children with HTML-layer
region children. Restructured the SVG/HTML passes to iterate `widget.children` directly
(rather than three pre-filtered arrays) so a group's SVG content interleaves in the correct
DECLARATION order with plain sibling geometry, not always-after regardless of where it was
actually written. `SurfaceGroupGeometry` wraps each copy's geometry children in one
`<g transform="matrix(...)">`; `SurfaceGroupRegions` repositions each copy's region children
by transforming only their CENTER point and redrawing the same w/h around it - text/button
content is deliberately never rotated or mirrored (would read backwards), matching how real
LCARS mirrored panels actually work. For mirror/repeat_linear this reposition is mathematically
EXACT (an axis-aligned box's mirror image has the same w/h); for repeat_radial/rotate it's a
documented simplification (position only, no content rotation). Every copy's geometry node id
gets suffixed `-copy-{i}` to avoid literal DOM id collisions.

**Caught a real pre-existing gap while writing the group test**, not a group-specific bug: the
`circle`/`ellipse`/`rect`/`rounded_rect`/`capsule` cases in `GeometryNode` never set an `id`
attribute at all (only the path-rendering types did, for `text_path` `href` references) - fine
when each node rendered exactly once, but a group repeating a `circle` produced N elements
sharing one id. Fixed by adding `id={node.id}` to every case, not just the ones the group
example happened to exercise.

### Phase 5.4 — Gauntlet + release
[x] DONE. New `mirrored_console` screen: one octagonal lobe `polygon()` declared once inside
`surface.group(mirror="x")` (default mirror axis = the surface's own center, exercised
deliberately rather than passed explicitly), a non-mirrored waist `region()` panel straddling
the centerline, and a row of 5 identical status tabs from a SINGLE `capsule()` declared inside
`surface.group(repeat_linear={"count":5,"dx":150,"dy":0})` - both transform modes get real
gauntlet coverage in one screen. Confirmed via live screenshot: symmetric bowtie shape, correct
waist placement, 5 evenly-spaced tabs, and readout text in BOTH mirrored lobes reading correctly
left-to-right (not reversed) - one real legibility bug found and fixed (readout text color had
poor contrast against the lobe's fill, unrelated to the transform math itself).

**Second planned example dropped as a bad fit, not attempted-and-abandoned**: the plan's Phase
5.4 also called for "revisit Milestone 2's DS9 helm console example to replace its
hand-duplicated left/right lobes with a single `mirror='x'` group (regression check that
Milestone 2's output is visually unchanged after the refactor)." Checked `_annular_helm()`
before starting - its two dials use genuinely DIFFERENT housing/accent colors and DIFFERENT
pointer angles (heading vs. velocity, two distinct instruments), not a reflection of identical
content. A literal `mirror` group can only produce exact reflected copies of the SAME template,
so forcing this refactor would have required either making the two dials identical (a real,
unwanted visual regression, directly contradicting the plan's own "visually unchanged"
requirement) or leaving `annular_helm` untouched and shipping a group wrapper that does
nothing. Left `annular_helm` as-is; `mirrored_console`'s repeat_linear tabs cover the
transform-mode breadth the second example would have added anyway.

Full gate: `make test` (455 passed, 90.13% cov), `npm test` (486 passed), `npm run typecheck`
(clean), `npm run build` (clean), `make contracts-update` + `make contracts-check` (no drift),
`make frontend-bundle`. Version bumped to v5.8.0; wheel built; GitHub release created.
**Milestone 5 complete.**

## Milestone 6 — Effects Layer / Animation (DONE, v5.9.0)

`surface.effect(target=, kind=)`: sweep/pulse/flow CSS animation attached to an already-declared
geometry node by id. **First milestone genuinely orchestrated rather than hand-written** - per
explicit user direction mid-milestone ("I want you to only orchestrate when it comes to code"),
every piece of implementation code (contract, DSL, renderer, tests, gauntlet examples) was
dispatched to opencode YOLO first and reviewed, not written directly; a late GPU-availability
constraint moved the final dispatch to Codex CLI (`codex exec`) instead. This produced far more
signal on fleet reliability than any milestone so far - three concrete failure modes hit,
diagnosed, and fixed, none of them silent.

### Phase 6.1 — Motion primitives (contract + DSL)
[x] DONE, written directly (small, and already in flight before the orchestrate-only directive
landed - kept per explicit user call rather than redone). New `EffectNode` contract type
(`target`, `kind: sweep|pulse|flow`, `period_ms`, `direction`, `from_angle`/`to_angle`,
`pivot_x`/`pivot_y` - defaults to the target's own anchor via the same `_surface_anchor_of()`
connectors already use, `colors`). `surface.effect()` validates the target id exists (reusing
`_find_surface_child_by_id`) and, for `kind="flow"`, that the target is a path-rendering node
(reusing `_PATH_RENDERING_TYPES`, the same restriction `text_path()` already uses) - both
established patterns, not new ones. Five reusable `@keyframes` added to `lcars.css`
(`lcars-surface-sweep[-bounded]`, `lcars-surface-pulse[-color]`, `lcars-surface-flow`),
parameterized per-effect via CSS custom properties rather than per-effect dynamic `<style>`
injection - and for free, already covered by the existing global
`prefers-reduced-motion`/`data-motion` wildcard guard, no new reduced-motion handling needed.
opencode wrote the Python test file (9 cases) correctly on the FIRST dispatch - but its own
final chat response was a bizarre, unrelated "Milestone 1-2 summary" + "how can I help you
next?", as if it had lost track of the actual task entirely. The underlying work was right; the
self-report was garbage - a sharper version of "never trust the summary, check the diff."

### Phase 6.2 — Wiring (frontend rendering)
[x] DONE. First opencode dispatch was given the COMPLETE, exact `buildEffectStyle()`
implementation to use verbatim (real `animationName`/`animationDuration`/`transformOrigin`/etc.
CSSProperties keys driving the Phase 6.1 keyframes) - it did not use it. Instead it invented an
inert scheme: setting only a `--animation-name` custom property that nothing in `lcars.css`
reads, silently dropping `period_ms`/`direction`/pivot entirely. **`npx vitest run` and `npm run
typecheck` both passed clean** - because the dispatch also wrote its OWN tests, which only
asserted its custom properties were *present as strings*, never that a real animation actually
fired. Every automated gate said done; the feature was completely inert. This is the sharpest
fleet failure mode of the whole plan so far: not a crash, not an obvious gap - confidently wrong
and self-validating. A second, correction-pass dispatch (same exact code, marked "use this
verbatim, do not invent an alternative scheme") fixed it correctly and rewrote the tests to
assert the real `animationName`/`animationDuration`/`strokeDasharray` values - verified with the
full gate (487 frontend tests). The first dispatch also silently overwrote 378 lines of this
very file (`PLAN.md`) with its own generic 42-line task tracker - restored from git; the
correction-pass prompt explicitly forbade touching `PLAN.md` and it complied.

### Phase 6.3 — Gauntlet + release
[x] DONE. Two new screens dispatched to opencode with near-complete literal code (given the 6.2
lesson): `animated_scanner` (Ares-IV-style - a continuously sweeping pointer wedge + a dashed
"flowing" rim arc) and `animated_sectors` (Year-of-Hell-style - six wedges in a ring, each
independently pulsing between two colors at a different period). The example code itself was
correct verbatim, but the mechanical wiring around it had two real bugs: the `build()`
if/elif/else dispatch chain never routed to `_animated_sectors()` at all (selecting it would
have silently rendered `_animated_scanner()` instead), and an unrelated EXISTING docstring
paragraph (`mirrored_console`'s) lost its indentation as a side effect of editing nearby text.
Both small enough to fix directly rather than another round-trip. The dispatch also proactively
ran half of `make contracts-update` (the Python side) unprompted - a genuinely correct and
necessary step I hadn't done yet for the Phase 6.1 contract addition - completed the frontend
half myself.

Visual verification hit a real infrastructure snag: the Playwright Chromium browser was mid-way
through a corrupt/incomplete previous state and `npx playwright install chromium` hung
indefinitely - not on the network (a direct download of the same archive completed in ~6s) but
on an interactive overwrite prompt during extraction, waiting on stdin that a non-interactive
shell would never provide. Fixed by wiping `~/.cache/ms-playwright` and extracting the
already-downloaded archive manually with `unzip -oq` (force-overwrite, no prompt).

Screenshotting then caught a REAL rendering bug neither gate had: `animated_sectors` showed only
1 of 6 wedges visibly colored, the other 5 rendering pure black. DOM inspection (not another
screenshot) showed all 6 wedges present with correct geometry, but 5 of 6 had their
`--lcars-effect-color-a` custom property set to the literal, unresolved LCARS token string
(`"mariner"`, `"periwinkle"`, etc.) instead of a real CSS color - invalid CSS, so SVG's default
black fill silently took over. Root cause: **this was the orchestrator's own bug, not the
fleet's** - the Phase 6.2 correction-pass prompt's "verbatim" reference code had accidentally
dropped the `accentVar()` wrapping that the ORIGINAL Phase 6.2 prompt had correctly included,
and the two sectors that happened to use "orange"/"red" (which are ALSO valid raw CSS keywords)
masked the bug by coincidence. Fixed directly in the codebase (`accentVar(effect.colors[i]) ??
effect.colors[i]`), re-screenshotted to confirm all 6 sectors now render distinct colors. Given
this session's local GPU fleet became unavailable (in use elsewhere), the follow-up regression
test (a pulse effect using an LCARS-only color name, asserting the resolved custom property
equals `accentVar(...)` rather than the raw string) was dispatched to Codex CLI instead
(`codex exec`) as a first real comparison point - it produced a correct, minimal, precisely
-targeted diff on the first attempt, respecting every constraint given (didn't touch `PLAN.md`,
didn't touch the already-fixed source file, ran the exact verification commands asked for).

Full gate: `make test` (464 passed, 90.17% cov), `npm test` (487 passed), `npm run typecheck`
(clean), `npm run build` (clean), `make contracts-update` + `make contracts-check` (no drift),
`make frontend-bundle`. Version bumped to v5.9.0; wheel built; GitHub release created.
**Milestone 6 complete.**

## Milestone 7 — Nesting & Composition Interop (DONE, v5.10.0)

A `surface_region` can host a nested `lcars.composition()` (CSS-grid) or another nested
`lcars.surface()`, not just plain widgets - "irregular outer frame containing a normal
rectangular sub-layout" screens. Orchestrated via **Codex CLI**, not opencode - the local GPU
fleet was unavailable this session ("my opencode GPU fleet is being used elsewhere" - user); a
quick `timeout 45 opencode run ...` probe confirmed it before falling back.

### Phase 7.1 — Validation rule refinement
[x] DONE, mostly verification as the plan predicted - no production code changed. Confirmed
directly (read `_builder.py`'s `build()`) that the "exactly one top-level composition/surface
per authored page" rule only inspects `page.rows -> row.columns -> column.widgets` (true
top-level widgets), never recursing into any widget's own `children` - so nesting was already
structurally legal before this milestone touched anything. Dispatched two regression tests to
Codex confirming this in practice (composition nested inside a region, and a surface nested
inside a region) - the FIRST dispatch correctly wrote both tests, but the second one exposed a
real `ValueError: Duplicate widget id 'surface'` because my own dispatch prompt had both the
outer and inner `lcars.surface()` omit an explicit `id=`, colliding on the shared default.
Codex did exactly the right thing here: it stopped at the failure, explicitly reported "no
production code was changed" and "the gauntlet change was not retained... because Step 1 did
not pass," rather than silently working around it or guessing - genuinely trustworthy failure
behavior, a first for this plan's fleet-orchestration history. This was a bug in the test SPEC
(every widget already requires distinct ids when there's more than one, same as any other
widget type - not a framework defect), fixed directly with a one-line `id="inner"`.

### Phase 7.2 — Gauntlet + release
[x] DONE, in two Codex dispatches (the first attempt's gauntlet-example half was correctly
discarded per Phase 7.1's stop-on-failure, so it needed a fresh, standalone dispatch). New
`nested_console` screen: a polygon outer frame (`surface`) containing a `surface_region` that
hosts a full `lcars.composition()` 3x3 CSS-grid (title bar + 3 vital-sign readouts + a control
bank), demonstrating the "medical-monitor-style" category the plan describes. The dispatch's
own code was correct on the first attempt and its build()-dispatch-chain wiring was ALSO
correct this time (explicitly primed with the exact prior-milestone bug as a "must not repeat"
warning, plus an independent all-10-screens build check baked into the prompt itself - both
paid off). Live screenshot then caught two REAL layout bugs, neither in the framework:

1. The nested `lcars.composition()` call never specified `design_size=`, so it fell back to the
   default `(1920, 1080)` with `min_width=960` - forcing the grid 960px wide inside its actual
   700px-wide hosting region. The overflow was silently clipped by the region's own
   `overflow: hidden`, so the third vital-sign column ("TEMP") was fully present and correctly
   positioned in the DOM (confirmed via `page.$eval`, not by staring at the screenshot) but
   invisible past the region's clipped edge. Fixed by passing `design_size=(700, 500),
   min_width=700` to match the actual hosting region - a reminder that a nested composition's
   design coordinate space needs to be sized to its ACTUAL container, not left at the page-scale
   default, exactly the kind of interaction issue this milestone exists to surface.
2. Four sibling buttons inside one composition area rendered as a vertical stack, 2 of them
   clipped off the bottom - not a bug: `.lcars-authored-area` is `flex-direction: column` by
   design (matching every other multi-widget region/area already in the gauntlet), so multiple
   button siblings always stack vertically. The area's row track was simply too short (80px) for
   4 stacked buttons; widened to 250px and re-screenshotted to confirm all 4 fully visible.

Full gate: `make test` (466 passed, 90.17% cov), `npm test` (487 passed), `npm run typecheck`
(clean), `npm run build` (clean), `make contracts-check` (no drift - no contract fields changed
this milestone), `make frontend-bundle`. Version bumped to v5.10.0; wheel built; GitHub release
created. **Milestone 7 complete.**
