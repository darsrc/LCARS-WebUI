# LCARS UI specification index

There is no separate root-level `LCARS UI Specification.md`. Use the maintained sources
below instead:

- [`../../LCARS_PORTING_SPEC.md`](../../LCARS_PORTING_SPEC.md) — authoritative semantic
  and geometry rules for LCARS parity work.
- [`../../STRICT_LCARS_VISUAL_SPEC.md`](../../STRICT_LCARS_VISUAL_SPEC.md) —
  screenshot-level visual requirements and pass/fail criteria.
- [`../docs/quickstart.md`](../docs/quickstart.md) — v7 application lifecycle.
- [`../docs/dsl.md`](../docs/dsl.md) and [`../docs/widgets.md`](../docs/widgets.md) —
  public Python API and action payloads.
- [`../docs/surface.md`](../docs/surface.md) — arbitrary-topology Surface Engine.

The executable wire contract is defined by Pydantic models in
`../src/lcars_ui/core/models.py` and guarded by the versioned fixtures in
`../fixtures/golden/`. TypeScript contracts and browser validators are generated from
those sources and checked with `make contracts-check`.
