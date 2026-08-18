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

## Phase 1.3 — Rendering (SurfaceControl in WidgetRenderer.tsx)
[ ] NOT STARTED. Separate future task.

## Phase 1.4 — Gauntlet example + golden regeneration + release
[ ] NOT STARTED. Separate future task.
