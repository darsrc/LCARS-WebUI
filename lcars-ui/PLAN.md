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
[ ] NOT STARTED. Add ArcNode/RingNode/WedgeNode to both contracts (mirror the Phase-1.1 pattern for
RectNode etc - remember to add to BOTH the Python Widget union in core/models.py AND the TypeScript
Widget union in contract.ts; Phase 1.3 found the TS union add is easy to silently skip since nothing
references the new type until later). `surface.arc/.ring/.wedge(*, center_x, center_y, inner_radius,
outer_radius, start_angle, end_angle, ...)` in dsl/api.py, mirroring the existing rect/circle/etc
methods exactly (same color/zone/span/... kwargs, same _apply_layout_hints call, same
self._builder.add_widget() append). Wire "arc"/"ring"/"wedge" into SurfaceControl.tsx's GeometryNode
switch, calling the Phase 2.1 path functions and setting fill-rule="evenodd" on ring/wedge <path>
elements (arc is a stroke, not a fill - use stroke={color}, fill="none", strokeWidth=~3-4).

### Phase 2.3 — Polar layout / track system
[ ] NOT STARTED. `surface.polar(center=, inner_radius=, outer_radius=, start_angle=, end_angle=,
tracks=, gap_deg=)` context manager (mirror `_AuthoredCompositionContext`'s track-index model) with
a `.track(i, *, span=1)` method returning a `surface.region()`-like scope bound to a resolved
angular slice - i.e. it computes concrete start/end angle for that track index from the polar
declaration's tracks/gap_deg, then likely just calls into `.region()`'s machinery with those computed
bounds. Simple arithmetic - safe to delegate.

### Phase 2.4 — Gauntlet + release
[ ] NOT STARTED. Two examples in examples/surface_gauntlet/app.py (new LCARS_GAUNTLET_SCREEN
values): "annular_helm" (mirrored polar-dial lobes) and "polar_scan" (full-bleed concentric
rings + spokes). Verify by actually running the server and screenshotting once - remember
`make frontend-bundle` before restarting the server, and check colors against the mapped subset
of LcarsColor (see Milestone 1 notes above). Regenerate golden fixtures (`make contracts-update`
then `make contracts-check`), version bump to v5.5.0 in the 3 known files, wheel build, gh release.
