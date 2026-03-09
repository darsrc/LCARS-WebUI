# Overview Parity Architecture

This document describes the current strict `overview` parity implementation after the stabilization/foundation pass.

## Scope and intent

- This is a parity-only renderer path for the strict `overview` page.
- The active renderer is code-rendered geometry/content (React + SVG + CSS layout), not screenshot-backed.
- This path is intentionally isolated so future parity tuning does not spill into generic LCARS rendering.

## Source of truth files

- Manifest/layout source:
  - `examples/lcars_console/app.py` (`overview_sweep_top`, `overview_sweep_bottom`, `overview_chart_alpha`, `overview_chart_beta`)
- Overview parity renderer:
  - `frontend/src/components/containers/LcarsSweepControl.tsx`
- Overview parity styles:
  - `frontend/src/styles/lcars/containers.css`
- Overview parity chart treatment:
  - `frontend/src/components/charts/LineChartWidget.tsx`
- Guardrail tests:
  - `frontend/src/components/containers/LcarsSweepControl.test.tsx`
  - `frontend/src/test/overviewParityGuardrails.test.ts`
  - `frontend/tests/visual/console.spec.ts`

## Renderer architecture

- `LcarsSweepControl` routes only canonical overview sweep IDs (`overview_sweep_top`, `overview_sweep_bottom`) to the parity renderer branch.
- Non-overview sweeps continue through the generic `lcars_sweep` renderer branch.
- Parity branch mounts:
  - `article.lcars-overview-parity-sweep`
  - SVG mass geometry (`.lcars-overview-parity-mass-svg` with `<path>`/`<rect>`)
  - code-rendered left/stack/right child containers
- Parity roots expose explicit markers:
  - `data-lcars-renderer="overview-parity-v1"`
  - `data-lcars-code-rendered="true"`
  - `data-lcars-parity-scope="overview"`

## Anti-cheat rule (non-negotiable)

Per repository guardrails (`AGENTS.md`), parity UI paths must remain code-rendered and must not embed reference screenshots/raster assets.

Forbidden for overview parity rendering:

- HTML `<img>`, SVG `<image>`, `canvas.drawImage`
- CSS `background-image`/`mask-image` URL raster embedding
- `data:` raster embedding of target references
- any direct rendering of reference screenshots (including README/reference parity images)

## What is solved now

- Overview parity uses a stable dedicated renderer path, not experiment branches.
- Legacy overview `.lcars-sweep-control` styling path was removed from active code.
- Parity-specific IDs and renderer markers are explicit and test-covered.
- Guardrails now assert:
  - overview parity path is active in visual regression runs
  - raster-backed elements are absent from overview subtree
  - reference screenshot asset names are not referenced in frontend source

## Safe future tuning points

- Sweep SVG path geometry and parity stack sizing constants in `LcarsSweepControl.tsx`
- Overview parity CSS geometry/typography values in `containers.css` parity section
- Overview chart parity axis/grid/bar tuning in `LineChartWidget.tsx`

## Do not casually change

- Overview parity sweep IDs
- Parity renderer data markers
- Anti-cheat guardrail tests
- Generic sweep renderer semantics for non-overview widgets

If changing any of the above, update tests and this document in the same commit.
