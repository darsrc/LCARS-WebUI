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
[ ] NOT STARTED. `surface.polar(center=, inner_radius=, outer_radius=, start_angle=, end_angle=,
tracks=, gap_deg=)` context manager (mirror `_AuthoredCompositionContext`'s track-index model) with
a `.track(i, *, span=1)` method returning a `surface.region()`-like scope bound to a resolved
angular slice - i.e. it computes concrete start/end angle for that track index from the polar
declaration's tracks/gap_deg, then likely just calls into `.region()`'s machinery with those computed
bounds. Simple arithmetic - safe to delegate.

### Phase 2.5 — Gauntlet + release
[ ] NOT STARTED. Two examples in examples/surface_gauntlet/app.py (new LCARS_GAUNTLET_SCREEN
values): "annular_helm" (mirrored polar-dial lobes) and "polar_scan" (full-bleed concentric
rings + spokes). Verify by actually running the server and screenshotting once - remember
`make frontend-bundle` before restarting the server, and check colors against the mapped subset
of LcarsColor (see Milestone 1 notes above). Regenerate golden fixtures (`make contracts-update`
then `make contracts-check`), version bump to v5.5.0 in the 3 known files, wheel build, gh release.
