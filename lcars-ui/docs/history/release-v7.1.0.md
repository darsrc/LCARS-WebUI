# v7.1.0 — every widget answers the same questions

_Released 2026-08-30. Additive._

v7.1.0 closes the widget-capability project, gives every scrollable widget a typed
height route, and adds managed keyboard bindings to the renderer-owned Options page. It
is a minor release: the v7.0.0 manifest remains valid against the v7.1.0 schema, and no
existing field was removed, retyped, moved, or redefined.

## Why a capability catalogue exists

The catalogue is an explicit mapping from every member of the discriminated widget
union to the cross-cutting behavior it claims: accent, scrolling, copying, feedback,
and busy state. Python tests derive the widget list from the union and reject missing
or extra classifications. The frontend then renders the generated fixture for every
declared member and asks the same observable question of each one. The expected-
failure ledger is empty, so a capability may not quietly regress behind a waiver.

That uniform question found twenty-three gaps:

- nine widgets accepted `color=` and silently ignored it;
- six widgets could render unbounded content but had no height policy;
- three widgets copied content without announcing success or failure; and
- `select`, `lcars_radio`, and `lcars_radio_toggle` could never render feedback at
  all, because the lookup found their choice array before their settings object.

None of those defects was found by looking for that specific defect. They surfaced
because every widget was asked the same question. The catalogue keeps that method in
the suite: adding a widget now requires an explicit capability classification, and
claiming a capability requires conformance.

## What changed

The shared frontend primitives from the first three capability steps now have a typed
contract behind them:

- `ScrollOptions` adds optional `max_height`, `overflow`, and `auto_scroll` fields
  only to text, Markdown, table, log, and chart-family options. It is deliberately
  absent from `BaseOptions`, so buttons, toggles, microphone controls, and other
  non-scrolling widgets do not acquire meaningless fields.
- The six shared `ScrollBox` sites read `widget.options?.max_height` directly. Both
  log renderers retain the 520px default; tables, line/financial charts, and
  sparklines remain uncapped when no value is supplied.
- Text can use a bounded scroll region without changing its older `max_lines` clamp.
  Markdown keeps its existing `max_height` constraint and behavior.
- `LogViewer.auto_scroll` remains on the widget body and remains the live follow
  control. The same optional name exists in the mixin for a consistent scroll-option
  shape; it does not move or override the established log field.
- The deliberate name collisions remain: text `wrap` is a literal while log `wrap`
  is a boolean; text `max_lines` is a visual clamp while log `max_lines` limits the
  client ring buffer. Resolving either requires a future major version.

## Keyboard bindings and Options

Applications can declare a portable chord with `app.bind_key(...)` and dispatch it
through the same explicit action path as a widget. `mod` resolves to Command on macOS
and Control elsewhere; exact Control, Meta, Alt, and Shift modifiers are also supported.
Bindings ignore editable controls by default and app-level chord collisions are rejected
instead of leaving dispatch order to chance.

The existing graph copy, paste, duplicate, group, undo, and redo shortcuts now use the
same typed registry rather than a component-local key map. The framework also declares
`mod+,` for opening Options when that page is enabled. Application definitions can
replace a framework binding by stable id or disable it with a null chord.

The default Options page was reorganized into Appearance, Behavior, and Keyboard
sections. Browser-local shortcut overrides persist per application. Each binding can be
recorded, disabled, or reset independently, and assigning an occupied chord moves it
from the old command. Enter/Space activation, modal focus containment, and other
accessibility semantics remain fixed rather than becoming remappable shortcuts.

Direct application scripts now accept `--port` and `--ip` (`--host` is an alias)
when `app.serve()` is called from the `__main__` guard. Command-line values override
the address defaults written in the script, while imported and programmatic calls
remain isolated from the process command line. Existing `LCARS_HOST`/`LCARS_PORT`
forwarding continues to work, with explicit command-line values taking precedence.

## Additive proof

`fixtures/golden/manifest.v7.0.0.json` is byte-identical to the manifest committed at
the `v7.0.0` tag. A contract test validates that frozen payload against the current
schema. The schema diff adds optional scroll fields to the seven intended concrete
option definitions and an optional typed key-binding list to manifest metadata; the
frozen manifest validates without modification.

Generated JSON Schema, TypeScript declarations, the standalone manifest validator,
and the widget catalogue are regenerated together. The checked-in handwritten
TypeScript contract remains no wider than the generated schema.

Adding a non-empty string constraint to `KeyBinding.label` caused AJV to include its
Unicode-length runtime helper for the first time and exposed a CommonJS default-interop
difference in the minified bundle. The contract generator now unwraps AJV helpers
consistently in dev and production, covered by generated-validator and real-browser
checks.

## Release evidence

The package, FastAPI app, frontend package and lockfile all report 7.1.0. Contracts,
standalone validators, the frontend bundle, documentation indexes, wiki, and codebase
map were regenerated from the release source.

- `make ci`: exit 0; 15 strict contract tests, 653 backend tests passed with 7 skipped,
  92.71% backend coverage, 547 frontend tests, and both dependency audits passed.
- Chromium Playwright: 10 passed, 8 skipped.
- Local Markdown reference audit: every repository-local link and image resolves.
- Installed-wheel smoke: version metadata, bundled static assets, default key bindings,
  and `lcars check examples/bridge_ops/app.py` all passed.

Release wheel: `lcars_ui-7.1.0-py3-none-any.whl`

SHA-256: `7e3432614ba74985429c3dbdc35ab59eef8492b832c74d25a550746f4b6fdb64`
