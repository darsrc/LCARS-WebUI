# LCARS Parity Guardrails

- Reference screenshots and reference repo assets are for measurement, comparison, and validation only.
- Do not render reference screenshots (or derivatives) in UI output.
- Forbidden in parity UI paths: `<img>`/SVG `<image>`, canvas `drawImage`, CSS `background-image`/`mask-image`/`image-set`, `data:` URLs, or any raster embedding of target screenshots.
- Parity pages must be code-rendered geometry and code-rendered content.
- Screenshot-backed or backdrop parity implementations are considered task failure.
- If parity is difficult, use parity-only geometry/components and local layout overrides, not image inclusion.
