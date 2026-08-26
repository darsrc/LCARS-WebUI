# AUD-02 — Large-file split

Completed on 2026-08-26 in six behavior-preserving seams. The contract, tests, and rendered behavior
were deliberately unchanged; each extraction kept dependencies flowing one way and was gated before
the next began.

## Backend

- `7d9c9eb` extracted the Surface Engine from `dsl/api.py` into `dsl/_surface_api.py`.
- `a501a20` extracted the knowledge-graph family into `dsl/_web_api.py` and its widget modules.

`dsl/api.py` fell from 5,068 to 3,354 lines, a 34% reduction.

## Frontend

- `6f0b82a` extracted the knowledge-graph renderers.
- `bb519e2` extracted the enhanced table and its exclusive helpers.
- `cee3bce` extracted push-to-talk and continuous-VAD microphone controls.
- `fb59002` extracted OHLC, shader, line-chart, and sparkline renderers.

`WidgetRenderer.tsx` fell from 4,182 to 2,024 lines, a 52% reduction. It remains the single widget
dispatch point while the extracted families live in focused modules.

## Closing gate

- Ruff and mypy passed.
- Contract goldens and generated TypeScript contracts matched.
- Backend: 499 passed, 6 skipped, 90.84% coverage.
- Smoke test and strict Python/npm security audit passed.
- Frontend: 498 passed, 76.42% line coverage; typecheck and production bundle passed.
