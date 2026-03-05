# Phase 7 Implementation Plan (Frontend Runtime & Contract Consumption)

This plan defines execution steps for Phase 7: delivering a production-grade LCARS frontend runtime that consumes the backend contract (`/lcars/manifest`, `/lcars/schema`, WS/SSE streams) without violating contract-first boundaries.

## 1) Phase Objective

Deliver a frontend client that:
- Renders the full manifest-driven UI reliably on desktop and mobile
- Consumes protocol events (WS primary, SSE fallback) using v1 envelope rules
- Dispatches upstream user intents (`action`, `input`, `form_submit`) correctly
- Preserves strict backend/frontend contract separation (no frontend business logic)

---

## 2) Entry Steps (Setup Gate)

1. Reconfirm source requirements:
   - `LCARS UI Specification.md` (Manifest, Event Protocol, fallback behavior)
   - `Implementation Plan.md` (phase dependencies and constraints)
2. Confirm backend readiness:
   - `/lcars/manifest`, `/lcars/schema`, `/lcars/ws`, `/lcars/events`, `/lcars/action/{widget_id}` are available.
3. Freeze renderer behavior:
   - Define widget rendering map and unsupported-widget failure policy.
4. Freeze responsive and accessibility targets:
   - Mobile and desktop baseline layouts
   - Keyboard navigation and ARIA coverage minimums

**Entry Exit Criteria:**
- Runtime dependencies, endpoints, and rendering scope are fully defined before implementation.

---

## 3) In-Scope / Out-of-Scope

### In Scope
- Manifest fetch + schema-aware parsing
- Widget renderer implementation for all v1 widget types
- WS lifecycle handling and SSE fallback
- Upstream intent dispatch and retry/error handling
- Frontend integration tests and contract regression checks

### Out of Scope
- New protocol/event types not in v1
- Backend-side business logic or contract mutation
- Non-v1 plugin UI extension behavior

---

## 4) Implementation Work Plan

### Step 1 — Manifest Bootstrap & Validation Path
1. Implement app bootstrap sequence:
   - Fetch manifest
   - Validate shape and required fields
   - Initialize app state/store
2. Add controlled failure states:
   - Empty/error views for fetch/validation failure
   - Deterministic diagnostics for invalid contract payloads

**Step Exit Criteria:**
- Frontend boots deterministically from manifest and handles malformed/failed contract inputs safely.

### Step 2 — Widget Renderer Parity
1. Implement renderers for all v1 widgets:
   - Primitive, input, data, and media widgets
2. Enforce property-level handling:
   - `visible`, `disabled`, color and label semantics
3. Add rendering regression tests:
   - Snapshot/behavior tests for representative payloads

**Step Exit Criteria:**
- Every v1 widget type renders correctly with test-backed parity against contract fields.

### Step 3 — Realtime Runtime (WS + SSE Fallback)
1. Implement WS connection manager:
   - Connect, reconnect/backoff, envelope parsing, event routing
2. Implement SSE fallback:
   - One-way downstream updates when WS unavailable
3. Apply updates safely:
   - `manifest_update`, `widget_update`, `log_chunk`, `notification`, `action_ack`

**Step Exit Criteria:**
- Frontend remains interactive with WS primary and SSE fallback, with deterministic update behavior.

### Step 4 — Upstream Interaction Pipeline
1. Wire user interactions to upstream events:
   - `action`, `input`, `form_submit`
2. Implement HTTP fallback for actions:
   - POST `/lcars/action/{widget_id}` for WS-unavailable scenarios
3. Add action acknowledgement and error display handling

**Step Exit Criteria:**
- User actions always produce a deterministic upstream path and visible status outcome.

### Step 5 — Quality and Test Gate
1. Add integration tests:
   - Manifest load + render
   - Realtime updates
   - Fallback path behavior
2. Add compatibility tests against committed golden fixtures
3. Add static checks for frontend build, typing, and lint

**Step Exit Criteria:**
- Frontend CI checks pass with contract and runtime regression coverage.

---

## 5) Verification Exit Step (Compliance Gate)

Phase 7 is complete only when all compliance checks pass:
1. Contract compliance:
   - Frontend consumes `manifest.v1.json` and protocol envelopes without shape drift assumptions.
2. Protocol compliance:
   - All required downstream types are handled; upstream payloads match spec.
3. Fallback compliance:
   - WS failure path degrades to SSE + HTTP action fallback without data loss.
4. UX compliance:
   - Core flows verified on desktop and mobile breakpoints; keyboard baseline is functional.
5. Evidence compliance:
   - Test outputs, build/lint reports, and an explicit sign-off record are captured.

**Verification Exit Step:**
- Record sign-off statement: **"Phase 7 compliance verified and approved for Phase 8 handoff."**

