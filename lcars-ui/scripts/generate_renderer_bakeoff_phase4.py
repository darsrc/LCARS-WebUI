"""Consolidate renderer bake-off artifacts and compute the Phase 4 scorecard."""

from __future__ import annotations

import argparse
import json
import shutil
from pathlib import Path

RENDERERS = ("legacy_strict", "joern_strict", "phase14_family")
PRIMARY_CANONICAL_PROBES = (
    "seismo_scan_a",
    "seismo_scan_b",
    "holodeck_programming_a",
    "periodic_table_matrix",
)
WITHHELD_AUDIT_PROBE = "holodeck_programming_b"
PRODUCT_SMOKE_PROBES = ("overview", "systems")
ALL_PROBES = PRIMARY_CANONICAL_PROBES + (WITHHELD_AUDIT_PROBE,) + PRODUCT_SMOKE_PROBES

QUALITATIVE_SCORES = {
    "legacy_strict": {
        "shared_system_leverage": 9,
        "support_boundary_integrity": 6,
        "maintenance_burden": 7,
        "bakeoff_ci_simplicity": 4,
        "shared_system_leverage_note": (
            "Uses the existing generic strict-manifest system and broad control set; strongest reusable product"
            " composition path in the repo."
        ),
        "support_boundary_integrity_note": (
            "No hidden fallback was observed in the bake-off harness, but unsupported boundaries remain less"
            " explicit than Joern's."
        ),
        "maintenance_burden_note": (
            "Carries heuristic layout debt and specimen-coupled parity history, but it is still the least new"
            " system to keep alive as a product path."
        ),
        "bakeoff_ci_simplicity_note": (
            "Fits the neutral harness with minimal ceremony because it already owns the main strict manifest path."
        ),
    },
    "joern_strict": {
        "shared_system_leverage": 3,
        "support_boundary_integrity": 9,
        "maintenance_burden": 2,
        "bakeoff_ci_simplicity": 4,
        "shared_system_leverage_note": (
            "Entered the contest only after minimal fixed-probe extensions and still depends on a parallel widget"
            " stack rather than the repo's main strict system."
        ),
        "support_boundary_integrity_note": (
            "Best explicit unsupported and no-fallback discipline of the three contenders."
        ),
        "maintenance_burden_note": (
            "Highest duplication burden: separate page renderer, widget renderer, and scoped style bridge with no"
            " winning role after scoring."
        ),
        "bakeoff_ci_simplicity_note": (
            "The neutral harness can score it honestly, but only by carrying a separate support model for a"
            " duplicate renderer path."
        ),
    },
    "phase14_family": {
        "shared_system_leverage": 4,
        "support_boundary_integrity": 8,
        "maintenance_burden": 7,
        "bakeoff_ci_simplicity": 5,
        "shared_system_leverage_note": (
            "Strong family-scene primitive reuse for acceptance work, but it is not yet a general product page"
            " composition system."
        ),
        "support_boundary_integrity_note": (
            "Ownership boundaries are explicit and product-smoke probes fail honestly as unsupported."
        ),
        "maintenance_burden_note": (
            "Distinct family-scene system, but it is already the accepted canonical path and shares scene primitives"
            " across multiple families."
        ),
        "bakeoff_ci_simplicity_note": (
            "Simplest contender to measure for canonical probes because the canonical acceptance flow already matches"
            " its owned path."
        ),
    },
}


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--source-root",
        required=True,
        help="Playwright output root containing renderer bake-off artifact directories.",
    )
    parser.add_argument(
        "--bundle-dir",
        required=True,
        help="Stable output directory for the consolidated Phase 4 bundle.",
    )
    return parser


def _discover_metadata(source_root: Path) -> dict[tuple[str, str], dict[str, object]]:
    rows: dict[tuple[str, str], dict[str, object]] = {}
    for metadata_path in source_root.glob("**/renderer-bakeoff-*/metadata.json"):
        with metadata_path.open("r", encoding="utf-8") as handle:
            payload = json.load(handle)
        renderer_id = payload["renderer_id"]
        probe_id = payload.get("probe_id") or payload.get("target_id")
        rows[(renderer_id, probe_id)] = payload
    missing = [
        (renderer_id, probe_id)
        for renderer_id in RENDERERS
        for probe_id in ALL_PROBES
        if (renderer_id, probe_id) not in rows
    ]
    if missing:
        missing_text = ", ".join(f"{renderer}/{probe}" for renderer, probe in missing)
        raise ValueError(f"Missing bake-off metadata entries: {missing_text}")
    return rows


def _copy_artifacts(
    entries: dict[tuple[str, str], dict[str, object]],
    bundle_dir: Path,
) -> list[dict[str, object]]:
    artifact_rows: list[dict[str, object]] = []
    artifacts_root = bundle_dir / "artifacts"
    for renderer_id in RENDERERS:
        for probe_id in ALL_PROBES:
            entry = entries[(renderer_id, probe_id)]
            source_dir = Path(entry["output_dir"])
            target_dir = artifacts_root / renderer_id / probe_id
            shutil.copytree(source_dir, target_dir, dirs_exist_ok=True)
            metadata_path = target_dir / "metadata.json"
            with metadata_path.open("r", encoding="utf-8") as handle:
                bundled = json.load(handle)
            artifact_rows.append(
                {
                    "renderer_id": renderer_id,
                    "probe_id": probe_id,
                    "probe_kind": bundled.get("probe_kind"),
                    "status": bundled.get("status"),
                    "artifact_dir": str(target_dir),
                    "rendered_path": str(target_dir / "rendered.png"),
                    "target_path": str(target_dir / "target.png") if (target_dir / "target.png").exists() else None,
                    "diff_path": str(target_dir / "diff.png") if (target_dir / "diff.png").exists() else None,
                    "structural_mismatch_ratio": bundled.get("structural_mismatch_ratio"),
                    "mismatch_ratio": bundled.get("mismatch_ratio"),
                }
            )
    return artifact_rows


def _score_product_smoke(entry_by_probe: dict[str, dict[str, object]]) -> tuple[float, list[dict[str, object]]]:
    probe_scores: list[dict[str, object]] = []
    total = 0.0
    per_probe_points = 15 / len(PRODUCT_SMOKE_PROBES)
    for probe_id in PRODUCT_SMOKE_PROBES:
        status = entry_by_probe[probe_id]["status"]
        points = per_probe_points if status == "rendered" else 0.0
        probe_scores.append(
            {
                "probe_id": probe_id,
                "status": status,
                "points": points,
                "max_points": per_probe_points,
            }
        )
        total += points
    return total, probe_scores


def _score_renderer(renderer_id: str, entry_by_probe: dict[str, dict[str, object]]) -> dict[str, object]:
    primary_values = [float(entry_by_probe[probe_id]["structural_mismatch_ratio"]) for probe_id in PRIMARY_CANONICAL_PROBES]
    primary_mean = sum(primary_values) / len(primary_values)
    structural_points = 30 * (1 - primary_mean)

    seismo_a = float(entry_by_probe["seismo_scan_a"]["structural_mismatch_ratio"])
    seismo_b = float(entry_by_probe["seismo_scan_b"]["structural_mismatch_ratio"])
    dual_state_pair_mean = (seismo_a + seismo_b) / 2
    dual_state_delta = abs(seismo_a - seismo_b)
    dual_state_points = 10 * (1 - (dual_state_pair_mean + dual_state_delta / 2))

    audit_ratio = float(entry_by_probe[WITHHELD_AUDIT_PROBE]["structural_mismatch_ratio"])
    audit_points = 10 * (1 - audit_ratio)

    product_points, product_probe_scores = _score_product_smoke(entry_by_probe)

    qualitative = QUALITATIVE_SCORES[renderer_id]
    fidelity_total = structural_points + dual_state_points + audit_points
    viability_total = (
        product_points
        + qualitative["shared_system_leverage"]
        + qualitative["support_boundary_integrity"]
    )
    operating_total = qualitative["maintenance_burden"] + qualitative["bakeoff_ci_simplicity"]
    total_score = fidelity_total + viability_total + operating_total

    return {
        "renderer_id": renderer_id,
        "fidelity": {
            "structural_mismatch_performance": {
                "points": structural_points,
                "max_points": 30,
                "primary_probe_structural_mismatch_ratio_mean": primary_mean,
                "primary_probe_ratios": {
                    probe_id: float(entry_by_probe[probe_id]["structural_mismatch_ratio"])
                    for probe_id in PRIMARY_CANONICAL_PROBES
                },
            },
            "dual_state_resilience": {
                "points": dual_state_points,
                "max_points": 10,
                "pair_mean": dual_state_pair_mean,
                "pair_delta": dual_state_delta,
            },
            "withheld_audit_resilience": {
                "points": audit_points,
                "max_points": 10,
                "probe_id": WITHHELD_AUDIT_PROBE,
                "structural_mismatch_ratio": audit_ratio,
            },
            "total_points": fidelity_total,
            "max_points": 50,
        },
        "reusable_system_viability": {
            "product_smoke_viability": {
                "points": product_points,
                "max_points": 15,
                "probe_scores": product_probe_scores,
            },
            "shared_system_leverage": {
                "points": qualitative["shared_system_leverage"],
                "max_points": 10,
                "note": qualitative["shared_system_leverage_note"],
            },
            "support_boundary_integrity": {
                "points": qualitative["support_boundary_integrity"],
                "max_points": 10,
                "note": qualitative["support_boundary_integrity_note"],
            },
            "total_points": viability_total,
            "max_points": 35,
        },
        "operating_cost": {
            "maintenance_burden": {
                "points": qualitative["maintenance_burden"],
                "max_points": 10,
                "note": qualitative["maintenance_burden_note"],
            },
            "bakeoff_ci_simplicity": {
                "points": qualitative["bakeoff_ci_simplicity"],
                "max_points": 5,
                "note": qualitative["bakeoff_ci_simplicity_note"],
            },
            "total_points": operating_total,
            "max_points": 15,
        },
        "total_points": total_score,
        "max_points": 100,
        "eligibility": {
            "acceptance_fixture_engine": (
                all(entry_by_probe[probe_id]["status"] == "rendered" for probe_id in PRIMARY_CANONICAL_PROBES)
                and entry_by_probe[WITHHELD_AUDIT_PROBE]["status"] == "rendered"
            ),
            "product_implementation_base": all(
                entry_by_probe[probe_id]["status"] == "rendered" for probe_id in PRODUCT_SMOKE_PROBES
            ),
        },
    }


def _build_role_assignment(scorecard: dict[str, object]) -> dict[str, object]:
    acceptance_candidates = [
        row for row in scorecard["renderers"] if row["eligibility"]["acceptance_fixture_engine"]
    ]
    product_candidates = [
        row for row in scorecard["renderers"] if row["eligibility"]["product_implementation_base"]
    ]
    acceptance_winner = max(
        acceptance_candidates,
        key=lambda row: (
            row["fidelity"]["total_points"],
            row["fidelity"]["withheld_audit_resilience"]["points"],
        ),
    )
    product_winner = max(
        product_candidates,
        key=lambda row: (
            row["reusable_system_viability"]["total_points"],
            row["operating_cost"]["maintenance_burden"]["points"],
            row["total_points"],
        ),
    )

    contender_status = {}
    for renderer_id in RENDERERS:
        if renderer_id == acceptance_winner["renderer_id"]:
            contender_status[renderer_id] = "acceptance_fixture_engine"
        elif renderer_id == product_winner["renderer_id"]:
            contender_status[renderer_id] = "product_implementation_base"
        elif renderer_id == "joern_strict":
            contender_status[renderer_id] = "deprecated"
        else:
            contender_status[renderer_id] = "transitional"

    return {
        "product_implementation_base": product_winner["renderer_id"],
        "acceptance_fixture_engine": acceptance_winner["renderer_id"],
        "contender_status": contender_status,
        "reasoning": {
            "product_implementation_base": (
                "Chosen by reusable-system viability among product-eligible contenders, not by support status alone."
            ),
            "acceptance_fixture_engine": (
                "Chosen by fidelity and withheld-audit performance among acceptance-eligible contenders."
            ),
        },
    }


def main() -> int:
    args = _build_parser().parse_args()
    source_root = Path(args.source_root).resolve()
    bundle_dir = Path(args.bundle_dir).resolve()
    bundle_dir.mkdir(parents=True, exist_ok=True)

    entries = _discover_metadata(source_root)
    artifact_rows = _copy_artifacts(entries, bundle_dir)

    score_rows = []
    for renderer_id in RENDERERS:
        entry_by_probe = {probe_id: entries[(renderer_id, probe_id)] for probe_id in ALL_PROBES}
        score_rows.append(_score_renderer(renderer_id, entry_by_probe))

    scorecard = {
        "bundle_dir": str(bundle_dir),
        "source_root": str(source_root),
        "renderers": score_rows,
    }
    role_assignment = _build_role_assignment(scorecard)

    (bundle_dir / "artifact_index.json").write_text(json.dumps(artifact_rows, indent=2), encoding="utf-8")
    (bundle_dir / "scorecard.json").write_text(json.dumps(scorecard, indent=2), encoding="utf-8")
    (bundle_dir / "role_assignment.json").write_text(json.dumps(role_assignment, indent=2), encoding="utf-8")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
