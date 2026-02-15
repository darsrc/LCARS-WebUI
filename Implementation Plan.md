# LCARS UI Implementation Plan (Verified v1.0)

This document outlines the step-by-step execution plan for building the lcars-ui Python library. It has been verified against the Specification to ensure **100% feature coverage**, including all required endpoints, widget types, and protocol messages.

## 1. Repository Architecture

The project follows a standard Python package structure. We emphasize **fixtures** for contract validation to ensure the backend never drifts from the agreed-upon JSON schema.

```
lcars-ui/
├── Makefile                # Task runner (build, test, sync, docker operations)
├── pyproject.toml          # Metadata, dependencies (FastAPI, Pydantic), entry points, tool config
├── README.md               # Quickstart, Architecture Overview, & Usage
├── .gitignore              # Standard Python gitignore
├── scripts/
│   ├── generate_golden.py  # Script to freeze current code into Golden Artifacts (Determinism is key)
│   └── run_smoke_test.py   # Minimal script to boot app and check health endpoints
├── spec/
│   └── SPEC.md             # The Source of Truth (v1.0) - All code must implement this
├── fixtures/
│   └── golden/             # CONTRACT ARTIFACTS (Must be committed & version controlled)
│       ├── manifest.v1.json    # Reference Manifest output (The "Golden" snapshot)
│       ├── protocol.v1.json    # Reference Event envelopes (WS messages)
│       └── schema.v1.json      # Reference JSON Schema (Generated from Pydantic)
├── src/
│   └── lcars_ui/
│       ├── __init__.py     # Version exposure
│       ├── app.py          # FastAPI factory, Router, & Middleware configuration
│       ├── core/           # Core Domain Objects
│       │   ├── models.py   # Base Pydantic models (Page, Layout, Row, Column)
│       │   └── widget_base.py # Abstract base class for all widgets
│       ├── widgets/        # Concrete Widget Definitions
│       │   ├── primitives.py  # Text, StatusTile, Alert
│       │   ├── inputs.py      # Button, Toggle, Select, TextInput, Form
│       │   ├── data.py        # Table, LineChart, Sparkline
│       │   └── media.py       # LogViewer, VideoHls, MicButton
│       ├── server/         # Runtime Logic
│       │   ├── events.py   # Protocol definition & Envelope models
│       │   ├── stream.py   # WebSocket Connection Manager & SSE Generators
│       │   └── stt.py      # STT Adapter Interfaces & MockAdapter implementation
│       └── plugins/
│           └── loader.py   # Plugin discovery logic (Entry points + File system)
├── tests/
│   ├── conftest.py         # Shared fixtures (event loop, clients, mock adapters)
│   ├── contracts/          # Anti-drift tests (The most critical suite)
│   │   ├── test_manifest_schema.py # Validates JSON output against Golden File & Schema
│   │   └── test_protocol_schema.py # Validates Event envelopes
│   ├── unit/               # Logic tests
│   │   └── test_widgets.py # Tests widget serialization logic
│   └── integration/        # End-to-end flow tests
│       ├── test_api_endpoints.py # HTTP Route testing
│       ├── test_streaming.py     # WS/SSE connectivity testing
│       └── test_plugins.py       # Plugin loading isolation
└── examples/
    └── bridge_ops/         # Reference Implementation (Used for Golden File generation)
        ├── app.py          # Entry point for the example
        └── plugins/        # Example file-based plugins
```

## 2. Execution Phases

### Phase 0: Initialization & Environment

**Goal:** Create the project skeleton, configure strict tooling, and establish a functional development environment.

```
**Directory Setup:** Create the folder structure defined in Section 1. Ensure __init__.py files exist.
mkdir -p lcars-ui/src/lcars_ui/{core,widgets,server,plugins}
mkdir -p lcars-ui/{tests/{contracts,unit,integration},fixtures/golden,examples/bridge_ops}
mkdir -p lcars-ui/scripts
touch lcars-ui/src/lcars_ui/__init__.py
```

- Dependencies & Configuration: Create pyproject.toml.
  - Runtime: fastapi, uvicorn[standard], pydantic>=2.0 (critical for strict schema generation), python-multipart (for file uploads).
  - Dev: pytest, pytest-asyncio (for async route testing), httpx (for TestClient), ruff (linting), mypy (strict typing), jsonschema (for validating the generated schema itself).
  - Tool Config: Configure [tool.mypy] to strict = true.
- Tooling: Create the Makefile (see Section 4).
- Environment: Create virtual environment and install in editable mode.
python -m venv .venv && source .venv/bin/activate
make install
### Phase 1: The Contract (Schema Freeze)

**Goal:** Generate the JSON artifacts *without* running a server. This enforces "Contract-First".

- Core Models (src/lcars_ui/core/models.py):
  - Implement Page, Layout (Header/Sidebar), Row, Column using pydantic.BaseModel.
  - Use pydantic.Field to add descriptions.
- Widget Models (src/lcars_ui/widgets/):
  - Implement BaseWidget with common fields (id, type, visible, disabled).
  - Batch A (Primitives): Text, StatusTile, Alert.
  - Batch B (Inputs): Button, Toggle, Select, TextInput, Form.
  - Batch C (Data): Table, LineChart, Sparkline.
  - Batch D (Media): LogViewer, VideoHls, MicButton.
  - Constraint: Ensure every widget has a unique type literal.
- Generator Script (scripts/generate_golden.py):
  - Import all widget models.
  - Construct a full example Manifest object.
  - Dump JSON to fixtures/golden/manifest.v1.json.
  - Export JSON Schema (Manifest.model_json_schema()) to fixtures/golden/schema.v1.json.
- Freeze: Run the script to generate initial artifacts.
python scripts/generate_golden.py
- Validation Test (tests/contracts/test_manifest_schema.py):
  - Load fixtures/golden/manifest.v1.json.
  - Re-generate the object in memory.
  - Assert byte-for-byte equality.
  - Validate against fixtures/golden/schema.v1.json.
### Phase 2: The Server (FastAPI)

**Goal:** Serve the frozen contract via HTTP and establish the application lifecycle.

- App Factory (src/lcars_ui/app.py):
  - Create create_app() factory function.
  - Configure CORS and Gzip middleware.
  - Static Mount: Configure static mounting for fixtures/ (optional, for dev) or assets.
- Routes:
  - Manifest: Add GET /lcars/manifest returning the global Manifest object.
  - Schema: Add GET /lcars/schema. This MUST read and return the content of fixtures/golden/schema.v1.json.
- Reference App (examples/bridge_ops/app.py):
  - Initialize lcars_ui with the "Golden" configuration.
```
**Smoke Test:**
make dev
# In new terminal:
curl http://localhost:8000/lcars/manifest
curl http://localhost:8000/lcars/schema
```

### Phase 3: Realtime Protocol (WebSockets)

**Goal:** Establish bi-directional communication, handling connection management and protocol events.

- Protocol Models (src/lcars_ui/server/events.py):
  - Define Envelope (v, ts, type, payload).
  - Downstream Payloads: ManifestUpdate, WidgetUpdate, LogChunk, Notification, ActionAck.
  - Upstream Payloads: Action, Input, FormSubmit.
- Connection Manager (src/lcars_ui/server/stream.py):
  - Implement ConnectionManager class (connect, disconnect, broadcast).
  - Implement EventBus to route messages from Backend -> Manager.
- Endpoints:
  - WebSocket: Add @app.websocket("/lcars/ws"). Handle handshake, loop, and dispatch.
```
**HTTP Fallback:** Add POST /lcars/action/{widget_id}.
```

    - Accepts JSON payload matches Upstream Action format.
    - Injects event into the internal EventBus.
    - Returns 200/202.
- Integration Test (tests/integration/test_streaming.py):
  - Connect to /lcars/ws, send Action, receive Ack.
```
POST to /lcars/action/{id}, assert side-effect (e.g., Ack via WS if connected, or HTTP response).
```

### Phase 4: Media & Audio Pipeline

**Goal:** Implement the "Push-to-Talk" logic, mocked STT, and background processing.

- Mock STT (src/lcars_ui/server/stt.py):
  - Define abstract STTAdapter.
  - Implement MockSTTAdapter.
  - Logic: transcribe(bytes) -> str. Return deterministic string: f"processed_{hash(bytes)}".
- Upload Endpoint:
  - Add POST /lcars/upload/audio.
  - Accept UploadFile.
  - Background Tasks: Save file, call stt_adapter.transcribe, dispatch result to EventBus (which triggers a Notification event).
- SSE Fallback:
  - Add GET /lcars/events.
  - Implement an async generator yielding text/event-stream formatted data.
  - Ensure LogViewer widgets can consume this stream.
### Phase 5: Plugins & Final Verification

**Goal:** Verify extensibility via plugins and finalize the release candidates.

- Plugin Loader (src/lcars_ui/plugins/loader.py):
  - Scan entry points lcars_ui.plugins.
  - Scan os.path.join(os.getcwd(), 'plugins').
- Merge Logic:
  - Merge Plugin.pages into Core.pages.
  - Raise ValueError on ID collision.
- Final CI Run:
  - Run the full suite.
make ci

## 3. Testing Strategy (Pytest)

### A. Contract Tests (tests/contracts)

- Purpose: The primary defense against API drift.
- Mechanism:
  - Fixture Loading: Load the committed manifest.v1.json.
  - Regeneration: Instantiate the Manifest Pydantic object in memory.
  - Comparison: assert actual_json == expected_json.
  - Schema Validity: jsonschema.validate(instance=golden_json, schema=generated_schema).
### B. Streaming Tests (tests/integration/test_streaming.py)

- Purpose: Verify WS/SSE reliability and HTTP fallback.
- Mechanism:
  - Use TestClient.
  - Scenario 1: WS Handshake & Action/Ack loop.
  - Scenario 2: HTTP POST Action -> Internal State Change.
  - Scenario 3: SSE Connection -> Receive Log Chunk.
### C. STT Determinism (tests/unit/test_stt.py)

- Purpose: CI-safe audio testing without external API calls.
- Mechanism:
  - Instantiate MockSTTAdapter.
  - Pass b'test_audio_bytes'.
  - Assert result is exactly processed_hash_of_bytes.
## 4. Makefile Targets

The Makefile serves as the developer's control panel.

```
.PHONY: install dev test lint contracts-check contracts-update clean docker-build

# Install dependencies in editable mode with dev tools
install:
	pip install -e ".[dev]"

# Run the Reference Implementation (Reload active for rapid dev)
dev:
	uvicorn examples.bridge_ops.app:app --reload

# Run all tests with verbose output
test:
	pytest tests/ -v

# Check for Contract Drift (CI Gate) - Fails if code differs from Golden Files
contracts-check:
	pytest tests/contracts/ --check-golden

# Accept current state as new Contract (Use with caution)
# Updates fixtures/golden/*.json
contracts-update:
	python scripts/generate_golden.py

# Static Analysis & Type Checking
lint:
	ruff check src/ tests/
	mypy src/

# Clean build artifacts
clean:
	rm -rf build/ dist/ *.egg-info .pytest_cache .mypy_cache
	find . -name "__pycache__" -delete

# Full CI Pipeline Simulation
ci: clean lint contracts-check test
```

## 5. Risk Register

| Risk ID | Risk Description | Probability | Impact | Mitigation Strategy | Owner |
| --- | --- | --- | --- | --- | --- |
| R-01 | Schema Drift: Frontend and Backend get out of sync. | Medium | High | Strict Contract Tests. CI fails if JSON output changes without explicit Golden File update. | Tech Lead |
| R-02 | WS Instability: Flaky connections cause state mismatch. | Low | Medium | SSE & HTTP Fallback. Use SSE for logs. Use POST /action/{id} if WS is down. | Backend Dev |
| R-03 | Audio Privacy: Browser blocks Mic API on non-HTTPS. | High | High | Documentation. Explicitly warn users that MicButton requires localhost or HTTPS. | Doc Owner |
| R-04 | Plugin Conflicts: Two plugins use the same Page ID. | Medium | Low | Namespacing. Enforce plugin_name.page_id convention. Raise ValueError on collision. | Backend Dev |
| R-05 | Performance: Large manifests (>1MB) slow down load. | Low | Low | Gzip Compression. Enable standard FastAPI Gzip middleware. | Perf Lead |