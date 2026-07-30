# Adaptive Layout and Interaction Milestone

This plan covers the layout, Arrange mode, node editor, controlled-table, upload,
floating-surface, and local-options work delivered together. Reference screenshots
are measurement inputs only; every shipped surface remains code-rendered LCARS
geometry.

## Milestone 1 — Adaptive composition and direct manipulation

**Entry gate**

- The reported landscape, portrait, collapsed-panel, and Arrange mode cases are
  reproducible.
- Existing manifest, frontend, and backend suites establish a clean behavioral
  baseline.
- Changes can be made without raster, backdrop, or screenshot-backed rendering.

### Phase 1.1 — Geometry, spacing, and fill

**Entry gate:** viewport profiles and the top-level panel model are measurable in
pure layout tests.

1. Align shell elbows, seams, rail blocks, panel headings, and footer segments to
   shared geometry.
2. Make `fill` the page default while retaining a `content` escape hatch.
3. Reallocate free rows to expanded panels and keep collapsed panels at title-band
   height.
4. Preserve deterministic portrait/landscape recomposition.

**Exit gate:** mosaic invariants cover non-overlap, full bounds, deterministic
packing, complete fill, and collapsed-panel demand; representative screenshots
show no detached seams or unexplained gaps.

### Phase 1.2 — Arrange mode movement and size

**Entry gate:** Phase 1.1 exits with stable cell coordinates and viewport profiles.

1. Treat inserted rows, columns, and sections as persistent, selectable spacers.
2. Make ordinary drops insert; expose swapping as an explicit one-shot operation.
3. Move panels and spacers with the same edge-aware rules.
4. Resize selected panels or spacers by pointer, keyboard, or toolbar.
5. Persist order and spans by page and viewport profile; retain Reset.

**Exit gate:** unit and browser gesture tests prove insertion, explicit swap,
spacer relocation, two-axis resizing, persistence, and reset.

### Phase 1.3 — Data and graph interaction parity

**Entry gate:** the layout no longer masks or clips interactive content.

1. Give controlled server tables an automatic two-state sort cycle.
2. Preserve explicit client two-state/three-state selection and programmatic clear.
3. Move node-group members and internal reroutes with their frame.
4. Restore graph viewport state and make ports, wires, arrow direction, and FIT
   visibly followable.

**Exit gate:** table tests never emit an empty third-click server sort; graph tests
cover grouped motion, reroutes, viewport restore, and FIT.

**Milestone exit gate**

- All three phase exits pass together.
- The packaged frontend contains the same source state as the validated frontend.
- Portrait-to-landscape recomposition remains automatic.

## Milestone 2 — Browser-native utility surfaces

**Entry gate**

- Overlay widgets can be excluded from the mosaic without weakening manifest
  validation.
- Upload actions can use the existing authenticated action-dispatch path.

### Phase 2.1 — Secure file transfer

**Entry gate:** multipart support, write-scope authorization, and action handlers
are available.

1. Add a typed drag/drop `file_upload` widget with accept, count, and byte guards.
2. Add a bounded `/lcars/upload/files` endpoint.
3. Deliver request-scoped bytes to Python while publishing metadata only.
4. Sanitize filenames and never persist uploads implicitly.

**Exit gate:** tests cover accepted files, validation failures, total server limits,
metadata-only broadcasts, byte delivery, and filename sanitization.

### Phase 2.2 — Pop-ups, notifications, and Options

**Entry gate:** Phase 2.1 establishes a reusable transport/status pattern.

1. Add movable/resizable modal or modeless pop-up windows outside the mosaic.
2. Add titled, timed, severity-aware notifications in a movable stack.
3. Clamp and persist floating geometry; support pointer and keyboard movement.
4. Add a default local Options page for theme, motion, sound, case, and body type.
5. Allow applications to remove that page with `settings_page=False`.

**Exit gate:** component and geometry tests cover move, resize, dismiss, focus,
preference persistence/reset, and opt-out manifest generation.

**Milestone exit gate**

- Generated JSON Schema and TypeScript contracts accept all new widgets.
- The kitchen sink exercises uploads, pop-ups, notifications, and the Options page.
- Authentication and payload limits remain enforced.

## Milestone 3 — Release

**Entry gate**

- Milestones 1 and 2 have exited.
- Documentation and deterministic contract artifacts are current.

### Phase 3.1 — Verification and publication

1. Run Ruff, mypy, backend tests, contract checks, frontend typecheck/tests/build,
   smoke test, security audit, and relevant browser tests.
2. Rebuild the packaged static frontend from the exact validated sources.
3. Bump the patch version consistently.
4. Commit, push, tag, and publish release notes.

**Exit gate:** the remote patch tag and GitHub release resolve to the pushed commit,
with validation results recorded in the release handoff.

**Milestone exit gate**

- No required work remains unpublished.
- The release is reproducible from the tagged source without reference-image
  rendering.
