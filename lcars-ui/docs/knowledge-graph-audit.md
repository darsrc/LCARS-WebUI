# Knowledge-graph widget family — audit

_Audited 2026-08-26._

## What this is

Twelve DSL exports and eight widget types serve a single application's domain vocabulary: a
knowledge-graph proposal/ingestion client. They landed whole in `7ba1871` ("Add The Web widgets for
v4.5.0", 2026-08-09) and were de-branded in `128c5c1` ("Generalize knowledge graph features") —
which renamed the example and the prose but **did not actually generalise any code**. The widget
types, field names and `Web*` type prefixes are unchanged. The internal module is still
`widgets/web.py`.

This is **not dead code.** Every export is exercised:

- `examples/knowledge_graph/app.py` uses all twelve.
- `tests/unit/test_web_widgets.py` builds all twelve plus ten semantic tests.
- `frontend/src/widgets/WidgetRenderer.web.test.tsx` covers every render branch.
- Documented in `docs/widgets.md`, `README.md`, `docs/release-v4.5.0.md` and `wiki/Knowledge-Graph.md`.

`docs/widgets.md` already treats it as a bolt-on family, excluded from the core widget count.

## What it costs

| Surface | Cost |
|---|---|
| `dsl/api.py` | ~450 lines, one contiguous block, two exclusive private helpers |
| `widgets/web.py` | 100% of the file |
| `WidgetRenderer.tsx` | ~390 lines, contiguous, plus switch cases |
| `lcars.css` | ~270 lines, contiguous |
| `contract.ts` | ~164 lines (~9% of the file) |
| **`fixtures/golden/schema.v1.json`** | **31 of 201 `$defs` — 15% of the schema** |
| `core/models.py` | 8 members of the discriminated `Widget` union |
| `dsl/_strict_contract.py` | 5 separate registries |

Roughly **1,200 lines of Python + TS + CSS and 15% of the golden schema** for one application.

## Buckets

### Keep as-is

- **`tri_state`** — smallest contract footprint of the eight widget types, the only one classified
  as a `READOUT_TYPE`, and the idea is genuinely general: YES / NO / UNKNOWN with a real neutral
  third state and a FAST→EXACT escalation. Any indeterminate query wants this (policy checks, test
  results, permission probes). Worth renaming the data fields away from `commitment`/`subject`.
- **`set_alert_condition`** — core LCARS semantics, not knowledge-graph at all. Tiny, no widget
  type, no contract cost. _(Now tested.)_

### Generalise when a second consumer appears

Do not do these speculatively — inventing patterns ahead of demand is how this family got into core
in the first place.

- **`frontier`** → a generic typed navigator. "Current item + breadcrumb path + typed one-hop
  neighbours, returns the clicked id" is broadly useful; only the four-value `FrontierEdge` literal
  is domain-bound. Highest reuse-per-line in the cluster.
- **`support_panel` + `environments` + `atom_legend`** → "alternative sets of typed evidence, where
  an empty set is meaningfully different from an absent one". The unsupported-vs-support-independent
  distinction is the one genuinely novel piece of design here and is worth preserving under a
  neutral name.
- **`commitment_selector`** → choice-with-consequences: a radio group where each option carries
  assumptions and selection derives labelled result sets. Generalising means letting the caller
  declare the result sets instead of hardcoding three.
- **`constraint_band`** → a numeric exclusion / tolerance band with positioned markers, useful for
  any numeric spec. _(The six unimplemented representations have now been dropped.)_
- **`assertion_card` + `context_tags`** → a `claim_card` with caller-defined qualifier roles.
  `canonical: bool` and the framework roles are the domain-bound parts.

### App-specific — would not survive generalisation

- **`gap_panel`** and **`contender_list`** — "a missing explanatory bridge between two endpoints
  with a known dependency" is irreducibly epistemic. `GapType`
  (RELATIONAL / MECHANISTIC / REDUCTION / EVIDENTIAL / ONTOLOGICAL) means nothing outside the
  origin app. `contender_list` is only meaningful attached to `gap_panel`.
- **`anchor_card`** — `empirical|formal` × `SUPPORTS|EXCLUDES` × `retracted|superseded` is a
  three-way domain vocabulary lock-in in 19 lines of contract. A generic citation card would share
  almost no fields.

## API-shape note

`atom_legend`, `context_tags` and `contender_list` are each a **one-boolean mutator** on their
enclosing container. Three of twelve public names exist to set three booleans that would more
naturally be `show_*=True` keyword arguments on the parent. If this family is ever revised, that is
the cheapest cleanup available.

## If the family is ever extracted

The excision boundary is clean — one contiguous block in each of `api.py`, `WidgetRenderer.tsx` and
`lcars.css`, with `widgets/web.py` entirely in-family and two exclusive private helpers.

The low-risk order is: **deprecate the DSL functions first** (drop from `__init__.py`, keep the
models and renderer), ship one minor release, then remove the widget types in the next schema major.
Removing any of the eight widget types is a breaking v1 manifest-schema change, because they are
baked into `fixtures/golden/schema.v1.json`, `manifestValidator.generated.ts` and the
`core/models.py` discriminated union. Removing only the DSL functions is not.

## Caveat

`examples/knowledge_graph/app.py` is not imported by any test, unlike `kitchen_sink`,
`graph_workspace`, `shape_gallery`, `canon_recreation`, `widget_capabilities` and
`table_repositories`. Its only build verification is `scripts/capture_docs_screenshots.mjs`.
