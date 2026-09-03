# LCARS Parity Guardrails

- Reference screenshots and reference repo assets are for measurement, comparison, and validation only.
- Do not render reference screenshots (or derivatives) in UI output.
- Forbidden in parity UI paths: `<img>`/SVG `<image>`, canvas `drawImage`, CSS `background-image`/`mask-image`/`image-set`, `data:` URLs, or any raster embedding of target screenshots.
- Parity pages must be code-rendered geometry and code-rendered content.
- Screenshot-backed or backdrop parity implementations are considered task failure.
- If parity is difficult, use parity-only geometry/components and local layout overrides, not image inclusion.

# Project Info

- Package: `lcars-ui/` — supports Python 3.10+; the local `.venv` runs Python 3.13. Install with `pip install -e ".[dev]"` (run from `lcars-ui/`).
- Run examples on port 8077 or 8078; port 8000 is reserved for the human's own app. Direct scripts accept `--port` and `--ip`/`--host`; for example: `python examples/bridge_ops/app.py --port 8077` (also see `examples/kitchen_sink/app.py` for the full widget showcase).
- Backend tests: `pytest tests/`. Frontend tests: `cd frontend && npx vitest run`.
- Build the frontend bundle into the package: `make frontend-bundle`.
- Lint + types: `make lint` (ruff + mypy).
- Design law (authoritative over taste): `STRICT_LCARS_VISUAL_SPEC.md`, `LCARS_PORTING_SPEC.md`; measure renders against `LCARS_TRUTH/`.

# Application Authoring (v7)

- Start with `llms.txt`, the curated documentation index; use `llms-full.txt` when one local file is more useful than following links.
- For a first application, read `lcars-ui/docs/quickstart.md`. Use `lcars-ui/docs/widgets.md` for widget signatures and action payloads, and `lcars-ui/docs/dsl.md` for layout, effects, services, sessions, Options, and keyboard bindings.
- A v7 application starts with `app = App()`. Declare pages once with `@app.page(...)`, use `lcars_ui.ui` for the 33 ordinary names and `lcars_ui.advanced` for the 27 specialist names, and handle interactions explicitly with `@app.action(widget_id)` plus `ActionContext`.
- Do not write v6 rerun code: no `lcars.run(...)`, `if lcars.button(...)`, flat `lcars.text(...)` widget calls, BUILD/HANDLE/LIVE lifecycle, or module-global `@lcars.live`. Read `lcars-ui/docs/migration.md` and run `lcars migrate PATH` when porting older code.
- Prefer `lcars new NAME` for a new project; it writes a runnable two-page app and a passing `app.test_client()` test. `lcars check` builds and validates an app without serving it.
- Put project themes in `themes/*.toml`; use their filename IDs with `app.config(theme=...)` or `set_theme(...)`. Themes extend one bundled base and can change only allowlisted pigments and font-family stacks — no arbitrary CSS, geometry, font files, or browser editor. Read `lcars-ui/docs/dsl.md#themes` before adding one.
- Declare application shortcuts with `app.bind_key(...)`. Use portable `mod` chords, stable binding ids when overriding framework defaults, and `chord=None` to disable a default; do not add component-local key maps for managed commands.
- Source supports Python 3.10. Do not introduce Python 3.11+ syntax or standard-library APIs; in particular, use the project's TOML compatibility path rather than `tomllib` (ruff flags it).

# Conventions

- All code must be parity-compliant with LCARS design language.
- No external image references or raster embedding allowed.
