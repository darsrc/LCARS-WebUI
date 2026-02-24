# Phase 2 Implementation Plan

## Baseline Plan (Approved; included verbatim)

## Phase 2 Implementation Plan — Server (FastAPI)

### Objective
Implement the Phase 2 goal: serve the frozen v1.0 contract over HTTP and establish app lifecycle/middleware for the LCARS backend.

---

### 1) Build the app factory in `lcars-ui/src/lcars_ui/app.py`

1. Implement `create_app() -> FastAPI`.
2. Configure middleware:
   - CORS with permissive default (`allow_origins=["*"]`) for dev mode.
   - GZip middleware for JSON responses.
3. Define where the “golden” artifacts live (`fixtures/golden/`), resolved robustly from project root.
4. Load/freeze manifest+schema data access strategy:
   - Manifest source: in-memory model/object generated from current widget/core models (or canonical fixture, depending on existing architecture decisions).
   - Schema source: **must** read `fixtures/golden/schema.v1.json` per plan/spec.

**Deliverable:** a working FastAPI factory with middleware and dependency-safe artifact loading.

---

### 2) Implement Phase 2 HTTP routes

Add the Phase 2 endpoints in app routing (same file or extracted router module if preferred by project style):

1. `GET /lcars/manifest`
   - Returns full Manifest v1.0 JSON.
   - Ensure stable serialization (no non-deterministic fields/order-sensitive pitfalls in tests).

2. `GET /lcars/schema`
   - Reads and returns JSON from `fixtures/golden/schema.v1.json`.
   - If file missing/unreadable, return explicit server error with actionable message (not silent fail).

**Deliverable:** endpoint contract parity with spec section 5 for these two routes.

---

### 3) Create Phase 2 reference app entrypoint

Implement `lcars-ui/examples/bridge_ops/app.py`:

1. Instantiate app via `create_app()`.
2. Expose module-level `app` for ASGI launch (`uvicorn ...:app`).
3. Keep file minimal; no Phase 3+ protocol logic here.

**Deliverable:** runnable example app wired to golden Phase 2 behavior.

---

### 4) Add/expand integration coverage in `lcars-ui/tests/integration/test_api_endpoints.py`

Implement tests for:

1. `GET /lcars/manifest`
   - `200 OK`
   - returns JSON object with expected top-level manifest keys and types.
2. `GET /lcars/schema`
   - `200 OK`
   - response equals (or semantically matches) `fixtures/golden/schema.v1.json`.
3. Optional hardening:
   - content-type assertions (`application/json`)
   - regression assertion for required schema title/version markers if present.

**Deliverable:** Phase 2 integration tests that prevent contract drift in HTTP serving layer.

---

### 5) Wire docs + developer workflow updates

1. Update `lcars-ui/README.md` quickstart to show:
   - how to launch app
   - curl commands for `/lcars/manifest` and `/lcars/schema`.
2. Ensure `Makefile` dev target (if present) points to the correct app module path.

**Deliverable:** reproducible smoke-test workflow matching Implementation Plan Phase 2 notes.

---

### 6) Phase 2 acceptance criteria (Definition of Done)

Phase 2 is complete when all are true:

- `create_app()` returns a functional FastAPI instance with CORS + GZip.
- `GET /lcars/manifest` returns Manifest v1.0 JSON.
- `GET /lcars/schema` returns `fixtures/golden/schema.v1.json` content.
- `examples/bridge_ops/app.py` exposes runnable ASGI app.
- Integration tests for both endpoints pass.
- README includes Phase 2 smoke test commands.

---

## Suggested implementation order (low-risk sequence)

1. `app.py` factory + middleware skeleton
2. `/lcars/schema` (file-backed, simplest endpoint)
3. `/lcars/manifest` (model/fixture-backed endpoint)
4. `examples/bridge_ops/app.py` wiring
5. integration tests
6. README/Makefile touch-ups

---

## Patched & Strengthened Plan (Integrated fixes for weaknesses)

### Weaknesses identified in the baseline plan

1. **Ambiguous manifest source of truth**: it allows either in-memory generation or fixture-backed serving, which can introduce drift and inconsistent behavior.
2. **No explicit error contract**: route failure behavior was described generally but not standardized.
3. **No concrete configuration strategy**: CORS behavior and file-path overrides were not formally parameterized.
4. **Insufficient non-happy-path testing**: tests focused mostly on success scenarios, with no explicit missing-schema/malformed-fixture behavior.
5. **Undefined startup validation**: no requirement to fail fast at startup if critical artifacts are missing/invalid.
6. **No implementation-level acceptance thresholds**: no explicit verification of status codes, response types, and deterministic payload expectations.

### Integrated fixes and execution details

#### A) Source-of-truth and determinism policy

- **Manifest source of truth for Phase 2:** serve from committed golden artifact (`lcars-ui/fixtures/golden/manifest.v1.json`) to guarantee deterministic API output and eliminate runtime drift.
- **Schema source of truth for Phase 2:** serve from committed golden artifact (`lcars-ui/fixtures/golden/schema.v1.json`) as required by the specification.
- Parsing should be strict JSON decoding with explicit handling for decode failures.

#### B) App factory contract (`lcars-ui/src/lcars_ui/app.py`)

- Implement `create_app()` returning a configured `FastAPI` instance.
- Add middleware:
  - `CORSMiddleware` with default development profile (`allow_origins=["*"]`, methods/headers permissive).
  - `GZipMiddleware` enabled for JSON responses.
- Add configuration inputs via environment variables (with safe defaults):
  - `LCARS_CORS_ORIGINS` (CSV list, default `*`).
  - `LCARS_FIXTURES_DIR` (optional override path; default `lcars-ui/fixtures/golden`).
- Add startup validation:
  - verify presence + JSON validity for `manifest.v1.json` and `schema.v1.json`.
  - fail-fast with clear error logging if invalid.

#### C) Route behavior and error semantics

- `GET /lcars/manifest`
  - **200** with JSON object when artifact is valid.
  - **500** with structured error payload when artifact read/decode fails.
- `GET /lcars/schema`
  - **200** with JSON object read from `schema.v1.json`.
  - **500** with structured error payload on read/decode failures.
- Standardized error envelope for Phase 2 HTTP routes:
  ```json
  {
    "error": "artifact_read_failed",
    "detail": "...",
    "path": "..."
  }
  ```

#### D) Example app (`lcars-ui/examples/bridge_ops/app.py`)

- Export module-level `app = create_app()` for direct ASGI execution.
- Keep logic minimal and Phase-2 bounded (no websocket/protocol handling here).

#### E) Test plan hardening (`lcars-ui/tests/integration/test_api_endpoints.py`)

Add/expand tests to include:

1. **Manifest success path**
   - assert `200`, `application/json`, and expected top-level keys.
2. **Schema success path**
   - assert `200`, `application/json`, semantic equality with `schema.v1.json`.
3. **Determinism assertions**
   - repeated requests return semantically identical payloads.
4. **Failure path: missing file**
   - with fixture override path (temporary dir), assert `500` + standardized error envelope.
5. **Failure path: malformed JSON**
   - assert `500` + standardized error envelope.

#### F) Documentation and workflow updates

- Update `lcars-ui/README.md` with:
  - startup command(s),
  - route smoke checks,
  - environment variable controls for CORS/fixtures path.
- Ensure `Makefile` includes (or validates) a `dev` target that launches the correct app module.

### Strengthened Definition of Done (DoD)

Phase 2 is complete only when all criteria pass:

1. `create_app()` returns a live FastAPI app with CORS and GZip configured.
2. `/lcars/manifest` and `/lcars/schema` return deterministic JSON from golden artifacts.
3. Startup validation catches missing/invalid artifacts before serving requests.
4. Failure modes produce standardized `500` error envelopes.
5. Integration tests cover success + failure paths and pass consistently.
6. Example bridge app is runnable via ASGI.
7. README and Makefile instructions reproduce smoke checks without extra assumptions.

### Implementation sequence (revised)

1. Implement app factory + env config parsing.
2. Implement startup artifact validation.
3. Implement `/lcars/manifest` and `/lcars/schema` with standardized error handling.
4. Wire `examples/bridge_ops/app.py`.
5. Implement/expand integration tests (success + negative scenarios).
6. Update README and Makefile.
7. Run test/smoke commands and finalize.
