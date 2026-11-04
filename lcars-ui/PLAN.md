# PLAN

Forward-looking. Finished work moves to [`docs/history/`](docs/history/README.md) rather than
accumulating here — if an item below is done, archive it instead of marking it done.

STATUS: `[ ]` pending · `[~]` in progress · `[x]` done · `[!]` blocked · `[-]` paused

**Where things stand.** v7.2.1 is the current release. The v7 line is closed. The new
direction is **v8: Adaptive Console Scenes** — make dynamic, shaped, task-driven console
composition the first-class model, and demote the website-style shell (rails + mosaic) to a
compatibility layout.

**Target spec:** `~/Documents/Projects/lcars-unification-project/` (spec **0.2.0**, proposed,
2026-11-04). Entry point `LCARS.md`; normative detail in `docs/LAYOUT-GRAMMAR.md`,
`docs/COMPONENTS.md`, `docs/IMPLEMENTATION.md`; gates in `docs/ACCEPTANCE.md`. The spec is
original, royalty-free work. Do **not** import its `evidence/` directory into this repo.

---

## v8 working rules

- **Additive, not a hard cut (v8.0).** `lcars.scene()` lands beside `page` / `composition` /
  `surface` and becomes the documented default. Existing manifests (incl. TrekBoard) must
  render unchanged. Removing the old shell is a later, separate decision.
- **Authored families + deterministic chooser, not a general constraint solver.** The spec
  allows this (IMPLEMENTATION.md, "Authored mode layouts can implement the same contract").
  Solve cycles are bounded and explainable.
- **Build on `surface()`.** Scene geometry compiles to the existing Surface Engine
  primitives (shapes, regions, connectors, anchors) wherever it can; extend it rather than
  writing a parallel renderer.
- **Python owns meaning, the browser owns geometry.** Regions/relations/modes come from the
  DSL; measurement and final placement happen in the frontend compositor.
- **Every phase ends green:** `make ci` passes, then commit + push to `main`.

### Dispatch protocol (Codex, token-frugal)

Claude orchestrates and reviews; Codex writes the code. Each step below is sized for one
dispatch and tagged with the tier to use:

| Tag | Invocation | Use for |
|---|---|---|
| `[luna]` | `codex exec -m gpt-6-luna -c model_reasoning_effort=low` | Default. Mechanical, well-specified edits, tests, docs, examples |
| `[terra]` | `codex exec -m gpt-6.1-terra -c model_reasoning_effort=low` | Cross-file logic with a clear spec (contract plumbing, transitions) |
| `[sol]` | `codex exec -m gpt-6.1-sol -c model_reasoning_effort=low` | Only the genuinely hard algorithmic steps; escalate here after a failed `[terra]` attempt, not before |
| `[claude]` | No dispatch | Decisions, schema design review, acceptance review, release |

Common flags: `--json --sandbox workspace-write -C lcars-ui -o <scratch>/last.md < /dev/null`.
The sandbox has **no network**: Claude runs any `npm`/`pip` installs first. Prompts name exact
files, the expected outcome, the verification command, and what *not* to touch (PLAN.md,
`LCARS_TRUTH/`, `_static/`). Claude reviews every diff before commit. A failure is retried
once at the same tier with a sharper prompt, then escalated one tier.

---

## M0 — Spec reconciliation  `[x]`

Settle what the 0.2.0 spec means for *this* codebase before any code is dispatched.

### Phase 0.1 — Map the spec onto the current system  `[x]`
- [x] 0.1.1 `[claude]` Read the full spec set; list every MUST and where it lands
      (DSL / contract / compositor / renderer / docs / tests).
- [x] 0.1.2 `[luna]` Inventory existing widgets, containers and Surface primitives into a
      table: id, semantic role, current layout participation (zone / area / surface region).
- [x] 0.1.3 `[claude]` Gap table: spec concept → existing equivalent → new work. Record it as
      `docs/v8/spec-mapping.md`.

### Phase 0.2 — Resolve spec ambiguities  `[x]`
- [x] 0.2.1 `[claude]` Decide how a composition family (wrap/branch/fork/contour/focus)
      becomes concrete geometry: parameterised templates over Surface primitives.
- [x] 0.2.2 `[claude]` Decide where solving happens: Python validates topology; browser
      chooses family + places geometry from measurements. Document the boundary.
- [x] 0.2.3 `[claude]` Define the minimum mode set for v8.0: `overview`, `select`
      (branch), `compare` (fork), `edit` (expand), `alert` (recovery branch), `focus`.
- [x] 0.2.4 `[claude]` Write decisions into `docs/v8/decisions.md` (V8-Dxx, linked to spec
      D-ids). User review gate before M1.

### Phase 0.3 — Scene schema proposal  `[x]`
- [x] 0.3.1 `[claude]` Draft the `Scene` contract shape (regions, relations, ports,
      representations, modes, policy) from `examples/adaptive-console.json`, narrowed to
      what v8.0 implements.
- [x] 0.3.2 `[luna]` Translate the draft into a worked JSON fixture + a short DSL sketch for
      one real example app, for review only (no implementation).
- [x] 0.3.3 `[claude]` User sign-off on schema and DSL surface.

---

## M1 — Scene model: DSL + contract  `[x]`

Python can declare a scene; the manifest carries it; the frontend accepts it (rendering
can still be a placeholder).

### Phase 1.1 — Contract  `[x]`
- [x] 1.1.1 `[terra]` Add Pydantic models: `SceneRegion`, `SceneRelation`, `ScenePort`,
      `SceneMode`, `ScenePolicy`, `Scene` (Page `archetype: "scene"`). Strict validation:
      unique ids, relations reference real regions, ports on real regions.
- [x] 1.1.2 `[luna]` `make contracts-update`; narrow `contract.ts`; update goldens.
- [x] 1.1.3 `[luna]` Contract tests: valid fixture round-trips; each invariant has a
      failing-case test.

### Phase 1.2 — DSL  `[x]`
- [x] 1.2.1 `[terra]` `lcars.scene(...)` context manager + `.region(id, role=, subject=,
      representations=)`; widgets declared inside a region are its contents.
- [x] 1.2.2 `[luna]` Relation helpers: `.controls()`, `.details()`, `.compares()`,
      `.feeds()`, `.part_of()`, `.recovers()`.
- [x] 1.2.3 `[terra]` Mode declaration + `ctx.set_mode()` / `ctx.end_mode()` / `scene.transition()`;
      mode is scene-widget state via session-scoped `widget_update` (no new protocol event).
- [x] 1.2.4 `[luna]` DSL tests + `docs/scene.md` first draft.

### Phase 1.3 — Frontend acceptance  `[x]`
- [x] 1.3.1 `[luna]` Types + manifest store support for `scene` and `scene_mode`.
- [x] 1.3.2 `[luna]` Placeholder renderer: regions in semantic order, relations listed
      (this becomes the access view seed in M4).
- [x] 1.3.3 `[claude]` Verify old manifests unaffected (golden + TrekBoard-shaped fixture).

---

## M2 — Compositor v1: authored families  `[~]`

The browser turns a scene + mode + field into real shaped geometry via Surface primitives.

### Phase 2.1 — Measurement + safe areas  `[ ]`
- [ ] 2.1.1 `[terra]` `compose/scene/measure.ts`: measure region content (min/preferred
      size per representation) against fallback fonts; bounded, cached by revision.
- [ ] 2.1.2 `[terra]` Safe-area model: a shaped envelope owns ≥1 rectangular content
      interiors; content placement never enters cutouts/corners.
- [ ] 2.1.3 `[luna]` Unit tests for measurement caching and safe-area containment.

### Phase 2.2 — Family templates  `[ ]`
- [ ] 2.2.1 `[sol]` Shared geometry kernel: spine/band, elbow, junction, terminal, aperture
      expressed over `surfaceGeometry.ts`; constant-width elbow rule (inner = outer − band).
- [ ] 2.2.2 `[terra]` `branch` family (spine + anchored unequal branches).
- [ ] 2.2.3 `[terra]` `wrap` family (focal aperture, bands on ≥2 edges).
- [ ] 2.2.4 `[terra]` `fork` family (shared origin, two subjects, difference bridge).
- [ ] 2.2.5 `[terra]` `focus` family (one subject + attached context/return band).
- [ ] 2.2.6 `[terra]` `contour` family (stepped boundaries, depth per group).
- [ ] 2.2.7 `[luna]` Per-family geometry tests: no overlap, ports on edges, connectors end
      at their real subject, all safe areas ≥ measured content.

### Phase 2.3 — Chooser + resolved scene  `[ ]`
- [ ] 2.3.1 `[terra]` `chooseFamily(model, mode, field, measurements, pins)`:
      candidates → reject hard-constraint failures → prefer continuity → fallback to `focus`.
- [ ] 2.3.2 `[terra]` `ResolvedScene` (placements, safe areas, paths, hit regions,
      semantic order, explanation string) — one revision consumed by both layers.
- [ ] 2.3.3 `[terra]` `SceneRenderer.tsx`: SVG structural layer + DOM semantic layer in a
      shared coordinate space; structural paths non-interactive; commands are real controls.
- [ ] 2.3.4 `[luna]` Chooser tests over field geometries (wide, tall, narrow, square).

### Phase 2.4 — First real scene  `[ ]`
- [ ] 2.4.1 `[luna]` `examples/scene_console/` — an original domain (not a copy of any
      screen) using ≥4 relation kinds.
- [ ] 2.4.2 `[claude]` One batched screenshot pass across 3 field shapes; review against
      LCARS.md §3 identity properties.

---

## M3 — Task-driven transitions + continuity  `[ ]`

Same viewport, different task → different topology, without losing the user's place.

### Phase 3.1 — Mode transitions  `[ ]`
- [ ] 3.1.1 `[terra]` Select → branch opens anchored to the selected subject.
- [ ] 3.1.2 `[terra]` Compare → fork; end compare → merge back.
- [ ] 3.1.3 `[terra]` Edit → expand safe interior; optional context folds to labelled
      terminals.
- [ ] 3.1.4 `[terra]` Alert → reserved recovery branch tied to its source.
- [ ] 3.1.5 `[luna]` Transitions use existing `motion.ts`; reduced motion = instant commit.

### Phase 3.2 — Interaction locks  `[ ]`
- [ ] 3.2.1 `[sol]` Preserve DOM identity of regions across recomposition (stable keys
      by region id; no remount of active editors).
- [ ] 3.2.2 `[terra]` Defer structural commits while pointer is captured or an editor has
      focus/unsaved draft; surface "pending layout" instead.
- [ ] 3.2.3 `[terra]` Anti-thrash: ordinary measurement changes never trigger family
      changes; hysteresis on field-size thresholds.
- [ ] 3.2.4 `[luna]` Playwright e2e: type into an editor, trigger a mode change, assert
      focus + draft + caret survive.

### Phase 3.3 — User control  `[ ]`
- [ ] 3.3.1 `[terra]` Pins (region stays where the user put it) persisted as intent, not pixels.
- [ ] 3.3.2 `[luna]` Stable-layout toggle + reset in settings.
- [ ] 3.3.3 `[luna]` "Why did the layout change" explanation surface (from 2.3.2).

---

## M4 — Restricted fields + access view  `[ ]`

### Phase 4.1 — Focused subscenes  `[ ]`
- [ ] 4.1.1 `[terra]` When no family fits, resolve to `focus` subscenes with explicit
      subject/return anchors; traverse linked subscenes.
- [ ] 4.1.2 `[luna]` Text-enlargement (200%) and narrow-field tests: no clipped essential
      text, no shrink-to-fit.

### Phase 4.2 — Equivalent access view  `[ ]`
- [ ] 4.2.1 `[terra]` Linear access view from the same scene: every region, command and
      relation (relations as text descriptions), complete task coverage.
- [ ] 4.2.2 `[luna]` Toggle + automatic offer when spatial view fails; deep-linkable.
- [ ] 4.2.3 `[luna]` Keyboard path + documented semantic reading order; axe checks.

### Phase 4.3 — Visual-system checks  `[ ]`
- [ ] 4.3.1 `[luna]` Token contrast validation (4.5:1 text, 3:1 boundaries) in tests.
- [ ] 4.3.2 `[luna]` 44×44 target audit for all scene controls; forced-colors check that
      relations survive.

---

## M5 — Scenes become the default (v8.0.0)  `[ ]`

### Phase 5.1 — Acceptance as tests  `[ ]`
- [ ] 5.1.1 `[claude]` Map each `ACCEPTANCE.md` gate to a test or an explicit, documented
      manual check.
- [ ] 5.1.2 `[luna]` Implement the automatable gates (same-viewport topology change, ≥3
      field geometries, state preservation, access path).

### Phase 5.2 — Migration + compatibility  `[ ]`
- [ ] 5.2.1 `[terra]` Archetype `auto` for new pages resolves to scene where a page
      declares regions; the rail/mosaic shell remains for legacy manifests.
- [ ] 5.2.2 `[luna]` Migrate 3 examples (bridge_ops, kitchen_sink, one template) to scenes;
      keep one legacy example as the compatibility guard.
- [ ] 5.2.3 `[claude]` Verify a TrekBoard-shaped manifest renders unchanged.

### Phase 5.3 — Docs + release  `[ ]`
- [ ] 5.3.1 `[luna]` `docs/scene.md` complete; README + `docs/dsl.md` lead with scenes.
- [ ] 5.3.2 `[luna]` `make docs-index`; version bump in all 3 places.
- [ ] 5.3.3 `[claude]` Full `make ci`, wheel build, tag + GitHub release v8.0.0.

---

## Parked (v7 backlog)

### [-] Cover the SSE bootstrap end to end
The SSE hydration path mirrors the WebSocket one and is exercised only by shared
`ConnectionManager` unit tests, because Starlette's synchronous `TestClient` deadlocks on a
never-terminating stream. It needs a real browser or an async client. Until then, SSE
reconnect behaviour is inference rather than demonstration.

### [-] Decide whether the colour palette should grow back
v7 narrowed the `color=` enum to the 15 tokens the renderer actually resolves, because the
other ~22 validated and rendered untinted. Several are real LCARS palette names and could be
given themed accents instead — that is truth-sampling work against `LCARS_TRUTH/`, not a
code change. Adding tokens back is non-breaking whenever it happens.

### [-] `NumberInput.value` cannot express "unset"
It is a non-nullable float, so an `Optional[float]` model field renders as `0` and submits
`0.0` until touched. Fixing it means `float | None` in the contract, which ripples into the
renderer's stepper and the goldens.

### [-] Interaction patterns, extracted rather than invented
Unchanged in intent from v6, and now with evidence behind it. Chat was deliberately left
out of v7: only one downstream application had built one, and what it actually needed was
reconnect hydration, which shipped. Extract a pattern when two real applications assemble
the same thing twice — that bar was applied and it held.

---

## Standing constraints

- Port 8000 is reserved for the owner's own application. Use 8077/8078.
- `LCARS_TRUTH/` is untracked reference material — never `git clean` it, never bundle it.
- `contract.ts` may be narrower than the generated schema, never wider. When the guard
  fires, run `make contracts-update` and narrow `contract.ts`; never widen the generated side.
- LCARS has no dropdown, no OS spinner, no default checkbox. New controls render as LCARS
  geometry. See [`docs/lcars_language.md`](docs/lcars_language.md).
- `make ci` must stay completable in one run.
- A thing that silently does nothing is worse than a thing that fails loudly. v7 removed
  four such cases; do not add a fifth.
