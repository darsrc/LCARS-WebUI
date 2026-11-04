# Scene compositor design (M2)

Implements V8-D01…D06 and D11 ([decisions.md](decisions.md)). This document is the dispatch
spec for M2. Every module below is pure TypeScript unless marked **DOM**.

## 0. Pipeline

```text
SceneWidget + current mode ──► deriveSlots()        compose/scene/slots.ts
                                   │
field {w,h} + Measurer ───────────►│
                                   ▼
                      chooseLayout()                compose/scene/choose.ts
                        for family in preference list:
                          family(slots, field, measurer, tokens)
                            → Candidate | Infeasible(reason)
                                   ▼
                          ResolvedScene             compose/scene/types.ts
                                   ▼
                       <SceneRenderer>  (DOM)       widgets/SceneRenderer.tsx
                SVG structural layer + absolutely placed region DOM
```

Directory: `frontend/src/compose/scene/`. Families live in `compose/scene/families/<name>.ts`.

## 1. Types (`compose/scene/types.ts`)

```ts
export interface Rect { x: number; y: number; w: number; h: number }
export interface Field { w: number; h: number }

export interface SceneTokens {          // spec geometry tokens (V8-D14)
  band: number;        // 24  structural band thickness
  elbowOuter: number;  // 48  elbow outer radius (inner = outer - band)
  gap: number;         // 8   clearance between bands and region interiors
  pad: number;         // 12  region interior padding
  target: number;      // 44  min control target
  terminalH: number;   // 44  height of a terminal/segment-bank button row
  regionMinW: number;  // 200 min interior width of any region
  regionMinH: number;  // 96  min interior height of a growing region
}
export const DEFAULT_SCENE_TOKENS: SceneTokens;

/** Height a region's content needs at a given interior width. Families never touch the DOM. */
export interface Measurer { height(regionId: string, width: number): number }

export type Visibility = "full" | "summary" | "terminal" | "hidden";
export interface Placement { regionId: string; rect: Rect; visibility: Visibility; scroll: boolean }

export type PathKind = "band" | "elbow" | "junction" | "connector" | "bridge" | "step";
export interface ScenePath {
  id: string; kind: PathKind; d: string;          // SVG path data, field coordinates
  tone: "frame" | "focal" | "commands" | "alert" | "relation";
  relationId?: string;                             // when the path expresses a relation
}
export interface Terminal {                        // labelled endpoint on a band
  id: string; label: string; rect: Rect;
  kind: "context" | "folded-region" | "return";
  regionId?: string;                               // folded region it stands for
}
export interface Candidate {
  family: Family; orientation: "landscape" | "portrait";
  placements: Placement[]; paths: ScenePath[]; terminals: Terminal[];
}
export type FamilyResult = { ok: true; candidate: Candidate } | { ok: false; reason: string };
export interface ResolvedScene extends Candidate {
  revision: number; modeId: string; field: Field;
  order: string[];            // semantic reading order = slot order (V8 reading-order rule)
  explanation: string;        // e.g. "fork (landscape): mode COMPARE; optional NOTES folded"
}
```

## 2. Slots (`compose/scene/slots.ts`)

`deriveSlots(scene, modeId) → Slots`, pure, implementing V8-D03:

```ts
interface Slots {
  focal: string[];      // mode.focal, in declared order (1 or 2 used by families)
  commands: string[];   // regions in mode with a `controls` relation whose target is focal
  details: string[];    // `details` → focal
  alerts: string[];     // `recovers` → focal
  context: string[];    // every other required/optional region in the mode
  optional: Set<string>;// which of the above came from mode.optional
  foldable: Set<string>;// optional && region.fold !== "never"
  relations: SceneRelation[]; // only those with both ends in the mode
}
```

A region's explicit `slot=` overrides derivation. Order within each slot is the mode's
declaration order (focal, then required, then optional). `order` in `ResolvedScene` is
`[...focal, ...alerts, ...commands, ...details, ...context]`. An alert is read before commands.

## 3. Hard constraints (every family enforces these and returns `Infeasible(reason)` otherwise)

1. Every placed region interior satisfies `w ≥ regionMinW`. Every control region (role `commands`,
   `context`, `detail`, `alert`) also has `h ≥ measurer.height(id, w)`: controls never scroll.
   Growing regions (`instrument`, `data`, `viewer`) need `h ≥ regionMinH` and scroll internally.
2. No two placements overlap. No placement overlaps a band (bands live in gutters).
3. A non-foldable region in the mode is placed `full`. Foldable optional regions may become
   `terminal` (a labelled button on a band). Nothing required is ever `hidden`.
4. Each `controls` / `details` / `recovers` relation is expressed: the source region shares a
   band with, or is joined by a path/junction to, its focal target.
5. Text is never scaled. If it doesn't fit, the family is infeasible.

Each family first tries with all optional regions `full`. If that fails, it retries with all
foldable optionals as terminals, then gives up.

## 4. Geometry kernel (`compose/scene/geometry.ts`)

Builds on `widgets/surfaceGeometry.ts` (`elbowPath`, `pathFromCommands`, `connectorPath`).
All functions are pure and return `ScenePath`/`d` strings.

- `hBand(x, y, w, t)` / `vBand(x, y, h, t)`: straight band, rounded only at a free end
  (`cap: "none" | "start" | "end" | "both"`, cap radius = t/2).
- `elbow(rect, corner, armX, armY, outer, inner)`: wraps `elbowPath`. `inner = outer − band`
  is the constant-width rule.
- `junction(x, y, t, branches: ("up"|"down"|"left"|"right")[])`: a T or cross where bands
  meet, drawn as one filled shape so there's no seam.
- `stepPath(points, t, radius)`: a stepped band through orthogonal points with rounded turns
  (for `contour`).
- `bridge(a: Rect, b: Rect, t)`: a short band across the gutter between two rects, at their
  shared vertical midpoint (for `fork`).

Tests: path strings are deterministic, endpoints land on the requested coordinates, the
constant-width rule holds, and no NaN appears.

## 5. Families (each `(slots, field, measurer, tokens) → FamilyResult`)

Notation: `B` = band, `G` = gap, `R` = elbowOuter. Regions sit in the areas the bands
leave free, inset by `G`. Each family has a landscape variant (`field.w ≥ field.h`) and a
portrait variant. The portrait variant transposes the layout.

### wrap: one focal, context wrapped around it on two edges
Landscape: a **left column** of width `Wl` stacks context terminal, commands and alerts
top-to-bottom. A **bottom row** of height `Hb` holds details and context side by side. The
**focal aperture** is the remaining top-right area. One structural band runs down the
column's inner edge, turns through a bottom-left **elbow** and runs along the bottom row's top
edge, so it wraps the aperture on two sides. Commands sit as a segment bank against the
vertical band. `Wl = max(regionMinW, widest commands min-width)`, `Hb = max(measured heights in
the row)`, or `0` when the row is empty, in which case there's no elbow and the band is
straight. Focal gets everything else and must still pass constraint 1.

### branch: main spine with an anchored unequal branch
Landscape: a horizontal **spine** band along the top. The focal sits under its left ~62%. The
details/context **branch** drops from a **junction** on the spine into the right ~38% column
via an elbow. Commands are a terminal bank at the spine's left end. Alerts take the top of
the branch column, directly under the junction, with a `recovers` path to the focal. The
split ratio flexes between 0.55 and 0.70 so both sides meet constraint 1. Portrait: the spine
is vertical on the left and the branch hangs below the focal.

### fork: two focal subjects from a shared origin, plus a difference bridge
Landscape: an **origin column** on the left (context terminal + commands). A top band leaves
the origin and splits at a **junction** into two elbows dropping onto focal A and focal B,
which share the remaining width equally. A **bridge** (`kind: "bridge"`,
`relationId` = the compares relation) crosses the gutter between A and B. The gutter is at
least `2G + B`. Details become terminals. Infeasible unless `slots.focal.length === 2`.
Portrait: A above B, origin as a top band.

### contour: stepped depth for dense or editing work
Landscape: the focal takes the full height on the left at width ≥ 55%. The remaining
regions (commands first, then details, then context) stack on the right, each step
**indented** further than the one above by `B + G`, with heights from the measurer. One
`stepPath` band traces the stepped boundary between the focal and the stack. Portrait:
the stack goes under the focal, stepping right-to-left.

### focus: last resort before the access view
The focal (first only) fills the field minus a top **context band** of height
`terminalH + 2G`. Every other required/optional region becomes a `terminal` on that band
(`kind: "folded-region"`). A `return` terminal appears when the mode has `returns_to`. This is
infeasible only if the focal can't meet constraint 1 even at full field. In that case the
renderer shows `SceneAccessView`.

## 6. Chooser (`compose/scene/choose.ts`)

```ts
chooseLayout(scene, modeId, field, measurer, tokens, previous?: ResolvedScene): ResolvedScene | null
```
1. `families = mode.families`, with `"focus"` appended if absent.
2. **Continuity (hysteresis):** if `previous` exists, has the same `modeId` and its family is
   still feasible, keep that family even if an earlier preference would now fit.
   Anti-flip-flop only.
3. Otherwise return the first feasible family in preference order.
4. `null` means nothing fits. The renderer falls back to the access view.
5. `explanation` names the family, orientation, mode label, folded regions and every
   rejected family with its reason.
Deterministic: same inputs give the same output. No randomness, no timers.

## 7. Renderer (`widgets/SceneRenderer.tsx`, **DOM**)

- Root `div.lcars-scene` fills the page (`position: relative`). A `ResizeObserver` reads `field`.
- **Every region in the scene is always mounted**, keyed by region id, as an absolutely
  positioned `section` (`aria-labelledby` its heading). Regions not in the resolved
  placements get the `hidden` attribute, so they're never unmounted and editors keep state
  (V8-D11 groundwork).
- **Measurer (DOM):** `height(id, w)` sets the live region element's width to `w` with
  `height: auto`, reads `scrollHeight`, then restores it. Results are cached by
  `(id, round(w/16))`. A `ResizeObserver` on each region's content clears that region's
  cache entries. Runs inside `useLayoutEffect` before paint, so there's no flicker.
- The SVG layer sits under the regions, has `pointer-events: none` and `aria-hidden`, and
  draws `paths` with tone → CSS var (`frame`→`--lcars-frame`-ish existing token,
  `alert`→the existing alert token).
- Terminals are real `<button>`s with visible labels, min 44×44. A `folded-region` terminal
  sets a local "focused region" state that re-solves with that region as focal in `focus`
  family. A `return` terminal posts the scene's return action (wired in M3; render it
  disabled with a reason until then).
- `data-scene-family`, `data-scene-orientation` and `data-scene-explanation` on the root
  allow DOM-level assertions in tests, which avoids screenshots.
- If `chooseLayout` returns `null`, render `SceneAccessView` instead.
- `SceneAccessView` is also offered through a visible "LINEAR VIEW" toggle (full version in M4).

## 8. Testing strategy (token-frugal)

- Families and the chooser are unit-tested with a **fake Measurer**
  (`height = (id, w) => table[id] ?? 80`) over fields: 1920×1080, 1366×768, 1080×1920,
  768×1024, 390×844.
- Shared invariant helper `assertCandidateValid(candidate, slots, tokens)`: no overlaps,
  regions ≥ min sizes, every required region present, relations expressed, no NaN. Every
  family test calls it.
- Renderer: vitest + jsdom for structure (ids, hidden vs mounted, terminals are buttons).
  Geometry correctness comes from the pure tests.
- One batched Playwright screenshot pass at the end of M2 (step 2.4.2), not per family.

## 9. Visual fidelity pass (M2 phase 2.5, from the 2.4.2 review)

The first capture (16 shots: 4 modes × 4 fields) proved the mechanism: the same viewport
changes topology per task. It failed the LCARS identity test. These rules fix that. They apply
to every family. The spec allows them: "band thickness 24px … defaults, not fixed dimensions
for every composition" (LCARS.md §6).

### 9.1 Asymmetric frame: wide spine, thin arm
- New tokens: `spine: 112` (vertical structural member width, landscape) and `arm: 24`
  (horizontal member thickness, = `band`). A structural **elbow joins a spine and an arm**
  with `armX = spine`, `armY = arm`, outer radius `elbowOuter` (48), inner radius `arm`
  (24). This is the asymmetric elbow from `surfaceGeometry.elbowPath`. The
  constant-width rule still applies to band-to-band turns (connectors, step paths).
- In portrait, the roles transpose: the spine runs horizontally along the top, with height
  `spine × 0.6` (≈ 68), and the arm runs vertically.
- **The spine carries terminals.** The context terminal (mode label) and folded-region
  terminals are stacked **inside** the spine as solid colour blocks the full width of the
  spine. They're separated by `gap`-sized black seams, labels are right-aligned and
  bottom-aligned in the block, and each is ≥ 44 px tall. Leftover spine length becomes
  plain spine segments (decorative, `aria-hidden`), so the spine always reaches its elbow.
  This replaces the plain-text context label and the grey terminal boxes.
- Every free band end gets a rounded cap (`cap: "end"`). A band meeting the field edge
  stays square.

### 9.2 Families adopt the frame
- **wrap:** spine = the left column's band, elbow at bottom-left into the bottom arm. The
  command bank sits *beside* the spine as now. The spine's top holds the context block.
- **branch:** spine = vertical on the left (landscape too). The top arm runs from the
  top-left elbow along the top. The branch drops from a junction on the arm via a second
  elbow (constant-width) into the branch column.
- **fork:** spine on the left. The top arm splits at a junction into two downward
  constant-width elbows, one landing on A and one on B. The **bridge** is a horizontal
  band segment across the A|B gutter at the focal regions' vertical centre, with both ends
  touching the region edges and a centred label block "COMPARE" (or the relation label).
  It's never a floating square. Gutter ≥ 96 px so the label fits.
- **contour:** spine on the far left. The step band starts from a top-left elbow.
- **focus:** spine on the left (landscape) or top (portrait) holding *all* terminals:
  return, context, folded regions.

### 9.3 Regions fill their interiors
- A region interior is a flex column. Its heading is fixed-size and its content area
  `flex: 1; min-height: 0`.
- **Growing content fills the region.** Charts, tables, logs, viewers, node canvases and
  three scenes inside a growing region (`instrument`, `data`, `viewer`) stretch to the
  content area's full height. Use the widgets' existing fill/height mechanism; add one
  only if none exists. A focal chart must not render at a fixed small height inside a large
  aperture.
- A growing region's placement height must be ≥ `regionMinH` **and** ≥ the content's own
  minimum (charts: 160). The contour stack must give growing regions at least that, or
  fold/fail. It must never squash a chart to a sliver.

### 9.4 Colour and type
- Tones: `frame` → orange, `focal` → periwinkle, `commands` → canary, `alert` → salmon/red,
  `relation` → lilac. Spine blocks alternate frame tones (orange, then a lighter
  orange/peach). Folded-region blocks use lilac. The context block uses the frame tone.
  Labels on filled blocks use black ink (dark ink on light fills, LCARS.md §6).
- Region headings keep the existing amber label style. Regions get no borders or cards.

### 9.5 Acceptance for 2.5 (checked by DOM probe, then one recapture)
- `data-scene-orientation` and `data-scene-explanation` are present on `.lcars-scene`
  (the capture printed null).
- In every resolved scene, at least one `elbow` path has `armX ≠ armY`. There are spine
  terminal blocks, and no terminal uses a grey background.
- The fork bridge's bbox touches both focal rects (|gap| ≤ 1 px).
- In every capture, each growing region's first chart/table element has height ≥ 60% of
  its region's content area.
