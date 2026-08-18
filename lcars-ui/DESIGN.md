# DESIGN — v6.0 Surface Engine

Full plan: `~/.claude/plans/uploaded-documents-list-logical-volcano.md` (Claude has it; ask if you need more than this excerpt).

## What we're building
A geometry layer (`surface` widget) for arbitrary-topology LCARS screens (arcs, rings, wedges,
polygons, elbows-as-paths, connectors, polar layout, anchors, mirror/repeat groups) alongside the
TWO layout systems that already exist and MUST NOT be touched/replaced:
- adaptive mosaic (`archetype: auto/console/telemetry/grid/menu`, `compose/*.ts`)
- authored CSS grid (`archetype: "authored"`, `AuthoredComposition`/`CompositionArea`,
  `lcars.composition()`/`.area()` in `dsl/api.py:887-923`, rendered by `AuthoredCompositionControl`
  in `frontend/src/widgets/WidgetRenderer.tsx:617-738`)

## The one integration fact that matters
`Console.tsx`'s authored-page branch does NOT switch on widget type — it flat-renders whatever
top-level widget(s) an authored page has, and `WidgetRenderer.tsx` dispatches by `widget.type`.
So `surface` is a NEW SIBLING widget type to `authored_composition` — same page archetype, same
"exactly one top-level layout widget" rule in `_ManifestBuilder.build()` (`dsl/_builder.py:365-374`,
generalize to accept `AuthoredComposition | Surface`). Do NOT add a new page archetype. Do NOT touch
`Console.tsx`'s branching logic beyond what's strictly needed.

## Pattern to copy for EVERYTHING
`lcars.composition()` (context manager) + `_AuthoredCompositionContext.area()` (`dsl/api.py:837-923`)
is the template for `lcars.surface()` + `surface.region()`. `AuthoredCompositionWidget` /
`CompositionAreaWidget` (`frontend/src/types/contract.ts:1072-1096`) is the template for
`SurfaceWidget` / `SurfaceRegionWidget`. `AuthoredCompositionControl` (`WidgetRenderer.tsx:617-738`)
is the template for `SurfaceControl` — reuse its `useViewportProfile`/`ResizeObserver`/
`design_width`-`aspectRatio`-`transform:scale()` mechanism verbatim for narrow policies
`scroll`/`scale` (adds `fluid` later). Mirror Pydantic models live next to `AuthoredComposition`/
`CompositionArea` in `core/models.py`.

## Contract shape (grows across milestones — see plan for exact fields per milestone)
- `SurfaceWidget` (design_width/design_height/min_width/narrow, children)
- `SurfaceRegionWidget` (bounds or anchors or polar-track binding; children: ordinary widgets)
- Geometry node union (SVG-rendered, never host widgets): rect/capsule/circle/ellipse/arc/ring/
  wedge/polygon/path/elbow/connector/text_path/ticks
- `SurfaceGroupWidget` (mirror/repeat_radial/repeat_linear/rotate — resolved at RENDER time in the
  frontend, not expanded server-side, to keep the manifest compact)
- Every direct child of a surface declares `layer: "geometry"|"content"|"overlay"|"effects"`

## DO NOT DELEGATE these three (Claude writes them directly, not the fleet)
1. Arc/ring/wedge SVG path math (sweep-flag/large-arc-flag/degenerate angles) — Milestone 2.
2. Elbow-as-path math (port `frontend/src/lcars/Elbow.tsx` corner logic to a path generator) — M3.
3. The anchor/constraint dependency-graph resolver (topological sort + cycle detection) — M4.
If your task touches one of these, STOP and flag it — do not attempt the math yourself.

## Gates before any step is "done"
`make test` (pytest, repo root = `lcars-ui/`), `cd frontend && npm test && npm run typecheck &&
npm run build`, `make contracts-check` (run `make contracts-update` first if you added/changed
contract fields, then re-run `make contracts-check` to confirm no unintended drift).
