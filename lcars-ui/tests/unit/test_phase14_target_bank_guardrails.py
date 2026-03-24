"""Phase 14 target-bank runtime guardrails."""

from __future__ import annotations

from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[3]
LCARS_ROOT = Path(__file__).resolve().parents[2]
PYTHON_RUNTIME_ROOTS = [
    LCARS_ROOT / "src",
    LCARS_ROOT / "examples",
    LCARS_ROOT / "scripts",
]
FORBIDDEN_TARGET_BANK_TOKENS = [
    "targets/",
    "targets\\",
    "LCARS_TNG_A_Matter_Of_Time_Seismographic_Scan_frames/",
    "LCARS_TNG_The_Outrageous_Okona_Holodeck_Selection_frames/",
    "LCARS_TNG_Rascals_Periodic_Table_of_Elements_frames/",
    "LCN adge intro2_frames/",
    "frame_000001.png",
    "frame_000118.png",
    "frame_000432.png",
]


def test_python_runtime_sources_do_not_reference_target_bank_assets() -> None:
    offenders: list[str] = []

    for root in PYTHON_RUNTIME_ROOTS:
        for file_path in root.rglob("*.py"):
            source = file_path.read_text(encoding="utf-8")
            relative_path = file_path.relative_to(REPO_ROOT)
            for token in FORBIDDEN_TARGET_BANK_TOKENS:
                if token in source:
                    offenders.append(f"{relative_path} -> {token}")

    assert offenders == []
