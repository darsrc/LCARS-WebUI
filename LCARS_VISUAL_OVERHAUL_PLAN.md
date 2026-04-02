# LCARS WebUI — Visual Fidelity Overhaul + Python Starter Templates

## Context

**Why this change**: The Python DSL backend (`import lcars_ui as lcars`) is complete and functional. The problem is entirely visual — the frontend renders as a modern "dark glass dashboard" (gradients, rounded card panels, borders, semi-transparent surface tints) instead of authentic Star Trek LCARS. The current golden screenshots capture this broken state and must be wiped. The goal is to make the WebUI visually match canonical LCARS screens so the user can focus purely on Python, then provide 3 starter templates for their actual use cases (algo-trading backtesting, vibe-coding, game planning).

**What prompted it**: The user provided 5 canonical LCARS reference images. Side-by-side with the current golden screenshots, the gap is stark. The current UI doesn't look like LCARS at all.

**Intended outcome**: A WebUI that reads as an authentic LCARS console at first glance, with zero frontend knowledge required from the user.

---

## What Real LCARS Looks Like (Critical — Opencode Has No Vision)

### Structural anatomy at 1920×1080

```
┌─[ELBOW TL]──[ HEADER BAR: solid accent color, large dark title text ]──[ELBOW TR]─┐  ~74px tall
│                                                                                      │
│  [NAV BAR color1 LABEL]  │                                                          │
│  [NAV BAR color2 LABEL]  │                                                          │
│  [NAV BAR color3 LABEL]  │      PURE BLACK CONTENT AREA (#000000)                   │
│  [NAV BAR color4*LABEL]  │      No border. No radius. No tint. No gradient.         │
│  [NAV BAR color5 LABEL]  │      Content sits directly on black.                     │
│         ~180px wide      │                                                          │
│                                                                                      │
└─[ELBOW BL]──[ FOOTER BAR: solid accent color, small pill buttons ]──[ELBOW BR]─────┘  ~36px tall
```

### Visual rules extracted from 5 canonical reference images

| Element | Real LCARS | Current implementation (wrong) |
|---|---|---|
| Body background | Pure black `#000000` to `#020306` | 4-layer radial gradient with orange/blue glow |
| Header bar bg | **Solid accent color** (e.g. `#ff9900`) | Dark surface `rgba(2,4,9,0.9)` |
| Header title | Large 32-40px, bold, uppercase, **dark text on bright bar** | `LcarsBar` same color as header bg = invisible |
| Footer bar bg | **Solid accent color** | `transparent` |
| Sidebar rail | Transparent container holding stacked color bars | Glass panel with border + gradient |
| Nav items | Simple full-width solid-color bar with label text inside | Complex 2-column card: terminal stack + body panel |
| Active nav | Brighter + white outline | Complex inner outlines on sub-elements |
| Content frame | Pure `#000000`, zero chrome | Semi-transparent `rgba(1,3,8,0.86)` with gradient tint |
| Text on accent bars | Dark `#020306` (dark-on-bright) | Light `var(--lcars-text)` (light-on-dark) |

### What NOT to change (already correct)
- Color palette in `tokens.css` — all LCARS colors are right
- Geometry tokens in `geometry.css` / `geometryTokens.ts` — elbow sizes correct
- Font stack (Antonio) — already imported and used
- Python DSL backend — complete, do not touch
- `visualLanguage` hardcoded to `"strict"` in `App.tsx:395` — correct
- `accentStyle()` in `widgetStyles.ts` sets `--lcars-accent` CSS var — the new CSS uses it

---

## Files That Change

| File | Action | What changes |
|---|---|---|
| `lcars-ui/frontend/tests/visual/golden/*.png` | DELETE | All 6 broken golden screenshots |
| `lcars-ui/frontend/src/styles/lcars/base.css` | EDIT | Body background → pure black; add `.lcars-ui` height |
| `lcars-ui/frontend/src/styles/lcars/shell.css` | EDIT | Header bg, footer bg, content frame bg, nav items, text colors |
| `lcars-ui/frontend/src/components/shell/LcarsFrame.tsx` | EDIT | Header title markup, nav item markup |
| `lcars-ui/examples/algo_trading/app.py` | NEW | Algo-trading backtesting starter |
| `lcars-ui/examples/vibe_coder/app.py` | NEW | Vibe coding session tracker starter |
| `lcars-ui/examples/game_planner/app.py` | NEW | Game planning board starter |

---

## Phase 0 — Wipe Broken Goldens

**Why first**: Visual regression tests guard the broken state. Keeping them means every correct fix shows as a failure.

```bash
rm lcars-ui/frontend/tests/visual/golden/*.png
```

Deletes these 6 files:
- `overview-1920x1080.png`, `console-1920x1080.png`, `padd-1920x1080.png`
- `bridge-ops-1920x1080.png`, `padd-768x1024.png`, `console-768x1024.png`

---

## Phase 1 — Pure Black Background

**File**: `lcars-ui/frontend/src/styles/lcars/base.css`

### 1a. Body background

Find the `body` rule (lines 17–24). Replace the `background` property only:

```css
/* BEFORE (lines 19-23): */
background:
  radial-gradient(circle at 8% 14%, rgba(255, 153, 0, 0.08), transparent 42%),
  radial-gradient(circle at 90% 10%, rgba(51, 102, 204, 0.12), transparent 32%),
  radial-gradient(circle at 50% 100%, rgba(0, 17, 40, 0.3), transparent 60%),
  linear-gradient(180deg, var(--lcars-bg-2), var(--lcars-bg));

/* AFTER: */
background: var(--lcars-bg);
```

### 1b. Ensure `.lcars-ui` fills viewport

Add after the `body` closing brace:
```css
.lcars-ui {
  min-height: 100dvh;
}
```

---

## Phase 2 — Header Bar: Solid Accent Color + Dark Text

**File**: `lcars-ui/frontend/src/styles/lcars/shell.css`

### 2a. Header bar background (strict mode, ~line 304)

Find:
```css
.lcars-ui[data-visual-language="strict"] .lcars-header-bar {
  grid-template-columns:
    minmax(3.5rem, 3.5rem)
    auto
    minmax(0, 1fr)
    minmax(6.2rem, 6.2rem);
  background:
    linear-gradient(90deg, rgba(255, 255, 255, 0.06), transparent 34%),
    rgba(2, 4, 9, 0.9);
  color: var(--lcars-text);
  padding: var(--lcars-segment-gap);
  gap: var(--lcars-segment-gap);
}
```

Change `background` and `color` only (keep grid-template-columns, padding, gap):
```css
  background: var(--lcars-accent);
  color: #020306;
```

### 2b. Header subtitle + schema text (~line 331)

Find:
```css
.lcars-ui[data-visual-language="strict"] .lcars-header-subtitle,
.lcars-ui[data-visual-language="strict"] .lcars-schema {
  color: rgba(245, 248, 255, 0.74);
}
```

Change to:
```css
  color: rgba(2, 4, 9, 0.68);
```

### 2c. Transport badge on bright header (~line 357)

Find:
```css
.lcars-ui[data-visual-language="strict"] .lcars-transport {
  border: none;
  background: rgba(255, 255, 255, 0.2);
  color: #050a14;
}
```

Change to:
```css
  border: none;
  background: rgba(0, 0, 0, 0.22);
  color: #020306;
```

### 2d. Add header title text style (new rule — add after the subtitle rule block)

```css
.lcars-ui[data-visual-language="strict"] .lcars-header-title-text {
  font-family: var(--lcars-font-sans);
  font-size: clamp(1.2rem, 2.2vw, 2.2rem);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #020306;
  text-align: right;
  display: block;
  line-height: 1;
  align-self: center;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
```

---

## Phase 3 — Header Title Markup: LcarsBar → Plain Text

**File**: `lcars-ui/frontend/src/components/shell/LcarsFrame.tsx`

Find the `lcars-header-title-wrap` div (~lines 141–153):

**Before:**
```tsx
<div className="lcars-header-title-wrap">
  <LcarsBar
    className="lcars-header-title-bar"
    color={headerColor}
    label={manifest.layout.header.title}
    roundedEnd
    roundedStart
  />
  <p className="lcars-header-subtitle">
    {manifest.layout.header.subtitle ?? manifest.meta.app_name}
  </p>
</div>
```

**After:**
```tsx
<div className="lcars-header-title-wrap">
  <span className="lcars-header-title-text">
    {manifest.layout.header.title ?? manifest.meta.app_name}
  </span>
  <p className="lcars-header-subtitle">
    {manifest.layout.header.subtitle}
  </p>
</div>
```

**Why**: `LcarsBar` with `color={headerColor}` renders a bar the same color as the now-accent-colored header background — the title vanishes (orange on orange). Plain `<span>` with dark CSS color sits correctly on the bright bar.

---

## Phase 4 — Nav Items: Complex Cards → Simple LCARS Bars

### 4a. TSX simplification

**File**: `lcars-ui/frontend/src/components/shell/LcarsFrame.tsx`

Inside `navList`, find the `<button>` body within `manifest.layout.sidebar.items.map(...)` (~lines 87–110).

**Before** (2-column grid with terminal + body + segments + label):
```tsx
<button
  aria-label={item.label}
  aria-current={activePageId === item.target_page ? "page" : undefined}
  className={clsx("lcars-nav-item", { active: activePageId === item.target_page })}
  key={item.id}
  onClick={() => onSelectPage(item.target_page)}
  type="button"
>
  <LcarsSegmentedBar
    className="lcars-nav-item-terminal"
    orientation="vertical"
    segments={navTerminalSegments}
  />
  <div className="lcars-nav-item-body">
    <LcarsSegmentedBar
      className="lcars-nav-item-segments"
      orientation="vertical"
      segments={navSegments}
    />
    <span className="lcars-nav-item-label">{item.label}</span>
  </div>
</button>
```

**After** (single LcarsBar):
```tsx
<button
  aria-label={item.label}
  aria-current={activePageId === item.target_page ? "page" : undefined}
  className={clsx("lcars-nav-item", { active: activePageId === item.target_page })}
  key={item.id}
  onClick={() => onSelectPage(item.target_page)}
  type="button"
>
  <LcarsBar
    color={item.color ?? headerColor}
    label={item.label}
  />
</button>
```

Also remove the now-unused `navSegments` and `navTerminalSegments` variables computed inside the `.map()`. The `sidebarSegments` helper function (~line 46) can be removed if nothing else references it.

### 4b. CSS replacement for nav items

**File**: `lcars-ui/frontend/src/styles/lcars/shell.css`

Replace the entire block of strict-mode nav-item rules (~lines 363–418, everything from `.lcars-nav-stack` through `.lcars-nav-item-label`) with:

```css
.lcars-ui[data-visual-language="strict"] .lcars-nav-stack {
  gap: var(--lcars-segment-gap);
}

.lcars-ui[data-visual-language="strict"] .lcars-nav-item {
  border: none;
  border-radius: 0;
  background: transparent;
  padding: 0;
  display: block;
  width: 100%;
  cursor: pointer;
  min-height: var(--lcars-bar-height-thick);
}

.lcars-ui[data-visual-language="strict"] .lcars-nav-item .lcars-bar {
  width: 100%;
  min-height: var(--lcars-bar-height-thick);
  border-radius: 0;
}

.lcars-ui[data-visual-language="strict"] .lcars-nav-item:hover {
  filter: brightness(1.1);
}

.lcars-ui[data-visual-language="strict"] .lcars-nav-item.active {
  filter: brightness(1.2);
  outline: 2px solid rgba(255, 255, 255, 0.65);
  outline-offset: -2px;
}
```

---

## Phase 5 — Footer Bar: Solid Accent Color

**File**: `lcars-ui/frontend/src/styles/lcars/shell.css`

Find the combined rule (~line 336):
```css
.lcars-ui[data-visual-language="strict"] .lcars-footer-bar,
.lcars-ui[data-visual-language="strict"] .lcars-sidebar-rail {
  background: transparent;
  padding: var(--lcars-segment-gap);
  gap: var(--lcars-segment-gap);
  display: grid;
  align-content: start;
  min-height: 0;
  overflow: auto;
}
```

**Split** into two separate rules — sidebar stays transparent, footer gets accent:

```css
.lcars-ui[data-visual-language="strict"] .lcars-sidebar-rail {
  background: transparent;
  padding: var(--lcars-segment-gap);
  gap: var(--lcars-segment-gap);
  display: grid;
  align-content: start;
  min-height: 0;
  overflow: auto;
}

.lcars-ui[data-visual-language="strict"] .lcars-footer-bar {
  background: var(--lcars-accent);
  color: #020306;
  padding: var(--lcars-segment-gap);
  gap: var(--lcars-segment-gap);
  display: grid;
  align-content: center;
  min-height: 0;
}
```

Add after:
```css
.lcars-ui[data-visual-language="strict"] .lcars-footer-bar .lcars-bar-label,
.lcars-ui[data-visual-language="strict"] .lcars-footer-bar .lcars-transport {
  color: #020306;
}
```

---

## Phase 6 — Content Frame: Pure Black

**File**: `lcars-ui/frontend/src/styles/lcars/shell.css`

Find strict content frame rule (~line 420):
```css
.lcars-ui[data-visual-language="strict"] .lcars-content-frame {
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.04), transparent 26%),
    rgba(1, 3, 8, 0.86);
```

Change `background` only:
```css
  background: #000000;
```

---

## Phase 7 — Build + Manual Verification

```bash
cd lcars-ui
make frontend-bundle          # rebuilds React → _static/
python examples/bridge_ops/app.py   # http://localhost:8000
```

Expected result in browser:
- Solid orange header bar with large dark uppercase title text
- Solid orange footer bar with dark text
- Pure black content area, no border or tint
- Left sidebar: plain stacked colored bars (one per nav item)
- Orange SVG corner elbows connecting header↔sidebar and footer↔sidebar
- Full viewport height — no black void below the layout

---

## Phase 8 — Re-Capture Golden Screenshots

```bash
cd lcars-ui/frontend
npx playwright install chromium
npm run test:visual
```

The bakeoff tests write screenshots to `test-results/`. Review them, copy correct ones into `tests/visual/golden/` with canonical names:
- `overview-1920x1080.png`
- `console-1920x1080.png`
- `padd-1920x1080.png`
- `bridge-ops-1920x1080.png`

Commit the new goldens.

---

## Phase 9 — Python Starter Templates

Create 3 new files in `lcars-ui/examples/`:

### `algo_trading/app.py`
Backtesting dashboard. Shows: equity curve chart, trade log table, metrics (total return, max drawdown, Sharpe, win rate), buttons for "Run Backtest" and "Export Results". Two pages: Overview + Trades.

### `vibe_coder/app.py`
Coding session tracker. Uses `@lcars.live(interval=2.0)`. Shows: session status metric, text input for current task, buttons (Log Task, Ship It, Stuck), running table of completed tasks. Two pages: Session + Log.

### `game_planner/app.py`
Game design board. Purple header color. Shows: feature roadmap table, completion progress bar, balance notes text input + log table, action buttons. Two pages: Features + Balance.

Each template has clearly marked `# --- Replace with your actual data ---` sections and a docstring with run instructions.

---

## Verification Checklist

- [ ] All 6 old golden PNGs deleted
- [ ] Body background is `var(--lcars-bg)` — no gradient bleed
- [ ] Header bar is solid `var(--lcars-accent)` — not dark
- [ ] Header title is large bold dark text on bright bar — not invisible
- [ ] Nav items are simple colored bars — not 2-column cards
- [ ] Footer bar is solid accent — not transparent
- [ ] Content frame is `#000000` — no tint
- [ ] Full viewport height used
- [ ] 3 example templates run with `python examples/*/app.py`
- [ ] `make frontend-bundle` succeeds
- [ ] New golden screenshots committed

## Constraints

- Do NOT touch `tokens.css`, `geometry.css`, `geometryTokens.ts` — values are correct
- Do NOT modify anything in `lcars-ui/src/lcars_ui/` — Python backend is done
- Do NOT change `visualLanguage = "strict"` in `App.tsx:395`
- `accentStyle()` sets `--lcars-accent` CSS var — the new CSS backgrounds use `var(--lcars-accent)` so colors flow correctly from the Python `header_color` config
