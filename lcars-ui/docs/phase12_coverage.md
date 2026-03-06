# Phase 12 Coverage

## Scope

Phase 12 focuses on LCARS visual-language authenticity and compatibility controls.

## Implemented

- Elbow geometry rewritten to a filled LCARS L-bracket path with configurable arm dimensions and radius.
- Strict shell mode updated for seamless frame joins, no structural borders, and black-void content framing.
- Sidebar nav items converted to direct LCARS bars in strict mode (no card wrappers).
- Widget chrome rewritten in strict mode to remove card visuals and use LCARS label bars.
- Container widgets (`lcars_box`, `lcars_sweep`, `lcars_bracket`) cleaned up in strict mode and wired to elbow arm sizing.
- Page title rendered as LCARS bar chrome instead of generic heading text.
- Manifest/DSL contract extended with `meta.visual_language` (`strict` default, `classic` compatibility mode).
- Strict-mode widget-group auto-wrapping normalizer added (`lcars_bracket` wrappers).
- Golden manifest/schema regenerated to include visual-language metadata.
- Tests added/updated for strict/classic metadata handling and normalizer behavior.

## Verification Targets

- Backend: `pytest tests/ -v`
- Frontend: `make frontend-ci`
- Build: `make frontend-bundle`
