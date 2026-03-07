# LCARS WebUI — Phase 12 Implementation Plan (Revised)

**Status:** Planning
**Depends on:** Phases 0–11 complete (shell, primitives, containers, colors, DSL, runtime)
**Target release:** v0.3.0 (alpha)
**Replaces:** Original Phase 12 plan (auto-wrapping-first approach)

---

## Goal

Phase 12 converts LCARS-WebUI from "dashboard UI decorated with LCARS elements" into a UI that is **structurally and visually LCARS**.

The reference standard is [leonawicz/lcars](https://github.com/leonawicz/lcars) — an R/Shiny package where every widget, container, and frame element reads as authentic LCARS. The goal is not to copy that codebase, but to match its level of visual fidelity: solid colored structural elements forming continuous frames on a black void, with no generic web-UI artifacts (card borders, translucent panels, gradient glass, visible gaps between frame elements).

---

## Diagnosis: Why It Doesn't Look LCARS Yet

The current codebase has the right architectural pieces — elbows, bars, segments, nav, containers, color tokens — but assembles them with a visual grammar borrowed from modern dashboard UI rather than LCARS. Specifically:

### 1. The elbow SVG is geometrically wrong (critical)

The current `ELBOW_PATH` (`M0 50 A50 50 0 0 1 50 0 L50 22 A28 28 0 0 0 22 50 Z`) produces a thin crescent arc — a decorative mark floating in the corner cell. In LCARS, the elbow is a **solid filled L-bracket**: imagine a rectangle filling the entire corner, with a quarter-circle subtracted from the inner corner. The remaining solid mass visually joins the horizontal bar above to the vertical sidebar beside it. This is the single most recognizable shape in all of LCARS. Getting it wrong invalidates every component that uses `LcarsElbow`: the shell frame, `lcarsBox`, `lcarsSweep`.

### 2. Frame elements have gaps and borders instead of seamless continuity

The shell's `.lcars-shell-top` uses `gap: 0.45rem` between elbow, header bar, and elbow. The `.lcars-header-bar` and `.lcars-sidebar-rail` each have `border: 1px solid var(--lcars-border-muted)`. In LCARS, the elbow physically connects to the horizontal bar and the vertical sidebar with zero space between them. They are the same solid color, touching edge to edge, reading as a single continuous piece of material. Borders between structural elements do not exist.

### 3. Surfaces use translucent glass instead of opaque solids

Header bar: `background: linear-gradient(120deg, rgba(255,255,255,0.08), rgba(255,255,255,0.01)), var(--lcars-surface-2)`. Sidebar: similar gradient treatment. Content frame: bordered panel with background gradient. In LCARS, structural elements (elbows, bars, rails, segments) are flat opaque color — `background: var(--lcars-color-orange)`, full stop. The content area is black void. Nothing has a border. Nothing is translucent. Nothing has a depth-simulating gradient.

### 4. Sidebar nav items are styled as modern cards

Current: `border: 1px solid var(--lcars-border-muted)`, `background: rgba(0,0,0,0.28)`, with rounded corners wrapping a segmented bar inside. In LCARS, the sidebar nav item IS the colored bar — a solid colored rectangle or pill with dark text right-aligned inside it. No card wrapper, no border, no transparency.

### 5. Widget chrome is a generic card

`.lcars-widget` applies rounded corners, subtle gradient, thin border, left accent stripe. This is the visual grammar of every modern dashboard framework. LCARS widgets use label bars (solid colored pill/bar segments), rails, and content on black — not cards.

### 6. Content frame is a bordered panel instead of black void

`.lcars-content-frame` has `border: 1px solid var(--lcars-border-muted)`, a background gradient, and `border-radius: var(--lcars-radius-panel)`. In LCARS, content simply floats in the black space bounded by the colored structural frame. The frame defines the boundary; the content area itself has no visible container.

---

## Execution Order

The plan is ordered by visual leverage — each step produces the maximum visible improvement given what came before it. Steps 1–3 together close roughly 70–80% of the visual gap. Steps 4–5 handle widget-level polish. Steps 6–8 are ergonomics and infrastructure.

---

## Phase 12A — Fix the Elbow Geometry

**Priority:** Critical — blocks everything else
**Files:** `frontend/src/components/shell/LcarsElbow.tsx`

### Problem

The current SVG path draws a thin arc. It needs to draw a filled L-bracket.

### Target geometry

The elbow fills its entire viewBox. A quarter-circle is subtracted from the inner corner. The result is a solid shape like this (for top-left corner):

```
┌──────────────┐
│              │  ← horizontal arm (full width, fixed height)
│   ┌─────────┘
│   │             ← quarter-circle cutout at inner corner
│   │
│   │             ← vertical arm (fixed width, full height)
└───┘
```

### Implementation

Replace `ELBOW_PATH` with a path that:

1. Starts at (0, 0) — outer top-left of the viewBox.
2. Draws across the full top edge to (100, 0).
3. Draws down to (100, armThickness) — the bottom of the horizontal arm.
4. Draws left to (armThickness + radius, armThickness).
5. Arcs (quarter circle, concave) to (armThickness, armThickness + radius).
6. Draws down to (armThickness, 100) — the bottom of the vertical arm.
7. Draws left to (0, 100).
8. Closes back to (0, 0).

The `armThickness` should be parameterizable (default ~40% of viewBox for the shell elbows; configurable via props for container elbows where the bar width varies). The inner `radius` controls the roundness of the cutout.

Rotation for other corners remains the same (rotate 90/180/270 around center).

### Variant: separate arm dimensions

In the shell, the horizontal arm height matches the header bar height and the vertical arm width matches the sidebar width. The elbow must accept independent horizontal and vertical arm thickness props so it can adapt. For containers like `lcarsBox`, the arms match the container's side bar widths (`width_left`, `width_right`).

### Acceptance criteria

- The elbow fills its grid cell as a solid L-bracket with a rounded inner cutout.
- Rotating by 90° increments produces correct corners for all four positions.
- The shell frame's four elbows visually connect to their adjacent bars and sidebar.
- Container elbows (`lcarsBox`, `lcarsSweep`) also render correctly.

---

## Phase 12B — Make the Shell Frame Seamless

**Priority:** Critical — largest single visual improvement after the elbow fix
**Files:**
- `frontend/src/styles/lcars/shell.css`
- `frontend/src/styles/lcars/primitives.css`
- `frontend/src/components/shell/LcarsFrame.tsx` (minor)

### 12B1 — Remove gaps between frame elements

**Current:** `.lcars-shell-top` and `.lcars-shell-bottom` use `gap: 0.45rem`.

**Target:** `gap: 0`. The elbow, header bar, and opposite elbow sit flush. The elbow's horizontal arm IS the visual continuation of the header bar. They must be the same height and the same color with no space between them.

Similarly, in `.lcars-shell-middle`, the sidebar rail must sit flush against the vertical arm of both the top and bottom elbows.

The outer frame gap (`.lcars-shell-frame { gap }`) controls spacing between the top rail, middle section, and bottom rail. In strict LCARS mode this should also be 0 or near-0 — the colored frame is one continuous structure.

### 12B2 — Remove borders from structural elements

Remove `border: 1px solid var(--lcars-border-muted)` from:
- `.lcars-header-bar`
- `.lcars-footer-bar`
- `.lcars-sidebar-rail`
- `.lcars-content-frame`

These elements are either solid-colored LCARS bars (header, footer, sidebar) which should have no border, or black void (content frame) which also should have no border.

### 12B3 — Make structural elements opaque solids

Replace translucent gradient backgrounds with flat opaque fills:

- `.lcars-header-bar`: `background: var(--lcars-bg)` (black, since the colored bars and elbows are children that sit on top) — or if the header bar IS one of the colored bars, give it the accent color directly.
- `.lcars-sidebar-rail`: `background: var(--lcars-bg)` — the colored nav items provide the visual; the rail itself is black.
- `.lcars-footer-bar`: same treatment as header.
- `.lcars-content-frame`: `background: var(--lcars-bg)` or `transparent` — content floats on black.

### 12B4 — Align dimensional relationships

The elbow's horizontal arm height must equal the header/footer bar height. The elbow's vertical arm width must equal the sidebar rail width. These should share CSS custom properties:

```css
--lcars-header-height: 74px;      /* or clamp(...) */
--lcars-sidebar-width: 15rem;
--lcars-elbow-arm-h: var(--lcars-header-height);
--lcars-elbow-arm-v: var(--lcars-sidebar-width);
```

### Acceptance criteria

- The top row (elbow + header bar + elbow) reads as one continuous colored band that turns a corner at each end.
- The sidebar reads as a continuous vertical band connected to the elbows above and below.
- No visible borders or gaps between any structural frame elements.
- The content area is black void with no visible container.

---

## Phase 12C — Fix Sidebar Nav Items

**Priority:** High — the sidebar is constantly visible and currently screams "not LCARS"
**Files:**
- `frontend/src/styles/lcars/shell.css`
- `frontend/src/components/shell/LcarsFrame.tsx` (minor)

### Changes

1. **Remove the card wrapper styling from `.lcars-nav-item`:**
   - Remove `border`
   - Remove `background: rgba(0,0,0,0.28)`
   - Remove `border-radius: 16px`
   - Remove `padding: 0.25rem`

2. **The segmented bar inside becomes the entire nav item:**
   - The `.lcars-nav-item-segments` (the `LcarsSegmentedBar`) fills the full width and height of the nav button.
   - The label text sits inside the colored bar, right-aligned, dark-colored — which is already how `LcarsSegmentedBar` labels work.

3. **Active state:** instead of `box-shadow: inset 0 0 0 2px rgba(255,255,255,0.72)`, use a brighter variant of the bar color or a white flash/pulse, consistent with how LCARS panels indicate selection.

4. **Hover state:** `filter: brightness(1.08)` is acceptable — LCARS buttons brighten on touch.

### Acceptance criteria

- Sidebar nav items are solid colored bars, not cards containing bars.
- Active state is clearly indicated without a card-style box-shadow.
- The nav items sit directly on the black sidebar rail background.

---

## Phase 12D — Rewrite Widget Chrome

**Priority:** High — affects every widget on every page
**Files:**
- `frontend/src/styles/lcars/widgets-core.css`
- `frontend/src/styles/lcars/tokens.css`
- `frontend/src/components/WidgetRenderer.tsx`
- Optional new: `frontend/src/components/chrome/LcarsPanel.tsx`

### 12D1 — Define LCARS widget patterns

Every widget should follow one of these LCARS-native chrome patterns:

**Readout** (metric, status_tile, gauge, progress_bar):
- Top: label rendered as a small colored bar/pill (the LCARS "section header" look).
- Below: value/content on black.
- Left: optional thin colored rail (2–4px) for grouping, not the current thick accent stripe.

**Input** (button, toggle, checkbox, radio, select, text_input, number_input):
- Button: solid colored pill/bar, dark text. Already partially correct.
- Toggle/checkbox/radio: label as colored bar, control element beside it.
- Text/number/select: label bar above, input field styled dark with LCARS border treatment.

**Data** (table, log_stream):
- Section header bar (colored, with title text).
- Table rows on black with subtle row dividers, not a bordered card.

**Plot** (chart, sparkline):
- Same section header bar treatment.
- Chart content on black.

**Message** (alert, markdown, text):
- Alert: colored bar with level-appropriate color, message text beside or below.
- Text/markdown: content on black, optionally prefixed with a label bar.

### 12D2 — CSS implementation

1. **Strip `.lcars-widget` card chrome:**
   - Remove `border-radius` (or reduce to match LCARS spec — small radius on specific elements only).
   - Remove `border`.
   - Remove gradient background.
   - Remove the left accent stripe (`.lcars-accent-rail`) or convert it to a true LCARS rail (thinner, pill-ended).
   - Background becomes `transparent` or `var(--lcars-bg)`.

2. **Restyle `.widget-label`:**
   - Currently: muted text sitting inside the card.
   - Target: a solid colored bar/pill with dark text inside — the LCARS "section label" look. Use the widget's accent color as the bar background.

3. **Introduce LCARS unit grid (optional but recommended):**
   - Add `--lcars-unit: 8px` to tokens.
   - Replace arbitrary `rem` paddings with unit multiples for consistent spacing.

### 12D3 — Optional: `LcarsPanel` component

If CSS-only changes don't achieve sufficient polish (particularly for the label-bar-above-content pattern), create a lightweight wrapper:

```tsx
// LcarsPanel wraps a widget with:
// - A colored label bar (LcarsBar or LcarsPill) showing the widget label
// - A content slot on black
// - An optional left/right rail
```

`WidgetRenderer` would use `LcarsPanel` instead of directly applying `widgetCardClass(...)`.

### Acceptance criteria

- Every widget type reads as LCARS-native without user-side container wrapping.
- No widget has a generic card border, card gradient, or card shadow.
- Labels render as colored LCARS bar elements, not as muted text.
- `visual_language="classic"` preserves old card chrome (see Phase 12G).

---

## Phase 12E — Fix Container Widgets (Box, Sweep, Bracket)

**Priority:** Medium — mostly fixed by Phase 12A's elbow correction, but needs cleanup
**Files:**
- `frontend/src/styles/lcars/containers.css`
- `frontend/src/components/containers/LcarsBoxControl.tsx`
- `frontend/src/components/containers/LcarsSweepControl.tsx`
- `frontend/src/components/containers/LcarsBracketControl.tsx`

### Changes

1. **Remove card-like container chrome from `.lcars-box-control` and `.lcars-sweep-control`:**
   - Remove `border: 1px solid var(--lcars-border-muted)`.
   - Remove `border-radius: var(--lcars-radius-soft)`.
   - Replace translucent `background` with black or transparent.
   - The colored frame elements (elbows, bars, segments) provide all the visual structure.

2. **Eliminate gaps in container grids:**
   - Container `gap: 4px` may need to become `gap: 2px` or `gap: 0` depending on whether the LCARS "thin black line between segments" look is desired (it is — LCARS does use ~2px black gaps between adjacent colored segments, but not the current 4px).

3. **Pass arm dimensions to container elbows:**
   - `LcarsBoxControl` should pass the box's `width_left`/`width_right` to `LcarsElbow` so the elbow arms match the side bar widths.

4. **Sweep geometry:**
   - The `lcarsSweep` is specifically two elbows facing opposite directions (forming an S-curve) connected by a sidebar column with content. With the corrected elbow from 12A, verify this renders the signature sweep shape. The sidebar in the sweep should be a solid colored vertical bar, not a translucent panel.

### Acceptance criteria

- `lcars_box` renders as a solid colored frame (elbows + bars) around black content, matching leonawicz's `lcarsBox()` visual.
- `lcars_sweep` renders the recognizable S-curve transition shape.
- `lcars_bracket` renders as solid colored rails flanking content.

---

## Phase 12F — Page Title and Content Frame Polish

**Priority:** Medium
**Files:**
- `frontend/src/App.tsx`
- `frontend/src/styles/lcars/base.css`
- `frontend/src/styles/lcars/responsive.css`

### 12F1 — Page title as LCARS header

**Current:** `<h2 className="lcars-page-title">` — generic styled heading.

**Target:** render the page title using `LcarsBar` or `lcars_header` visual treatment — a colored bar with the title text inside, matching the LCARS section header pattern.

### 12F2 — Content frame becomes true black void

After 12B's changes, verify the content frame has:
- No visible border.
- No visible background (transparent on the black body).
- No border-radius (the frame's colored elements define the visual boundary).
- Content simply appears in the black space.

### 12F3 — Tighten layout spacing

Reduce default row/column gaps to match LCARS density. LCARS interfaces are information-dense with tight spacing between functional elements. The current `--lcars-frame-gap: 0.85rem` may be too generous — evaluate reducing to `0.5rem` or `4px` to match segment gap rhythm.

### Acceptance criteria

- Page title is visually indistinguishable from other LCARS header bars.
- Content area is black void bounded only by the colored frame.

---

## Phase 12G — Visual Language Mode Switch

**Priority:** Lower — important for backwards compatibility, but the visual fixes above are the core work
**Files:**
- `src/lcars_ui/core/models.py`
- `src/lcars_ui/dsl/_state.py`
- `src/lcars_ui/dsl/_builder.py`
- `frontend/src/types/contract.ts`
- `frontend/src/App.tsx`
- CSS files (conditional classes)

### Concept

Add `visual_language: Literal["strict", "classic"] = "strict"` to `Meta` and the DSL config.

- **strict** (default): all Phase 12 visual changes are active. This is the LCARS look.
- **classic**: the pre-Phase-12 card-dashboard chrome is preserved.

### Implementation

The frontend reads `manifest.meta.visual_language` and sets a `data-visual-language="strict|classic"` attribute on the root element. All Phase 12 CSS changes are scoped under `[data-visual-language="strict"]` selectors, with the old styles preserved under `[data-visual-language="classic"]`.

This means the old CSS doesn't get deleted — it gets scoped. New strict-mode CSS is additive.

### Acceptance criteria

- `lcars.config(visual_language="classic")` produces the exact current (pre-Phase-12) look.
- Default (no config) produces the new LCARS look.

---

## Phase 12H — Auto-wrapping Normalizer (Optional / Deferred)

**Priority:** Low — a DX convenience, not a visual fix
**Files:**
- New: `src/lcars_ui/dsl/_normalize.py`
- Edit: `src/lcars_ui/dsl/_builder.py`

### Rationale

With Phases 12A–12F complete, widgets and the shell already look LCARS. The question of "what if a user puts bare widgets in a page without using containers" is now a minor ergonomic issue, not a visual emergency. The bare widgets themselves look LCARS-native (12D), and the shell frame provides LCARS context (12A–12B).

If you still want auto-wrapping, implement it here as a convenience layer:

- In strict mode, bare widget groups in a page column get wrapped in a default container (`lcars_sweep` or `lcars_bracket`).
- In classic mode, no wrapping.

This is a nice-to-have that can ship in a later phase (12.1 or Phase 13) without blocking the v0.3.0 release.

### Acceptance criteria

- Bare widgets in a page render inside auto-generated LCARS containers in strict mode.
- No auto-wrapping in classic mode.

---

## Phase 12I — Docs, Golden Artifacts, and Tests

**Priority:** Required for release
**Files:**
- `docs/quickstart.md`
- New: `docs/lcars_language.md`
- `scripts/generate_golden.py`
- `fixtures/golden/` updates
- New: `tests/unit/test_phase12_visual_language.py`
- `frontend/src/components/WidgetRenderer.test.tsx`

### 12I1 — Rewrite quickstart

The "first app" example must produce LCARS visuals with minimal code. Show the simplest possible app and demonstrate that it looks LCARS out of the box. Include an example using `lcars.section()` or `with lcars.box(...)` to teach container-first thinking.

### 12I2 — Add LCARS visual language doc

Document:
- What strict vs classic mode means.
- The visual rules (opaque solids, seamless frames, label bars, black void content areas).
- How to opt out.
- Design guidelines for custom widgets.

### 12I3 — Golden file updates

Regenerate golden manifests and schema to include `visual_language` field. Add golden snapshot for a strict-mode manifest if auto-wrapping (12H) is included.

### 12I4 — Tests

**Backend:**
- `visual_language` field appears in manifest.
- Default is `strict`.
- If 12H is included: normalizer wrapping rules for strict/classic.

**Frontend:**
- Strict mode applies correct CSS classes/data attributes.
- Classic mode preserves old class structure.
- If Playwright is available: one visual smoke test for strict mode shell frame.

---

## Phase 12J — Release

**Version:** `0.3.0`

**Contract version:** keep `meta.version` at `1.0` if changes are strictly additive (new optional fields only). Bump to `1.1` if any breaking schema change.

**Migration:**
- Existing apps will look significantly more LCARS by default.
- `lcars.config(visual_language="classic")` restores the old look.
- Document this in release notes.

---

## Execution Checklist

| Step | Phase | Description | Visual impact |
|------|-------|-------------|---------------|
| 1 | 12A | Fix elbow SVG geometry | Critical — fixes every component using elbows |
| 2 | 12B | Make shell frame seamless (gaps, borders, opacity) | Critical — fixes the overall page frame |
| 3 | 12C | Fix sidebar nav items | High — sidebar is always visible |
| 4 | 12D | Rewrite widget chrome | High — affects every widget |
| 5 | 12E | Fix container widgets (box, sweep, bracket) | Medium — mostly fixed by step 1 |
| 6 | 12F | Page title + content frame polish | Medium |
| 7 | 12G | Visual language mode switch | Enables backwards compatibility |
| 8 | 12H | Auto-wrapping normalizer (optional) | Low — DX convenience only |
| 9 | 12I | Docs, golden files, tests | Required for release |
| 10 | 12J | Version bump + release notes | Ship it |

---

## Definition of Done

Phase 12 is complete when:

1. The shell frame renders as a continuous colored structure (elbows seamlessly joining bars and sidebar) on a black background.
2. Elbows are solid filled L-brackets, not thin arcs.
3. No structural element has a visible border, translucent background, or depth-simulating gradient.
4. Sidebar nav items are solid colored bars, not cards.
5. Every widget type renders with LCARS-native chrome (label bars, rails, content on black) — not card chrome.
6. Container widgets (box, sweep, bracket) render with correct elbows and seamless frames.
7. `visual_language="classic"` preserves the pre-Phase-12 look.
8. Docs demonstrate strict mode as default and explain modes.
9. Golden files and tests verify the mode switch and visual structure.
10. `ruff`, `mypy`, `pytest`, frontend unit tests, and frontend build all pass.
