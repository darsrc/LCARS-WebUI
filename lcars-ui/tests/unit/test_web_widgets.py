"""Contract and DSL coverage for the knowledge-graph widget family."""

from __future__ import annotations

import pytest
from pydantic import ValidationError

from lcars_ui import advanced
from lcars_ui.dsl._builder import _ManifestBuilder
from lcars_ui.dsl._state import _LCARSContext, set_ctx
from lcars_ui.widgets.web import (
    CommitmentData,
    CommitmentSelector,
    ConstraintData,
    Frontier,
    SupportCompleteness,
    SupportData,
    TriState,
)

SUPPORT = {
    "node": "n07",
    "truncated": False,
    "environments": [
        {
            "atoms": [
                {"id": "e01", "type": "empirical", "label": "HH 1952 voltage clamp"},
                {"id": "a04", "type": "assumption", "label": "space clamp"},
            ]
        },
        {
            "atoms": [
                {"id": "e09", "type": "empirical", "label": "Cole & Curtis 1939"},
                {"id": "f02", "type": "formal", "label": "GHK derivation"},
            ]
        },
    ],
}

FRONTIER = {
    "current": {"id": "n07", "label": "Na+ conductance"},
    "path": [{"id": "n01", "label": "action potential"}],
    "frontier": [
        {
            "id": "n11",
            "label": "channel open probability",
            "edge": "JUSTIFICATION",
            "kind": "assertion",
            "terminal": False,
        },
        {
            "id": "n19",
            "label": "depolarization",
            "edge": "DOMAIN",
            "kind": "assertion",
            "terminal": False,
        },
    ],
}

ASSERTION = {
    "id": "n07",
    "gloss": "Na+ conductance rises with membrane depolarization",
    "canonical": False,
    "framework": {"id": "hh_kinetics", "label": "Hodgkin-Huxley kinetics"},
    "context": [
        {"qualifier": "q0182", "label": "squid giant axon", "roles": ["SYSTEM_CLASS"]},
        {
            "qualifier": "q0433",
            "label": "classical regime",
            "roles": ["SEMANTIC_FRAMEWORK", "APPLICABILITY_DOMAIN"],
        },
    ],
    "status": ["established"],
}

ANCHOR = {
    "id": "e01",
    "type": "empirical",
    "label": "Voltage-clamp recordings, squid giant axon",
    "polarity": "SUPPORTS",
    "source": {"id": "s09", "citation": "Hodgkin & Huxley, J. Physiol., 1952"},
    "sibling_anchors": ["e02", "f07"],
    "inspectable": "published measurements; procedure re-run since",
    "status": [],
}

TRI_STATE = {
    "query": "supported_under",
    "subject": "n07",
    "commitment": "c02",
    "result": "UNKNOWN",
    "mode": "FAST",
    "reason": "label_truncated",
}

CONSTRAINT = {
    "quantity": {"id": "q_coupling", "label": "new force coupling", "unit": "1"},
    "representation": "INTERVAL",
    "excluded": {"min": 1e-5, "max": None},
    "confidence": "95% CL",
    "conditions": [{"quantity": "q_range", "min": 0.01, "max": 1.0, "unit": "m"}],
    "source": {"id": "s41", "citation": "torsion-balance null result"},
    "claims": [
        {"id": "t03", "label": "fifth force (ghost)", "position": None},
        {"id": "t08", "label": "light scalar", "position": 3e-6},
    ],
}

GAP = {
    "id": "g01",
    "type": "REDUCTION",
    "endpoints": [
        {"id": "n21", "label": "HH gating variables"},
        {"id": "n22", "label": "channel conformational states"},
    ],
    "known_dependency": "m³h reproduces macroscopic kinetics",
    "missing": "one-to-one mapping to modern channel-state models",
    "contenders": [{"id": "t11", "label": "allosteric gating model", "environments": 2}],
    "constraints": ["c07"],
}

COMMITMENT = {
    "available": [
        {"id": "c00", "label": "none", "assumptions": []},
        {"id": "c02", "label": "HH formalism", "assumptions": ["a04", "a11"]},
    ],
    "active": "c02",
    "supported_under": ["n07", "n09"],
    "empirically_grounded": ["n07"],
    "conflict_set": ["n33"],
}


def _raw_widgets() -> list[object]:
    ctx = _LCARSContext(builder=_ManifestBuilder())
    set_ctx(ctx)
    with advanced.raw(reason="semantic contract test"):
        with advanced.support_panel("Support", node="n07"):
            advanced.environments(SUPPORT)
            advanced.atom_legend()
        advanced.frontier(FRONTIER, layer_filter=["JUSTIFICATION"])
        with advanced.assertion_card(ASSERTION):
            advanced.context_tags()
        advanced.anchor_card(ANCHOR)
        advanced.tri_state(TRI_STATE, on_escalate="EXACT")
        advanced.constraint_band(CONSTRAINT)
        with advanced.gap_panel(GAP):
            advanced.contender_list()
        advanced.commitment_selector(COMMITMENT)
    assert ctx.builder is not None
    return ctx.builder.build(ctx.config).pages["main"].rows[0].columns[0].widgets


def test_all_web_widgets_build_as_discriminated_manifest_members() -> None:
    widgets = _raw_widgets()

    assert [widget.type for widget in widgets] == [
        "support_panel",
        "frontier",
        "assertion_card",
        "anchor_card",
        "tri_state",
        "constraint_band",
        "gap_panel",
        "commitment_selector",
    ]
    assert widgets[0].show_atom_legend is True
    assert widgets[0].data.environments[0].atoms[1].type == "assumption"
    assert widgets[2].show_context is True
    assert len(widgets[2].data.context[1].roles) == 2
    assert widgets[6].show_contenders is True


def test_support_states_remain_structurally_distinct() -> None:
    unsupported = SupportData.model_validate({"node": "n", "environments": []})
    independent = SupportData.model_validate({"node": "n", "environments": [{"atoms": []}]})

    assert unsupported.environments == []
    assert len(independent.environments) == 1
    assert independent.environments[0].atoms == []


def test_support_completeness_defaults_to_complete() -> None:
    data = SupportData.model_validate({"node": "n"})
    assert data.truncated is False
    assert data.completeness == SupportCompleteness(state="complete")
    assert data.completeness.unsafe_for_negative_conclusions is False


def test_support_completeness_derived_from_legacy_truncated() -> None:
    """Old callers that only set truncated keep working and get a matching state."""
    data = SupportData.model_validate({"node": "n", "truncated": True})
    assert data.completeness.state == "partial"
    assert data.completeness.unsafe_for_negative_conclusions is True


def test_support_truncated_derived_from_new_completeness() -> None:
    """New callers can set structured completeness; truncated stays a compatibility projection."""
    data = SupportData.model_validate(
        {
            "node": "n",
            "completeness": {
                "state": "partial",
                "returned": 5,
                "total": 12,
                "reason": "rate_limited",
            },
        }
    )
    assert data.truncated is True
    assert data.completeness.returned == 5
    assert data.completeness.total == 12
    assert data.completeness.reason == "rate_limited"


def test_support_completeness_and_truncated_must_agree() -> None:
    with pytest.raises(ValidationError, match="truncated must match"):
        SupportData.model_validate(
            {"node": "n", "truncated": True, "completeness": {"state": "complete"}}
        )


def test_constraint_preserves_null_claim_position_and_rejects_reversed_bounds() -> None:
    parsed = ConstraintData.model_validate(CONSTRAINT)
    assert parsed.claims[0].position is None
    assert parsed.excluded.max is None

    invalid = {**CONSTRAINT, "excluded": {"min": 2.0, "max": 1.0}}
    with pytest.raises(ValidationError, match="min must not exceed max"):
        ConstraintData.model_validate(invalid)


def test_commitment_requires_an_available_active_set_and_keeps_results_separate() -> None:
    parsed = CommitmentData.model_validate(COMMITMENT)
    assert parsed.supported_under == ["n07", "n09"]
    assert parsed.empirically_grounded == ["n07"]
    with pytest.raises(ValidationError, match="active commitment"):
        CommitmentData.model_validate({**COMMITMENT, "active": "missing"})


def test_composable_helpers_require_their_matching_panel() -> None:
    ctx = _LCARSContext(builder=_ManifestBuilder())
    set_ctx(ctx)
    with pytest.raises(ValueError, match="enclosing lcars.support_panel"):
        advanced.environments(SUPPORT)


def test_interactive_web_helpers_return_declared_widgets() -> None:
    ctx = _LCARSContext(builder=_ManifestBuilder())
    set_ctx(ctx)

    frontier = advanced.frontier(FRONTIER, layer_filter=["JUSTIFICATION"])
    tri_state = advanced.tri_state(TRI_STATE, on_escalate="EXACT")
    commitment = advanced.commitment_selector(COMMITMENT)

    assert isinstance(frontier, Frontier)
    assert isinstance(tri_state, TriState)
    assert isinstance(commitment, CommitmentSelector)
