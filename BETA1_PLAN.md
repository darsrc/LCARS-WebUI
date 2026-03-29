# Beta 1.0 Plan — LCARS WebUI

## Context

The codebase is a Phase 18–closed POC/academic exercise. It contains a working
React+FastAPI LCARS dashboard framework but is burdened by oracle acceptance
infrastructure (phase14_family scenes, renderer bake-off harness, JoernStrict
renderer) that has no place in a Beta product. The image shared by the user
shows the current broken state: content overflow in the strict-mode frame (input
controls bleeding outside the right elbow), nav labels that are nearly invisible
(0.62 rem), and an App.tsx that is 740 lines of conditional oracle/fixture logic
wrapping a 200-line product core.

Beta 1.0 requires: a clean product-only codebase, a fixed LCARS layout that
visibly looks correct, a curated widget set, a working demo, and the ability for
a text-only coder (Qwen3 30B) to work on it without visual feedback.

---

## 1 — Where the codebase is

| Layer | Tech | Status |
|---|---|---|
| Frontend | React 18 / TypeScript / Vite | Builds. Ships `legacy_strict` renderer. |
| Backend | FastAPI / Python 3.10+ | Builds. DSL API in `lcars_ui.dsl.api`. |
| CSS | Custom LCARS tokens + Tailwind 3 | `geometry.css` overrides `tokens.css` for strict mode. |
| Frame | `LcarsFrame.tsx` + `shell.css` | Works but `--lcars-shell-frame` lacks explicit `grid-template-rows` in strict mode, causing content overflow. |
| Renderer | `LegacyStrictPageRenderer.tsx` | Functional. Wrapped in dead oracle/bakeoff code in `App.tsx`. |
| Tests | Vitest (31 pass) + Playwright (2 pass) | Many guardrail tests are oracle-only and will be removed. |

Critical visual bugs (identified from image + CSS audit):
- **Content overflow**: `.lcars-shell-frame` in strict mode has no explicit
  `grid-template-rows`. The content-area row expands unconstrained, pushing
  widgets past the footer and right elbow.
- **Nav label invisibility**: `font-size: 0.62rem` in strict mode nav labels.
- **Oracle complexity in App.tsx**: 500+ lines of conditional phase14/bakeoff
  logic wraps the 200-line product rendering path.

---

## 2 — Beta 1.0 supported widget set (final)

### Input (8)
`button` · `toggle` · `checkbox` · `radio_toggle` · `select` ·
`text_input` · `number_input` · `form`

### Display (9)
`text` · `alert` · `status_tile` · `progress` · `gauge` ·
`table` · `line_chart` · `sparkline` · `markdown`

### Streaming (1)
`log_viewer`

### Container (4)
`lcars_box` · `lcars_sweep` · `lcars_bracket` · `lcars_header`

### Media (2, optional/advanced)
`video_hls` · `mic_button`

**Total: 24 widgets.** `joern_strict`-only widgets are dropped. The `form` composite widget wraps the 6 input primitives.

### Design decisions (locked)
- Visual language: **strict** only (remove classic code paths from product)
- Renderer: **`legacy_strict`** only (remove `joern_strict`, `phase14_family`)
- Themes: **galaxy** (default) · **tng** · **nemesis**
- Font: Antonio (LCARS headers); Segoe UI (body); JetBrains Mono (code)
- Min console width: `--lcars-strict-min-console-width` (currently unset — set to `900px`)

---

## 3 — Plan: POC → Beta 1.0

### Phase A — Codebase cleanup (removes ~40 % of frontend, all oracle Python)

**A1 — Remove oracle/acceptance frontend files**

Delete entirely:
```
frontend/src/components/phase14/             # HolodeckFamilyScene, PeriodicTableFamilyScene,
                                             # SeismographicFamilyScene + data files
frontend/src/fixtures/                       # phase14TargetFixtures.ts, rendererBakeoffHarness.ts
frontend/src/components/strict/JoernStrictPageRenderer.tsx
frontend/src/styles/lcars/phase14-scenes.css
frontend/src/styles/lcars/joern-bridge.css
frontend/src/test/targetBankGuardrails.test.ts
frontend/src/test/overviewParityGuardrails.test.ts
frontend/src/test/joernGuardrails.test.ts
frontend/src/test/parityRetirementGuardrails.test.ts
frontend/src/test/strictRoleHeuristicGuardrails.test.ts
frontend/src/test/phase15PrimitiveBoundaryGuardrails.test.ts
frontend/src/test/phase16CatalogGuardrails.test.ts
```

Remove CSS imports from `frontend/src/main.tsx` (or wherever phase14-scenes and
joern-bridge are imported).

**A2 — Rewrite App.tsx to product-only (~200 lines)**

Key simplifications:
- Remove all `bakeoffRequest`, `bakeoffResolution`, `phase14*` state/memo/refs
- Remove all conditional oracle scene renders
- Keep: manifest load → transport → `LcarsFrame` → `LegacyStrictPageRenderer`
- Remove `joernDeprecatedCompatibilityMode` branch (it now just shows a notice — delete it)
- Remove `strictRenderer === "joern"` branch (only `legacy` remains)
- Keep `showPageTitleBar` logic (still needed for classic-style title bar if manifest requests it)
- Keep `visualLanguage` detection BUT the product now only renders `strict` (if manifest says "classic", still render strict; or remove classic path entirely and update contract)

**A3 — Remove JoernStrictPageRenderer import chain**

After deleting the file, remove the import from App.tsx and any CSS that was
imported only for joern (`joern-bridge.css`).

**A4 — Backend oracle cleanup**

Audit `lcars-ui/src/lcars_ui/`:
- `dsl/_recipes.py` — review and remove any oracle-only recipes not exposed in public DSL
- `dsl/_normalize.py` — keep; compatibility repair still needed for old manifests
- `core/models.py` — keep; contract is still valid

Remove backend test files that only test oracle/phase14 acceptance if they exist.
Keep: `tests/contracts/`, `tests/unit/test_phase13_*.py`, `tests/integration/`.

---

### Phase B — Layout fixes (fixes the visible LCARS bugs)

**B1 — Fix strict-mode shell height containment** (`shell.css`)

The root cause of content overflow: `.lcars-shell-frame` in strict mode has no
explicit height or `grid-template-rows`. Content expands the frame past 100 vh.

Add to the `[data-visual-language="strict"] .lcars-shell-frame` rule:
```css
height: 100dvh;                        /* lock frame to viewport */
grid-template-rows: auto 1fr auto;    /* header / content-stretch / footer */
overflow: hidden;
```

This makes `.lcars-shell-middle` (the `1fr` row) fill remaining height, and the
`.lcars-content-frame` inside it (already `overflow: auto`) will scroll rather
than overflow.

Also verify `.lcars-shell-middle` has `min-height: 0` in strict mode (it
inherits from base but may need re-declaration after the `1fr` fix).

**B2 — Fix nav label visibility** (`shell.css`)

Current: `.lcars-ui[data-visual-language="strict"] .lcars-nav-item-label { font-size: 0.62rem; }`

Change to:
```css
font-size: 0.72rem;
font-weight: 700;
letter-spacing: 0.06em;
color: var(--lcars-text);
```

**B3 — Set min console width** (`geometry.css` or `tokens.css`)

Add to the `:root` block in `geometry.css`:
```css
--lcars-strict-min-console-width: 900px;
```

This token is already referenced in `shell.css` strict frame rule but never set.

**B4 — Fix radio_toggle overflow in terminal** (`controls.css`)

The `lcars-control-radio-surface` (or similar) renders a horizontal strip that
doesn't wrap. Find the rule that renders the radio toggle button row and add:
```css
flex-wrap: wrap;
gap: var(--lcars-segment-gap);
```

Also add to `.lcars-strict-lane-terminal-item`:
```css
overflow: hidden;
min-width: 0;
```

**B5 — Set explicit elbow size in strict mode** (`geometry.css`)

`tokens.css` sets `--lcars-elbow-size: clamp(68px, 6vw, 88px)` but `geometry.css`
sets `--lcars-elbow-size: 120px`. The 120px in strict mode may be oversized for
narrow viewports and clips content. The shell.css strict rule for
`.lcars-shell-top` and `.lcars-shell-bottom` uses `--lcars-shell-rail-width` (180px)
as the grid column width for the elbows, which is correct. No change needed here
unless visual audit shows elbow clipping; document as known.

---

### Phase C — Demo overhaul

**C1 — Create `examples/beta1_showcase.py`**

Replace the all-in-one showcase with a properly structured multi-page demo:

- **Page: Dashboard** — Status overview (metric tiles, progress bar, gauge, alert)
  + a small line chart. One control panel with 2 buttons. This is the "landing page."
- **Page: Inputs** — One panel per input widget category:
  - Buttons + toggle
  - Radio toggle (use only 3 options to fit narrow terminal)
  - Select + text_input + number_input
  - Form (composite)
- **Page: Data** — Table, line chart, sparkline, markdown, log viewer
- **Page: Containers** — One of each: lcars_box, lcars_sweep, lcars_bracket

DSL recipe for each page: use `lcars.console()` + `lcars.control_panel()` with
enough padding that no panel overflows. Limit `radio_toggle` to 3 options max.

**C2 — Update `examples/dashboard.py`** to fix the radio_toggle overflow:

The existing demo uses:
```python
alert_posture = lcars.radio_toggle("Alert Posture", ["Green", "Yellow", "Red"], ...)
```
This is fine. The overflow seen in the image is likely from the widget showcase
demo (which has "Impulse, Warp 1, Warp 3, Warp 9" = 4 options). Limit
radio_toggle terminal placement to 3 options maximum in the demo.

---

### Phase D — Documentation + release prep

**D1 — Update `lcars-ui/README.md`**

Add a "Beta 1.0 Widget Reference" table with all 24 supported widgets, their
DSL function name, and a one-line description.

**D2 — Update `RELEASE_NOTES.md`**

Add Beta 1.0 section documenting:
- Supported widget set (24 widgets)
- Breaking changes: `joern_strict` removed, `phase14_family` removed, `classic`
  visual language removed from product (strict only)
- Known limitations: no drag-and-drop, no widget-to-widget binding, no i18n

**D3 — Version bump**

`lcars-ui/pyproject.toml`: set `version = "1.0.0b1"` (PEP 440 beta format)

**D4 — `CURRENT_STATE.md`**

Overwrite with a Beta 1.0 state description: active renderer is `legacy_strict`,
oracle infrastructure removed, supported widget set finalized.

---

## 4 — Critical files to modify

| File | Change |
|---|---|
| `frontend/src/App.tsx` | Rewrite to ~200 lines (remove oracle/bakeoff) |
| `frontend/src/styles/lcars/shell.css` | Add `grid-template-rows + height: 100dvh` to strict frame; fix nav label font |
| `frontend/src/styles/lcars/geometry.css` | Add `--lcars-strict-min-console-width: 900px` |
| `frontend/src/styles/lcars/controls.css` | Fix radio_toggle flex-wrap |
| `frontend/src/main.tsx` | Remove phase14-scenes.css and joern-bridge.css imports |
| `examples/beta1_showcase.py` | New file: clean multi-page showcase |
| `lcars-ui/pyproject.toml` | Version → `1.0.0b1` |
| `RELEASE_NOTES.md` | Add Beta 1.0 section |
| `CURRENT_STATE.md` | Overwrite with Beta 1.0 state |

Files to **delete** (see Phase A above):
- `frontend/src/components/phase14/` (directory)
- `frontend/src/fixtures/` (directory)
- `frontend/src/components/strict/JoernStrictPageRenderer.tsx`
- `frontend/src/styles/lcars/phase14-scenes.css`
- `frontend/src/styles/lcars/joern-bridge.css`
- `frontend/src/test/*Guardrails.test.ts` (7 oracle-only test files)

---

## 5 — Verification (text-only, no visual LLM required)

1. **TypeScript build**: `cd lcars-ui/frontend && npm run build` — must PASS, zero TS errors
2. **Frontend unit tests**: `npm run test` — expect ~15 tests pass (after oracle tests removed)
3. **Backend type check**: `python -m mypy src` — must PASS
4. **Backend unit tests**: `python -m pytest tests/contracts/ tests/unit/ -q` — must PASS
5. **Smoke test**: `python scripts/run_smoke_test.py` — must PASS
6. **Demo runs**: `PYTHONPATH=src python examples/beta1_showcase.py` — server starts on port 8104, no Python errors
7. **Manifest shape**: `curl http://localhost:8104/lcars/manifest` — returns valid JSON with `"version": "1.0"` and the pages defined in the demo

**Layout correctness verification (text-based)**:

After the shell.css fix, verify in browser devtools (or describe to coder):
- `document.querySelector('.lcars-shell-frame').style` → should report `height: 100dvh`
- `document.querySelector('.lcars-content-frame').scrollHeight` ≤ `clientHeight + scrollTop` (no hidden overflow)
- `document.querySelectorAll('.lcars-nav-item-label')` → computed font-size ≥ 11px

HTML structure assertions the coder can verify without visuals:
- `<main class="lcars-ui" data-strict-renderer="legacy" data-visual-language="strict">` exists
- No element with class `phase14`, `holodeck`, `seismographic`, `periodic-table`, or `bakeoff` exists in DOM
- `<div class="lcars-shell-frame">` contains exactly 3 direct children: `.lcars-shell-top`, `.lcars-shell-middle`, `.lcars-shell-bottom`
