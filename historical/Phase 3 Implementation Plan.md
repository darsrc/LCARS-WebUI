# Phase 3 Implementation Plan (Realtime Protocol / WebSockets)

This plan translates **Phase 3: Realtime Protocol (WebSockets)** from `Implementation Plan.md` into an execution-ready checklist, aligned with `LCARS UI Specification.md` event protocol v1.0.

## 1) Phase Objective

Deliver a production-ready realtime transport layer for LCARS UI with:
- Typed protocol envelopes (`v`, `ts`, `type`, `payload`)
- Bi-directional WebSocket communication at `/lcars/ws`
- HTTP action fallback at `POST /lcars/action/{widget_id}`
- Connection/session management and broadcast primitives
- Integration tests that prove action roundtrip and acknowledgement behavior

---

## 2) Entry Steps (Setup Gate)

Complete these before writing Phase 3 code.

1. **Sync baseline branch state**
   - Confirm Phase 1/2 artifacts and app factory exist and are committed.
   - Confirm no unrelated dirty files in working tree.

2. **Confirm protocol/source references**
   - Re-read:
     - `Implementation Plan.md` (Phase 3 section)
     - `LCARS UI Specification.md` (Event Protocol v1.0, WS/SSE lifecycle, upstream/downstream types)
   - Freeze event names and payload contracts from spec (`manifest_update`, `widget_update`, `log_chunk`, `notification`, `action_ack`, `action`, `input`, `form_submit`).

3. **Locate implementation touchpoints**
   - `lcars-ui/src/lcars_ui/server/events.py`
   - `lcars-ui/src/lcars_ui/server/stream.py`
   - `lcars-ui/src/lcars_ui/app.py` (websocket and fallback route wiring)
   - `lcars-ui/tests/integration/test_streaming.py`

4. **Decide deterministic defaults**
   - Protocol version constant (`"1.0"`)
   - Timestamp generation strategy (float Unix timestamp, generated server-side)
   - Ack behavior policy for WS and HTTP fallback

**Entry Exit Criteria (Setup Complete):**
- Scope boundaries are explicit.
- File touch list is fixed.
- Protocol types and payload schemas are frozen for implementation.

---

## 3) In-Scope / Out-of-Scope

### In Scope
- Strongly typed protocol envelopes + payload models
- WS endpoint and message loop
- Connection manager and event fanout/broadcast
- HTTP fallback action endpoint wired into same event path
- Integration tests for realtime behavior

### Out of Scope
- SSE implementation details (Phase 4)
- Audio/STT upload pipeline (Phase 4)
- Plugin-triggered realtime extensions (Phase 5)
- Frontend rendering behavior beyond protocol contract

---

## 4) Implementation Work Plan

### Step 1 — Protocol Models (`lcars-ui/src/lcars_ui/server/events.py`)

Implement typed event contracts:
- `Envelope` base model:
  - `v: Literal["1.0"]`
  - `ts: float`
  - `type: Literal[...]` (discriminator)
  - `payload: <typed payload union>`
- Downstream payload models:
  - `ManifestUpdatePayload`
  - `WidgetUpdatePayload`
  - `LogChunkPayload`
  - `NotificationPayload`
  - `ActionAckPayload`
- Upstream payload models:
  - `ActionPayload`
  - `InputPayload`
  - `FormSubmitPayload`

Implementation notes:
- Keep payload names explicit and one-to-one with spec table entries.
- Ensure validation rejects unknown required fields and malformed payload shapes.

**Step Exit Criteria:**
- Every Phase 3 event type is represented by a typed model.
- Envelope validation can parse and serialize all supported event variants.

---

### Step 2 — Connection Management + Event Bus (`lcars-ui/src/lcars_ui/server/stream.py`)

Implement runtime transport primitives:
- `ConnectionManager`
  - `connect(websocket)`
  - `disconnect(websocket)`
  - `send_to(websocket, envelope)`
  - `broadcast(envelope)`
- `EventBus`
  - Internal async queue or pub/sub primitive for downstream envelopes
  - API for publishing server-side events and consuming/broadcasting them

Implementation notes:
- Handle disconnect exceptions cleanly and prune dead sockets.
- Preserve message ordering per connection as much as practical.
- Keep manager stateless beyond active connection registry.

**Step Exit Criteria:**
- Multiple WS clients can connect/disconnect without orphaned sessions.
- Published downstream envelopes reach all active clients.

---

### Step 3 — WebSocket Endpoint Wiring (`lcars-ui/src/lcars_ui/app.py`)

Add `/lcars/ws` endpoint behavior:
1. Accept connection (optional auth hooks if already present in app architecture).
2. Register with `ConnectionManager`.
3. Receive client messages in loop.
4. Parse into typed upstream envelopes.
5. Route/emit corresponding internal events.
6. Return `action_ack` envelopes on actionable inputs.
7. Ensure cleanup on disconnect.

Implementation notes:
- Reject protocol version mismatch with explicit close behavior.
- Normalize invalid message handling (validation error -> controlled error/close path).

**Step Exit Criteria:**
- Client can send `action`/`input`/`form_submit` messages and receive deterministic acknowledgements.
- Endpoint remains stable across connect/disconnect churn.

---

### Step 4 — HTTP Fallback Action Endpoint (`lcars-ui/src/lcars_ui/app.py`)

Add `POST /lcars/action/{widget_id}`:
- Accept JSON body mapped to upstream action shape.
- Normalize `widget_id` path and payload `id` handling (single canonical action id).
- Inject event into same internal processing path used by WS actions.
- Return synchronous HTTP status (`200`/`202`) with acknowledgement payload.

Implementation notes:
- Keep fallback semantics aligned with spec: HTTP handles upstream when WS unavailable.
- Reuse shared validation model to avoid drift between WS and HTTP input formats.

**Step Exit Criteria:**
- HTTP fallback action triggers same backend path as WS action.
- Response contract is consistent and documented.

---

### Step 5 — Integration Tests (`lcars-ui/tests/integration/test_streaming.py`)

Add/expand integration coverage:
1. **WS Action Roundtrip**
   - Connect to `/lcars/ws`
   - Send upstream `action`
   - Assert `action_ack` envelope received
2. **WS Validation/Error Handling**
   - Send malformed envelope
   - Assert controlled failure behavior (error/close policy)
3. **Broadcast Behavior**
   - Connect 2+ clients
   - Publish downstream event via bus
   - Assert all clients receive event
4. **HTTP Fallback Action**
   - POST `/lcars/action/{id}`
   - Assert accepted status + expected ack/result contract
   - If WS client connected, assert observable side effect when applicable

**Step Exit Criteria:**
- Tests protect all core Phase 3 transport guarantees.
- Regressions in envelope format or routing fail fast.

---

## 5) Phase Completion Confirmation (Exit Gate)

Phase 3 is complete only when all checks pass:

1. **Contract Completion**
   - All Phase 3 event types from spec exist as typed models.

2. **Transport Completion**
   - `/lcars/ws` supports connect, receive, dispatch, ack, and disconnect cleanup.

3. **Fallback Completion**
   - `POST /lcars/action/{widget_id}` is implemented and integrated with shared event pipeline.

4. **Quality Completion**
   - Integration tests cover WS roundtrip, malformed input behavior, broadcast, and HTTP fallback.

5. **Documentation Completion**
   - Any protocol/endpoint behavior changes are reflected in repository docs where Phase 2/3 runtime behavior is described.

6. **Implementation Readiness Confirmation**
   - Confirm “Phase 3 ready for Phase 4 handoff” with a short summary of:
     - Implemented files
     - Supported event types
     - Verified test coverage areas
     - Known deferred items (if any)

---

## 6) Suggested Execution Sequence

1. `events.py` typed contracts
2. `stream.py` manager + event bus
3. `app.py` WS endpoint
4. `app.py` HTTP fallback action endpoint
5. `test_streaming.py` integration scenarios
6. docs touch-ups and phase exit checklist

This order minimizes risk by locking protocol definitions first, then transport internals, then endpoint wiring, then verification.
