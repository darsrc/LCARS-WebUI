# Renderer Bake-Off Contender Capability Table

## Purpose
This table records what each contender is actually capable of at Phase 1 freeze time.

Historical note:
- this is a freeze-time capability snapshot, not the active architecture plan,
- final roles are fixed in `docs/RENDERER_BAKEOFF_PHASE4_ROLE_ASSIGNMENT.md`,
- current fixed-probe answers after neutral-harness adapter wiring are recorded separately in `docs/RENDERER_BAKEOFF_FIXED_PROBE_ANSWER_SHEET.md`,
- `joern_strict` is now deprecated rather than an active future contender.

It is intentionally skeptical. It is not a roadmap of what each contender could become with enough work.

| contender | owned paths | current repo routing status | current canonical-target status | current product-smoke status | real strengths | hard limitations at freeze time | Phase 1 implication |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `legacy_strict` | `frontend/src/components/strict/LegacyStrictPageRenderer.tsx`; generic strict controls; parity branch in `frontend/src/components/containers/LcarsSweepControl.tsx` and `paritySweepSpec.ts` | Default strict page renderer when `strict_renderer` is not `joern`; not used for accepted Phase 14 family-scene routing in `App.tsx` | No target-owned canonical renderer path today; can render generic strict manifests, but canonical fidelity still depends on heuristic bands and specimen-coupled parity branches | Renders manifest-driven product pages such as `overview` and `systems` through the normal app path | Broadest strict-manifest compatibility; already integrated with strict controls; closest thing to a general product renderer in the repo today | Layout truth is still heuristic; parity path is specimen-coupled; current canonical-target ownership is weak and indirect rather than native | Must be treated as the leading product-base candidate, but under skepticism for acceptance fidelity |
| `joern_strict` | `frontend/src/components/strict/JoernStrictPageRenderer.tsx`; `frontend/src/components/strict/joern/*`; `frontend/src/styles/lcars/joern-bridge.css` | Opt-in preview path when `strict_renderer` is `joern`; hardcoded to `overview` support only | No canonical-target ownership today | `overview` renders; `systems` explicitly returns unsupported page state | Clean isolation; scoped stylesheet; explicit unsupported behavior; no silent fallback is already part of the design | Page coverage is intentionally narrow; widget coverage is partial; non-`overview` pages are unsupported by design | Must not be protected by “future potential”; if it cannot broaden honestly in Phase 2/3, it will lose both roles |
| `phase14_family` | `frontend/src/components/phase14/*`; shared primitives in `frontend/src/components/phase14/phase14Primitives.tsx` | Current accepted Phase 14 canonical targets route directly here from `App.tsx`; bypasses both strict page renderers | Owns all five current canonical targets, including the planned withheld audit probe `holodeck_programming_b` | Does not own `overview` or `systems`; not a general product page renderer today | Strongest current target-bank fidelity path; already family-based; already proves multi-state reuse for Seismographic and Holodeck; already covers dense repeated primitive grammar for Periodic Table | Current strength is target-family acceptance, not general product composition; fixture manifests still default to legacy strict, which shows the product/acceptance split is unresolved | Must be treated as the leading acceptance candidate, but not assumed to be product base without product-smoke proof |

## Additional notes
- The parity sweep family is not listed separately because the Phase 1 contract freezes it inside `legacy_strict`.
- The current Phase 14 visual harness is evidence that `phase14_family` is the active acceptance path. It is not evidence that the comparison is already neutral.
- The current Joern guardrails are evidence of architectural discipline. They are not evidence of broad competitiveness.
