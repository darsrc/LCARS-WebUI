# LCARS Visual Language

Phase 12 introduces a visual language switch in `lcars.config(...)`.

## Modes

- `visual_language="strict"` (default): authentic LCARS frame language.
- `visual_language="classic"`: preserves pre-Phase-12 dashboard-card chrome.

Example:

```python
lcars.config("Bridge Ops", visual_language="strict")
```

## Strict Mode Rules

Strict mode applies these rules across shell, containers, and widgets:

- Opaque LCARS structural elements (no translucent frame chrome)
- Seamless shell joins (elbows + rails + bars connect without visible gaps)
- Sidebar navigation rendered as LCARS bars, not card wrappers
- Widget labels rendered as colored LCARS bars/pills
- Content surfaces treated as black-void space bounded by structural frame

## Classic Mode Rules

Classic mode keeps the prior card-driven styling and spacing. Use this mode when migrating an existing app that depends on earlier visuals.

## Auto-Wrapping in Strict Mode

In strict mode, bare widget groups are normalized into generated `lcars_bracket` wrappers so pages remain structurally LCARS even if authors do not explicitly wrap every group.

Classic mode does not auto-wrap.

## Guidance for Custom Widgets

If you add custom frontend widgets, align with strict mode by following these principles:

- Use a label bar treatment (`widget-label`) for widget headers.
- Avoid card borders/gradients/shadows on structural UI.
- Prefer black content backgrounds and solid LCARS accents.
- Keep spacing on LCARS unit rhythm (`--lcars-unit`).
