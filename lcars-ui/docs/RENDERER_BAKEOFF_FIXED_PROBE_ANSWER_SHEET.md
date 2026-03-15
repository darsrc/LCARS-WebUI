# Renderer Bake-Off Fixed Probe Answer Sheet

## Purpose
This document records the current in-repo answer to the frozen Phase 4 probe set after the neutral harness and fixed-probe adapters landed.

It does not reopen renderer strategy.
It does not change the role assignment in `docs/RENDERER_BAKEOFF_PHASE4_ROLE_ASSIGNMENT.md`.
It exists so the current probe answers are explicit instead of being inferred from tests and artifact JSON.

## Source of truth
- Harness resolution logic: `frontend/src/fixtures/rendererBakeoffHarness.ts`
- Frozen support matrix: `frontend/src/fixtures/rendererBakeoffSupportMatrix.ts`
- Anti-regression tests: `frontend/src/fixtures/rendererBakeoffHarness.test.ts`
- Consolidated Phase 4 bundle outputs:
  - `docs/RENDERER_BAKEOFF_PHASE4_SUPPORT_MATRIX.json`
  - `docs/RENDERER_BAKEOFF_PHASE4_CONTENDER_PROBE_SUMMARIES.json`

## Fixed probe answers

| contender | `seismo_scan_a` | `seismo_scan_b` | `holodeck_programming_a` | `periodic_table_matrix` | `holodeck_programming_b` | `overview` | `systems` |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `legacy_strict` | rendered | rendered | rendered | rendered | rendered | rendered | rendered |
| `joern_strict` | rendered | rendered | rendered | rendered | rendered | rendered | rendered |
| `phase14_family` | rendered | rendered | rendered | rendered | rendered | unsupported | unsupported |

## Adapter boundary by contender

### `legacy_strict`
- Canonical probes resolve through deterministic strict fixture manifests with `strict_renderer: "legacy"`.
- Product-smoke probes resolve through a real strict-manifest product fixture path.
- This is an adapter, not a shadow renderer, because the harness still enters the existing `legacy_strict` product stack rather than a copied renderer implementation.

### `joern_strict`
- Canonical probes resolve through the same deterministic fixture-manifest contract with `strict_renderer: "joern"`.
- Product-smoke probes resolve through the Joern strict renderer mapping on the same external harness contract.
- This is an adapter, not a shadow renderer, because the harness only swaps the declared strict renderer and routes into the existing Joern stack. It does not render through `legacy_strict` or `phase14_family` and relabel the result.

### `phase14_family`
- Canonical probes resolve directly through owned Phase 14 family scenes.
- Product-smoke probes answer explicitly as `unsupported`.
- This is an adapter, not a shadow renderer, because the harness exposes the family scene path only for probes that the contender actually owns and refuses product-smoke fallback.

## Important interpretation rule
- Fixed-probe render status is not the same as winning a role.
- `joern_strict` rendering all seven fixed probes does not change its deprecated status, because the bake-off decision also scored reusable-system viability, maintenance burden, and ownership duplication.
- `phase14_family` remaining unsupported on `overview` and `systems` is the honest product-boundary signal that preserves the two-role architecture.
