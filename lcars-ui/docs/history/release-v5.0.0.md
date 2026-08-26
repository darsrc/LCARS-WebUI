# LCARS UI 5.0.0 — Graph authoring and exact composition

LCARS UI 5.0.0 adds a general, contract-first proposal workspace for high-density graph
authoring and an opt-in authored composition grammar for exact code-rendered screens.

## Graph workspace

- Versioned `GraphWorkspaceDocument`, command, response, and ingestion-receipt contracts.
- Immutable canonical and visually distinct proposal planes rendered together.
- Proposal-only draft record and graph create/edit/delete operations.
- Caller-defined scalar/reference fields and structured typed-tree editors.
- Caller-defined code-rendered port, part, and slot geometries; incompatible tree parts
  remain visibly unavailable before selection.
- Proposal-scoped transactional undo/redo and delayed browser-local autosave.
- Collapse/expand restoration, directed N-hop focus, facet filters, matched-field search,
  step selection restoration, breadcrumbs, and back/forward reader history.
- Virtual record/diff surfaces and exact, paged edge-fan handling for dense parallel edges.
- Structural proposal diff, preflight, complete export, versioned submission handoff, and
  receipt rendering that requires a fresh canonical read.

The package exports the workspace contract models directly from `lcars_ui`. Run
`python examples/graph_workspace/app.py` for the generic example.

## Interaction metric

The reusable authoring harness counts one intentional committed proposal command or one
committed field/group edit as one interaction. Compound commands count once, and an
accepted semantic suggestion counts as a committed semantic choice. Keystrokes, pointer
movement, individual DOM/React/React Flow/transport events, intermediate edits, reader
operations, and passive previews count zero.

Application-specific acceptance walkthroughs remain downstream. The library provides
the counter, policy contract, and generic harness; it cannot know the consuming
application's authoring task.

## Layered live connections

Editable version-2 node canvases no longer create invalid unlayered edges. A completed
drag validates the ports, then opens an explicit chooser populated from the document's
declared layers. The edge is committed only after a layer is selected.

## Authored composition

The new `layout="authored"` page archetype and `composition()` context preserve explicit
CSS Grid topology. `stage.area()` uses one-based tracks, spans, alignment, stacking, and
decorative flags; same-layer overlaps are rejected. `px`, `fr`, `auto`, and `minmax`
build validated track values. Pages can keep or suppress standard console chrome, and
narrow screens can scroll, scale, or repack non-decorative content adaptively.

`bar()`, expanded text sizes/alignment, data-tile buttons, and procedural atom glyphs
support exact screens without raster backdrops. The canon-recreation example and capture
harness reject image requests and raster-bearing parity output.

## Boundaries

- Semantic validation is caller/server supplied. LCARS does not encode an application's
  domain types, field names, edge meanings, or validation model.
- Workspace transports are represented and tested through versioned contracts and mocked
  server interactions here; end-to-end service proof belongs to the consuming project.
- The release is a major version because the public authoring and composition surface is
  substantial. Existing dashboard and node-canvas APIs remain supported; no intentional
  breaking migration is required for ordinary 4.5 applications.

## Validation and assets

Generated JSON Schema, TypeScript contracts, standalone validators, bundled frontend
assets, README screenshots, Wiki screenshots, and image-free canon recreations are
regenerated from the 5.0.0 source. Use `make ci`, `make docs-screenshots`, and
`make canon-screenshots` to reproduce them.
