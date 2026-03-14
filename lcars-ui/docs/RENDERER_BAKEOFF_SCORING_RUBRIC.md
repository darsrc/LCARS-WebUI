# Renderer Bake-Off Scoring Rubric

## Purpose
This rubric fixes how the bake-off will be judged once Phase 2 provides a neutral comparison harness.

It exists to stop later phases from moving the goalposts based on whichever renderer looks most convenient after the harness exists.

## Eligibility gates

### Acceptance/fixture engine gate
A contender is not eligible for the acceptance role unless it:
- returns `rendered` for all four primary canonical probes,
- returns `rendered` for the withheld audit probe,
- has no disqualifying anti-cheat or hidden-fallback behavior.

### Product implementation base gate
A contender is not eligible for the product-base role unless it:
- returns `rendered` for `overview`,
- returns `rendered` for `systems`,
- has no hidden fallback behavior.

Unsupported canonical probes are not neutral. They are evidence that the contender cannot currently hold the acceptance role.

Unsupported product-smoke probes are not neutral. They are evidence that the contender cannot currently hold the product-base role.

## Weighted score
Total score: 100 points.

### 1. Fidelity score: 50 points

#### Structural mismatch performance: 30 points
- Source of truth:
  - artifact metrics produced from the canonical target-bank comparison flow
- Primary probes used:
  - `seismo_scan_a`
  - `seismo_scan_b`
  - `holodeck_programming_a`
  - `periodic_table_matrix`
- Rule:
  - lower structural mismatch is better
  - a contender that does not render a primary canonical probe gets zero for that probe

#### Dual-state resilience: 10 points
- Probe pair:
  - `seismo_scan_a`
  - `seismo_scan_b`
- What is being judged:
  - whether one family scaffold survives a payload-mode change
  - whether the renderer collapses into frame-specific branches or overfitting behavior

#### Withheld audit resilience: 10 points
- Probe:
  - `holodeck_programming_b`
- Rule:
  - the first scored run must use the same contender state as the primary run
  - the withheld audit probe is not available for pre-bake-off tuning

## 2. Reusable-system viability: 35 points

### Product-smoke viability: 15 points
- Probes:
  - `overview`
  - `systems`
- What is being judged:
  - whether the renderer can act as a real product path rather than a target-specific acceptance path

### Shared-system leverage: 10 points
- What is being judged:
  - reliance on reusable primitives and composition rules
  - avoidance of target-local branches and renderer silos

### Support-boundary integrity: 10 points
- What is being judged:
  - explicit unsupported behavior
  - absence of silent fallback
  - debuggability of failure states
  - testability of the renderer in isolation

## 3. Operating cost: 15 points

### Maintenance burden: 10 points
- What is being judged:
  - duplication across renderer-specific systems
  - amount of special-case knowledge needed to keep the contender alive
  - whether the contender requires parallel ownership of primitives that already exist elsewhere

### Bake-off and CI simplicity: 5 points
- What is being judged:
  - how straightforward it is to measure the contender under the shared contract
  - how much contender-specific ceremony is required to keep comparisons honest

## Skeptical interpretation rules
- Do not award “future potential” points. Score the contender that exists after Phase 2 setup, not the one someone hopes to build later.
- Do not hide missing support behind architecture rhetoric.
- Do not let a clean unsupported state count as successful rendering.
- Do not let current repo routing bias the score. Phase 14’s current direct routing advantage and Joern’s current preview-only status are both facts to document, not excuses to waive categories.
- If a contender needs significant new rendering capability merely to enter the contest, that cost counts against it in system viability and maintenance burden.

## Tie-break rule
If two contenders are close on total score:
- acceptance role goes to the one with better fidelity and better withheld audit behavior,
- product-base role goes to the one with broader honest product coverage and lower maintenance burden.

There is no tie-break rule that preserves three coequal renderers.

## Outputs expected from Phase 4
Phase 4 must produce:
- a scored table using these exact categories,
- one role assignment for product base,
- one role assignment for acceptance/fixture engine,
- one explicit disposition for every non-winning contender.
