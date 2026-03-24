# Phase 1 Implementation Plan (Contract / Schema Freeze)

This document is the execution plan for **Phase 1** from `Implementation Plan.md`, aligned with `LCARS UI Specification.md`.

## 1) Phase Objective

Deliver a **contract-first, frozen manifest + schema baseline** for `lcars-ui` without running the server.

By the end of Phase 1 we will have:
- Complete Pydantic models for the v1 manifest contract.
- Deterministic golden artifacts for manifest and schema.
- Contract tests that detect drift via byte-level and schema validation.

## 2) Scope

### In Scope
- `lcars-ui/src/lcars_ui/core/models.py`
- `lcars-ui/src/lcars_ui/core/widget_base.py`
- `lcars-ui/src/lcars_ui/widgets/primitives.py`
- `lcars-ui/src/lcars_ui/widgets/inputs.py`
- `lcars-ui/src/lcars_ui/widgets/data.py`
- `lcars-ui/src/lcars_ui/widgets/media.py`
- `lcars-ui/scripts/generate_golden.py`
- `lcars-ui/fixtures/golden/manifest.v1.json`
- `lcars-ui/fixtures/golden/schema.v1.json`
- `lcars-ui/tests/contracts/test_manifest_schema.py`

### Out of Scope
- FastAPI endpoints and app wiring (`/lcars/manifest`, `/lcars/schema`).
- WebSocket/SSE protocol modeling and transport.
- STT/audio pipeline.
- Plugin discovery/merge behavior.

## 3) Contract Requirements (Phase 1)

### 3.1 Root Manifest
Implement root contract fields:
- `meta`: `version`, `app_name`, `theme`, `lang`, `sound_enabled`
- `layout`: `header` + `sidebar`
- `pages`: dictionary keyed by page id

### 3.2 Page/Grid Hierarchy
Implement strict structure:
- `Manifest -> Page -> Row -> Column -> Widget[]`
- Support layout hints (e.g., `height: auto|1fr|200px`, `width: 1fr|2fr|300px`).

### 3.3 Base Widget Contract
All widgets must include:
- `id` (required)
- `type` (required discriminator)
- `label` (optional)
- `color` (optional; LCARS palette)
- `disabled` (bool)
- `visible` (bool)

### 3.4 Widget Families and Required Fields
#### A) Primitives
- `Text`: `content`, `size`
- `StatusTile`: `status`, `value`
- `Alert`: `severity`, `message`, `blink`

#### B) Inputs
- `Button`: `action_id`
- `Toggle`: `checked`, `action_id`
- `Select`: `options[{label,value}]`, `value`, `action_id`
- `TextInput`: `placeholder`, `value`, `password`, `regex`
- `Form`: `submit_label`, `action_id`, `children`

#### C) Data
- `Table`: `headers`, `rows[{id,cells}]`
- `LineChart`: `series[{name,data,color}]`, `x_labels`
- `Sparkline`: `series[{name,data,color}]`, `x_labels`

#### D) Media
- `LogViewer`: `stream_id`, `max_lines`
- `VideoHls`: `src`, `autoplay`, `muted`
- `MicButton`: `upload_url`, `action_id`, `timeout_ms`

### 3.5 Determinism Requirements
- No dynamic timestamps/random values in generated fixtures.
- Stable serializer configuration (ordering/indent/newline).
- Re-run generator with no source changes => no file diff.

## 4) Implementation Work Plan

### Step 1 — Core Manifest Models (`core/models.py`)
- Implement: `Meta`, `Header`, `SidebarItem`, `Sidebar`, `Layout`, `Page`, `Row`, `Column`, `Manifest`.
- Add `Field(...)` descriptions for schema readability.
- Apply enums/literals where called out by spec (theme, sidebar position, colors when shared models are used).

**Exit Criteria:** Manifest instances can represent a page tree with rows/columns/widgets and serialize cleanly.

### Step 2 — Widget Base + Discriminated Union (`core/widget_base.py`)
- Implement `BaseWidget` common fields.
- Use a unique fixed `type` literal per concrete widget.
- Define/import a discriminated union used by `Column.widgets`.

**Exit Criteria:** Mixed widget arrays validate/serialize with correct type discrimination.

### Step 3 — Primitive + Input Widgets (`widgets/primitives.py`, `widgets/inputs.py`)
- Implement all primitive models and required fields.
- Implement all input models and required fields.
- Ensure `Form.children` only accepts valid input widget variants.

**Exit Criteria:** Primitive/input models validate required fields and reject invalid enums/types.

### Step 4 — Data + Media Widgets (`widgets/data.py`, `widgets/media.py`)
- Implement all data and media models and nested structures.
- Add defaults where spec allows defaults (`max_lines`, `timeout_ms`), while preserving explicitness in fixture generation.

**Exit Criteria:** Full widget catalog is importable and schema generation includes every widget definition.

### Step 5 — Golden Artifact Generator (`scripts/generate_golden.py`)
- Import all widget modules/models.
- Build one representative `Manifest` containing **every widget type at least once**.
- Write:
  - `fixtures/golden/manifest.v1.json`
  - `fixtures/golden/schema.v1.json` via `Manifest.model_json_schema()`
- Keep output deterministic (fixed formatting + trailing newline policy).

**Exit Criteria:** Re-running generator produces identical artifacts unless model changes are intentional.

### Step 6 — Contract Drift Tests (`tests/contracts/test_manifest_schema.py`)
- Load committed `manifest.v1.json`.
- Regenerate equivalent manifest object in-memory.
- Assert byte-level equality between expected and regenerated manifest JSON.
- Validate manifest against committed schema fixture (`schema.v1.json`) using `jsonschema`.

**Exit Criteria:** Test fails on drift and passes when code/fixtures are aligned.

## 5) Gaps/Weaknesses Addressed in This Revision

- Added explicit required-field coverage for each widget family (previously high-level only).
- Added validation expectations for `Form.children` typing and discriminated unions.
- Clarified deterministic fixture guarantees (format + no dynamic values + no-diff rerun).
- Clarified defaulted fields that must still be represented/validated in contract behavior.
- Strengthened “exit criteria” so each step has a measurable completion condition.

## 6) Acceptance Criteria (Phase 1 Done)

Phase 1 is complete only when all are true:
1. Every widget listed in the specification exists as a typed model.
2. Every widget has a unique stable `type` discriminator.
3. Manifest hierarchy (`Manifest/Page/Row/Column/Widget`) is fully typed and serializable.
4. Golden manifest and schema fixtures are generated and committed.
5. Running the generator twice without code changes yields no diff.
6. Contract test verifies byte equality for manifest fixture.
7. Contract test validates manifest against committed schema fixture.

## 7) Execution Checklist

1. Implement/update core + widget models.
2. Ensure discriminator union wiring compiles and validates.
3. Run generator.
4. Review fixture diffs.
5. Run contract tests.
6. (Optional) Run broader test suite.
7. Commit only once fixtures/tests are green.

## 8) Commands for Implementation

```bash
# from repository root
cd lcars-ui

# 1) generate frozen artifacts
python scripts/generate_golden.py

# 2) run contract guardrail test
pytest -q tests/contracts/test_manifest_schema.py

# 3) optional broader regression
pytest -q
```

## 9) Phase 1 Traceability Matrix (100% Coverage)

This maps each Phase 1 bullet in `Implementation Plan.md` to this document.

| Phase 1 Source Requirement | Coverage in This Plan |
| --- | --- |
| Implement `Page`, `Layout` (Header/Sidebar), `Row`, `Column` in `core/models.py` | §4 Step 1 |
| Use `pydantic.Field` descriptions | §4 Step 1 |
| Implement `BaseWidget` common fields (`id`, `type`, `visible`, `disabled`) | §3.3 + §4 Step 2 |
| Batch A widgets (`Text`, `StatusTile`, `Alert`) | §3.4A + §4 Step 3 |
| Batch B widgets (`Button`, `Toggle`, `Select`, `TextInput`, `Form`) | §3.4B + §4 Step 3 |
| Batch C widgets (`Table`, `LineChart`, `Sparkline`) | §3.4C + §4 Step 4 |
| Batch D widgets (`LogViewer`, `VideoHls`, `MicButton`) | §3.4D + §4 Step 4 |
| Ensure unique widget `type` literals | §4 Step 2 + §6 #2 |
| Generator imports all widget models | §4 Step 5 |
| Build full example manifest | §4 Step 5 |
| Dump `fixtures/golden/manifest.v1.json` | §4 Step 5 |
| Dump `fixtures/golden/schema.v1.json` from `Manifest.model_json_schema()` | §4 Step 5 |
| Freeze by running generator script | §7 #3 + §8 |
| Contract test loads committed manifest fixture | §4 Step 6 |
| Contract test asserts regenerated manifest equality | §4 Step 6 + §6 #6 |
| Contract test validates against committed schema fixture | §4 Step 6 + §6 #7 |

**Coverage Result:** All Phase 1 requirements are explicitly represented in this plan.

## 10) Risks and Mitigations

- **Risk:** Non-deterministic fixture output creates noisy diffs.
  - **Mitigation:** Deterministic serializer settings and no dynamic values in sample manifest.

- **Risk:** Ambiguous widget validation from non-discriminated unions.
  - **Mitigation:** Enforce unique literal `type` per widget and discriminated union definitions.

- **Risk:** Under-specified nested structures (`Form.children`, `Table.rows`, chart `series`) drift from spec.
  - **Mitigation:** Explicit nested model typing + contract tests covering nested payload shape.

- **Risk:** Schema regenerated but fixture equality test becomes brittle due to formatting only.
  - **Mitigation:** Standardize formatting in generator and compare normalized + byte-level outputs where needed.

## 11) Definition of Ready for Phase 2

Before moving to Phase 2 (server delivery of contract), confirm:
- Artifacts are frozen and reviewed.
- Contract tests run in normal CI path.
- Model imports/type unions are stable and reusable by app/server layers.


## 12) Patch Plan to Close 100% of Remaining Gaps/Weaknesses

This patch plan is the implementation backlog to guarantee complete Phase 1 closure on this branch.

### 12.1 Gap Inventory (Current Branch)

| Gap ID | Gap / Weakness Found | Impact | Patch Action | Target Files |
| --- | --- | --- | --- | --- |
| P1-G01 | Phase 0 placeholders still exist in `core/models.py`, `widget_base.py`, and widget modules. | Manifest/schema cannot represent the v1 contract. | Replace placeholders with complete Pydantic models and unique widget type literals. | `lcars-ui/src/lcars_ui/core/models.py`, `lcars-ui/src/lcars_ui/core/widget_base.py`, `lcars-ui/src/lcars_ui/widgets/*.py` |
| P1-G02 | Golden artifact generator is still a Phase 0 placeholder. | Contract artifacts are not spec-compliant and cannot freeze Phase 1 schema. | Rewrite generator to build full example manifest + export schema from `Manifest.model_json_schema()`. | `lcars-ui/scripts/generate_golden.py` |
| P1-G03 | Golden fixtures are placeholder payloads. | Contract drift checks have no real value. | Regenerate and commit `manifest.v1.json` + `schema.v1.json` from Phase 1 models. | `lcars-ui/fixtures/golden/manifest.v1.json`, `lcars-ui/fixtures/golden/schema.v1.json` |
| P1-G04 | Contract test currently validates placeholder structure only. | Drift in real manifest/schema would be undetected. | Replace with anti-drift tests: in-memory regeneration, byte-equality, schema validation. | `lcars-ui/tests/contracts/test_manifest_schema.py` |
| P1-G05 | Widget tests are still Phase 0 config checks (not widget behavior). | No confidence on discriminator uniqueness/typing. | Add widget unit tests for type uniqueness + discriminated unions (`Column.widgets`, `Form.children`). | `lcars-ui/tests/unit/test_widgets.py` |
| P1-G06 | Test import path may fail without editable install. | CI/dev test runs become brittle. | Ensure `src/` path bootstrap in `tests/conftest.py`. | `lcars-ui/tests/conftest.py` |
| P1-G07 | Optional `jsonschema` availability may block complete contract validation in restricted envs. | False-negative pipeline failures. | Keep strict validation test, gated with explicit `importorskip` fallback and note in CI requirements. | `lcars-ui/tests/contracts/test_manifest_schema.py`, `lcars-ui/pyproject.toml` |

### 12.2 Patch Sequence (Execution Order)

1. **Models first** (`P1-G01`) so schema contract exists.
2. **Generator rewrite** (`P1-G02`) to produce canonical artifacts.
3. **Fixture freeze** (`P1-G03`) by running generator and reviewing diffs.
4. **Contract test hardening** (`P1-G04`) against new artifacts.
5. **Widget unit tests** (`P1-G05`) for discriminator/type guarantees.
6. **Test harness stabilization** (`P1-G06`, `P1-G07`) for repeatable CI behavior.
7. Final full verification run and commit.

### 12.3 Validation Matrix for Patch Plan

| Validation Goal | Command | Pass Criteria |
| --- | --- | --- |
| Generator produces artifacts | `cd lcars-ui && python scripts/generate_golden.py` | Exit 0, manifest/schema updated deterministically |
| Manifest fixture equals in-memory generation | `cd lcars-ui && pytest -q tests/contracts/test_manifest_schema.py::test_manifest_fixture_matches_in_memory_phase1_manifest_generation` | Test passes |
| Schema fixture equals model schema output | `cd lcars-ui && pytest -q tests/contracts/test_manifest_schema.py::test_schema_fixture_matches_manifest_model_json_schema` | Test passes |
| Widget type literals are unique | `cd lcars-ui && pytest -q tests/unit/test_widgets.py::test_widget_type_literals_are_unique_across_all_widgets` | Test passes |
| Discriminated union behavior works | `cd lcars-ui && pytest -q tests/unit/test_widgets.py` | All widget unit tests pass |
| Contract suite health | `cd lcars-ui && pytest -q tests/contracts/` | All contract tests pass (or explicitly skipped only when dependency absent) |

### 12.4 Definition of Done for “100% Phase 1 Coverage”

Phase 1 is considered **100% complete** only if all are true:
- All gap IDs `P1-G01` through `P1-G07` are closed.
- Traceability matrix in Section 9 remains complete with no uncovered source requirement.
- `manifest.v1.json` and `schema.v1.json` are generated from current models and committed.
- Contract/unit tests covering Phase 1 pass in CI-compatible mode.
- Any skipped test has an explicit environment dependency reason and documented remediation.
