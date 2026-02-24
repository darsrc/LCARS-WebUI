# Phase 4 Implementation Plan (Media & Audio Pipeline)

This plan translates **Phase 4: Media & Audio Pipeline** from `Implementation Plan.md` into an execution-ready checklist aligned with `LCARS UI Specification.md` sections covering Mic workflow, SSE fallback, and `/lcars/upload/audio` behavior.

## 1) Phase Objective

Deliver a deterministic, testable media pipeline that provides:
- Pluggable speech-to-text adapter interface with a default `MockSTTAdapter`
- Async audio upload processing at `POST /lcars/upload/audio`
- Server-Sent Events fallback stream at `GET /lcars/events`
- Event propagation compatible with existing WS/SSE downstream protocol (`notification`, `log_chunk`, `widget_update` as applicable)
- Coverage proving deterministic STT behavior and non-blocking upload semantics

---

## 2) Entry Steps (Setup Gate)

Complete these before writing Phase 4 code.

1. **Validate prerequisite phases are stable**
   - Confirm Phase 2 API app structure and Phase 3 event/stream infrastructure are present.
   - Confirm there is a shared event publication path usable by WS and SSE subscribers.

2. **Reconfirm source contracts for Phase 4**
   - Re-read:
     - `Implementation Plan.md` (Phase 4 section)
     - `LCARS UI Specification.md` (Sections 3.3, 4, and 5 endpoint table)
   - Freeze behavior expectations:
     - `POST /lcars/upload/audio` returns `202 Accepted`
     - Processing is asynchronous
     - Results are delivered through realtime channels (WS/SSE)
     - SSE remains downstream-only

3. **Identify implementation touchpoints**
   - `lcars-ui/src/lcars_ui/server/stt.py`
   - `lcars-ui/src/lcars_ui/server/stream.py` (SSE producer/subscriber mechanics)
   - `lcars-ui/src/lcars_ui/app.py` (`/lcars/upload/audio`, `/lcars/events` wiring)
   - `lcars-ui/tests/unit/test_stt.py`
   - `lcars-ui/tests/integration/test_streaming.py` (or dedicated SSE/audio integration test file)

4. **Freeze deterministic adapter semantics**
   - Define exact deterministic output contract for `MockSTTAdapter.transcribe(bytes) -> str`.
   - Prefer a stable digest-based output (for reproducible CI) and document it in tests.

5. **Define background task boundaries**
   - Audio endpoint should only validate input and enqueue work.
   - Heavy processing/transcription must happen outside request-response critical path.

**Entry Exit Criteria (Setup Complete):**
- Phase 4 scope and dependencies are explicit.
- File touch list is agreed.
- Determinism and async response semantics are frozen.

---

## 3) In-Scope / Out-of-Scope

### In Scope
- STT adapter abstraction and mock implementation
- Audio upload endpoint with asynchronous processing pipeline
- SSE fallback endpoint and event formatting
- Event emission path that can deliver transcription outcomes to clients
- Unit/integration tests for determinism and transport behavior

### Out of Scope
- Real cloud STT provider integrations (future plugin/adapter work)
- Frontend MediaRecorder implementation details
- Advanced command parsing/NLU beyond basic “transcribe then dispatch” handoff
- Auth or production hardening beyond existing project standards

---

## 4) Implementation Work Plan

### Step 1 — STT Adapter Layer (`lcars-ui/src/lcars_ui/server/stt.py`)

Implement adapter contracts:
- Create abstract `STTAdapter` interface (or protocol) with `transcribe(audio_bytes: bytes) -> str`.
- Implement `MockSTTAdapter` with deterministic output for identical input bytes.
- Ensure deterministic behavior is independent of process randomness.

Implementation notes:
- Keep adapter API synchronous unless existing architecture already requires async.
- If adapter errors occur, convert to controlled domain exceptions that can be surfaced as notifications.

**Step Exit Criteria:**
- `MockSTTAdapter` returns predictable output for repeated identical input.
- Adapter interface is ready for future cloud-backed implementations.

---

### Step 2 — Audio Upload Endpoint (`lcars-ui/src/lcars_ui/app.py`)

Add `POST /lcars/upload/audio`:
1. Accept multipart file upload (`UploadFile`).
2. Validate content presence/size constraints per existing project conventions.
3. Read bytes safely and enqueue background processing.
4. Return immediately with `202 Accepted` and lightweight acknowledgement payload.

Background flow:
- Invoke `stt_adapter.transcribe(audio_bytes)`.
- Hand off transcribed text to existing command/action processing path.
- Emit downstream events (at minimum `notification`; optionally `widget_update` depending on command result).

Implementation notes:
- Do not block request while transcription/dispatch completes.
- Keep the endpoint resilient: malformed upload -> explicit 4xx; processing failure -> logged + user-visible error notification event.

**Step Exit Criteria:**
- Endpoint returns `202` quickly and does not perform long-running work inline.
- Successful processing results in downstream event emission.

---

### Step 3 — SSE Fallback Stream (`lcars-ui/src/lcars_ui/app.py`, `lcars-ui/src/lcars_ui/server/stream.py`)

Add `GET /lcars/events` with `text/event-stream` response:
- Implement async event generator that yields properly formatted SSE frames.
- Subscribe SSE clients to the same downstream event source as WS broadcasts.
- Ensure disconnect cleanup for SSE subscribers.

SSE framing requirements:
- Emit `event:` using protocol `type` where useful.
- Emit `data:` as JSON-serialized envelope payload (or full envelope based on existing transport design).
- Include heartbeat/keepalive strategy if required by current infra.

Implementation notes:
- Preserve spec constraint: SSE is downstream-only.
- Keep event ordering predictable per client stream.

**Step Exit Criteria:**
- SSE endpoint streams downstream updates in valid `text/event-stream` format.
- LogViewer-compatible `log_chunk` events can be consumed over SSE.

---

### Step 4 — Event Routing for Audio Outcomes (`lcars-ui/src/lcars_ui/server/stream.py` + app wiring)

Wire transcription outputs into realtime pipeline:
- Define the translation from transcription result to emitted protocol events.
- At minimum send a `notification` event confirming processed command; add `action_ack`/`widget_update` only if consistent with existing pipeline.
- Ensure both WS and SSE consumers observe equivalent downstream outcomes.

Implementation notes:
- Reuse shared event envelope builders to avoid protocol drift.
- Add structured logs around upload -> transcribe -> dispatch lifecycle for debugability.

**Step Exit Criteria:**
- Audio processing outcomes are visible on realtime channels.
- No duplicate or transport-specific divergence in emitted events.

---

### Step 5 — Verification Coverage (`lcars-ui/tests/unit/test_stt.py`, `lcars-ui/tests/integration/test_streaming.py`)

Add/expand tests:
1. **Mock STT Determinism (unit)**
   - Same bytes -> same transcription output
   - Different bytes -> predictably different output (if hashing contract is used)
2. **Audio Upload Async Contract (integration)**
   - POST multipart to `/lcars/upload/audio`
   - Assert immediate `202 Accepted`
   - Assert downstream notification/event appears via WS or SSE test client
3. **SSE Stream Contract (integration)**
   - Connect to `/lcars/events`
   - Publish/emulate downstream event
   - Assert correctly framed SSE message content and event type
4. **Failure Path Coverage**
   - Invalid upload payload -> expected client error
   - Adapter exception -> controlled behavior + error notification/event

**Step Exit Criteria:**
- Tests guard deterministic STT behavior, async upload semantics, and SSE formatting.
- Regressions in Phase 4 protocol behavior fail fast.

---

## 5) Phase Completion Confirmation (Exit Gate)

Phase 4 is complete only when all checks pass:

1. **Adapter Completion**
   - `STTAdapter` contract and deterministic `MockSTTAdapter` implemented and tested.

2. **Endpoint Completion**
   - `POST /lcars/upload/audio` is available, validates upload input, and returns `202` while processing asynchronously.

3. **Fallback Completion**
   - `GET /lcars/events` streams valid SSE frames with downstream event data.

4. **Realtime Consistency Completion**
   - Audio outcomes are observable to both WS and SSE consumers via shared event pipeline.

5. **Quality Completion**
   - Unit + integration coverage exists for deterministic STT, async upload behavior, SSE delivery, and failure paths.

6. **Phase Sign-off Artifacts**
   - Short completion summary recorded with:
     - Implemented files
     - Endpoint behavior confirmations
     - Test areas validated
     - Deferred items explicitly listed (if any)

**Exit Step (Phase Completion Confirmation):**
- Record explicit sign-off statement: **"Phase 4 ready for Phase 5 handoff"** once all gates are satisfied.

---

## 6) Suggested Execution Sequence

1. `server/stt.py` adapter abstraction + mock
2. `app.py` upload endpoint and background task orchestration
3. `stream.py` + `app.py` SSE endpoint wiring
4. event routing for transcription results into shared bus
5. unit/integration tests for STT, upload async, and SSE stream behavior
6. final phase-exit checklist and handoff summary

This ordering minimizes risk by locking deterministic core behavior first, then exposing endpoints, then validating transport and end-to-end outcomes.
