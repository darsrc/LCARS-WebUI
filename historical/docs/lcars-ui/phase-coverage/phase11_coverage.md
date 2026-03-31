# Phase 11 Coverage

## Scope completed

- 11A: expanded LCARS color system (30+ named colors + legacy aliases + hex passthrough), backend model validation, frontend token resolver, and theme mappings.
- 11B: new LCARS primitive shape components (`LcarsBar`, `LcarsSegmentedBar`, `LcarsPill`/`LcarsHalfPill`, `LcarsRect`) plus SVG elbow refactor for all corners.
- 11C: new `lcars_box` container widget model + DSL context manager + nested child/side-input rendering (`LcarsBoxControl`).
- 11D: new `lcars_sweep`, `lcars_bracket`, and `lcars_header` widgets across backend schema, DSL API, frontend rendering, and recursive runtime update handling.
- 11E: shell refactor to primitives, segmented sidebar/footer rendering, LCARS checkbox/radio/radio-toggle input types, typography config flags in `meta`, and distinct toggle on/off audio cues.

## Verification exit

Executed in this implementation pass:

```bash
python scripts/generate_golden.py
pytest -q tests/contracts --check-golden --override-ini addopts='-ra'
pytest -q tests/unit/test_phase11_colors.py tests/unit/test_phase11_dsl.py tests/unit/test_widgets.py tests/unit/test_dsl_builder.py tests/unit/test_new_widgets.py tests/contracts/test_manifest_schema.py tests/contracts/test_protocol_schema.py --override-ini addopts='-ra'
ruff check src tests
mypy src
cd frontend && npm run test
cd frontend && npm run build
```

Environment constraint noted:

- Full `pytest tests/` hangs intermittently in this shell during smoke/websocket-related execution paths; targeted deterministic suites above were used for verification.
