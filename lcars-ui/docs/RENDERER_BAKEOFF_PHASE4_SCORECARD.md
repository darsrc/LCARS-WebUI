# Renderer Bake-Off Phase 4 Scorecard

## Evidence source
- Fresh Phase 4 artifact run:
  - `frontend/test-results/renderer-bakeoff-phase4-run`
- Consolidated artifact bundle:
  - `artifacts/renderer_bakeoff_phase4_2026-03-14`
- Machine-readable summaries:
  - `docs/RENDERER_BAKEOFF_PHASE4_ARTIFACT_INDEX.json`
  - `docs/RENDERER_BAKEOFF_PHASE4_SCORECARD.json`

This scorecard uses the frozen probe set, the Phase 2 neutral harness, and the Phase 4 measured artifacts only. No renderer tuning was done before scoring.

## Scoring method used
- Structural mismatch performance, 30 points:
  - `30 * (1 - mean primary structural mismatch ratio)`
- Dual-state resilience, 10 points:
  - `10 * (1 - (seismo pair mean + seismo pair delta / 2))`
  - reason: this rewards both lower mismatch and scaffold stability across the `seismo_scan_a` / `seismo_scan_b` pair
- Withheld audit resilience, 10 points:
  - `10 * (1 - withheld audit structural mismatch ratio)`
- Product-smoke viability, 15 points:
  - `7.5` points per rendered product-smoke probe
- Shared-system leverage, support-boundary integrity, maintenance burden, and bake-off/CI simplicity were scored against the fixed rubric using the measured outputs plus current in-repo architecture reality. These values are explicit in `docs/RENDERER_BAKEOFF_PHASE4_SCORECARD.json`.

## Scored table

| contender | fidelity / 50 | viability / 35 | operating / 15 | total / 100 |
| --- | ---: | ---: | ---: | ---: |
| `legacy_strict` | 17.44 | 30.00 | 11.00 | 58.44 |
| `joern_strict` | 19.65 | 27.00 | 6.00 | 52.65 |
| `phase14_family` | 28.47 | 12.00 | 12.00 | 52.47 |

## Canonical fidelity evidence

| contender | primary mean structural mismatch | seismo pair mean | seismo pair delta | withheld audit structural mismatch |
| --- | ---: | ---: | ---: | ---: |
| `legacy_strict` | 0.6594 | 0.7187 | 0.0390 | 0.5397 |
| `joern_strict` | 0.5977 | 0.6518 | 0.0839 | 0.5486 |
| `phase14_family` | 0.4514 | 0.4491 | 0.0979 | 0.3005 |

Interpretation:
- `phase14_family` is the clear fidelity winner. It is materially better on the primary canonical set and materially better again on the withheld audit probe.
- `joern_strict` beats `legacy_strict` on raw canonical mismatch, but not by enough to overcome its weaker reusable-system footing and higher duplication cost.
- `legacy_strict` is the weakest fidelity path of the three measured contenders.

## Product-smoke evidence

| contender | overview | systems | product-smoke viability |
| --- | --- | --- | ---: |
| `legacy_strict` | rendered | rendered | 15.0 / 15 |
| `joern_strict` | rendered | rendered | 15.0 / 15 |
| `phase14_family` | unsupported | unsupported | 0.0 / 15 |

Interpretation:
- `phase14_family` is not eligible for product base under the frozen rules.
- `legacy_strict` and `joern_strict` are both eligible for product base, so the decision turns on reusable-system leverage and maintenance burden, not support status alone.

## Rubric calls that decide the roles
- Acceptance/fixture engine is decided by fidelity among acceptance-eligible contenders. `phase14_family` wins that category decisively.
- Product implementation base is decided by reusable-system viability among product-eligible contenders. `legacy_strict` wins that category because it already sits on the repo's broad strict-manifest product path, while `joern_strict` remains a duplicate renderer system with much lower shared-system leverage.
