# Spec 0.2.0 acceptance → v8 evidence

PLAN.md step 5.1.1. Each gate in `lcars-unification-project/docs/ACCEPTANCE.md` maps to
one of these:

- **auto**: an automated test
- **manual**: a documented manual check
- **gap**: not met in v8.0, with a reason

Test locations:

- **Unit:** `frontend/src/compose/scene/**.test.ts`, `frontend/src/widgets/SceneRenderer.test.tsx`,
  `tests/unit/test_scene_*.py`
- **E2E:** `frontend/e2e/scene.spec.ts`. These aren't in `make ci`; run them with
  `LCARS_PLAYWRIGHT_SKIP_BACKENDS=1 LCARS_PLAYWRIGHT_CHROMIUM_PATH=/usr/bin/chromium npx playwright test e2e/scene.spec.ts`.
- **Capture:** `frontend/scripts/scene_shots.mjs` against `examples/scene_console`. It covers
  4 field sizes × 4 modes and prints the family and explanation for each.

## 1. Spatial identity

| Gate | Status | Evidence |
|---|---|---|
| Connected composition | auto + capture | Every family draws one frame: spine, arm and elbows (`families/frame.ts`). The fork gutter band and contour divider leave the arm through junctions. `assertCandidateValid` checks that there are no stubs. |
| Functional geometry | auto | Slots come from relations (`slots.ts`, V8-D03). Each path carries a `kind`. The relation sentences name relation ids in the DOM (`.lcars-scene-relations`). |
| Shaped region | auto + capture | The wrap, fork and contour families are built around measured interiors. One rectangular interior per region (V8-D05, narrowed). |
| Unequal allocation | auto | The focal slot gets the largest rect (family tests). |
| Same-field adaptation | auto | E2E "mode changes topology at the same viewport": inspect→wrap, compare→fork, inspect→wrap, fault→branch at 1920×1080. |
| Field adaptation | auto + capture | Family tests at 1920×1080, 1366×768, 1080×1920 and 390×844. Occluded field: E2E "occluded field" (5.1.2). |
| Structural legibility | auto | The forced-colors E2E checks that bands render and relations are described in text. Motion is optional (reduced motion gives the same scene). |
| Semantic equivalence | auto | The linear view re-presents the same mounted region sections and includes every region ("OTHER REGIONS") (SceneRenderer tests). Axe runs in both views. |

## 2. Geometry and behaviour

| Gate | Status | Evidence |
|---|---|---|
| Safe interiors | auto | The 200% text and 320 px E2E checks there's no clipped text and no shrink-to-fit. Long labels: E2E "long labels refit" (5.1.2). |
| Hit regions | auto | Paths are `aria-hidden` SVG with `pointer-events: none`. Controls are rectangular DOM elements at least 44 px (target E2E). |
| Connections | auto | Paths are rebuilt from placements on every commit (one `ResolvedScene`). |
| Atomic commit | auto | One `ResolvedScene.revision` drives placements, paths and terminals in a single render (`data-scene-revision`). |
| Fit failure | auto | Chooser order: preferred families → `focus` → linear view with a `role="status"` notice (choose and SceneRenderer tests). |
| Focus/pointer locks | auto | `schedule.test.ts` rules 4–6 and `useSceneLocks.test.tsx`. E2E "background change defers while editing" and "pointer press defers" (5.1.2). |
| Editing | auto | E2E "user mode change keeps draft, focus and caret" (same DOM node). The linear toggle keeps the same input node (SceneRenderer test). |
| User pins | auto | `pins.test.ts`: a pin promotes optional to required. An infeasible pinned fit falls to `focus` or linear and is never silently unpinned (5.1.2 test). |
| Stable-layout mode | auto | `schedule.test.ts` rule 5. The panel toggle is persisted. Data `widget_update`s still apply to mounted widgets. |
| Anti-thrashing | auto | `schedule.test.ts` quiet window and interval. The chooser keeps the previous family. Orientation hysteresis is in `choose.test.ts`. |
| Return continuity | auto | `<scene>.return` → `ctx.end_mode()` → `returns_to` (`test_scene_modes.py`). The E2E return terminal sends the action. Pins persist across modes. |
| Explainability | auto | `ResolvedScene.explanation` gives the family, mode, folded regions and rejected families. The LAYOUT panel shows it and any pending reason. |

## 3. Accessible operation and truthful state

| Gate | Status | Evidence |
|---|---|---|
| Keyboard | auto | E2E keyboard path reaches every control. The subscene BACK restores focus to its opener. There's no dragging in scenes. |
| Focus | auto + manual | Focus survives user and background changes (E2E). Escape on the LAYOUT panel restores focus. Manual: check the visible focus ring in all themes. |
| Semantics | auto | Axe (spatial and linear). Regions are `section`s with headings. Paths are `aria-hidden`. Relations use `aria-describedby`. |
| Contrast | auto | `contrast.test.ts` on the theme tokens used by scene rules (4.5:1 text, 3:1 bands). Only the default theme is checked; other themes are manual. |
| Zoom/reflow | auto + manual | 200% text and a 320 px field (E2E). 400% zoom from 1280 px is a 320 px CSS field, covered by the same E2E (5.1.2). True 2D instruments: manual. |
| Touch | auto | 44×44 target E2E at 1920 and 390 px. No hover-only commands. |
| Localization | auto / gap | Long labels: E2E (5.1.2). RTL: **gap**. CSS logical properties aren't applied to absolute placements, so RTL is v8.x (decisions.md "Deferred"). |
| Forced colors | auto | E2E with `forcedColors: "active"`. |
| Motion/sound | auto | Reduced motion sets the tokens to 0 ms; the scene is the same. No sound. |
| Data truth | **gap** | A widget-level freshness model is outside layout scope (spec-mapping.md §5). Example data is labelled "DEMO DATA". |
| Failure | partial | Drafts are preserved through recomposition. Accepted ≠ succeeded is a **gap** (spec-mapping.md §5). |
| Performance | auto | Measurement is cached per (region, width/16) and families are bounded templates. Stale solves can't occur because the solve is synchronous in one layout effect. |
| Rights | manual | Examples use original domains (V8-D15). No assets from the spec's `evidence/` are in the repo. |

## 4. Proving workflows

| Workflow | Status | Evidence |
|---|---|---|
| A. Inspect → compare → edit | auto | `examples/scene_console` (soil lab), E2E topology and draft tests, captures. |
| B. Live exception and recovery | auto | The fault mode branch (`recovers` relation), E2E background deferral, and the pointer-press and pin-conflict tests (5.1.2). |
| C. Dense data, restricted field | auto | The `scene_console` "Records" page (5.1.2): table in a contour region, filters attached via `controls`, selection branch via `details`. The E2E covers wide → tall → narrow and a reserved keyboard area. |

## 5. Known limitations recorded for v8.0

- RTL refit, data freshness and command lifecycle (above).
- One rectangular interior per region (V8-D05).
- Only Chromium is tested automatically. Assistive technology and real-user validation are
  manual and not yet done.
