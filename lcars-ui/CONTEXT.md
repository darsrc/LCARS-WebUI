# CONTEXT — repo conventions (LCARS-WebUI / lcars_ui)

Python library (`src/lcars_ui/`, Python 3.13, `.venv` at repo root's parent) that renders a
Star-Trek-authentic web UI from pure-Python widget declarations. Contract-first: Python/FastAPI
backend emits a JSON Manifest + WS protocol; the React/TS/Vite frontend (`frontend/`) consumes it.
Strict versioned schema — golden fixture tests guard drift.

## Never touch
- `LCARS_TRUTH/` (untracked, gitignored, ~97MB reference stills — never `git clean`, never commit
  anything from it, never bundle it into a wheel or release)
- `.serena/`, `opencode.json` at repo root — the human's other-tool configs
- Port 8000 — reserved for the human's own app; use 8077/8078 for anything you run locally

## File layout
- `src/lcars_ui/dsl/api.py` — the entire public `lcars.*` Python API (single file, large — read the
  section you need, don't reread the whole thing)
- `src/lcars_ui/dsl/_builder.py` — `_ManifestBuilder`, widget nesting/ID assignment
- `src/lcars_ui/dsl/_state.py` — `_LCARSContext` (BUILD/HANDLE/LIVE modes)
- `src/lcars_ui/core/models.py` — Pydantic contract models (Python side)
- `frontend/src/types/contract.ts` — TypeScript contract types (must match `core/models.py`)
- `frontend/src/widgets/WidgetRenderer.tsx` — every widget's render component, dispatched by
  `widget.type`
- `frontend/src/lcars/Console.tsx` — page shell / `Deck` (adaptive mosaic pipeline)
- `frontend/src/compose/*.ts` — adaptive mosaic layout engine (do not modify for surface work)
- `scripts/generate_golden.py` + `fixtures/golden/*.json` — contract schema snapshots
- `examples/` — runnable demo apps; `examples/surface_gauntlet/` is new, for this project

## Commands (run from `lcars-ui/`)
- `make test` — pytest, 60% coverage gate
- `make contracts-check` — golden fixtures vs. `scripts/generate_golden.py` output (must pass)
- `make contracts-update` — regenerate golden fixtures after a contract change
- `cd frontend && npm test && npm run typecheck && npm run build`
- Run an example: `LCARS_PORT=8077 LCARS_OPEN_BROWSER=0 .venv/bin/python examples/<name>/app.py`
- Screenshot (use sparingly — one capture per batch, never iterate visually):
  `SHOT_URL=.. SHOT_W=.. SHOT_OUT=.. node parity_shot.mjs`

## Conventions
- Widget constructors set `zone=`/`span=`/`weight=`/`aspect=`/`group=`/`sizing=`/`color=` as
  POST-CONSTRUCTION attribute assignment, not constructor kwargs (see any existing widget function
  in `dsl/api.py` for the pattern) — follow this exactly for new widgets.
- IDs: explicit `id=` goes through `_resolve_id()` (raises on duplicate); otherwise
  `auto_id(label, registered_ids)` kebab-cases and dedupes automatically. Don't hand-roll ID logic.
- No new page archetype, no bespoke CSS/JS/React per example app — every example must be buildable
  from public `lcars_ui` Python calls only.
- Version bumps (only at a milestone's final release step) touch 3 files: `pyproject.toml`,
  `src/lcars_ui/__init__.py` (`__version__`), `app.py` (FastAPI `version=`).
- Commit messages: short, present-tense, describe the "why" not a line-by-line diff.
