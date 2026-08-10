# LCARS UI 4.5.0 — The Web

LCARS UI 4.5.0 adds a native knowledge-client instrument family for The Web v0.3 and
v0.3.1 payloads. All visuals are code-rendered LCARS geometry and content; no reference,
target, raster, canvas-image, or backdrop assets are used.

## Added

- `support_panel`, `environments`, and `atom_legend` preserve alternative support
  environments and distinguish unsupported from support-independent nodes.
- `frontier` renders one-hop traversal with edge-layer filtering and returns a validated
  clicked neighbour id.
- `assertion_card` and `context_tags` render the primary assertion, its singular framework,
  and every role held by every qualifier.
- `anchor_card` identifies empirical/formal evidence, source, support/exclusion polarity,
  inspectability, sibling anchors, and lifecycle status.
- `tri_state` gives YES, NO, and UNKNOWN independent semantic treatments and supports an
  optional FAST-to-EXACT escalation action.
- `constraint_band` renders interval exclusions, conditions, claims positioned on the
  quantity, and claims that deliberately make no quantity commitment. Unsupported
  representations are identified without invented geometry.
- `gap_panel` and `contender_list` render missing bridges, endpoints, known dependencies,
  constraints, and the valid empty-contender state.
- `commitment_selector` preserves supported, empirically grounded, and conflict sets as
  separate outputs and returns only valid selected commitment ids.
- `examples/the_web/app.py` demonstrates the complete widget family in a two-page console.

## Contract and frontend

- Typed Pydantic payload models are exported for all eight widget shapes.
- The manifest discriminated union and generated frontend contract understand the new widgets.
- Adaptive composition has dedicated role and footprint defaults for the new instruments.
- Focused backend and frontend suites cover interaction and semantic edge cases.
