"""Phase 0 scaffold validation tests."""

from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def test_phase0_required_paths_exist() -> None:
    required = [
        ".gitignore",
        "Makefile",
        "README.md",
        "pyproject.toml",
        "scripts/generate_golden.py",
        "scripts/run_smoke_test.py",
        "spec/SPEC.md",
        "fixtures/golden/manifest.v1.json",
        "fixtures/golden/protocol.v1.json",
        "fixtures/golden/schema.v1.json",
        "src/lcars_ui/__init__.py",
        "src/lcars_ui/app.py",
        "src/lcars_ui/core/__init__.py",
        "src/lcars_ui/core/models.py",
        "src/lcars_ui/core/widget_base.py",
        "src/lcars_ui/widgets/__init__.py",
        "src/lcars_ui/widgets/primitives.py",
        "src/lcars_ui/widgets/inputs.py",
        "src/lcars_ui/widgets/data.py",
        "src/lcars_ui/widgets/media.py",
        "src/lcars_ui/server/__init__.py",
        "src/lcars_ui/server/events.py",
        "src/lcars_ui/server/stream.py",
        "src/lcars_ui/server/stt.py",
        "src/lcars_ui/plugins/__init__.py",
        "src/lcars_ui/plugins/loader.py",
        "tests/__init__.py",
        "tests/conftest.py",
        "tests/contracts/__init__.py",
        "tests/contracts/test_manifest_schema.py",
        "tests/contracts/test_protocol_schema.py",
        "tests/unit/__init__.py",
        "tests/unit/test_placeholder.py",
        "tests/unit/test_widgets.py",
        "tests/integration/__init__.py",
        "tests/integration/test_api_endpoints.py",
        "tests/integration/test_streaming.py",
        "tests/integration/test_plugins.py",
        "examples/__init__.py",
        "examples/bridge_ops/__init__.py",
        "examples/bridge_ops/app.py",
        "examples/bridge_ops/plugins/.gitkeep",
        "docs/phase0_coverage.md",
    ]
    missing = [path for path in required if not (ROOT / path).exists()]
    assert not missing, f"Missing required Phase 0 scaffold paths: {missing}"


def test_makefile_targets_present() -> None:
    contents = (ROOT / "Makefile").read_text(encoding="utf-8")
    targets = [
        "install:",
        "dev:",
        "test:",
        "contracts-check:",
        "contracts-update:",
        "lint:",
        "clean:",
        "docker-build:",
        "ci:",
    ]
    for target in targets:
        assert target in contents
