# Phase 5 Implementation Plan (Plugins & Final Verification)

This plan translates **Phase 5: Plugins & Final Verification** from `Implementation Plan.md` into an execution-ready checklist aligned with `LCARS UI Specification.md` Section 7 (Plugin System) and the release-quality expectations defined across the implementation roadmap.

## 1) Phase Objective

Deliver an extensible, release-ready LCARS backend by implementing and validating:
- Dual plugin discovery (entry points + local filesystem `./plugins`)
- Safe plugin merge behavior for pages/navigation/action handlers
- Explicit collision and contract validation behavior
- End-to-end verification through full CI (`make ci`) and phase sign-off artifacts

---

## 2) Entry Steps (Setup Gate)

Complete these before writing Phase 5 code.

1. **Baseline readiness check**
   - Confirm Phases 1–4 are merged and green.
   - Confirm no unrelated working-tree changes before Phase 5 work starts.

2. **Reconfirm Phase 5 source requirements**
   - Re-read:
     - `Implementation Plan.md` (Phase 5 section)
     - `LCARS UI Specification.md` (Section 7: discovery mechanisms, plugin capabilities, constraints)
   - Freeze mandatory expectations:
     - Discovery scans both `lcars_ui.plugins` entry points and `./plugins`.
     - Plugin extensions are limited to allowed capability areas.
     - Collision behavior is deterministic and test-covered.

3. **Define Phase 5 implementation surface**
   - Primary code:
     - `lcars-ui/src/lcars_ui/plugins/loader.py`
   - Likely integration points:
     - `lcars-ui/src/lcars_ui/app.py` (plugin load lifecycle wiring)
     - `lcars-ui/src/lcars_ui/core/models.py` (if plugin registration models are formalized)
     - `lcars-ui/src/lcars_ui/server/events.py` / action dispatch module (if plugin action handlers are bound here)
   - Test scope:
     - `lcars-ui/tests/integration/test_plugins.py`
     - Supporting fixtures under `lcars-ui/tests/` and/or `lcars-ui/examples/bridge_ops/plugins/`

4. **Freeze plugin contract and safety policy**
   - Define canonical plugin interface (e.g., export object/function returning plugin metadata).
   - Freeze merge semantics for:
     - Pages
     - Sidebar nav injections
     - Action handlers
   - Freeze collision policy:
     - Error class/type raised
     - Error message contract for diagnostics

5. **Prepare deterministic test fixtures**
   - Create/confirm fixture plugins for:
     - Valid entry-point plugin
     - Valid filesystem plugin
     - Duplicate page ID collision
     - Invalid plugin shape/version

**Entry Exit Criteria (Setup Complete):**
- Phase 5 requirements are frozen against source docs.
- Touchpoints and test matrix are explicit.
- Merge and collision policies are agreed before coding.

---

## 3) In-Scope / Out-of-Scope

### In Scope
- Plugin discovery via entry points and `./plugins`
- Plugin load/validation pipeline
- Merge of plugin pages into manifest/page registry
- Optional sidebar/action-handler registration per spec capability boundaries
- Deterministic collision handling and error reporting
- Full suite verification and release-candidate readiness checks

### Out of Scope
- New widget schema types introduced by plugins (explicitly disallowed in spec v1)
- Event protocol envelope changes
- Frontend plugin UI runtime behavior
- Post-v1 plugin sandbox/security model redesign

---

## 4) Implementation Work Plan

### Step 1 — Loader Foundations (`lcars-ui/src/lcars_ui/plugins/loader.py`)

Implement a plugin loader service with explicit stages:
1. Discover candidate plugins from:
   - Python entry point group `lcars_ui.plugins`
   - Filesystem path `os.path.join(os.getcwd(), "plugins")`
2. Import/load candidates with structured diagnostics.
3. Normalize each plugin into a canonical internal model.
4. Validate plugin payload before merge.

Implementation notes:
- Keep discovery and merge concerns separate for testability.
- Record source origin (`entry_point` vs `filesystem`) for observability/debug logs.

**Step Exit Criteria:**
- Loader can enumerate both discovery sources deterministically.
- Invalid imports are surfaced as controlled failures (not silent skips unless explicitly configured).

---

### Step 2 — Plugin Schema & Constraint Validation

Validate plugin contributions against spec constraints:
- Allowed contributions:
  - Page registrations
  - Sidebar navigation injection requests
  - Action handler registrations
- Disallowed contributions:
  - New widget schema/type definitions
  - Protocol envelope modifications

Validation checks:
- Required plugin metadata present (name/id/version as defined by project interface).
- Page/action/nav identifiers conform to project naming rules.
- Any optional version compatibility marker matches current schema/protocol major version.

**Step Exit Criteria:**
- Invalid plugin shapes fail early with actionable errors.
- Constraint violations are blocked prior to manifest/runtime mutation.

---

### Step 3 — Merge Semantics & Collision Handling

Implement deterministic merge behavior:
1. **Pages**
   - Merge plugin pages into core page registry.
   - Apply agreed conflict rule:
     - If using strict no-overwrite mode from implementation plan: raise `ValueError` on duplicate page ID.
     - If using namespaced IDs per spec guidance: enforce namespace transformation/validation and still reject effective duplicates.
2. **Sidebar items**
   - Append validated plugin nav entries in stable order.
3. **Action handlers**
   - Register handler patterns/callbacks without clobbering existing explicit mappings.

Implementation notes:
- Keep merge operation transactional where practical (fail all on critical collision, avoid partial apply).
- Emit structured logs with plugin identifier and conflicting key.

**Step Exit Criteria:**
- Merge outcomes are deterministic across runs.
- ID collisions and invalid overlaps raise expected exceptions with clear messages.

---

### Step 4 — Runtime Wiring & Lifecycle

Integrate plugin loading into app startup/runtime flow:
- Load plugins at application bootstrap (or explicit initialization hook).
- Apply plugin contributions before manifest is served to clients.
- Ensure plugin action handlers are reachable through existing action processing pipeline (WS + HTTP fallback path).
- Ensure failures follow configured policy:
  - Fail-fast for invalid/colliding required plugins, or
  - Continue with degraded mode if project policy explicitly allows optional plugin failure.

**Step Exit Criteria:**
- Running app reflects plugin-contributed pages/nav/actions.
- Startup behavior is predictable for both success and failure scenarios.

---

### Step 5 — Verification Matrix (`lcars-ui/tests/integration/test_plugins.py` + related tests)

Add/expand tests to cover:
1. **Discovery tests**
   - Entry-point plugin discovered/loaded.
   - Filesystem plugin discovered/loaded.
2. **Merge tests**
   - Valid plugin page appears in manifest/page registry.
   - Sidebar injection appears as expected.
3. **Collision tests**
   - Duplicate page ID produces expected `ValueError` (or equivalent contract error).
4. **Constraint tests**
   - Plugin attempting unsupported schema/protocol extension is rejected.
5. **Action-handler routing tests**
   - Plugin-registered action pattern receives matching actions.
6. **Determinism tests**
   - Plugin load order and merge output remain stable under repeated runs.

**Step Exit Criteria:**
- Plugin behavior is covered for success, collision, and invalid contribution paths.
- Regressions in discovery/merge/runtime routing fail fast.

---

### Step 6 — Final Verification & Release Candidate Checks

Execute release-grade checks:
- Run full CI pipeline via `make ci`.
- Confirm contract artifacts and runtime tests remain green.
- Confirm plugin tests run as part of standard CI target.
- Document any deferred non-blockers explicitly.

**Step Exit Criteria:**
- Full suite passes with Phase 5 changes included.
- No unresolved blocker remains for v1.0 release candidate.

---

## 5) Phase Completion Confirmation (Exit Gate)

Phase 5 is complete only when all checks pass:

1. **Discovery Completion**
   - Both `lcars_ui.plugins` entry points and `./plugins` filesystem discovery are implemented and validated.

2. **Extensibility Completion**
   - Plugin pages are merged into application state with deterministic ordering and expected behavior.

3. **Safety Completion**
   - ID collisions and invalid plugin contracts are blocked with explicit, test-covered errors.

4. **Runtime Completion**
   - Plugin-contributed action handlers are reachable through the existing action processing pipeline.

5. **Quality Completion**
   - Integration tests cover discovery, merge success paths, collision failures, and constraint enforcement.

6. **Release Verification Completion**
   - `make ci` passes with all relevant suites, including plugin-related coverage.

7. **Sign-off Artifact Completion**
   - Record a concise phase summary including:
     - Implemented files
     - Verified behaviors
     - Test evidence
     - Deferred items (if any)

**Exit Step (Phase Completion Confirmation):**
- Record explicit sign-off statement: **"Phase 5 complete and verified for release candidate handoff."**

---

## 6) Suggested Execution Sequence

1. Loader discovery scaffolding (entry point + filesystem)
2. Plugin schema/constraint validation layer
3. Deterministic merge engine + collision rules
4. App/runtime wiring for startup and action-handler integration
5. Integration + failure-path test coverage
6. Full CI run and Phase 5 sign-off artifact

This sequence minimizes risk by validating plugin safety contracts before runtime integration and final release checks.
