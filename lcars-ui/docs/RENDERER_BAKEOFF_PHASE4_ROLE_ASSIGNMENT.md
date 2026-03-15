# Renderer Bake-Off Phase 4 Role Assignment

## Decision
- Product implementation base:
  - `legacy_strict`
- Acceptance/fixture engine:
  - `phase14_family`
- Non-winning contender disposition:
  - `joern_strict`: deprecated

This bake-off does not preserve three co-equal renderer philosophies.

## Why `legacy_strict` is the product implementation base
- It passed both product-smoke probes through a real product path.
- It won reusable-system viability under the frozen rubric:
  - `legacy_strict`: 30.00 / 35
  - `joern_strict`: 27.00 / 35
  - `phase14_family`: 12.00 / 35
- The deciding factor was not support alone. `joern_strict` also rendered `overview` and `systems`, but it did so through a duplicate renderer stack with much lower shared-system leverage and worse maintenance burden.

## Why `phase14_family` is the acceptance/fixture engine
- It passed all four primary canonical probes and the withheld audit probe.
- It won fidelity under the frozen rubric:
  - `phase14_family`: 28.47 / 50
  - `joern_strict`: 19.65 / 50
  - `legacy_strict`: 17.44 / 50
- It had the best primary canonical structural mismatch mean and the best withheld audit result by a wide margin.

## Why `joern_strict` is deprecated
- It won neither role.
- It was product-eligible, but lost the product-base decision to `legacy_strict` on reusable-system leverage and maintenance burden.
- It was acceptance-eligible, but lost badly on measured fidelity to `phase14_family`.
- Under the frozen rules, a contender that wins neither role does not stay alive as a third first-class philosophy.

## Resulting repo posture
- `legacy_strict` remains the product renderer foundation.
- `phase14_family` remains and is now explicitly confirmed as the acceptance/fixture engine.
- `joern_strict` should not continue as a standing co-equal renderer path after this decision; it is a deprecated branch awaiting follow-on removal planning outside this Phase 4 scope.
