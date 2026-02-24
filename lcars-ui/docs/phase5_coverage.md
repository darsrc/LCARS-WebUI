# Phase 5 Coverage (Plugins & Final Verification)

## Entry Steps (Setup Gate)

- ✅ Baseline readiness checked: existing Phases 1–4 tests remain green in full CI.
- ✅ Source requirements revalidated against `Implementation Plan.md` Phase 5 and `LCARS UI Specification.md` Section 7.
- ✅ Implementation surface completed in:
  - `src/lcars_ui/plugins/loader.py`
  - `src/lcars_ui/app.py`
  - `tests/integration/test_plugins.py`
- ✅ Plugin contract/safety policy frozen:
  - discovery from entry points and `./plugins`
  - page/sidebar/action handler contributions
  - deterministic collision errors
- ✅ Deterministic plugin fixtures added in integration tests, including invalid shape/version fixtures.

**Entry Exit Criteria:** satisfied.

---

## Implementation Steps

### Step 1 — Loader foundations
- Implemented `PluginLoader` with entry-point and filesystem discovery.
- Added normalization and source metadata with deterministic ordering.

### Step 2 — Schema & constraint validation
- Implemented plugin structure validation and forbidden capability rejection.
- Added explicit error contracts via `PluginError`.

### Step 3 — Merge semantics & collision handling
- Implemented manifest page merge and sidebar merge.
- Added collision exceptions via `PluginCollisionError` for page/sidebar/action-handler keys.

### Step 4 — Runtime wiring & lifecycle
- Integrated plugin loading in `create_app()`.
- Added plugin action-handler dispatch path for upstream `action` events.

### Step 5 — Verification matrix
- Added integration tests for:
  - entry-point discovery
  - filesystem discovery and merge
  - page collision failure
  - forbidden capability rejection
  - invalid plugin shape (missing version) rejection
  - incompatible compatibility marker rejection
  - action-handler routing via HTTP fallback
  - action-handler collision rejection
  - deterministic discovery ordering across repeated runs

### Step 6 — Final verification
- Full CI run executed successfully via `make ci`.

---

## Phase Completion Confirmation (Exit Gate)

- ✅ Discovery completion: both sources implemented and verified.
- ✅ Extensibility completion: plugin page/sidebar merge verified.
- ✅ Safety completion: collisions and forbidden capabilities blocked and tested.
- ✅ Runtime completion: plugin action handler routing verified.
- ✅ Quality completion: plugin integration coverage added and passing.
- ✅ Release verification completion: `make ci` passed.
- ✅ Sign-off artifact completion: this document records implemented files, verified behaviors, and test evidence.

**Exit Step (Phase Completion Confirmation):**
**Phase 5 complete and verified for release candidate handoff.**

**Coverage status: 100% of the Phase 5 plan is implemented and verified.**
