# CONTEXT — repository conventions

`lcars-ui` is a Python 3.10+ server-driven UI library. An application declares pages
and widgets in Python, Pydantic models produce a versioned manifest and realtime
protocol, FastAPI serves them, and the bundled React/TypeScript frontend validates and
renders code-native LCARS geometry.

## Read first

- New application: `docs/quickstart.md`, then `docs/widgets.md` and `docs/dsl.md`.
- v6 migration: `docs/migration.md` and `lcars migrate PATH`.
- Agent-sized index: `../llms.txt`; one-file corpus: `../llms-full.txt`.
- Current direction: `PLAN.md`. Completed work belongs in `docs/history/`.
- Visual work: `../STRICT_LCARS_VISUAL_SPEC.md` and
  `../LCARS_PORTING_SPEC.md` are authoritative; `../LCARS_TRUTH/` is measurement
  material only.

## Application model

- `app = App()` owns configuration, pages, actions, live jobs, services, sessions,
  testing, and serving.
- `@app.page(...)` functions declare widgets during `app.build_manifest()`. Browser
  actions never rerun a page.
- Ordinary declarations come from `lcars_ui.ui` (33 names); specialist composition,
  Surface Engine, graph, and media declarations come from `lcars_ui.advanced` (27).
- `@app.action(widget_id)` handlers receive `ActionContext[T]`. Effects are `ctx.update`,
  `ctx.notify`, `ctx.append_log`, `ctx.set_theme`, and `ctx.set_alert_condition`.
- `@app.live(...)` jobs use the package-root effect functions because they have no
  triggering `ActionContext`.
- `app.test_client()` builds the real manifest once per client and creates independent
  session projections for behavior tests.
- `app.bind_key(...)` declares portable shortcuts in the manifest. Framework and
  application bindings share one typed registry and browser-local overrides live in the
  renderer-owned Options page.

There is no `lcars.run`, rerun-return-value control flow, flat widget namespace, or
BUILD/HANDLE/LIVE lifecycle in the v7 application API.

## Source map

- `src/lcars_ui/application.py` — `App`, `ActionContext`, declarations, services, live
  jobs, manifest construction, and the test-client entry point.
- `src/lcars_ui/ui.py` / `advanced.py` — curated public widget namespaces.
- `src/lcars_ui/dsl/` — declaration implementations, builder context, normalization,
  model-backed forms, recipes, and Surface Engine helpers. `dsl/api.py` is an internal
  implementation aggregate, not a flat package-root authoring API.
- `src/lcars_ui/core/models.py` and `core/widget_base.py` — Pydantic manifest contract,
  typed key bindings, and shared widget rules.
- `src/lcars_ui/app.py` — FastAPI factory, routes, uploads, static serving, and transport
  integration.
- `src/lcars_ui/server/` — sessions, projection/hydration, events, streaming, security,
  and speech-to-text interfaces.
- `src/lcars_ui/testing.py` — synchronous `app.test_client()` harness.
- `frontend/src/types/` — handwritten and generated TypeScript contracts/validators.
- `frontend/src/runtime/keybindings.ts` — default resolution, portable chord matching,
  scopes, display formatting, and browser override conflict checks.
- `frontend/src/widgets/` — renderer and specialist controls; `frontend/src/lcars/` and
  `frontend/src/compose/` own the shell and adaptive mosaic.
- `fixtures/golden/` — manifest/schema v2, protocol v1, and workspace v1 drift guards.
- `examples/` — 15 runnable applications, all built by
  `tests/unit/test_examples_build.py`.

## Commands (run from `lcars-ui/`)

- `make ci` — complete project gate.
- `pytest tests/` — backend tests; `make test` adds the coverage gate.
- `make lint` — ruff and strict mypy.
- `make contracts-check` / `make contracts-update` — verify or regenerate contracts.
- `cd frontend && npx vitest run` — focused frontend test run.
- `make frontend-bundle` — rebuild the packaged frontend.
- `LCARS_PORT=8077 LCARS_OPEN_BROWSER=0 .venv/bin/python examples/bridge_ops/app.py`
  — local example without using reserved port 8000.

## Constraints and conventions

- Backend source must run on Python 3.10. Do not use Python 3.11+ syntax or stdlib APIs;
  do not use `tomllib`.
- Never edit or bundle `LCARS_TRUTH/`; never embed reference screenshots or derivatives
  in parity UI.
- Do not touch `.serena/` or `opencode.json`; they belong to other tools.
- Explicit widget ids go through the shared builder and must be unique across the whole
  manifest. Do not hand-roll id or session state.
- Pydantic is the contract source. Contract changes require regenerated Python fixtures,
  generated TypeScript, browser validators, and contract checks.
- Release versions must agree in `pyproject.toml`, `src/lcars_ui/__init__.py`,
  `src/lcars_ui/app.py`, `frontend/package.json`, and `frontend/package-lock.json`.
