"""Phase 14 target-bank catalog coverage."""

from __future__ import annotations

import json
import struct
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[3]
LCARS_ROOT = Path(__file__).resolve().parents[2]
CATALOG_PATH = REPO_ROOT / "targets" / "phase14_target_catalog.json"


def _png_size(path: Path) -> tuple[int, int]:
    with path.open("rb") as handle:
        signature = handle.read(8)
        assert signature == b"\x89PNG\r\n\x1a\n", f"{path} is not a PNG file"
        chunk_length = struct.unpack(">I", handle.read(4))[0]
        chunk_type = handle.read(4)
        assert chunk_type == b"IHDR", f"{path} did not start with IHDR"
        width, height = struct.unpack(">II", handle.read(8))
        assert chunk_length == 13
        return width, height


def test_phase14_catalog_and_docs_exist() -> None:
    required = [
        REPO_ROOT / "targets" / "phase14_target_catalog.json",
        LCARS_ROOT / "docs" / "TARGET_BANK_ACCEPTANCE.md",
        LCARS_ROOT / "docs" / "PHASE14_TRANSITION_BOUNDARIES.md",
    ]
    missing = [str(path) for path in required if not path.exists()]
    assert not missing, f"Missing Phase 14 Phase 1 artifacts: {missing}"


def test_phase14_catalog_freezes_first_wave_scope() -> None:
    payload = json.loads(CATALOG_PATH.read_text(encoding="utf-8"))

    assert payload["catalog_version"] == "phase14-v1"
    assert payload["phase"] == "phase14-phase1"
    assert payload["scope"]["blocking_target_count"] == 5
    assert payload["scope"]["blocking_family_count"] == 3
    assert payload["scope"]["deferred_families"] == ["adge_intro"]

    families = payload["families"]
    assert {family["family_id"] for family in families} == {
        "seismographic_scan",
        "holodeck_programming",
        "periodic_table_matrix",
        "adge_intro",
    }

    canonical_targets = [target for target in payload["targets"] if target["tier"] == "canonical"]
    assert len(canonical_targets) == 5
    assert {target["target_id"] for target in canonical_targets} == {
        "seismo_scan_a",
        "seismo_scan_b",
        "holodeck_programming_a",
        "holodeck_programming_b",
        "periodic_table_matrix",
    }


def test_phase14_catalog_targets_match_real_files_and_metadata() -> None:
    payload = json.loads(CATALOG_PATH.read_text(encoding="utf-8"))

    for target in payload["targets"]:
        source_path = REPO_ROOT / target["source_path"]
        assert source_path.exists(), f"Missing target-bank file for {target['target_id']}: {source_path}"

        width, height = _png_size(source_path)
        assert target["viewport"] == {"width": width, "height": height}
        assert target["primitive_tags"], f"{target['target_id']} missing primitive tags"
        assert target["stable_regions"], f"{target['target_id']} missing stable regions"
        assert target["dynamic_regions"], f"{target['target_id']} missing dynamic regions"
        assert isinstance(target["acceptance_notes"], str) and target["acceptance_notes"].strip()
        assert isinstance(target["sequence_group"], str) and target["sequence_group"].strip()


def test_phase14_dual_state_targets_share_family_and_viewport() -> None:
    payload = json.loads(CATALOG_PATH.read_text(encoding="utf-8"))
    targets_by_id = {target["target_id"]: target for target in payload["targets"]}

    seismo_a = targets_by_id["seismo_scan_a"]
    seismo_b = targets_by_id["seismo_scan_b"]
    assert seismo_a["family_id"] == seismo_b["family_id"] == "seismographic_scan"
    assert seismo_a["viewport"] == seismo_b["viewport"] == {"width": 984, "height": 750}
    assert seismo_a["sequence_group"] == seismo_b["sequence_group"] == "seismographic_dual_state"

    holo_a = targets_by_id["holodeck_programming_a"]
    holo_b = targets_by_id["holodeck_programming_b"]
    assert holo_a["family_id"] == holo_b["family_id"] == "holodeck_programming"
    assert holo_a["viewport"] == holo_b["viewport"] == {"width": 1388, "height": 1080}
    assert holo_a["sequence_group"] == holo_b["sequence_group"] == "holodeck_dual_state"
