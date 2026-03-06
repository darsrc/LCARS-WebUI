# LCARS WebUI — Phase 13 Implementation Plan (LCARS-Native Architecture)

**Status:** Planning
**Depends on:** Phases 0–12 complete (backend, DSL, frontend renderer, containers, strict visual language)
**Target release:** v0.4.0-alpha

---

## Goal

Phase 13 transforms LCARS-WebUI from a manifest-driven dashboard framework with LCARS styling into a system where LCARS is the composition language itself. The end-state is a Python analogue of `leonawicz/lcars`: LCARS-native functions, structurally LCARS controls, canonical geometry, and layouts that naturally resemble consoles, PADDs, and diagnostic surfaces — not generic dashboards with accent colors.

Planning note: file-level implementation targets in this document are directional and must be re-validated against the current repository state when each workstream starts. This plan intentionally avoids treating line-level references as authoritative.

---

## Why Phase 12 Was Not Enough

Phase 12 delivered significant visual improvements: corrected elbow geometry, seamless shell joins, opaque structural elements, strict/classic mode switching, and auto-wrapping bare widgets into brackets. The shell frame now looks like LCARS. But the content inside the frame does not.

The diagnosis is straightforward: Phase 12 was a **visual-language pass** — it changed how things look. Phase 13 is an **architectural pass** — it changes what things are.

### What Phase 12 achieved

- Elbows are solid L-brackets (see `LcarsElbow.tsx`, SVG path with configurable arm dimensions).
- Shell frame is seamless (see strict-mode rules in `shell.css` that remove gaps/borders/transparency).
- Widget chrome uses label-bar treatment instead of card borders (see strict-mode overrides in `widgets-core.css`).
- Bare widget groups auto-wrap into `lcars_bracket` containers (see `normalize_manifest_for_strict()` in `_normalize.py`).
- `visual_language` field in manifest enables strict/classic switching (see `Meta` model in `models.py`).

### What Phase 12 did not achieve

1. **The primary authoring model is still `row()`/`col()`.** The DSL's layout primitives in `api.py` (`row()`, `col()`, `columns()`) are generic CSS grid wrappers. LCARS containers (`box()`, `sweep()`, `bracket()`) exist but are opt-in additions. The reference app (`bridge_ops/app.py`) does not use a single LCARS container — it uses `page()` + bare widgets. This means the default output of a typical LCARS-WebUI app is a generic dashboard, not an LCARS console.

2. **Widgets are generic HTML controls with LCARS accent colors.** In `WidgetRenderer.tsx`, a button renders as a `<button>` with pill border-radius and accent background. A select renders as a native `<select>` with dark styling. A table renders as a standard `<table>` with LCARS-colored headers. A toggle renders as a standard track-and-thumb switch. None of these are structurally LCARS — they are browser-native controls themed to not clash with the frame.

3. **The auto-wrap normalizer is a band-aid.** `normalize_manifest_for_strict()` in `_normalize.py` wraps bare widgets in `lcars_bracket` containers. This prevents widgets from floating on black void without any LCARS framing, but the brackets themselves are just vertical rails flanking content — they don't make the widgets inside look more LCARS. A metric tile inside a bracket is still a generic readout.

4. **Geometry is ad-hoc.** Bar heights are hardcoded at `30px` across `primitives.css`. Elbow arm dimensions are passed as inline props in `LcarsFrame.tsx`. Container gap widths vary between `2px`, `4px`, and `0.45rem` depending on context. There is no unified geometry system that ensures consistent proportions across shell, containers, and widgets.

5. **No visual regression enforcement.** There are no screenshot-based tests. The only verification that strict mode "looks LCARS" is manual inspection. CSS changes can silently break the visual contract.

---

## Current Architectural Gaps

### Gap 1: Theme-first instead of grammar-first

The codebase treats LCARS as a theme applied to a generic dashboard framework. The manifest schema (see `Page`, `Row`, `Column` in `models.py`) defines `Page > Row > Column > Widget` — a hierarchy borrowed from dashboard/grid systems. LCARS containers (`LcarsBox`, `LcarsSweep`, `LcarsBracket`) are widget types that happen to contain other widgets, but they sit inside the generic grid rather than replacing it.

In an LCARS-native system, the primary layout units should be LCARS containers. A page is not "rows and columns containing widgets" — it is "a sweep containing a box containing readouts and an input column." The grid is internal scaffolding, not the authoring surface.

### Gap 2: Row/col/dashboard-first composition

The `_ManifestBuilder` (in `_builder.py`) manages a stack of pages, rows, and columns. LCARS containers are pushed via `container_context()`, which redirects `add_widget()` into a container's `children` list. But the builder's primary flow — `_ensure_default_page()`, auto-row/auto-col creation — is grid-oriented. There is no concept of "the default layout structure for a page is an LCARS sweep" or "widgets placed at the top level of a page should go into an LCARS panel."

### Gap 3: Generic HTML control rendering under LCARS chrome

Every input widget in `WidgetRenderer.tsx` renders a native HTML control:

- `<button>` for Button
- `<input type="checkbox">` for Toggle/Checkbox
- `<select>` for Select
- `<input type="text">` for TextInput
- `<input type="number">` for NumberInput
- `<input type="radio">` for Radio

These are styled with CSS to approximate LCARS colors, but they do not have LCARS geometry. An LCARS button is a solid colored bar with rounded ends and dark text — not a pill-shaped `<button>` element. An LCARS toggle is a pair of colored bars (on/off states), not a track-and-thumb switch. An LCARS select is a set of stacked colored bars or a cycling button, not a `<select>` dropdown.

### Gap 4: Insufficient visual regression enforcement

The test suite covers manifest schema validity (`test_manifest_schema.py`), DSL behavior (`test_phase11_dsl.py`, `test_phase12_visual_language.py`), and widget model serialization (`test_widgets.py`). There are no tests that verify what the rendered output looks like. A CSS regression that breaks the seamless shell join or changes button geometry would pass all existing tests.

---

## Phase 13 Design Principles

**The central commitment of Phase 13:**

> Phase 13 does not aim to improve the appearance of generic layouts.
> Phase 13 makes generic layouts no longer the default mental model in strict mode.

If at the end of Phase 13 a developer can still write `row()` / `col()` / bare widgets and get something that looks "fine," but has to opt in to LCARS containers for it to look "LCARS" — the phase has failed. The default path through the DSL in strict mode must produce structurally LCARS output without the author reaching for containers manually. This is the difference between a renderer pass and an architecture pass.

1. **LCARS is the composition language, not just a theme.** In strict mode, the primary layout primitives are LCARS containers. Authors compose with `lcars.box()`, `lcars.sweep()`, `lcars.panel()`, and `lcars.input_column()` — not `lcars.row()` and `lcars.col()`.

2. **Controls are structurally LCARS.** Buttons, toggles, selects, and other inputs render as LCARS-native shapes (bars, pills, segmented controls) rather than styled HTML form elements. The HTML `<input>` and `<button>` elements remain for accessibility, but they are visually replaced by LCARS geometry.

3. **Geometry is canonical and enforced.** A single geometry token system defines bar heights, rail widths, elbow proportions, segment gaps, and spacing rhythm. All components consume these tokens. Changing a token changes the entire system proportionally.

4. **The default output is unmistakably LCARS.** A developer who writes `lcars.config("My App")` and adds widgets without explicit containers should get output that reads as an LCARS interface, not a dashboard.

5. **The manifest contract is preserved.** All changes flow through the existing manifest schema and WebSocket protocol. New layout concepts are expressed as new or evolved widget types in the manifest, not as frontend-only rendering heuristics.

6. **Classic mode remains unchanged.** All Phase 13 changes are scoped to strict mode. `visual_language="classic"` preserves the current Phase 12 behavior.

7. **Strict mode has structural composition rules, not only visual rules.** In strict mode, top-level `row()` / `col()` composition is lowered through the LCARS layout compiler into LCARS-native page structure, whether authored manually or generated by recipes. Frontend control styling alone does not satisfy this requirement.

---

## Workstream 13A — LCARS Grammar / Compiler

### Problem

The manifest builder (`_builder.py`) produces a `Page > Row > Column > Widget` tree. In strict mode, bare widgets get auto-wrapped in brackets, but the underlying structure is still a flat grid. There is no concept of LCARS-native page structure.

### Design

Introduce a strict-mode **layout compiler** that transforms the raw widget tree into an LCARS-native structure. This replaces the simple `normalize_manifest_for_strict()` pass with a richer transformation.

#### 13A1 — Page-level LCARS structure

In strict mode, each page gets a default LCARS frame structure if the author does not provide one explicitly:

```
[page-title sweep]
  [content area]
    [auto-paneled widget groups]
```

The page title renders as an `lcars_sweep` (elbow + bar + title text) at the top of the page, replacing the current `<h2>` treatment. Widget groups below it are auto-paneled into `lcars_box` containers (not just brackets) with sensible defaults.

#### 13A2 — Smart auto-paneling

Replace the current bracket-only auto-wrap in `_normalize.py` with a smarter paneling algorithm:

- **Input groups** (consecutive buttons, toggles, selects, text inputs) → wrap in an `lcars_box` with the inputs placed in the box's side input column, not the content area.
- **Data groups** (consecutive metrics, tables, charts, gauges) → wrap in an `lcars_box` with a generated title derived from the first widget's label.
- **Mixed groups** → wrap in an `lcars_bracket` (current behavior).
- **Single widgets** → wrap in a minimal `lcars_bracket` with `orientation="left"`.
- **Already-containerized widgets** (`lcars_box`, `lcars_sweep`, `lcars_bracket`) → pass through unchanged (current behavior).

#### 13A3 — Layout recipes

Add pre-built layout recipes that authors can invoke instead of composing containers manually:

```python
# Console layout: sweep title bar + two-column body (data left, inputs right)
with lcars.console("Bridge Operations"):
    with lcars.data_panel():
        lcars.metric("Shields", "100%")
        lcars.chart(data, title="Stability")
    with lcars.control_panel():
        lcars.button("Red Alert")
        lcars.toggle("Shields")

# PADD layout: single-column sweep with dense readouts
with lcars.padd("Duty Roster"):
    lcars.table(roster_data)

# Diagnostic layout: full-frame box with side input columns
with lcars.diagnostic("Warp Core Analysis", color="blue"):
    lcars.gauge("Output", 87.2)
    lcars.chart(core_data)
```

These are syntactic sugar over `sweep()`, `box()`, `row()`, and `col()` — they emit the same manifest types but with preconfigured geometry that produces canonical LCARS layouts.

### Files

| File | Change |
|---|---|
| `src/lcars_ui/dsl/_normalize.py` | Rewrite: smart auto-paneling algorithm with widget-type-aware grouping |
| `src/lcars_ui/dsl/_builder.py` | Extend: page-level LCARS structure injection in strict mode |
| `src/lcars_ui/dsl/api.py` | Add: `console()`, `padd()`, `diagnostic()`, `data_panel()`, `control_panel()` context managers |
| `src/lcars_ui/dsl/_recipes.py` | New: recipe implementations as builder helpers |
| `src/lcars_ui/__init__.py` | Re-export new DSL functions |

### Backward compatibility

- `row()` and `col()` continue to work. In strict mode, their output is still subject to the layout compiler, so widgets inside them may receive LCARS paneling. Authors who want raw grid control can use `visual_language="classic"`.
- The smart auto-paneling only activates in strict mode. Classic mode is unchanged.
- Existing apps that already use explicit LCARS containers are unaffected — the compiler passes containerized widgets through.

---

## Workstream 13B — Geometry System

### Problem

LCARS has canonical dimensions: bar heights, rail widths, elbow proportions, segment gaps, and spacing rhythm. The current codebase scatters these as magic numbers across CSS files, inline props, and component defaults.

### Design

#### 13B1 — Geometry token layer

Define a single source of truth for LCARS geometry in CSS custom properties and a corresponding TypeScript constants file:

```css
/* styles/lcars/geometry.css */
:root {
  /* Bars and rails */
  --lcars-bar-height: 30px;
  --lcars-bar-height-thin: 16px;
  --lcars-bar-height-thick: 44px;
  --lcars-rail-width: 30px;
  --lcars-rail-width-narrow: 16px;

  /* Elbows */
  --lcars-elbow-size: 120px;         /* default elbow cell size */
  --lcars-elbow-inner-radius: 34px;  /* inner cutout radius */
  --lcars-elbow-arm-h: 34px;         /* horizontal arm thickness */
  --lcars-elbow-arm-v: 34px;         /* vertical arm thickness */

  /* Shell frame */
  --lcars-shell-rail-width: 180px;
  --lcars-header-height: 74px;

  /* Containers */
  --lcars-box-sidebar-width: 150px;
  --lcars-segment-gap: 2px;          /* gap between adjacent colored segments */
  --lcars-frame-gap: 0px;            /* gap in structural frame (0 in strict) */

  /* Spacing rhythm */
  --lcars-unit: 8px;
  --lcars-spacing-xs: calc(var(--lcars-unit) * 0.5);   /* 4px */
  --lcars-spacing-sm: var(--lcars-unit);                /* 8px */
  --lcars-spacing-md: calc(var(--lcars-unit) * 2);      /* 16px */
  --lcars-spacing-lg: calc(var(--lcars-unit) * 3);      /* 24px */

  /* Pill/button geometry */
  --lcars-pill-radius: 15px;
  --lcars-button-min-height: 30px;
  --lcars-button-min-width: 100px;

  /* Typography */
  --lcars-label-font-size: 0.72rem;
  --lcars-readout-font-size: clamp(1.2rem, 2vw, 1.55rem);
}
```

#### 13B2 — Responsive degradation rules

LCARS interfaces were designed for fixed-size screens. On smaller viewports, the geometry system must degrade gracefully:

| Breakpoint | Behavior |
|---|---|
| >= 1200px (console) | Full canonical geometry. Shell sidebar visible. Container sidebars at full width. |
| 768–1199px (workstation) | Reduce `--lcars-shell-rail-width` to 140px. Container sidebars narrow to 100px. Elbow proportions scale. |
| < 768px (PADD) | Shell sidebar collapses to icons or hides. Containers lose side bars; elbows become header-only sweeps. Content stacks vertically. |

These rules are implemented as CSS `@container` or `@media` queries that adjust the geometry tokens. Components do not need breakpoint logic — they consume the tokens.

#### 13B3 — Join behavior specification

Define the rules for how LCARS elements connect:

- **Elbow-to-bar join**: Zero gap. Elbow arm height equals adjacent bar height. Same color. The elbow's horizontal arm IS the bar's continuation.
- **Bar-to-bar join (horizontal)**: `--lcars-segment-gap` (2px black) between adjacent segments of different colors. Zero gap between segments of the same color.
- **Bar-to-bar join (vertical)**: Same rule.
- **Container nesting**: Nested containers use thinner bars (`--lcars-bar-height-thin`) to establish visual hierarchy. The outermost container uses standard thickness.
- **Widget-to-container**: Widgets inside a container have no bar/frame of their own — the container provides the LCARS framing. Widget labels render as inline pills, not as structural bars.

### Files

| File | Change |
|---|---|
| `frontend/src/styles/lcars/geometry.css` | New: all geometry tokens in one file |
| `frontend/src/styles/lcars/shell.css` | Refactor: consume geometry tokens instead of hardcoded values |
| `frontend/src/styles/lcars/containers.css` | Refactor: consume geometry tokens |
| `frontend/src/styles/lcars/widgets-core.css` | Refactor: consume geometry tokens |
| `frontend/src/styles/lcars/primitives.css` | Refactor: consume geometry tokens |
| `frontend/src/styles/lcars/responsive.css` | Refactor: responsive rules adjust tokens, not individual properties |
| `frontend/src/theme/geometryTokens.ts` | New: TypeScript constants mirroring CSS tokens for components that need JS-level dimensions (elbow SVG, gauge SVG) |
| `frontend/src/components/shell/LcarsElbow.tsx` | Refactor: read arm dimensions from geometry tokens instead of inline props |
| `frontend/src/components/shell/LcarsFrame.tsx` | Refactor: remove hardcoded shell elbow shape constants and consume geometry tokens |

---

## Workstream 13C — LCARS-Native Widgets / Controls

### Problem

Every widget renderer in `WidgetRenderer.tsx` uses standard HTML controls. These work but do not look like LCARS. The gap is most visible with:

- **Button**: pill-shaped `<button>` vs. LCARS solid bar with rounded ends
- **Toggle**: track-and-thumb switch vs. LCARS on/off state bar pair
- **Select**: browser `<select>` dropdown vs. LCARS cycling button or stacked bar selector
- **Table**: `<table>` with colored header vs. LCARS data surface with bar headers and rail framing
- **StatusTile / Metric**: card-like readout vs. LCARS readout panel with bar label
- **Gauge**: SVG circle on card vs. LCARS arc readout integrated into frame
- **Progress**: generic progress bar vs. LCARS segmented fill bar

### Design: LCARS-native control components

Create a new set of strict-mode widget renderers that replace the current controls when `visual_language="strict"`. Classic mode continues using the current renderers.

#### 13C1 — LCARS Button (`LcarsButtonControl.tsx`)

- Renders as a `LcarsBar` component with `roundedEnd={true}`, the button label as the bar text, and the accent color as background.
- The native `<button>` element is present but visually hidden (for accessibility and click handling).
- Active/pressed state: bar brightness increases (existing `filter: brightness(1.08)` behavior).
- Disabled state: bar opacity reduces.
- Min-width: `--lcars-button-min-width` (100px). Min-height: `--lcars-button-min-height` (30px).

#### 13C2 — LCARS Toggle (`LcarsToggleControl.tsx`)

- Renders as two adjacent `LcarsBar` segments: one for ON, one for OFF.
- The active state's bar is fully opaque; the inactive state's bar is dimmed (opacity 0.3).
- The hidden `<input type="checkbox">` handles the actual state.
- For checkbox mode (`lcars_checkbox`): renders as a single bar that toggles between the accent color (checked) and dimmed (unchecked).

#### 13C3 — LCARS Select (`LcarsSelectControl.tsx`)

- Renders as a vertical stack of `LcarsBar` segments, one per option.
- The selected option's bar is fully opaque; unselected options are dimmed.
- Clicking an option bar selects it.
- The hidden `<select>` element is present for form/accessibility semantics.
- For small option counts (<=4): show all bars. For larger counts: show the selected bar with left/right arrows to cycle (LCARS cycling button pattern).

#### 13C4 — LCARS Radio/RadioToggle (`LcarsRadioControl.tsx`)

- Radio: vertical stack of bars (same as select).
- RadioToggle: horizontal row of bar segments (already close to correct — refine to use `LcarsBar` shapes with proper pill termination on the first and last segments).

#### 13C5 — LCARS TextInput / NumberInput (`LcarsTextInputControl.tsx`)

- Label renders as a colored bar above the input.
- Input field styled as a dark recessed rectangle with LCARS-colored left rail and monospace text.
- The field border uses `--lcars-segment-gap` width in the accent color.

#### 13C6 — LCARS Table (`LcarsTableControl.tsx`)

- Header row renders as a `LcarsSegmentedBar` with one segment per column header.
- Data rows render on black with thin accent-colored row dividers.
- The table itself sits inside an implicit `lcars_bracket` frame (left rail).
- Optional: column headers can cycle sort order on click (stretch goal, not required).

#### 13C7 — LCARS StatusTile / Metric (`LcarsMetricControl.tsx`)

- Label renders as a colored bar at the top.
- Value renders in large LCARS-font text below the bar.
- Status indicator renders as a small colored bar segment (ok=green bar, warn=yellow bar, crit=red bar) below the value, not a dot.

#### 13C8 — LCARS Gauge (`LcarsGaugeControl.tsx`)

- Replace the circular gauge with an LCARS arc readout: a horizontal bar divided into segments where the fill segments are colored and the remaining segments are dark.
- The value readout sits to the right of the bar in large text.
- Warn/crit thresholds change the fill color.

#### 13C9 — LCARS Progress (`LcarsProgressControl.tsx`)

- Render as a `LcarsSegmentedBar` where filled segments are solid accent color and unfilled segments are dark/transparent.
- Segment count is fixed at 10 or 20 (canonical LCARS progress bars use discrete segments, not continuous fills).
- Percentage text renders to the right of the bar.

### Implementation pattern

Each new control component is registered in `WidgetRenderer.tsx` under a strict-mode branch:

```tsx
// In WidgetRenderer.tsx, inside the switch:
case "button":
  if (isStrictMode) {
    return <LcarsButtonControl widget={widget} onAction={onAction} />;
  }
  return (/* existing button rendering */);
```

The `isStrictMode` flag is derived from the manifest's `visual_language` field, passed via React context or a prop.

### Files

| File | Change |
|---|---|
| `frontend/src/components/controls/LcarsButtonControl.tsx` | New |
| `frontend/src/components/controls/LcarsToggleControl.tsx` | New |
| `frontend/src/components/controls/LcarsSelectControl.tsx` | New |
| `frontend/src/components/controls/LcarsRadioControl.tsx` | New |
| `frontend/src/components/controls/LcarsTextInputControl.tsx` | New |
| `frontend/src/components/controls/LcarsTableControl.tsx` | New |
| `frontend/src/components/controls/LcarsMetricControl.tsx` | New |
| `frontend/src/components/controls/LcarsGaugeControl.tsx` | New |
| `frontend/src/components/controls/LcarsProgressControl.tsx` | New |
| `frontend/src/components/WidgetRenderer.tsx` | Edit: add strict-mode branching |
| `frontend/src/styles/lcars/controls.css` | New: strict-mode control styles |
| `frontend/src/context/VisualLanguageContext.tsx` | New: React context for `visual_language` flag |

### Backend changes

Minimal. The widget models are unchanged for 13C specifically — the `visual_language` field in `meta` already tells the frontend which renderer to use. The control-level work is purely a frontend rendering change.

However, Phase 13 as a whole does not commit to zero schema changes. If workstreams 13A or 13D reveal that LCARS-native composition needs additive schema fields (for example, a `layout_hint` on containers, or a `panel_role` discriminator for the auto-paneling compiler), those changes are permitted under the v1.x additive-only contract. The guiding rule is: do not add schema fields speculatively, but do not contort the implementation to avoid them either.

---

## Workstream 13D — DSL / API Evolution

### Problem

The current DSL encourages dashboard-style composition:

```python
with lcars.page("Main", id="main"):
    with lcars.row():
        with lcars.col("2fr"):
            lcars.metric("Shields", "100%")
        with lcars.col("1fr"):
            lcars.button("Fire")
```

This produces a generic grid. The LCARS containers (`box()`, `sweep()`, `bracket()`) exist but require the author to know about them and use them explicitly.

### Design

#### 13D1 — LCARS-first page primitives

Add higher-level page composition functions that produce LCARS-native layouts:

```python
# lcars.console() — the standard LCARS console layout
# Produces: sweep title bar, two-column body, box containers
with lcars.console("Bridge Operations", color="orange"):
    with lcars.data_panel("Systems", color="blue"):
        lcars.metric("Shields", "100%", status="ok")
        lcars.metric("Weapons", "Armed", status="warn")

    with lcars.control_panel("Actions", color="orange"):
        lcars.button("Red Alert", color="red")
        lcars.toggle("Shields")

# lcars.padd() — single-column PADD layout
with lcars.padd("Crew Manifest"):
    lcars.table(roster_data)

# lcars.diagnostic() — full-frame diagnostic display
with lcars.diagnostic("Warp Core", color="blue"):
    lcars.gauge("Core Output", 87.2, unit="%")
    lcars.chart(core_data, title="Plasma Flow")
```

#### 13D2 — Input column model

Add `lcars.input_column()` as a context manager that places its child widgets into the parent container's side input column. This is more ergonomic than the current `box.left_inputs()` / `box.right_inputs()` pattern:

```python
with lcars.box(title="Systems") as box:
    lcars.metric("Status", "Online")

    with lcars.input_column(side="left"):  # equivalent to box.left_inputs()
        lcars.button("Scan")
        lcars.toggle("Auto")
```

The `input_column()` function detects the nearest enclosing `lcars_box` and redirects widget placement into its `left_inputs` or `right_inputs` list.

#### 13D3 — Deprecation strategy for `row()` / `col()` in strict mode

`row()` and `col()` are not deprecated globally — they remain the primary layout primitives in classic mode and are useful for fine-grained control in strict mode. However, the documentation should guide strict-mode authors toward LCARS container composition first, with `row()` / `col()` presented as an escape hatch for custom layouts.

The DSL will emit a log-level warning if `row()` or `col()` is used directly inside a page in strict mode without an enclosing LCARS container:

```
UserWarning: lcars.row() used at page level in strict mode. Consider using
lcars.console(), lcars.box(), or lcars.sweep() for LCARS-native layout.
```

This is advisory, not blocking.

#### 13D4 — Explicit escape hatch: `lcars.raw()`

Add `lcars.raw()` as an explicit context manager for strict mode when an author needs a subtree to bypass LCARS structural lowering and auto-paneling:

```python
with lcars.page("Experimental", id="exp"):
    with lcars.raw(reason="custom operator layout"):
        with lcars.row():
            with lcars.col("1fr"):
                lcars.metric("A", "12")
            with lcars.col("2fr"):
                lcars.table(data)
```

Behavior:

- In strict mode, widgets within `lcars.raw()` keep authored layout structure for that subtree and skip smart auto-paneling.
- `lcars.raw()` is local in scope (subtree-only), so the rest of the page still uses LCARS-first structural rules.
- In classic mode, `lcars.raw()` is a no-op.
- Documentation positions `lcars.raw()` as an advanced escape hatch, not a default composition pattern.

### Files

| File | Change |
|---|---|
| `src/lcars_ui/dsl/api.py` | Add: `console()`, `padd()`, `diagnostic()`, `data_panel()`, `control_panel()`, `input_column()`, `raw()` |
| `src/lcars_ui/dsl/_recipes.py` | New: recipe builder helpers consumed by api.py |
| `src/lcars_ui/dsl/_builder.py` | Extend: support `input_column()` target detection and `raw()` scope tracking |
| `src/lcars_ui/__init__.py` | Re-export new functions |
| `docs/dsl.md` | Update: document new layout primitives |
| `docs/lcars_language.md` | Update: LCARS-first composition guide |

### Backward compatibility

- All existing DSL functions remain unchanged.
- `row()`, `col()`, `columns()` continue to work in both modes.
- New functions are additive — no existing code breaks.
- `lcars.raw()` is additive and optional; apps that do not use it are unaffected.
- `console()`, `padd()`, `diagnostic()` target standard manifest types (`lcars_sweep`, `lcars_box`, `Row`, `Column`) by default. If composition semantics require additive metadata, optional schema fields are allowed under the v1.x compatibility contract.

---

## Workstream 13E — Reference Compositions

### Problem

The only example app is `bridge_ops/app.py` (65 lines). It uses no LCARS containers and produces a dashboard-style layout. There are no golden reference compositions that demonstrate what LCARS-native output should look like.

### Design

#### 13E1 — Canonical example: `examples/lcars_console/app.py`

A full LCARS console application using the new DSL primitives. Demonstrates:
- `lcars.console()` layout with sweep title, data panels, control panels
- `lcars.box()` with side input columns
- `lcars.sweep()` for section transitions
- All widget types in LCARS-native rendering
- Multi-page navigation with different layout recipes per page

Target: unmistakably LCARS-native in composition and control geometry.

#### 13E2 — Canonical example: `examples/lcars_padd/app.py`

A PADD-style single-page application. Demonstrates:
- `lcars.padd()` layout
- Dense data display (table, metrics, log)
- Minimal input controls
- Responsive behavior (works at tablet and phone sizes)

#### 13E3 — Update `examples/bridge_ops/app.py`

Migrate the existing reference app to use LCARS container composition. Preserve the same functional behavior but use `lcars.console()`, `lcars.box()`, and `lcars.sweep()` instead of bare widgets.

#### 13E4 — Golden visual references

For each example app, capture a golden screenshot at 1920x1080 resolution. Store in `docs/golden/` as reference images. These are human-reviewed reference points, not automated test fixtures (automated visual regression is covered in 13F).

### Files

| File | Change |
|---|---|
| `examples/lcars_console/app.py` | New |
| `examples/lcars_padd/app.py` | New |
| `examples/bridge_ops/app.py` | Edit: migrate to LCARS-native composition |
| `docs/golden/console_1920x1080.png` | New: reference screenshot |
| `docs/golden/padd_1920x1080.png` | New: reference screenshot |
| `docs/golden/bridge_ops_1920x1080.png` | New: reference screenshot |

---

## Workstream 13F — Visual Regression Gates

### Problem

The project has no way to enforce that strict mode stays LCARS-native. CSS changes, dependency updates, or component refactors can silently break the visual output.

### Design

#### 13F1 — Playwright screenshot tests

Add Playwright-based visual regression tests that:

1. Start the Python backend serving each example app.
2. Open the browser at the configured viewport.
3. Wait for WebSocket connection and manifest render.
4. Capture a full-page screenshot.
5. Compare against a committed golden screenshot using pixel-diff with a configurable tolerance threshold (default: 0.1% pixel difference).

Test matrix:

| Example | Viewport | Theme |
|---|---|---|
| `lcars_console` | 1920x1080 | galaxy |
| `lcars_console` | 768x1024 | galaxy |
| `lcars_padd` | 768x1024 | galaxy |
| `bridge_ops` | 1920x1080 | galaxy |

#### 13F2 — Component-level visual snapshots

Add Storybook or a lightweight snapshot harness for individual LCARS control components. Each control from 13C gets a snapshot at multiple states:

- Button: default, hover, disabled
- Toggle: on, off
- Select: 3 options with second selected
- Table: 5 rows with header
- Metric: ok, warn, crit states
- Gauge: 25%, 75%, 95% fill

Golden snapshots committed to `frontend/src/components/controls/__snapshots__/`.

#### 13F3 — CI integration

Add a `make visual-regression` target that runs the Playwright suite. Add it to CI as an optional gate (runs on PRs that touch `frontend/src/` or `styles/`).

```makefile
visual-regression:
	cd frontend && npx playwright test --project=visual-regression
```

### Files

| File | Change |
|---|---|
| `frontend/playwright.config.ts` | New or extend: visual regression project |
| `frontend/tests/visual/console.spec.ts` | New: console app screenshot test |
| `frontend/tests/visual/padd.spec.ts` | New: PADD app screenshot test |
| `frontend/tests/visual/bridge_ops.spec.ts` | New: bridge ops screenshot test |
| `frontend/tests/visual/golden/` | New: committed golden screenshots |
| `frontend/src/components/controls/__snapshots__/` | New: component snapshots |
| `Makefile` | Add: `visual-regression` target |

---

## File-by-File Implementation Targets

### Backend (Python)

| File | Phase 13 changes |
|---|---|
| `src/lcars_ui/dsl/api.py` | Add `console()`, `padd()`, `diagnostic()`, `data_panel()`, `control_panel()`, `input_column()`, `raw()`. Add strict-mode advisory warning for bare `row()`/`col()`. |
| `src/lcars_ui/dsl/_builder.py` | Extend `container_context()` to support `input_column()` target resolution. Add page-level strict structure injection hook and `raw()` scope tracking. |
| `src/lcars_ui/dsl/_normalize.py` | Rewrite `normalize_manifest_for_strict()`: widget-type-aware grouping, smart container selection (box vs bracket), page-title sweep injection, and raw-scope bypass behavior. |
| `src/lcars_ui/dsl/_recipes.py` | New file: `_console_layout()`, `_padd_layout()`, `_diagnostic_layout()` builder helpers. |
| `src/lcars_ui/__init__.py` | Re-export new DSL functions. |
| `src/lcars_ui/core/models.py` | Additive schema fields permitted if 13A/13D require them (e.g., `layout_hint`, `panel_role`). No removals or renames. v1.x additive-only contract. |
| `src/lcars_ui/widgets/containers.py` | No changes. Existing `LcarsBox`, `LcarsSweep`, `LcarsBracket`, `LcarsHeader` are sufficient. |

### Frontend (TypeScript/React)

| File | Phase 13 changes |
|---|---|
| `frontend/src/components/WidgetRenderer.tsx` | Add strict-mode rendering branch for each widget type. Import new control components. |
| `frontend/src/components/controls/Lcars*Control.tsx` | 9 new control components (13C1–13C9). |
| `frontend/src/styles/lcars/geometry.css` | New: geometry token system. |
| `frontend/src/styles/lcars/controls.css` | New: strict-mode control styles. |
| `frontend/src/styles/lcars/shell.css` | Refactor to consume geometry tokens. |
| `frontend/src/styles/lcars/containers.css` | Refactor to consume geometry tokens. |
| `frontend/src/styles/lcars/widgets-core.css` | Refactor to consume geometry tokens. |
| `frontend/src/styles/lcars/primitives.css` | Refactor to consume geometry tokens. |
| `frontend/src/styles/lcars/responsive.css` | Refactor responsive rules to adjust geometry tokens. |
| `frontend/src/theme/geometryTokens.ts` | New: TypeScript geometry constants. |
| `frontend/src/context/VisualLanguageContext.tsx` | New: React context providing `visual_language` to all renderers. |
| `frontend/src/components/shell/LcarsFrame.tsx` | Refactor: consume geometry tokens, remove inline dimension props. |
| `frontend/src/components/shell/LcarsElbow.tsx` | Refactor: consume geometry tokens for default arm dimensions. |

### Tests

| File | Phase 13 changes |
|---|---|
| `tests/unit/test_phase13_recipes.py` | New: test `console()`, `padd()`, `diagnostic()` produce correct manifest structure. |
| `tests/unit/test_phase13_normalize.py` | New: test smart auto-paneling (input groups → box, data groups → box, mixed → bracket). |
| `tests/unit/test_phase13_input_column.py` | New: test `input_column()` redirects widgets to parent container's side inputs. |
| `tests/integration/test_dsl_roundtrip.py` | Extend: add roundtrip tests for new DSL functions. |
| `frontend/src/components/controls/*.test.tsx` | New: unit tests for each LCARS-native control component. |
| `frontend/tests/visual/*.spec.ts` | New: Playwright visual regression tests. |

### Examples

| File | Phase 13 changes |
|---|---|
| `examples/lcars_console/app.py` | New: canonical LCARS console example. |
| `examples/lcars_padd/app.py` | New: canonical LCARS PADD example. |
| `examples/bridge_ops/app.py` | Edit: migrate to LCARS-native composition. |

### Documentation

| File | Phase 13 changes |
|---|---|
| `docs/dsl.md` | Update: document new layout primitives and composition patterns. |
| `docs/lcars_language.md` | Update: LCARS-first composition guide, geometry rules, control rendering. |
| `docs/widgets.md` | Update: note strict-mode rendering differences per widget type. |
| `docs/phase13_coverage.md` | New: phase 13 coverage report. |
| `README.md` (repo root) | Update: showcase LCARS-native output in examples. |
| `lcars-ui/README.md` | Update: phase 13 in status table, examples using new primitives. |

---

## Testing and Verification Strategy

### Backend tests

1. **Recipe tests** (`test_phase13_recipes.py`): Each recipe function (`console`, `padd`, `diagnostic`) produces a manifest with the expected container structure. Verify widget types, nesting, and container properties.

2. **Normalizer tests** (`test_phase13_normalize.py`): The smart auto-paneling correctly classifies widget groups (input, data, mixed) and wraps them in appropriate containers. Edge cases: single widget, all-input page, all-data page, pre-containerized page.

3. **Input column tests** (`test_phase13_input_column.py`): `input_column()` correctly redirects widgets into the nearest enclosing `lcars_box`. Error case: `input_column()` called without an enclosing box raises `ValueError`.

4. **Backward compatibility tests**: All existing tests in `test_phase11_dsl.py`, `test_phase12_visual_language.py`, and `test_dsl_roundtrip.py` continue to pass unchanged.

5. **Contract tests**: `make contracts-check` passes after golden artifact regeneration.

### Frontend tests

1. **Control component tests** (`*.test.tsx`): Each new LCARS control renders correctly with standard props. Accessibility: hidden native controls are present and focusable. State changes (click, toggle, select) fire callbacks correctly.

2. **Geometry token tests**: Snapshot tests verify that geometry tokens are applied (components reference token values, not hardcoded values).

3. **Visual regression tests** (`*.spec.ts`): Playwright screenshot comparisons for each example app at specified viewports. Tolerance: 0.1% pixel difference.

### Verification gate

Phase 13 is verified when:

```bash
# Backend
pytest tests/ -v
make contracts-check
ruff check src tests
mypy src

# Frontend
cd frontend && npm run test
cd frontend && npm run build

# Visual (requires running backend)
make visual-regression
```

---

## Migration / Compatibility Notes

### For existing apps

- **No breaking changes.** All existing DSL functions, widget types, and manifest fields remain unchanged.
- Apps using `visual_language="classic"` are completely unaffected by Phase 13.
- Apps using `visual_language="strict"` (the default) will see improved auto-paneling: bare widgets that previously got bracket wrappers may now get box wrappers with better grouping. This is a visual improvement, not a behavioral change.
- Apps that already use explicit LCARS containers (`box()`, `sweep()`, `bracket()`) are unaffected.

### For the manifest contract

- `console()`, `padd()`, and `diagnostic()` primarily emit existing types (`lcars_sweep`, `lcars_box`, `Row`, `Column`).
- Additive schema fields may be introduced if the grammar compiler or DSL evolution requires them. These are optional fields with defaults, preserving backward compatibility. Examples: a `layout_hint` field on containers, a `panel_role` discriminator for auto-paneled groups.
- `meta.version` stays at `1.0` unless a new required field is introduced (unlikely). Additive optional fields are backward-compatible under v1.x rules.

### For frontend consumers

- Strict mode gets new control components that replace the current renderers. The component interface (props, callbacks) is unchanged — only the visual output differs.
- Classic mode rendering is untouched.

---

## Risks and Non-Goals

### Risks

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| Smart auto-paneling produces surprising layouts for edge-case widget combinations | Medium | Medium | Make auto-paneling conservative (bracket fallback for ambiguous cases). Allow `lcars.raw()` escape hatch to suppress auto-paneling for a widget group. |
| LCARS-native controls reduce accessibility (hidden native inputs not properly linked) | Medium | High | Every LCARS control must pass axe-core accessibility audit. Native inputs remain in the DOM for screen readers and keyboard navigation. |
| Geometry token refactor introduces visual regressions in existing strict-mode rendering | Medium | Medium | Visual regression tests (13F) are implemented before or in parallel with the geometry refactor (13B). Golden screenshots captured before 13B changes. |
| Playwright visual regression tests are flaky across platforms (font rendering differences) | Medium | Low | Run visual tests only on CI with a fixed Docker image and browser version. Allow per-platform golden files if needed. |
| Recipe functions (`console()`, `padd()`) are too opinionated and don't match author intent | Low | Medium | Recipes are syntactic sugar with sensible defaults. All parameters are overridable. Authors can always use raw `box()` / `sweep()` for full control. |

### Non-goals

- **Animated LCARS transitions.** Page transitions, data cascade animations, and sweep wipes are deferred to a future phase.
- **Touch-optimized PADD mode.** Responsive degradation is addressed (13B2), but a dedicated touch-first interaction model is out of scope.
- **Parity with `leonawicz/lcars`.** The R/Shiny package has Shiny-specific features (reactive outputs, server-rendered containers) that do not apply to this architecture. Phase 13 aims for the same visual direction, not API parity.
- **New widget types.** No new Pydantic widget models are added. Phase 13 is about making existing widgets render as LCARS-native controls, not about adding new data types.
- **Breaking the manifest contract.** The v1.0 manifest schema is preserved. No fields are removed or renamed.

---

## Execution Sequence

```
13B (geometry tokens)  ──────────────────────── Frontend foundation
 │
 ├──→ 13C (LCARS-native controls)  ────────── Frontend, depends on 13B tokens
 │
 └──→ 13F (visual regression setup)  ──────── Can start once 13B golden screenshots exist
       │
13A (grammar/compiler)  ───────────────────── Backend, independent of 13B/13C
 │
 └──→ 13D (DSL evolution)  ────────────────── Backend, depends on 13A
       │
       └──→ 13E (reference compositions)  ─── Depends on 13C + 13D
              │
              └──→ 13F (visual regression)  ── Final golden captures after 13E
```

Recommended implementation order for a single developer:

1. **13A** — Smart auto-paneling and grammar compiler. This is the architectural core — it changes what strict mode *is*, not just how it looks. Without this, everything else is a renderer pass.
2. **13B** — Geometry token system. Lays the dimensional foundation for all visual work.
3. **13F (partial)** — Capture pre-change golden screenshots for regression baseline.
4. **13C** — LCARS-native control components. Highest visual impact per widget.
5. **13D** — DSL recipes and layout primitives. Improves authoring experience.
6. **13E** — Reference compositions. Demonstrates and validates the end-state.
7. **13F (complete)** — Final golden screenshots and CI integration.

The ordering reflects the priority: **13A before 13C**. If you ship new control skins (13C) without the grammar compiler (13A), you get a prettier dashboard. If you ship the grammar compiler without new skins, you get structurally LCARS output with imperfect controls. The second outcome is closer to the goal.

Architecture gate for release readiness:

- Phase 13 cannot be called complete if strict mode still treats top-level `row()` / `col()` as the default composition model without LCARS structural lowering, even if 13C control rendering is finished.
- 13C may ship incrementally, but release sign-off requires 13A structural behavior to be present in strict mode.

---

## Definition of Done

Phase 13 is complete when:

1. **Strict-mode widgets render as LCARS-native controls**, not styled HTML form elements. Buttons are colored bars. Toggles are on/off bar pairs. Selects are stacked bar options. Tables have segmented bar headers. Metrics have bar labels and status bars.

2. **A canonical geometry token system** governs all dimensional relationships (bar heights, rail widths, elbow proportions, spacing rhythm). All components consume tokens; no hardcoded magic numbers remain in core strict-mode geometry paths except where documented and justified.

3. **The smart auto-paneling normalizer** wraps bare widgets into appropriate LCARS containers based on widget type (inputs → box with input column, data → box, mixed → bracket).

4. **DSL layout recipes** (`console()`, `padd()`, `diagnostic()`) produce canonical LCARS layouts with minimal author code.

5. **At least two canonical example apps** (`lcars_console`, `lcars_padd`) demonstrate unmistakably LCARS output.

6. **Visual regression tests** capture golden screenshots and run in CI, preventing silent visual regressions.

7. **Classic mode is unchanged.** All Phase 13 changes are scoped to strict mode.

8. **All existing tests pass.** No backward-incompatible changes to the manifest schema, DSL API, or WebSocket protocol.

9. **`ruff check`, `mypy`, `pytest`, frontend unit tests, frontend build, and visual regression tests all pass.**

10. **Documentation** reflects LCARS-first composition as the primary authoring model for strict mode.

11. **Architecture-first acceptance gate passes.** In strict mode, top-level generic layout composition is structurally lowered into LCARS-native layout before rendering, and this behavior is covered by backend tests.
