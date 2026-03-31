# CURRENT_STATE

## Beta 1.0 Release

**Active Release: Beta 1.0**

This document describes the state of the LCARS-WebUI codebase after the Beta 1.0 cleanup.

## Active Architecture

- **Product Renderer**: `legacy_strict` (only renderer in product)
- **Visual Language**: `strict` only (removed `classic` from product)
- **Themes**: `galaxy` (default), `tng`, `nemesis`
- **Min Console Width**: 900px

## Beta 1.0 Changes

### Removed from Product
- `joern_strict` renderer (deprecated, removed)
- Oracle/acceptance infrastructure (archived)
- `classic` visual language
- Frontend oracle test files (guardrails)
- Legacy scene components
- Joern-specific components

### Layout Fixes
- Fixed strict-mode shell height containment (`height: 100dvh`, `grid-template-rows`)
- Fixed nav label visibility (font-size: 0.72rem, font-weight: 700)
- Set min console width (900px)
- Fixed radio_toggle overflow (flex-wrap)

## Supported Widget Set (24 widgets)

| Category | Count | Widgets |
|----------|-------|---------|
| Input | 8 | button, toggle, checkbox, radio_toggle, select, text_input, number_input, form |
| Display | 9 | text, alert, status_tile, progress, gauge, table, line_chart, sparkline, markdown |
| Streaming | 1 | log_viewer |
| Container | 4 | lcars_box, lcars_sweep, lcars_bracket, lcars_header |
| Media | 2 | video_hls, mic_button |

## Known Limitations

- No drag-and-drop support
- No widget-to-widget binding
- No internationalization (i18n)

## Demo

Run the Beta 1.0 showcase:
```bash
cd lcars-ui && PYTHONPATH=src python examples/beta1_showcase.py
```

Run the dashboard demo:
```bash
cd lcars-ui && PYTHONPATH=src python examples/dashboard.py
```

## Version

- Package version: `1.0.0b1` (PEP 440 beta format)
- Manifest version: `1.0`