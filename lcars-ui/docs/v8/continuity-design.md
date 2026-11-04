# Continuity design (M3)

PLAN.md M3. This covers how a resolved scene reaches the screen without costing the
user their place. It builds on [compositor-design.md](compositor-design.md) and
V8-D06, D07 and D11.

## 1. Commit reasons

Each new `ResolvedScene` produced by `chooseLayout` has a reason:

| Reason | Source | Example |
|---|---|---|
| `user` | `widget.mode` changed with `mode_reason="user"`, or the user clicked a terminal (focus, return, APPLY) | COMPARE button → fork |
| `server` | `widget.mode` changed with `mode_reason="server"` | live loop raises a fault |
| `field` | the scene root was resized | window resize, rotation |
| `content` | a region's measured content changed | log grew, chart re-rendered |

## 2. Structural vs geometric

A commit is **structural** when, compared with the committed scene, any of these differ:
the family, the orientation, the set of regions placed `full`, or the set of folded
terminals. Anything else is **geometric** (rects move or resize), which always commits
at once, because region DOM is never remounted (regions stay mounted and are keyed by id).

## 3. Interaction locks (frontend only, V8-D11)

A region is locked while any of these hold inside it:

- **focus**: `focusin`/`focusout`
- **pointer**: `pointerdown` until `pointerup`/`pointercancel`
- **composing**: `compositionstart` until `compositionend`
- **dirty**: an `input` event since the last `submit` in that region, or since every
  text field in it returned to its default value

Listeners are delegated on the scene root. `closest("[data-region-id]")` finds the region.

## 4. Commit scheduler (pure: `compose/scene/schedule.ts`)

`decideCommit(input) → { action: "commit" } | { action: "defer", retryAt: number | null, why }`

The rules apply in order:

1. Nothing is committed yet → commit.
2. Geometric → commit.
3. Reason `user` → commit, because the user asked for the change.
4. Structural, and a locked region would be hidden, folded or moved → defer with
   `retryAt: null`; re-evaluate when the lock releases.
5. Stable-layout mode is on and the reason is `server` or `content` → defer with
   `retryAt: null`. This is held as pending until the user presses APPLY. A `field`
   change still commits, because the chooser keeps the previous family whenever it
   still fits, so a field-driven family change means the old layout stopped fitting.
6. Background structural (`server`, `content`, `field`) → commit only once both
   `now - lastActivityAt >= quiet_window_ms` (750) and
   `now - lastStructuralCommitAt >= min_background_interval_ms` (5000) hold.
   Otherwise defer, with `retryAt` set to the later of those two times.

While a commit is deferred, the renderer keeps showing the committed scene. It sets
`data-scene-pending="true"` and shows a **LAYOUT PENDING · APPLY** terminal
(`aria-live="polite"`). Pressing it commits as `user`.

## 5. Hysteresis (anti-thrash)

- **Family:** the chooser already keeps the previous family while it's feasible in the
  same mode, so measurement changes alone never change the family.
- **Orientation:** the chooser resolves orientation once and passes it in
  `FamilyInput.orientation`.
  - Switch landscape → portrait only when `w / h < 0.9`.
  - Switch portrait → landscape only when `w / h > 1.1`.
  - With no previous scene, the split is `w >= h`.
  - Families read `input.orientation` rather than recomputing it.

## 6. Return wiring

When any mode declares `returns_to`, `ui.scene()` registers a built-in action
`"<scene_id>.return"` whose handler calls `ctx.end_mode(scene=scene_id)`. It's
conflict-checked like `scene.transition`. The return terminal sends that action through
`handlers.onAction`.

## 7. Motion

Placement changes animate `left/top/width/height` with the existing motion tokens. Under
reduced motion (`useReducedMotion`, or the CSS media query), the commit is instant. The
scene is the same either way; only the interpolation differs.

## 8. User control (Phase 3.3)

- **Pins:** a pinned region stays visible. In any mode that lists it as `optional`, it's
  treated as `required`, so it is never folded. Pins are intent (region ids), never
  pixels. They persist in `localStorage` under `lcars.scene.<sceneId>.pins`, wrapped in
  try/catch.
- **Stable layout:** a per-scene toggle, persisted the same way (`.stable`). It feeds
  rule 5.
- **Reset:** clears pins and stable layout.
- **Why:** a LAYOUT terminal opens a small panel. The panel shows `resolved.explanation`,
  the pending reason if any, the pin list and the stable toggle.
