# DESIGN — current architecture

LCARS WebUI is a contract-first, server-driven UI system. Python application code
declares semantic LCARS instruments; the browser renders those declarations as
code-native geometry. The framework does not accept screenshot-backed parity shortcuts.

## Authorities

- `../LCARS_PORTING_SPEC.md` defines the LCARS composition and porting rules.
- `../STRICT_LCARS_VISUAL_SPEC.md` defines screenshot-level visual requirements.
- `docs/lcars_language.md` records the control, typography, and geometry language the
  current renderer implements.
- `docs/dsl.md` and `docs/surface.md` document the public layout systems.
- `../LCARS_TRUTH/` is for offline measurement and validation only.

Those sources govern visual decisions. This file explains how the implementation keeps
the application API, wire contract, and renderer aligned.

## Application boundary

`App` is the sole application lifecycle owner. `@app.page(...)` functions declare a
manifest; `@app.action(...)` handlers react to exact widget ids; `@app.live(...)` jobs
publish periodic effects; services and session state are app-owned. Page declaration is
not rerun after browser input.

The public declaration vocabulary is deliberately split:

- `lcars_ui.ui` contains 33 ordinary application names.
- `lcars_ui.advanced` contains 27 specialist composition, Surface Engine, graph,
  workspace, and media names.

Package-root exports are lifecycle classes, effect functions, option/state models, and
typed payload models—not a flat widget namespace.

Keyboard commands cross the application boundary through typed manifest metadata.
`App.bind_key()` routes application shortcuts through the same explicit action registry
as widgets; framework commands use stable ids and scopes. The renderer resolves those
defaults with browser-local Options overrides instead of maintaining component-local
shortcut maps.

## Three layout regimes

1. **Adaptive mosaic.** `auto`, `console`, `telemetry`, `grid`, and `menu` page
   archetypes classify semantic panels and pack them into a responsive LCARS deck.
   `zone`, `span`, `weight`, `aspect`, `group`, and `sizing` are hints to that grammar.
2. **Authored composition.** An `authored` page may contain one top-level
   `advanced.composition()` plus allowed overlays. Explicit grid tracks and areas retain
   topology when spatial relationships are part of the information.
3. **Surface Engine.** `advanced.surface()` combines code-rendered geometry with
   positioned content regions for arcs, rings, paths, polar layouts, constraints,
   transforms, and other topology a rectangular grid cannot express.

These regimes share one manifest and one widget renderer. Exact layouts do not bypass
the contract or introduce application-specific React/CSS backdrops.

## Contract and transport

Pydantic models in `src/lcars_ui/core/` are the source for the manifest schema. The
golden fixtures, generated TypeScript declarations, and standalone browser validators
must agree with them. Contract drift is checked by `make contracts-check`.

FastAPI serves the manifest, schema, bundled frontend, optional read-only application
assets, actions, forms, uploads, WebSocket transport, and SSE/HTTP fallbacks. Each
browser tab has a server-issued session; the projection layer merges shared state with
session-private effects and hydrates current state after reconnect.

`ScrollOptions` is a capability mixin, not a universal base. It is structurally included
only in concrete text, Markdown, table, log, and chart-family option models.

## Implementation boundaries

- `application.py` owns lifecycles and effect contexts.
- `dsl/` builds and normalizes declarations; public authors enter through `ui` and
  `advanced`.
- `core/` owns schema-bearing models.
- `server/` owns sessions, projection, transport, and security.
- `frontend/src/compose/` owns adaptive packing; `frontend/src/lcars/` owns the shell;
  `frontend/src/widgets/` renders contract widget types.
- Example applications must use public Python declarations. A new example is not a
  reason to add bespoke frontend geometry.

Reference screenshots and repository assets may be inspected for measurement. They may
not be rendered, transformed into backdrops, embedded as data, or loaded through image,
canvas, CSS image, or mask paths in parity UI.
