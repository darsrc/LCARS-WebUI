# PLAN — v6.0 Surface Engine, Milestone 1

STATUS: [ ] pending · [~] in progress · [x] done · [!] blocked · [-] paused

## Phase 1.1 — Contract types
[x] DONE. Verified directly by the orchestrator (make test: 398 passed; npm typecheck/test/build: clean;
make contracts-check: clean) and committed to main as 0acffcb "v6.0 M1 Phase 1.1: add Surface contract
types (schema v1.1)". Surface, SurfaceRegion, RectNode, RoundedRectNode, CapsuleNode, CircleNode,
EllipseNode all exist in src/lcars_ui/core/models.py, all extend BaseWidget, all are members of the
Widget discriminated union. Matching TypeScript types exist in frontend/src/types/contract.ts.
Do not recreate or modify these type definitions.

## Phase 1.2 — Python DSL (lcars.surface(), shape methods, .region(), builder validation)
[x] DONE. Verified directly by the orchestrator: make test (398 passed), end-to-end BUILD-mode and
HANDLE-mode sanity checks (geometry nesting, color application, region overlap detection, builder
validation for authored-page top-level widget rules). lcars.surface() + .rect/.rounded_rect/.capsule/
.circle/.ellipse()/.region() all live in dsl/api.py and are re-exported from lcars_ui/__init__.py
(the fleet's first pass missed the __init__.py re-export - always verify a new top-level lcars.*
function is actually reachable via `import lcars_ui as lcars; lcars.<name>`, not just present in
dsl/api.py). surface() and region() must each push their own builder.container_context(widget,
target="children") around their body (mirror box()/sweep()'s pattern exactly) or children silently
land as page-level siblings instead of surface/region children.

## Phase 1.3 — Rendering (SurfaceControl)
[x] DONE. Verified directly by the orchestrator: npm typecheck/test/build all clean, plus a new
runtime smoke test (SurfaceControl.test.tsx) confirming geometry nodes render as real SVG shapes
and surface_region children render as normal recursive widgets. SurfaceControl lives in its own
file, frontend/src/widgets/SurfaceControl.tsx (not inline in WidgetRenderer.tsx - that file is
already huge), imported into WidgetRenderer.tsx's dispatch switch for widget.type "surface". Also
fixed two Phase-1.1 contract.ts gaps found while building this: the Widget union was missing
RectNode/RoundedRectNode/CapsuleNode/CircleNode/EllipseNode (only SurfaceWidget/SurfaceRegionWidget
had been added) - this passed typecheck at the time only because nothing referenced those types yet.
A control component that lives in its own file and imports WidgetRenderer/WidgetHandlers/accentVar
back from WidgetRenderer.tsx (a real but already-established circular-import pattern in this
codebase, see HintAnchor.tsx) must accept `{ widget, depth, handlers }: { handlers: WidgetHandlers }`
as three separate props, NOT `{ widget, depth, ...handlers }` rest-spread - the dispatch switch
always calls with a single `handlers={handlers}` prop.

## Phase 1.4 — Gauntlet example + golden regeneration + release
[x] DONE. examples/surface_gauntlet/app.py ("stacked_consoles" screen) built directly by the
orchestrator rather than dispatched - small, visually-judgment-heavy, and the API was already fully
understood after fixing phases 1.1-1.3. Verified by actually running the server and screenshotting
it once (not just typecheck/build) - caught two real issues invisible to any automated gate: (1) the
running server serves src/lcars_ui/_static/, a separate bundled copy that `npm run build` does NOT
update - must run `make frontend-bundle` (or `make frontend-build` + the bundle copy step) and
restart the server before any visual check, or you'll see stale-bundle errors that look like contract
bugs but aren't; (2) this app's COLOR_VAR map (WidgetRenderer.tsx) only resolves ~15 of the 37 named
LcarsColor tokens to a real CSS value - an unmapped color (e.g. "tanoi", "periwinkle") silently
falls back to a default rather than erroring, so two different colors can render identically. Pick
colors from the mapped set for anything where visual distinction matters.
MILESTONE 1 COMPLETE. Next: Milestone 2 (arc/ring/wedge geometry + polar layout), a new PLAN.md
phase set - see the full plan at ~/.claude/plans/uploaded-documents-list-logical-volcano.md.
