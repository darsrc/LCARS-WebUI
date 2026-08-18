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
MILESTONE 2 COMPLETE. Next: Milestone 3 (path geometry, elbows, connectors) - see the full plan at
`~/.claude/plans/uploaded-documents-list-logical-volcano.md`.
