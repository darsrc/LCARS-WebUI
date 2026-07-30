# LCARS WebUI v4.4.1

This patch release turns adaptive layout and interaction into a coherent
screen-filling system, then adds browser-native utility surfaces without
weakening the LCARS visual contract.

## Highlights

- Screen-filling adaptive mosaics with aligned shell/panel geometry, responsive
  portrait/landscape recomposition, content-sizing opt-out, and correctly
  minimized collapsed panels.
- Arrange mode with movable persistent spaces, insert-by-default drops, explicit
  swapping, named sections, and pointer/keyboard/tool-bar resizing for panels
  and spaces.
- Controlled server tables automatically use a two-state ascending/descending
  sort cycle; explicit client policies remain available.
- Clearer node-canvas ports, directional wires, FIT behavior, viewport restore,
  and group movement that carries members and internal reroutes.
- Typed drag/drop file uploads with bounded authenticated multipart handling,
  request-scoped Python bytes, metadata-only broadcasts, and no implicit disk
  persistence.
- Movable/resizable modal or modeless pop-up windows and a movable, dockable,
  severity-aware notification center.
- A removable default Options page for local theme, motion, sound, uppercase,
  and body-type preferences (`settings_page=False` opts out).

## Verification

- Backend: 339 passed, 5 optional-dependency/golden-mode skips.
- Frontend: 299 passed; coverage threshold passed.
- Contract drift: 7 passed plus generated TypeScript/Ajv check.
- Ruff and strict mypy passed.
- Frontend production build, smoke test, and strict security audit passed.

See [the gated implementation plan](layout-interaction-milestone.md) for the
milestone, phase, and entry/exit criteria behind this release.
