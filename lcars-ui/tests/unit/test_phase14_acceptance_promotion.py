"""Phase 14 acceptance promotion coverage."""

from __future__ import annotations

import json
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[3]
LCARS_ROOT = Path(__file__).resolve().parents[2]
FRONTEND_ROOT = LCARS_ROOT / "frontend"


def test_phase14_acceptance_promotion_artifacts_exist() -> None:
    required = [
        LCARS_ROOT / "docs" / "PHASE14_ACCEPTANCE_PROMOTION.md",
        LCARS_ROOT / "docs" / "TARGET_BANK_ACCEPTANCE.md",
        LCARS_ROOT / "docs" / "PHASE14_TARGET_BANK_VISUAL_FLOW.md",
        LCARS_ROOT / "docs" / "OVERVIEW_PARITY_ARCHITECTURE.md",
    ]
    missing = [str(path) for path in required if not path.exists()]
    assert not missing, f"Missing Phase 6 artifacts: {missing}"


def test_makefile_promotes_canonical_acceptance_and_demotes_legacy_visuals() -> None:
    contents = (LCARS_ROOT / "Makefile").read_text(encoding="utf-8")

    assert "canonical-acceptance:" in contents
    assert "legacy-visual-regression:" in contents
    assert "visual-regression: canonical-acceptance" in contents
    assert "cd frontend && npm run test:visual" in contents
    assert "cd frontend && npm run test:visual:legacy" in contents

    ci_line = next(line for line in contents.splitlines() if line.startswith("ci:"))
    assert "canonical-acceptance" in ci_line
    assert "visual-regression" not in ci_line


def test_frontend_visual_scripts_make_phase14_canonical_by_default() -> None:
    payload = json.loads((FRONTEND_ROOT / "package.json").read_text(encoding="utf-8"))
    scripts = payload["scripts"]

    assert scripts["test:visual"] == "npm run test:visual:phase14"
    assert (
        scripts["test:visual:legacy"]
        == "playwright test tests/visual/console.spec.ts tests/visual/padd.spec.ts tests/visual/bridge_ops.spec.ts --project=legacy-visual-regression"
    )
    assert "phase14-target-bank" in scripts["test:visual:phase14"]

    playwright_config = (FRONTEND_ROOT / "playwright.config.ts").read_text(encoding="utf-8")
    assert 'name: "legacy-visual-regression"' in playwright_config


def test_docs_define_lcars_ready_in_canonical_target_bank_terms() -> None:
    root_readme = (REPO_ROOT / "README.md").read_text(encoding="utf-8")
    package_readme = (LCARS_ROOT / "README.md").read_text(encoding="utf-8")
    target_bank_doc = (LCARS_ROOT / "docs" / "TARGET_BANK_ACCEPTANCE.md").read_text(encoding="utf-8")
    promotion_doc = (LCARS_ROOT / "docs" / "PHASE14_ACCEPTANCE_PROMOTION.md").read_text(encoding="utf-8")
    overview_doc = (LCARS_ROOT / "docs" / "OVERVIEW_PARITY_ARCHITECTURE.md").read_text(encoding="utf-8")

    assert "Phase 14 canonical target-bank acceptance" in root_readme
    assert "Canonical acceptance gate in CI" in root_readme
    assert "Visual regression gate in CI" not in root_readme
    assert "Implemented through **Phase 14**" in package_readme
    assert "make canonical-acceptance" in package_readme
    assert "make legacy-visual-regression" in package_readme
    assert "authoritative LCARS-ready acceptance standard" in target_bank_doc
    assert "LCARS-ready now means" in target_bank_doc
    assert "default acceptance commands" in promotion_doc
    assert "no longer the LCARS-ready acceptance oracle" in overview_doc


def test_legacy_parity_routing_tests_are_explicitly_downgraded() -> None:
    sweep_test = (FRONTEND_ROOT / "src" / "components" / "containers" / "LcarsSweepControl.test.tsx").read_text(
        encoding="utf-8"
    )
    assert "transitional legacy regression path" in sweep_test
    assert "freezes the transitional parity routing IDs" in sweep_test
