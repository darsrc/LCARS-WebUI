# Overview Parity Architecture

This document describes the parity renderer family built from the `overview` specimen and reused by `systems`.

## Scope

- The renderer family is parity-grade and code-rendered (React + SVG + CSS geometry).
- It is intentionally not a generic dashboard renderer.
- It currently targets specific sweep IDs for:
  - `overview`
  - `systems`

## Source of truth files

- Manifest/layout source:
  - `examples/lcars_console/app.py`
- Parity geometry/spec layer:
  - `frontend/src/components/containers/paritySweepSpec.ts`
- Parity + generic sweep routing:
  - `frontend/src/components/containers/LcarsSweepControl.tsx`
- Shared parity family styles:
  - `frontend/src/styles/lcars/containers.css`
- Parity chart behavior:
  - `frontend/src/components/charts/LineChartWidget.tsx`
- Page-selection helper for proving second page:
  - `frontend/src/App.tsx` (`?page=<id>`)

## Extracted primitives/specs

- `ParitySweepSpec`:
  - sweep view box bounds
  - path geometry
  - static cap/stack rect geometry
  - title/subtitle anchor positions
  - left/right panel bounds
  - stack column geometry (x/y/width/gap/heights)
  - chart frame token values
- Primitive helpers:
  - `resolveParitySweepSpec(widgetId)`
  - `isParitySweepId(widgetId)`
  - explicit ID sets (`OVERVIEW_PARITY_SWEEP_IDS`, `SYSTEMS_PARITY_SWEEP_IDS`)
- Shared renderer metadata:
  - `data-lcars-parity-family="stacked-sweep"`
  - `data-lcars-renderer="stacked-sweep-parity-v1"`
  - `data-lcars-code-rendered="true"`

## Current renderer boundaries

- `LcarsSweepControl` behavior:
  - If widget ID resolves to parity spec: render `ParitySweepRenderer` (spec-driven path).
  - Else: keep existing generic `lcars_sweep` renderer behavior.
- This keeps parity work isolated while preserving compatibility for non-parity sweeps.

## Second-page proof

- `systems` now uses the same parity renderer family with dedicated IDs:
  - `systems_sweep_top`
  - `systems_sweep_bottom`
- `systems` charts use parity histogram IDs:
  - `systems_chart_alpha`
  - `systems_chart_beta`
- This proves the overview implementation is now a reusable subsystem, not a one-off branch.

## Anti-cheat rule (non-negotiable)

Per `AGENTS.md`, parity paths must remain code-rendered and must not embed reference screenshots or raster-backed parity content.

Forbidden in parity rendering:

- HTML `<img>`, SVG `<image>`, canvas `drawImage`
- CSS `background-image` / `mask-image` URL raster embedding
- `data:` raster embedding of target references
- direct rendering of reference screenshots

## Stable vs tuning zones

Stable (change cautiously):

- `paritySweepSpec.ts` ID sets and renderer version tag
- `LcarsSweepControl.tsx` parity-vs-generic routing branch
- anti-cheat guardrails and parity family metadata

Expected future tuning:

- spec coordinates (paths/anchors/bounds)
- parity typography spacing and chart framing tokens
- per-page palette values inside `paritySweepSpec.ts`

## What this does not claim

- This is not full renderer generalization.
- It does not claim gold-level screenshot parity.
- It does not replace all strict LCARS layout patterns.

It establishes a reusable parity renderer family foundation from overview and proves it on a second page.
