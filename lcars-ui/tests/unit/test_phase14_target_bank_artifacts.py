"""Phase 14 target-bank artifact generation coverage."""

from __future__ import annotations

import json
import importlib.util
from pathlib import Path

from tests.unit.test_phase14_target_bank_catalog import CATALOG_PATH

REPO_ROOT = Path(__file__).resolve().parents[3]
SCRIPT_PATH = REPO_ROOT / "lcars-ui" / "scripts" / "write_target_bank_artifacts.py"

_SPEC = importlib.util.spec_from_file_location("phase14_artifacts_script", SCRIPT_PATH)
assert _SPEC is not None and _SPEC.loader is not None
_MODULE = importlib.util.module_from_spec(_SPEC)
_SPEC.loader.exec_module(_MODULE)
_write_artifacts = _MODULE._write_artifacts


def test_write_target_bank_artifacts_writes_expected_files(tmp_path: Path) -> None:
    payload = json.loads(CATALOG_PATH.read_text(encoding="utf-8"))
    target = next(entry for entry in payload["targets"] if entry["target_id"] == "seismo_scan_a")
    source_path = REPO_ROOT / target["source_path"]

    output_dir = tmp_path / "artifacts"
    summary = _write_artifacts(
        rendered_path=source_path,
        target_path=source_path,
        target_id=target["target_id"],
        output_dir=output_dir,
    )

    assert summary["target_id"] == "seismo_scan_a"
    assert summary["total_pixels"] == 984 * 750
    assert summary["mismatch_pixels"] == 0
    assert summary["structural_mismatch_pixels"] == 0
    assert summary["structural_mismatch_ratio"] == 0
    assert (output_dir / "rendered.png").exists()
    assert (output_dir / "target.png").exists()
    assert (output_dir / "diff.png").exists()
    assert (output_dir / "metadata.json").exists()

    metadata = json.loads((output_dir / "metadata.json").read_text(encoding="utf-8"))
    assert metadata["target_id"] == "seismo_scan_a"
    assert metadata["output_dir"] == str(output_dir)
    assert metadata["rendered_path"].endswith("rendered.png")
    assert metadata["target_path"].endswith("target.png")
    assert metadata["diff_path"].endswith("diff.png")
    assert metadata["mean_abs_diff"] == {"red": 0.0, "green": 0.0, "blue": 0.0}
