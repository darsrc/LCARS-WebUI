# LCARS Visual Fidelity Plan

**Goal:** Make renders produced by this library look like actual LCARS — the Star Trek TNG/DS9/Voyager computer interface designed by Michael Okuda.

**Guiding principle:** Every change targets a specific visual element that currently diverges from canonical LCARS. No cheats, no shortcuts — only structural improvements to the rendering pipeline.

---

## Element 1: Segment Gaps (Severity: HIGH)

**Problem:** `--lcars-segment-gap: 3px` creates visible black seams between every bar segment, elbow edge, and container boundary. Real LCARS has no gaps between structural elements within a single frame. Bars butt directly against elbows; segmented bars are seamless color blocks separated only by color changes, not by empty space.

**Current behavior:** Header bar floats 3px below the elbow. Footer bar floats 3px above the bottom elbow. Sidebar bars have 4px gaps between them. Every container's internal bars have gaps showing the black background through the chrome.

**Fix:**

| File | Change |
|------|--------|
| `frontend/src/styles/lcars/geometry.css` | `--lcars-segment-gap: 0px` (strict mode override or global) |
| `frontend/src/styles/lcars/shell.css` | Strict mode `.lcars-shell-top`, `.lcars-shell-bottom`: `gap: 0` |
| `frontend/src/styles/lcars/shell.css` | Strict mode `.lcars-nav-stack`: `gap: 0` |
| `frontend/src/styles/lcars/containers.css` | Strict mode sweep/box containers: `gap: 0` within frame elements (bars, elbows) |

**Exceptions:** Content widgets inside the black viewport area can retain small gaps. The gap-free rule applies only to colored chrome (bars, elbows, rails, terminals).

---

## Element 2: Sidebar Bar Variety (Severity: HIGH)

**Problem:** The sidebar currently shows 3 identical-height navigation bars. Real LCARS sidebars have 8-15 bars of varying heights, colors, and purposes — some are navigation, some are decorative filler, some are status indicators. The variety of bar heights and colors is a defining LCARS characteristic.

**Current behavior:** 3 bars, all 56px, all the same color family, with 4px gaps between them.

**Fix:**

| File | Change |
|------|--------|
| `frontend/src/components/shell/LcarsFrame.tsx` | After rendering nav items, render decorative filler bars to fill remaining sidebar space. Use 3-5 additional `<LcarsBar>` elements with varying heights (thin: 20px, standard: 44px, thick: 60px) and alternating colors from the manifest's palette. |
| `frontend/src/styles/lcars/shell.css` | Strict mode `.lcars-sidebar-rail`: `display: flex; flex-direction: column; gap: 0;` with child bars growing to fill. Add `.lcars-sidebar-filler { flex: 1 1 auto; }` for the final filler bar that stretches to consume remaining vertical space. |
| `frontend/src/types/contract.ts` | Consider adding a `sidebar.filler_bars` field to the manifest layout for user-specified decorative bars (optional — can also be auto-generated). |

**Visual target:** Sidebar should be a solid column of colored bars from the elbow down to the footer elbow, with no black gaps. The last bar should stretch to fill all remaining vertical space.

---

## Element 3: Elbow Inner Radius (Severity: MEDIUM)

**Problem:** Shell elbow `innerRadius` is 28 (in a 100-unit viewBox), producing a tight corner. Real LCARS elbows have a generous, sweeping inner curve — approximately 40-50% of the elbow's shorter dimension.

**Current behavior:** The inner corner of each elbow is noticeably tight, looking mechanical rather than organic.

**Fix:**

| File | Change |
|------|--------|
| `frontend/src/theme/geometryTokens.ts` | `shellElbowInnerRadius: 28` → `shellElbowInnerRadius: 42` |
| `frontend/src/styles/lcars/geometry.css` | `--lcars-shell-elbow-inner-radius: 28` → `42` |
| `frontend/src/theme/geometryTokens.ts` | `sweepElbowInnerRadius: 66` — verify this renders correctly at new value; may need tuning to `55` |

**Verification:** The inner curve should feel smooth and organic, like a quarter-pipe, not a sharp bend.

---

## Element 4: Header Bar Title Typography (Severity: MEDIUM)

**Problem:** The title text in the header bar is currently rendered at `clamp(2rem, 4vw, 4rem)` but the header bar is only 70% of 140px = 98px tall. At 1920px wide, the title renders reasonably, but the font weight and tracking don't match LCARS's distinctive ultra-compressed, heavyweight titling.

**Current behavior:** Title text is bold Antonio at 2-4rem. LCARS canonical title text is ultra-compressed, very tall, uppercase, with minimal letter-spacing.

**Fix:**

| File | Change |
|------|--------|
| `frontend/src/styles/lcars/shell.css` | `.lcars-header-title-text` in strict mode: `font-size: clamp(2.5rem, 5vw, 5rem)`. The text should be as tall as the header bar allows, filling the vertical space. `font-stretch: ultra-condensed` if available. `letter-spacing: 0.02em` (tighter than current 0.04em). |
| `frontend/src/styles/lcars/tokens.css` | Add `--lcars-font-title: "Antonio", "Swiss 911 Ultra Compressed BT", "Helvetica Ultra Compressed", "Oswald", sans-serif` to prioritize ultra-compressed fonts when available. |

---

## Element 5: Content Area Density (Severity: HIGH)

**Problem:** Content pages have too much empty black space. Real LCARS screens are information-dense — every surface is covered with data readouts, charts, status indicators, and labeled panels. The black viewport area should feel packed with data, not sparse.

**Current behavior:** Widgets are small, left-aligned, with large empty regions. A typical page shows 4-6 metrics and a chart floating in a sea of black.

**Fix (multi-part):**

### 5a. Widget sizing

| File | Change |
|------|--------|
| `frontend/src/styles/lcars/widgets-core.css` | Strict mode widgets: increase minimum heights. Metric cards should be at least 80px tall. Charts should fill available width. Tables should stretch to container width. |
| `frontend/src/components/strict/LegacyStrictPageRenderer.tsx` | Band body grid: use `grid-template-columns: repeat(auto-fill, minmax(280px, 1fr))` for widget grids within lanes, so widgets tile to fill horizontal space. |

### 5b. Container content fill

| File | Change |
|------|--------|
| `frontend/src/styles/lcars/containers.css` | Strict mode content area: `align-content: stretch` instead of `start`. Children should stretch to fill the container's content region. |

### 5c. Demo data density

| File | Change |
|------|--------|
| `dashboard_demo.py` | Add more widgets per page to demonstrate density. Each page should have at least 8-12 visible data elements. Add secondary metrics, status bars, text readouts, and multiple charts to fill the viewport. |

---

## Element 6: Footer Bar Proportion (Severity: MEDIUM)

**Problem:** The footer bar is `60px` (`--lcars-bar-height-thick`) but at 1080p that's only ~5.5% of viewport height. Real LCARS footers are visually substantial — roughly the same height as a standard bar or slightly thicker, but they mirror the header's structural weight.

**Current behavior:** Footer feels thin relative to the header (140px). The internal segmented bars add visual noise.

**Fix:**

| File | Change |
|------|--------|
| `frontend/src/styles/lcars/shell.css` | Strict mode footer: `height: var(--lcars-bar-height-thick)` is adequate, but ensure the footer bar's internal layout is simplified. The 3-column grid (`terminal | segments | cap`) should render as solid colored blocks with minimal subdivisions. |
| `frontend/src/components/shell/LcarsFrame.tsx` | Footer terminal segments: reduce from 2 segments to 1. Footer action segments: cap at 3-4 visible segments maximum, merging excess into one block. |

---

## Element 7: Container Frame Bars (Severity: HIGH)

**Problem:** LcarsSweep and LcarsBox containers have thin bars (20-44px) forming their structural frames. Real LCARS container frames use bars that are thick enough to carry labels — typically 30-44px for horizontal runs, 44-60px for vertical rails.

**Current behavior:** Container sidebar bars are thin and uniform. The top/bottom horizontal bars are `--lcars-bar-height` (44px) which is acceptable, but the sidebar rails within containers are often narrower.

**Fix:**

| File | Change |
|------|--------|
| `frontend/src/styles/lcars/containers.css` | Strict mode `.lcars-sweep-rail`, `.lcars-box-rail`: `min-width: 44px`. Ensure no rail is narrower than the standard bar height. |
| `frontend/src/components/containers/LcarsSweepControl.tsx` | Sidebar rail: ensure it renders as a solid colored vertical bar (the "sidebar" column), not just a thin line. The rail bar should fill the full sidebar width. |
| Container CSS | Bar labels inside container frames should be right-aligned, uppercase, dark text on colored background — matching LCARS conventions. |

---

## Element 8: Color Usage Variety (Severity: MEDIUM)

**Problem:** Pages tend to use 1-2 colors (tanoi + anakiwa). Real LCARS screens use 4-6 colors simultaneously, with different structural roles assigned to different colors. Header = one color, sidebar bars = 3-4 alternating colors, container frames = varied by purpose.

**Current behavior:** Most elements default to `tanoi` (peach). The palette tokens are correct but underutilized.

**Fix:**

| File | Change |
|------|--------|
| `dashboard_demo.py` | Assign distinct colors to each container, metric, and structural element. Use the full `galaxy` palette: tanoi, golden-tanoi, lilac, blue-bell, anakiwa, pale-canary, periwinkle. Each band/container should have a different frame color. |
| `frontend/src/components/shell/LcarsFrame.tsx` | Decorative sidebar filler bars (from Element 2) should cycle through 3-4 colors from the manifest's theme palette. |

---

## Element 9: Elbow-to-Bar Seamless Join (Severity: MEDIUM)

**Problem:** The SVG elbow and the adjacent CSS bar meet at a seam. Due to `--lcars-segment-gap` and potential sub-pixel rendering, a hairline black line can appear between the elbow and the header/footer bar.

**Current behavior:** Sometimes a 1px gap is visible at the elbow-bar junction, breaking the illusion of a continuous structural element.

**Fix:**

| File | Change |
|------|--------|
| `frontend/src/styles/lcars/shell.css` | Elbow SVG container: add `margin-right: -1px` (or margin toward the bar) to overlap by 1px, ensuring seamless visual join. |
| `frontend/src/styles/lcars/primitives.css` | `.lcars-elbow-svg`: ensure `display: block` (not inline) to prevent whitespace gaps. |

---

## Element 10: Nav Bar Rounded Ends (Severity: LOW)

**Problem:** Sidebar nav bars have rounded right ends (pill caps), which is correct. But all bars have the same rounding radius. Real LCARS varies — some bars have full pill ends, some have smaller rounded corners, some are flat on both ends.

**Current behavior:** All nav bars use `--lcars-pill-radius: 22px` on the right end. This is acceptable but monotonous.

**Fix:**

| File | Change |
|------|--------|
| `frontend/src/components/shapes/LcarsBar.tsx` | Add a `roundedRadius` prop (optional) that overrides the default pill radius. Allow values like `"full"` (999px), `"half"` (half bar height), `"none"` (0). |
| Sidebar filler bars | Decorative bars could alternate between full-pill and half-radius ends for visual variety. |

---

## Priority Order

| Priority | Element | Impact |
|----------|---------|--------|
| 1 | Element 1: Segment Gaps → 0 | Transforms the entire UI from "floating pieces" to "solid frame" |
| 2 | Element 2: Sidebar Bar Variety | Makes the sidebar look like LCARS instead of a simple menu |
| 3 | Element 5: Content Density | Fills the black void with data, matching LCARS's information-rich aesthetic |
| 4 | Element 7: Container Frame Bars | Makes containers look like proper LCARS subframes |
| 5 | Element 3: Elbow Inner Radius | Smoother, more organic curves |
| 6 | Element 9: Elbow-Bar Seam | Eliminates hairline gaps at structural joins |
| 7 | Element 8: Color Variety | Uses the full palette for visual richness |
| 8 | Element 6: Footer Proportion | Balances top/bottom visual weight |
| 9 | Element 4: Title Typography | Matches the ultra-compressed LCARS titling style |
| 10 | Element 10: Nav Bar Rounding | Polish detail |

---

## Files Touched (Summary)

| File | Elements |
|------|----------|
| `frontend/src/styles/lcars/geometry.css` | 1, 3 |
| `frontend/src/styles/lcars/shell.css` | 1, 2, 4, 6, 9 |
| `frontend/src/styles/lcars/containers.css` | 1, 5b, 7 |
| `frontend/src/styles/lcars/widgets-core.css` | 5a |
| `frontend/src/styles/lcars/primitives.css` | 9 |
| `frontend/src/styles/lcars/tokens.css` | 4 |
| `frontend/src/theme/geometryTokens.ts` | 1, 3 |
| `frontend/src/components/shell/LcarsFrame.tsx` | 2, 6, 8 |
| `frontend/src/components/shapes/LcarsBar.tsx` | 10 |
| `frontend/src/components/containers/LcarsSweepControl.tsx` | 7 |
| `frontend/src/components/strict/LegacyStrictPageRenderer.tsx` | 5a |
| `dashboard_demo.py` | 5c, 8 |

---

## What NOT to Touch

- **Python backend models** (`src/lcars_ui/`) — the DSL layer is complete and correct
- **Color token values** (`tokens.css` hex values) — the palette is already accurate to canonical LCARS
- **App.tsx** — `visualLanguage="strict"` is already correct
- **Transport/WebSocket logic** — infrastructure, not visual
- **Non-strict (classic) mode CSS** — out of scope; strict mode is the LCARS target

---

## Verification Protocol

After each element is implemented:

1. `cd lcars-ui && make frontend-bundle`
2. `python dashboard_demo.py` → open `http://localhost:8000`
3. Screenshot all 3 pages at 1920x1080
4. Compare against reference LCARS images for the specific element changed
5. The test: *Could this screenshot be mistaken for a frame from TNG?*
