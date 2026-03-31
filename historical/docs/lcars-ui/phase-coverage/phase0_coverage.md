# Phase 0 Coverage Matrix

This matrix maps each Phase 0 requirement from `Implementation Plan.md` to the implementation and verification points in this repository.

## Directory setup and skeleton

- **Requirement:** Create package/module/test/example/scripts fixture structure and `__init__.py` files.
- **Implementation:** `src/lcars_ui/*`, `tests/*`, `examples/*`, `scripts/*`, `fixtures/golden/*`.
- **Verification:** `tests/unit/test_phase0_coverage.py::test_phase0_package_init_files_exist`, `tests/unit/test_placeholder.py::test_phase0_required_paths_exist`.

## Dependencies and configuration

- **Requirement:** Runtime deps (`fastapi`, `uvicorn[standard]`, `pydantic>=2.0`, `python-multipart`) and dev deps (`pytest`, `pytest-asyncio`, `httpx`, `ruff`, `mypy`, `jsonschema`) with strict mypy.
- **Implementation:** `pyproject.toml`.
- **Verification:** `tests/unit/test_widgets.py::test_pyproject_phase0_dependencies_and_strict_mypy_config`, `tests/unit/test_phase0_semantic_confidence.py::test_pyproject_declares_required_dependencies_once`.

## Tooling

- **Requirement:** Makefile targets (`install`, `dev`, `test`, `contracts-check`, `contracts-update`, `lint`, `clean`, `ci`) plus placeholder docker target.
- **Implementation:** `Makefile`.
- **Verification:** `tests/unit/test_placeholder.py::test_makefile_targets_present`, `tests/unit/test_phase0_coverage.py::test_phase0_makefile_commands_match_plan`, `tests/unit/test_phase0_semantic_confidence.py::test_makefile_targets_dry_run_success`.

## Environment bootstrap

- **Requirement:** `python -m venv .venv && source .venv/bin/activate && make install`.
- **Implementation:** `README.md` quickstart and `Makefile` install target.
- **Verification:** manual command run (`make -C lcars-ui install`) with restricted-network fallback behavior documented and implemented.

## Contract placeholders and scripts

- **Requirement:** Golden artifacts and phase placeholder scripts exist and execute.
- **Implementation:** `fixtures/golden/*.json`, `scripts/generate_golden.py`, `scripts/run_smoke_test.py`.
- **Verification:** `tests/contracts/test_manifest_schema.py`, `tests/contracts/test_protocol_schema.py`, `tests/unit/test_phase0_coverage.py::test_phase0_scripts_execute_successfully`, `tests/unit/test_phase0_semantic_confidence.py::test_generate_golden_script_is_deterministic`, `tests/unit/test_phase0_semantic_confidence.py::test_smoke_script_performs_real_checks`.

## Command validation baseline

Run the full Phase 0 verification command set:

```bash
make -C lcars-ui lint
make -C lcars-ui test
make -C lcars-ui contracts-check
make -C lcars-ui contracts-update
make -C lcars-ui docker-build
make -C lcars-ui install
```
