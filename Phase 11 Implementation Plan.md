# Phase 11 Implementation Plan — Authentic LCARS Visual System

**Goal:** Close the gap between your current "LCARS-flavored dashboard" and the composable, screen-accurate LCARS widget system that `leonawicz/lcars` delivers for Shiny — but in React/TypeScript.

---

## The Gap (Diagnostic)

Your current frontend has an outer shell frame with two elbows, a sidebar rail, a header bar, a footer bar, and 17 functional widgets rendered inside. That's the skeleton of LCARS, but the *grammar* of LCARS is missing. Here's what `leonawicz/lcars` has that you don't:

| leonawicz/lcars feature | Your current state | Gap severity |
|---|---|---|
| **lcarsBox** — composable container with per-corner elbow selection (1–4), side bars, embedded title/subtitle in bars, left/right input columns | Single fixed outer shell only. No nestable LCARS containers. | **Critical** — this is the core visual building block |
| **lcarsSweep** — full-width sweep with curved transition between sections | Nothing equivalent | **High** — signature visual element |
| **lcarsBracket** — bracket-style grouping element | Nothing equivalent | Medium |
| **Segmented bars** — multi-color bar segments with embedded text labels per segment | Solid single-color bars only | **High** — this is what makes LCARS look like LCARS |
| **Pill / Half-pill / Rect shapes** — rounded-end indicator elements | Not present | **High** — used everywhere as terminators and indicators |
| **lcarsHeader (h1–h6)** — section headers with LCARS bar styling | Plain colored text headings | Medium |
| **Official LCARS color palettes** — 30+ named colors across 4 eras (2357/2369/2375/2379) | 6 color tokens (orange, red, blue, purple, white, yellow) | **High** — severely limits visual variety |
| **Per-corner / per-side color control** — each elbow and each bar segment can be a different color | Single color per frame region | High |
| **Input columns** — buttons/toggles stacked inside box sidebars | Sidebar is a nav rail; inputs are in content area | Medium |
| **Configurable text casing** — force_uppercase, label_uppercase, lcars_font_headers/labels/text switches | Hardcoded uppercase via CSS | Low |
| **Checkbox, Radio, RadioToggle** inputs with LCARS styling | Not present as distinct input types | Low |

The fundamental issue: you have *one* LCARS frame wrapping a generic widget grid. leonawicz has *composable* LCARS containers that ARE the layout. Every box, every sweep, every bracket is itself a visual LCARS element. The widgets live inside LCARS geometry, not beside it.

---

## Architecture Decision: How to Add Composable Containers

Two options, and I'd argue for Option A:

**Option A — New container widget types** (recommended): Add `lcars_box`, `lcars_sweep`, `lcars_bracket` as widget types in your manifest. They contain child widgets. The DSL gets `lcars.box()`, `lcars.sweep()`, `lcars.bracket()` as context managers. The frontend renders them as proper LCARS geometry with children inside.

**Option B — Replace the row/column system entirely**: Make rows and columns themselves render as LCARS boxes. This is more invasive and harder to make optional.

Option A keeps your existing layout system intact, adds the new containers as composable elements within it, and lets developers choose when to use LCARS-specific framing vs. plain grid layout.

---

## Sub-phases

Phase 11 is big. Break it into five sub-phases (11A through 11E), each independently shippable.

---

### Phase 11A — Color System Overhaul

**Why first:** Everything else depends on having the right colors. You can't build authentic LCARS boxes with 6 tokens.

**Deliverables:**

1. **Expand `LcarsColor` from 6 to 30+ named colors.** Use the official names from the `trekcolors` package:

   2357 era: pale-canary (`#FFFF99`), tanoi (`#FFCC99`), golden-tanoi (`#FFCC66`), neon-carrot (`#FF9933`), eggplant (`#664466`), lilac (`#CC99CC`), anakiwa (`#99CCFF`), mariner (`#3366CC`)

   2369 era: bahama-blue (`#006699`), blue-bell (`#9999CC`), melrose (`#9999FF`), hopbush (`#CC6699`), chestnut-rose (`#CC6666`), orange-peel (`#FF9966`), atomic-tangerine (`#FF9900`), danub (`#6688CC`)

   2375 era: indigo (`#4455BB`), lavender-purple (`#9977AA`), cosmic (`#774466`), red-damask (`#DD6644`), medium-carmine (`#AA5533`), bourbon (`#BB6622`), sandy-brown (`#EE9955`), periwinkle (`#CCDDFF`)

   2379 era: dodger-pale (`#5599FF`), dodger-soft (`#3366FF`), near-blue (`#0011EE`), navy-blue (`#000088`), husk (`#BBAA55`), rust (`#BB4411`), tamarillo (`#882211`)

2. **Restructure `tokens.css`** to define all 30+ colors as CSS custom properties. Keep the 3-theme system (galaxy/tng/nemesis) but map each theme to one of the canonical eras as its base palette, with fallbacks for all names.

3. **Update `colorTokens.ts`** — `resolveColorToken()` handles the full set. Accept both kebab-case names (`"pale-canary"`) and raw hex. The existing 6 simple names (`orange`, `red`, etc.) remain as aliases.

4. **DSL backward compat** — `color="orange"` keeps working. New colors available as `color="pale-canary"` etc.

5. **Regenerate golden artifacts.**

**Files touched:** `core/widget_base.py` (LcarsColor enum expansion), `theme/colorTokens.ts`, `styles/lcars/tokens.css`, `dsl/api.py` (accept new color names), `__init__.py`, golden fixtures.

**Tests:** Color resolution unit tests for all 30+ names across all 3 themes. Backward-compat test for existing 6 names.

---

### Phase 11B — Primitive LCARS Shapes (Bars, Pills, Rects, Segments)

**Why second:** These are the atomic visual elements that boxes, sweeps, and brackets are composed from.

**Deliverables:**

1. **New React components** (not widget types — internal rendering primitives):
   - `LcarsBar` — a horizontal or vertical colored bar with optional text label, optional rounded ends (pill termination), configurable height/width.
   - `LcarsPill` / `LcarsHalfPill` — rounded-end indicator elements. Left-pill, right-pill, full-pill variants.
   - `LcarsRect` — basic rectangle element conforming to LCARS sizing (height = 1/3 unit).
   - `LcarsSegmentedBar` — a bar divided into N segments, each with its own color and optional text label. This is the key composable: it's what makes the top/bottom/side bars of an lcarsBox look authentic.
   - `LcarsElbow` (refactor existing `LcarsElbow.tsx`) — support all 4 corners (currently you have top-left and top-right). Add bottom-left, bottom-right. Accept per-corner color. Use SVG with proper scaling ratios matching leonawicz's `300/w` scaling approach.

2. **CSS additions** in a new `styles/lcars/primitives.css`:
   - `.lcars-bar`, `.lcars-bar-segment`, `.lcars-pill`, `.lcars-rect`
   - Proper sizing: bar height = 30px (standard LCARS), pill end-cap radius = 15px
   - Text inside bars: right-aligned by default (LCARS convention), uppercase, `font-family: Antonio`

3. **Storybook-style test page** (optional but recommended) — a hidden `/lcars/debug/shapes` route that renders every primitive at every color for visual regression.

**Files touched:** New files in `frontend/src/components/shapes/`. Refactor `LcarsElbow.tsx`. New CSS file.

**Tests:** Vitest snapshot tests for each shape component.

---

### Phase 11C — lcarsBox Container Widget

**The big one.** This is the equivalent of leonawicz's `lcarsBox()`.

**Deliverables:**

1. **New Pydantic model: `LcarsBox`** in `widgets/containers.py`:
   ```
   type: "lcars_box"
   title: str | None
   subtitle: str | None
   corners: list[int]          # which corners get elbows: [1,2,3,4] = TL,TR,BR,BL
   sides: list[int]            # which sides get bars: [1,2,3,4] = top,right,bottom,left
   color: LcarsColor           # base color (inherited by all parts)
   corner_colors: list[LcarsColor] | None   # per-corner override [TL,TR,BR,BL]
   side_colors: list[LcarsColor] | None     # per-side override [top,right,bottom,left]
   title_color: LcarsColor | None
   subtitle_color: LcarsColor | None
   width_left: int             # left sidebar width in px (default 150)
   width_right: int            # right sidebar width in px (default 150)
   left_inputs: list[Widget] | None   # input widgets in left sidebar
   right_inputs: list[Widget] | None  # input widgets in right sidebar
   children: list[Widget]      # main content area widgets
   ```

2. **Update Widget union** in `core/models.py` to include `LcarsBox`.

3. **DSL context manager:**
   ```python
   with lcars.box(title="Systems", corners=[1,4], color="golden-tanoi") as box:
       with box.left_inputs():
           lcars.button("Run Scan")
       lcars.table(data, title="Status")
   ```

4. **React component: `LcarsBoxControl.tsx`**:
   Uses CSS Grid layout:
   ```
   [TL-elbow] [top-bar .............. title] [TR-elbow]
   [left-bar] [main-content-area           ] [right-bar]
   [left-bar] [                             ] [right-bar]
   [BL-elbow] [bottom-bar ...... subtitle   ] [BR-elbow]
   ```
   - Each corner cell renders `LcarsElbow` or `LcarsHalfPill` (depending on `corners` config)
   - Side bars render as `LcarsSegmentedBar` or plain `LcarsBar`
   - Title text embedded in top bar, right-aligned by default
   - Left/right input columns render vertically in side panels
   - Main content area renders children via `WidgetRenderer`

5. **CSS** in `styles/lcars/containers.css`:
   - `.lcars-box` grid template
   - Side panel widths (150px default, adjustable)
   - Proper elbow-to-bar connection (no gaps, seamless color)
   - Elbow scaling: inner radius and outer radius proportional to sidebar width (matching leonawicz's `ro = width/2, ri = height/2` defaults)

6. **Update `WidgetRenderer.tsx`** to handle `type: "lcars_box"`.

**Files touched:** New `widgets/containers.py`, update `core/models.py`, new `LcarsBoxControl.tsx`, new `containers.css`, update `WidgetRenderer.tsx`, update DSL `api.py` + `_builder.py`.

**Tests:**
- Unit: LcarsBox model serialization, DSL box context manager, child nesting
- Integration: Box renders via manifest endpoint
- Vitest: LcarsBoxControl renders grid, elbows, bars, children
- Contract: Update golden artifacts

---

### Phase 11D — lcarsSweep + lcarsBracket + lcarsHeader

**Deliverables:**

1. **LcarsSweep** — a full-width element with a curved elbow transition connecting a sidebar to a horizontal bar, then content below. Think of it as a "half-box" — it's the top (or bottom) elbow + bar + sidebar extending down, with content occupying the remaining space.
   ```
   Pydantic model: LcarsSweep
     type: "lcars_sweep"
     title: str | None
     color: LcarsColor
     reverse: bool              # flip vertically (sweep from bottom)
     width_sidebar: int         # sidebar width (default 150)
     children: list[Widget]
   ```
   React: `LcarsSweepControl.tsx` — similar grid structure to box but only 2 corners (TL+BL or TR+BR depending on direction).

2. **LcarsBracket** — a decorative bracket grouping element. Two vertical bars with optional top/bottom connections.
   ```
   Pydantic model: LcarsBracket
     type: "lcars_bracket"
     color: LcarsColor
     orientation: "left" | "right" | "both"
     children: list[Widget]
   ```

3. **LcarsHeader** — a section header bar with pill termination, styled text, optional segment colors.
   ```
   Pydantic model: LcarsHeader
     type: "lcars_header"
     text: str
     color: LcarsColor
     size: "h1" | "h2" | "h3" | "h4" | "h5" | "h6"
   ```
   This is NOT a free-text widget — it's a visual LCARS divider with text label, using pill-end bars.

4. **DSL functions:**
   ```python
   with lcars.sweep(title="Operations", color="anakiwa"):
       lcars.metric("Warp Core", "Online")

   with lcars.bracket(color="lilac"):
       lcars.text("Grouped content")

   lcars.header("Section Title", size="h2", color="pale-canary")
   ```

**Files touched:** Extend `widgets/containers.py`, three new React components, extend `containers.css`, extend DSL.

**Tests:** Same pattern as 11C — model, DSL, Vitest, contract.

---

### Phase 11E — Shell Refactor + Input Polish + Typography

**Deliverables:**

1. **Refactor `LcarsFrame.tsx`** to use the new shape primitives internally. The outer shell should itself be built from `LcarsBar`, `LcarsElbow`, `LcarsSegmentedBar`. This deduplicates the elbow rendering code and proves the primitives are composable.

2. **Segmented sidebar and footer bars.** Your current sidebar is a nav rail with orange buttons. In authentic LCARS, the sidebar is a series of colored bar segments with text labels — some are buttons, some are purely decorative. Allow sidebar items in the manifest to specify `segments` (list of `{color, label}`) that render as stacked colored blocks.

3. **New LCARS-styled inputs** matching leonawicz:
   - `lcarsCheckbox` — checkbox with pill-shaped indicator
   - `lcarsRadio` / `lcarsRadioToggle` — radio buttons with LCARS styling
   These are new input widget types in the manifest.

4. **Typography controls** on `lcarsPage` / `config`:
   ```python
   lcars.config(
       name="Bridge Ops",
       force_uppercase=True,      # CSS text-transform on all text
       label_uppercase=True,      # labels specifically
       lcars_font_headers=True,   # Antonio for headers
       lcars_font_labels=True,    # Antonio for widget labels
       lcars_font_text=False,     # sans-serif for body text (more readable)
   )
   ```
   These map to manifest `meta` fields and `data-*` attributes on the root element, controlling CSS rules.

5. **Sound cues for new interactions.** Box/sweep sidebar button clicks should play `ack`. Toggle switches should have distinct on/off cues.

**Files touched:** Refactor `LcarsFrame.tsx`, `shell.css`, new input components, extend `Meta` model, extend `config()` DSL.

**Tests:** Vitest for refactored frame, new input types. Integration tests for typography config.

---

## Effort Estimate

| Sub-phase | Scope | Estimated complexity |
|---|---|---|
| 11A — Colors | Backend enum + CSS tokens + TS resolver | Small (1–2 sessions) |
| 11B — Shape primitives | 5 new React components + CSS | Medium (2–3 sessions) |
| 11C — lcarsBox | Full-stack: model → DSL → renderer | Large (3–5 sessions) |
| 11D — Sweep/Bracket/Header | 3 more containers, similar pattern | Medium-Large (2–4 sessions) |
| 11E — Shell refactor + polish | Refactor + new inputs + typography | Medium (2–3 sessions) |

Total: ~10–17 working sessions. Not trivial, but each sub-phase is independently useful and shippable.

---

## Dependency Order

```
11A (colors)
 └──→ 11B (shape primitives)
       └──→ 11C (lcarsBox)
       │     └──→ 11D (sweep/bracket/header)
       └──→ 11E (shell refactor + polish)
```

11A and 11B are prerequisites. 11C is the high-value target. 11D extends the pattern. 11E can run in parallel with 11D once 11B is done.

---

## What This Does NOT Cover (Future Phases)

- **Animated LCARS transitions** — page transitions with sweep/wipe effects (Phase 12?)
- **Touch-optimized PADD mode** — responsive layout for tablet use
- **Data cascade animations** — the iconic scrolling-numbers effect from the show
- **Dynamic LCARS layout reflow** — real-time box reconfiguration via live updates
- **lcarsOutput / renderLcars** equivalents — server-side rendered LCARS containers (leonawicz has this for Shiny)

---

## Key Design Principles to Maintain

1. **The developer writes Python only.** Every new visual element must have a DSL function. No HTML/CSS/JS escapes.
2. **Manifest is the contract.** New container types are widget types in the manifest JSON, with full Pydantic validation and golden artifact coverage.
3. **Composability over configuration.** A sweep contains a box contains inputs — the nesting is the power.
4. **Authentic colors and proportions.** Use the real LCARS color names. Match the 30px bar height, 150px sidebar width, 90px elbow height conventions from the spec.
5. **Backward compatibility.** Existing apps using `lcars.row()` / `lcars.col()` / simple widgets continue to work exactly as before. The new containers are opt-in.
