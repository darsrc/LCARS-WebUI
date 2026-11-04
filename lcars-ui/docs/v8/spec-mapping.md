# Spec 0.2.0 → LCARS-WebUI mapping

PLAN.md steps 0.1.1 and 0.1.3. This maps each normative requirement in spec 0.2.0 to where it
lands in this codebase and what already exists. Decisions are cited as V8-Dxx
([decisions.md](decisions.md)). The widget catalogue is in
[widget-inventory.md](widget-inventory.md).

**Layer key:** **DSL** = `lcars_ui` Python API · **C** = contract (Pydantic models, `contract.ts`,
protocol) · **CMP** = frontend compositor (new, `frontend/src/compose/scene/`) · **R** = renderer
(`SceneRenderer`, `WidgetRenderer`) · **T** = tests/gates · **Doc** = docs.

## 1. Identity and spatial grammar (LCARS.md §3–4, LAYOUT-GRAMMAR §1–3)

| Spec requirement | Layer | Exists today | New work | Milestone |
|---|---|---|---|---|
| Regions with stable id, role, subject | DSL, C | `surface.region()` (fixed coordinates only); mosaic panels (no relations) | `scene_region` container widget (V8-D09) | M1 |
| Relations: controls / details / compares / feeds / part_of / recovers | DSL, C | none | `SceneRelation` model and DSL helpers | M1 |
| Ports (id, side, role) | C, CMP | Surface connectors attach to anchors, not ports | `ScenePort`; the compositor places ports on region edges | M1 / M2 |
| Spine, band, elbow, junction, terminal, aperture | CMP, R | `elbowPath`, `pathFromCommands`, `connectorPath`, arcs in `surfaceGeometry.ts` | Geometry kernel composes them into bands (V8-D04) | M2 |
| Segment bank (controls along a path) | R | `.lcars-segments` select bank; button stacks | Command bank placed on a band terminal; individually labelled controls | M2 |
| Shaped regions with measured safe interiors | CMP | none (surface regions are fixed rects) | One measured interior per region in v8.0 (V8-D05) | M2 |
| Rails structural, strokes non-interactive | R | Surface SVG layer is already `pointer-events` decoration | Enforce `pointer-events: none` on all structural paths; test it | M2 |
| Composition families wrap / branch / fork / contour / focus | CMP | archetypes console / telemetry / grid / menu (website-shaped) | Five family templates (V8-D02, V8-D08) | M2 |
| Asymmetry: focal work earns area | CMP | mosaic weights by content, not task | Focal slot gets the largest allocation by construction | M2 |

## 2. Adaptive behaviour (LCARS.md §5, LAYOUT-GRAMMAR §4–7)

| Spec requirement | Layer | Exists today | New work | Milestone |
|---|---|---|---|---|
| Separate topology, geometry and interaction state | C, CMP | conflated in mosaic | `SceneModel` (topology), `ResolvedScene` (geometry), lock store (interaction) | M1–M3 |
| Task modes change the topology at the same viewport | DSL, C, CMP | page switching only | `SceneMode`, `ctx.set_mode()`, `scene_mode` event (V8-D07) | M1 / M3 |
| Inputs: field shape, measured content, modality, prefs | CMP | `compose/measure.ts`, `compose/viewport.ts` (mosaic) | Scene measurement per representation, reusing these where possible | M2 |
| Hard constraints before soft preferences, deterministic | CMP | none | Lexicographic chooser (V8-D06) | M2 |
| Infeasible → alternate family → fold → focus → access view | CMP | `narrow` policies (scroll / scale / fluid) on surfaces | Fallback chain ending in `focus`, then the access view | M2 / M4 |
| Locks: focus, pointer capture, IME, unsaved edit | CMP, R | none | Lock store; deferred commits (V8-D11) | M3 |
| No remount of live editors | R | the Deck remounts on page change | Region DOM keyed by region id, persistent across commits | M3 |
| Anti-thrash: 750 ms quiet window, 5 s interval, hysteresis | CMP | none | Commit scheduler | M3 |
| Pins, stable-layout mode, reset, explanation | CMP, R | `WebUISettings` (theme, motion) | Pins as intent; stable-layout toggle; "why changed" text | M3 |
| Reduced motion = instant commit, same scene | R | `motion.ts`, `useReducedMotion` | Reuse | M3 |
| Atomic commit (geometry, DOM, hit regions share a revision) | CMP, R | n/a | `ResolvedScene.revision`; single render pass | M2 |

## 3. Operation and accessibility (LCARS.md §7, ACCEPTANCE §3)

| Spec requirement | Layer | Exists today | New work | Milestone |
|---|---|---|---|---|
| Semantic HTML controls, keyboard path, documented reading order | R | widgets are already semantic; LCARS control language | Scene semantic order = mode order, not geometry | M2 / M4 |
| Relations described accessibly | R | none | `aria-describedby` relation text; access view lists relations | M4 |
| Focused subscene and linear access view | CMP, R | none | V8-D12 | M4 |
| 4.5:1 text, 3:1 boundaries, 44×44 targets | T | palette truth-sampled; no automated contrast gate | Token contrast test; target audit | M4 |
| 200% text and 400% zoom, forced colours | T | 768/480 px overflow checks only | Playwright gates | M4 |
| Data truth: zero / missing / stale / partial distinct | R | widgets show values; no freshness model | Out of v8 layout scope. Logged as a widget-level follow-up (see §5) | — |

## 4. Python boundary (LCARS.md §8, IMPLEMENTATION)

| Spec requirement | Layer | Exists today | New work | Milestone |
|---|---|---|---|---|
| Python supplies meaning, compositor resolves presentation | DSL, CMP | Surface resolves geometry in Python (opposite) | V8-D01 | M1 |
| No hard-coded sidebar or uniform card list | R | rail shell + mosaic are the default | Scene pages own the field (V8-D10); legacy untouched (V8-D13) | M1 / M5 |
| Server re-checks authorisation; capabilities advisory | — | v7 handlers + session isolation | No change | — |
| Command lifecycle submitting → accepted → succeeded/failed | R | `action_ack` exists | Out of layout scope; see §5 | — |

## 5. Gaps deliberately outside v8's layout scope

These are real spec requirements that are about widgets or data, not composition. They're
recorded here so they aren't mistaken for done.

- **Metric freshness / quality** (`observed_at`, `stale_after`, `quality`): needs a `status_tile`
  and `gauge` contract change. Candidate for v8.x.
- **Full command lifecycle** (accepted ≠ succeeded, idempotency keys): extends `action_ack`.
  Candidate for v8.x.
- **Data state vs interaction state** separation on every component: widget-by-widget audit.

## 6. What carries over unchanged

- All 40 widget types render inside `scene_region` without modification (V8-D09).
- Streaming (`widget_update`, `log_chunk`, notifications), forms, sessions, themes.
- `surface()`, `composition()` and the mosaic archetypes, as compatibility and authored
  regimes (V8-D13).
- The geometry kernel in `surfaceGeometry.ts` (V8-D04).
