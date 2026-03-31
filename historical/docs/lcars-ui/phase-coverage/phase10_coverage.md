# Phase 10 Coverage

## Scope completed

- 10A: real chart rendering (`recharts`) for `line_chart` and `sparkline`
- 10B: new widgets (`progress_bar`, `gauge`, `markdown`, `number_input`) across backend schema, DSL, frontend renderer, and contracts
- 10C: websocket reliability improvements (exponential backoff reconnect, reconnect status, manifest root resync handling)
- 10D: session-isolated widget state keyed by websocket session ID + cleanup on disconnect
- 10E: DSL ergonomics (`row`, `col`, `form`, `section`, implicit default page behavior preserved and documented)
- 10F: MicButton MediaRecorder push-to-talk flow
- 10G: added/updated backend and frontend tests, added coverage-enabled test commands
- 10H: docs delivered (`quickstart.md`, `widgets.md`, `dsl.md`, `deployment.md`, README refresh)

## Verification exit

Executed in this implementation pass:

```bash
ruff check src/ tests/
mypy src/
pytest -q tests/unit/test_new_widgets.py tests/unit/test_session_state.py tests/unit/test_dsl_form.py tests/unit/test_dsl_row_col.py --override-ini addopts='-ra'
pytest -q tests/unit/test_stream_and_dispatch.py tests/unit/test_dsl_builder.py tests/unit/test_dsl_state.py --override-ini addopts='-ra'
make contracts-update
make contracts-check
cd frontend && npm run test
cd frontend && npm run test:coverage
cd frontend && npm run build
make frontend-ci
```

Environment constraint noted:

- `fastapi.testclient.TestClient` websocket integration tests may hang in this Python 3.14 shell environment; targeted integration checks requiring websocket round-trips could not be fully re-run end-to-end here.
