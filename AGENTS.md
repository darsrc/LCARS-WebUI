# LCARS Parity Guardrails

- Reference screenshots and reference repo assets are for measurement, comparison, and validation only.
- Do not render reference screenshots (or derivatives) in UI output.
- Forbidden in parity UI paths: `<img>`/SVG `<image>`, canvas `drawImage`, CSS `background-image`/`mask-image`/`image-set`, `data:` URLs, or any raster embedding of target screenshots.
- Parity pages must be code-rendered geometry and code-rendered content.
- Screenshot-backed or backdrop parity implementations are considered task failure.
- If parity is difficult, use parity-only geometry/components and local layout overrides, not image inclusion.

# Project Info

- Package: `lcars-ui/` — Python 3.10+; install with `pip install -e ".[dev]"` (run from `lcars-ui/`).
- Run an example: `python examples/lcars_console/app.py` (serves http://127.0.0.1:8000).
- Backend tests: `pytest tests/`. Frontend tests: `cd frontend && npx vitest run`.
- Build the frontend bundle into the package: `make frontend-bundle`.
- Lint + types: `make lint` (ruff + mypy).
- Design law (authoritative over taste): `STRICT_LCARS_VISUAL_SPEC.md`, `LCARS_PORTING_SPEC.md`; measure renders against `LCARS_TRUTH/`.

# Conventions

- All code must be parity-compliant with LCARS design language.
- No external image references or raster embedding allowed.