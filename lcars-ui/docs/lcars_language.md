# LCARS Visual Language

Phase 13 makes LCARS a composition grammar in strict mode, not only a style layer.

## Modes

- `visual_language="strict"` (default): LCARS-first structural lowering + LCARS-native controls.
- `visual_language="classic"`: pre-Phase-13/legacy dashboard rendering path.

```python
lcars.config("Bridge Ops", visual_language="strict")
```

## Strict Mode Architecture (Phase 13)

Strict mode now has two layers:

1. Backend layout compiler (`normalize_manifest_for_strict`)
- Injects a page-title `lcars_sweep` for titled pages.
- Smart auto-panels bare widget groups into LCARS containers.
- Respects `lcars.raw()` escape hatches.

2. Frontend strict renderers
- `WidgetRenderer` routes strict-mode widgets to dedicated `Lcars*Control` components.
- Controls render as LCARS geometry (bars/segments/rails) instead of native browser control visuals.

## Smart Auto-Paneling Rules

- Input groups -> `lcars_box` with widgets in `right_inputs`
- Data groups -> `lcars_box` with widgets in `children`
- Mixed groups -> `lcars_bracket` (`orientation="both"`)
- Single widgets -> `lcars_bracket` (`orientation="left"`)
- Structural containers (`lcars_box`, `lcars_sweep`, `lcars_bracket`, `lcars_header`) pass through unchanged

## Geometry Token System

Core strict geometry is driven by tokenized CSS variables and mirrored TS constants:

- `styles/lcars/geometry.css`
- `theme/geometryTokens.ts`

This covers bar heights, rail widths, elbow arm geometry, shell widths, segment gaps, spacing rhythm, and control dimensions. Strict shell/containers/widgets consume tokens instead of hardcoded dimensions.

## Strict Control Language

Strict-mode controls include:

- `LcarsButtonControl`
- `LcarsToggleControl`
- `LcarsSelectControl`
- `LcarsRadioControl`
- `LcarsTextInputControl`
- `LcarsTableControl`
- `LcarsMetricControl`
- `LcarsGaugeControl`
- `LcarsProgressControl`

## Classic Mode

Classic mode remains unchanged and bypasses strict structural lowering/strict control branches.

## Guidance for Custom Widgets

- Treat containers as structural frame and keep inner content dark/flat.
- Prefer LCARS bars/segments over card borders.
- Use geometry tokens (`--lcars-*`) instead of hardcoded px values.
- Keep strict/classic behavior behind `useIsStrictMode()`.
