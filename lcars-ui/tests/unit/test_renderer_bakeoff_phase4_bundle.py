"""Renderer bake-off Phase 4 bundle coverage."""

from __future__ import annotations

import importlib.util
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[3]
SCRIPT_PATH = REPO_ROOT / "lcars-ui" / "scripts" / "generate_renderer_bakeoff_phase4.py"

_SPEC = importlib.util.spec_from_file_location("renderer_bakeoff_phase4_script", SCRIPT_PATH)
assert _SPEC is not None and _SPEC.loader is not None
_MODULE = importlib.util.module_from_spec(_SPEC)
_SPEC.loader.exec_module(_MODULE)
_build_support_matrix = _MODULE._build_support_matrix
_build_contender_probe_summaries = _MODULE._build_contender_probe_summaries


def test_phase4_bundle_support_matrix_and_summaries_cover_fixed_probes() -> None:
    entries = {
        ("legacy_strict", "seismo_scan_a"): {
            "family_id": "seismographic_scan",
            "probe_id": "seismo_scan_a",
            "probe_kind": "canonical",
            "renderer_id": "legacy_strict",
            "status": "rendered",
        },
        ("legacy_strict", "seismo_scan_b"): {
            "family_id": "seismographic_scan",
            "probe_id": "seismo_scan_b",
            "probe_kind": "canonical",
            "renderer_id": "legacy_strict",
            "status": "rendered",
        },
        ("legacy_strict", "holodeck_programming_a"): {
            "family_id": "holodeck_programming",
            "probe_id": "holodeck_programming_a",
            "probe_kind": "canonical",
            "renderer_id": "legacy_strict",
            "status": "rendered",
        },
        ("legacy_strict", "periodic_table_matrix"): {
            "family_id": "periodic_table_matrix",
            "probe_id": "periodic_table_matrix",
            "probe_kind": "canonical",
            "renderer_id": "legacy_strict",
            "status": "rendered",
        },
        ("legacy_strict", "holodeck_programming_b"): {
            "family_id": "holodeck_programming",
            "probe_id": "holodeck_programming_b",
            "probe_kind": "canonical",
            "renderer_id": "legacy_strict",
            "status": "rendered",
        },
        ("legacy_strict", "overview"): {
            "family_id": None,
            "probe_id": "overview",
            "probe_kind": "product_smoke",
            "renderer_id": "legacy_strict",
            "status": "rendered",
        },
        ("legacy_strict", "systems"): {
            "family_id": None,
            "probe_id": "systems",
            "probe_kind": "product_smoke",
            "renderer_id": "legacy_strict",
            "status": "rendered",
        },
        ("joern_strict", "seismo_scan_a"): {
            "family_id": "seismographic_scan",
            "probe_id": "seismo_scan_a",
            "probe_kind": "canonical",
            "renderer_id": "joern_strict",
            "status": "rendered",
        },
        ("joern_strict", "seismo_scan_b"): {
            "family_id": "seismographic_scan",
            "probe_id": "seismo_scan_b",
            "probe_kind": "canonical",
            "renderer_id": "joern_strict",
            "status": "rendered",
        },
        ("joern_strict", "holodeck_programming_a"): {
            "family_id": "holodeck_programming",
            "probe_id": "holodeck_programming_a",
            "probe_kind": "canonical",
            "renderer_id": "joern_strict",
            "status": "rendered",
        },
        ("joern_strict", "periodic_table_matrix"): {
            "family_id": "periodic_table_matrix",
            "probe_id": "periodic_table_matrix",
            "probe_kind": "canonical",
            "renderer_id": "joern_strict",
            "status": "rendered",
        },
        ("joern_strict", "holodeck_programming_b"): {
            "family_id": "holodeck_programming",
            "probe_id": "holodeck_programming_b",
            "probe_kind": "canonical",
            "renderer_id": "joern_strict",
            "status": "rendered",
        },
        ("joern_strict", "overview"): {
            "family_id": None,
            "probe_id": "overview",
            "probe_kind": "product_smoke",
            "renderer_id": "joern_strict",
            "status": "rendered",
        },
        ("joern_strict", "systems"): {
            "family_id": None,
            "probe_id": "systems",
            "probe_kind": "product_smoke",
            "renderer_id": "joern_strict",
            "status": "rendered",
        },
        ("phase14_family", "seismo_scan_a"): {
            "family_id": "seismographic_scan",
            "probe_id": "seismo_scan_a",
            "probe_kind": "canonical",
            "renderer_id": "phase14_family",
            "status": "rendered",
        },
        ("phase14_family", "seismo_scan_b"): {
            "family_id": "seismographic_scan",
            "probe_id": "seismo_scan_b",
            "probe_kind": "canonical",
            "renderer_id": "phase14_family",
            "status": "rendered",
        },
        ("phase14_family", "holodeck_programming_a"): {
            "family_id": "holodeck_programming",
            "probe_id": "holodeck_programming_a",
            "probe_kind": "canonical",
            "renderer_id": "phase14_family",
            "status": "rendered",
        },
        ("phase14_family", "periodic_table_matrix"): {
            "family_id": "periodic_table_matrix",
            "probe_id": "periodic_table_matrix",
            "probe_kind": "canonical",
            "renderer_id": "phase14_family",
            "status": "rendered",
        },
        ("phase14_family", "holodeck_programming_b"): {
            "family_id": "holodeck_programming",
            "probe_id": "holodeck_programming_b",
            "probe_kind": "canonical",
            "renderer_id": "phase14_family",
            "status": "rendered",
        },
        ("phase14_family", "overview"): {
            "family_id": None,
            "probe_id": "overview",
            "probe_kind": "product_smoke",
            "renderer_id": "phase14_family",
            "status": "unsupported",
        },
        ("phase14_family", "systems"): {
            "family_id": None,
            "probe_id": "systems",
            "probe_kind": "product_smoke",
            "renderer_id": "phase14_family",
            "status": "unsupported",
        },
    }

    support_matrix = _build_support_matrix(entries)
    summaries = _build_contender_probe_summaries(support_matrix)

    assert support_matrix[0] == {
        "active_page_id": "target",
        "adapter_kind": "canonical_strict_fixture_manifest",
        "entry_kind": "manifest",
        "family_id": "seismographic_scan",
        "probe_id": "seismo_scan_a",
        "probe_kind": "canonical",
        "renderer_id": "legacy_strict",
        "status": "rendered",
        "strict_renderer": "legacy",
    }
    assert support_matrix[13] == {
        "active_page_id": "systems",
        "adapter_kind": "product_smoke_manifest",
        "entry_kind": "manifest",
        "family_id": None,
        "probe_id": "systems",
        "probe_kind": "product_smoke",
        "renderer_id": "joern_strict",
        "status": "rendered",
        "strict_renderer": "joern",
    }
    assert support_matrix[-1] == {
        "active_page_id": None,
        "adapter_kind": "unsupported_boundary",
        "entry_kind": "unsupported",
        "family_id": None,
        "probe_id": "systems",
        "probe_kind": "product_smoke",
        "renderer_id": "phase14_family",
        "status": "unsupported",
        "strict_renderer": None,
    }

    assert summaries == [
        {
            "error": [],
            "rendered": [
                "seismo_scan_a",
                "seismo_scan_b",
                "holodeck_programming_a",
                "periodic_table_matrix",
                "holodeck_programming_b",
                "overview",
                "systems",
            ],
            "renderer_id": "legacy_strict",
            "unsupported": [],
        },
        {
            "error": [],
            "rendered": [
                "seismo_scan_a",
                "seismo_scan_b",
                "holodeck_programming_a",
                "periodic_table_matrix",
                "holodeck_programming_b",
                "overview",
                "systems",
            ],
            "renderer_id": "joern_strict",
            "unsupported": [],
        },
        {
            "error": [],
            "rendered": [
                "seismo_scan_a",
                "seismo_scan_b",
                "holodeck_programming_a",
                "periodic_table_matrix",
                "holodeck_programming_b",
            ],
            "renderer_id": "phase14_family",
            "unsupported": ["overview", "systems"],
        },
    ]
