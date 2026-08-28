# LCARS Visual Language

LCARS is a composition grammar here, not only a style layer. This document describes what the
renderer actually does today.

## Defaults

| Setting | Default | Notes |
|---------|---------|-------|
| `visual_language` | `"strict"` | The only value. Classic mode was removed. |
| `theme` | `"galaxy"` | Classic TNG/DS9 orange + blue |
| `force_uppercase` | `True` | LCARS typography |
| `label_uppercase` | `True` | LCARS labels |
| `lcars_font_headers` | `True` | LCARS headers |
| `lcars_font_labels` | `True` | LCARS labels |
| `lcars_font_text` | `False` | System text for readability |

### Canonical viewport
- **Primary**: 1920x1080 (desktop)
- **Design target**: strict LCARS composition optimised for desktop
- **Responsive**: sidebar collapses, shell adapts (not mobile-first)

`visual_language` is typed `Literal["strict"]` (`dsl/_state.py`, `core/models.py`). There is no
`"classic"` value; passing one is a type error.

## Backend layout compiler

`normalize_manifest_for_strict` (`dsl/_normalize.py`, called from `dsl/_builder.py`) runs on every
build:

- Injects a page-title `lcars_sweep` for titled pages.
- Auto-panels bare widget groups into LCARS containers.
- Respects `advanced.raw()` escape hatches.

### Auto-paneling rules

- Input groups -> `lcars_box` with widgets in `right_inputs`
- Data groups -> `lcars_box` with widgets in `children`
- Mixed groups -> `lcars_bracket` (`orientation="both"`)
- Single widgets -> `lcars_bracket` (`orientation="left"`)
- Structural containers (`lcars_box`, `lcars_sweep`, `lcars_bracket`, `lcars_header`) pass through
  unchanged

## The control language

LCARS has **no dropdown**. Okuda's design language contains no control that opens a floating,
OS-rendered menu, and a native `<select>` popup cannot be themed on any platform. The same is true
of OS spinner arrows and default checkboxes. Every control in a product surface therefore renders
as LCARS geometry.

| Widget | Renders as |
|---|---|
| `button` | `.lcars-btn`, or `.lcars-data-tile` via `presentation="data_tile"` |
| `toggle` / `lcars_checkbox` | `.lcars-btn` with `data-on` |
| `lcars_radio` / `lcars_radio_toggle` | `.lcars-segments` bank |
| `select` | segment bank or option stack — see below |
| `text_input` | `.lcars-input` (a lit field with an underline) |
| `number_input` | `.lcars-input` plus `.lcars-number-step` increment/decrement caps |
| `table` row selection | `.lcars-check` pip (`role="checkbox"` / `role="radio"`) |
| `table` column filter, page size | `.lcars-segments` bank |
| `video_hls` playback rate | `.lcars-segments` bank |

### Choosing a form for `select`

`ChoiceOptions.presentation` accepts `"auto"` (default), `"segments"` or `"stack"`.

- **`.lcars-segments`** — a horizontal bank where every option is visible and the active one is lit
  amber. Used when there are few options.
- **`.lcars-option-stack`** — a bounded, internally scrolling column of caps-terminated bars, each
  showing a label and optional description. Used when a bank would be unreadable.

`"auto"` switches on `AUTO_SEGMENT_OPTION_LIMIT` (8) in `widgets/WidgetRenderer.tsx`. Both forms
support `searchable`, `multiple`, `placeholder`, and per-option `description` and `group`.

Because button-based controls are not form elements, each one emits a hidden `<input>` carrying
`name={widget.id}` so `collectFormPayload` still sees it. Multi-select emits one hidden input per
selected value, which is what the `FormData.getAll` path requires.

### Still native

The node-graph and workspace authoring surfaces (`nodecanvas/`, `workspace/`) still use native
controls. They are developer tooling rather than product chrome, and are deliberately out of scope.

## Guidance for custom widgets

- Treat containers as structural frame and keep inner content dark and flat.
- Prefer LCARS bars and segments over card borders. A translucent panel with a coloured left border
  is a modern-dashboard tell, not LCARS.
- On-black text is amber (`--ink-label` / `--ink-value`), never ice-blue.
- Reuse the existing control classes (`.lcars-segment`, `.lcars-option-stack`, `.lcars-check`)
  rather than redefining them, and use existing custom properties instead of hardcoded hex values.
