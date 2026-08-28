"""Contract and DSL coverage for the knowledge-graph widget family."""

from __future__ import annotations

import pytest
from pydantic import ValidationError

from lcars_ui import advanced
from lcars_ui.dsl._builder import _ManifestBuilder
from lcars_ui.dsl._state import _LCARSContext, set_ctx
from lcars_ui.widgets.web import SupportCompleteness, SupportData, TriState

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

TRI_STATE = {
    "query": "supported_under",
    "target": "n07",
    "scope": "c02",
    "result": "UNKNOWN",
    "mode": "FAST",
    "reason": "label_truncated",
}


def _raw_widgets() -> list[object]:
    ctx = _LCARSContext(builder=_ManifestBuilder())
    set_ctx(ctx)
    with advanced.raw(reason="semantic contract test"):
        with advanced.support_panel(
            "Support", node="n07", data=SUPPORT, show_environments=True, show_legend=True
        ):
            pass
        advanced.tri_state(TRI_STATE, on_escalate="EXACT")
    assert ctx.builder is not None
    return ctx.builder.build(ctx.config).pages["main"].rows[0].columns[0].widgets


def test_all_web_widgets_build_as_discriminated_manifest_members() -> None:
    widgets = _raw_widgets()

    assert [widget.type for widget in widgets] == ["support_panel", "tri_state"]
    assert widgets[0].show_legend is True
    assert widgets[0].show_environments is True
    assert widgets[0].data.environments[0].atoms[1].type == "assumption"
    assert widgets[1].data.target == "n07"
    assert widgets[1].data.scope == "c02"


def test_support_panel_rejects_data_for_a_different_node() -> None:
    ctx = _LCARSContext(builder=_ManifestBuilder())
    set_ctx(ctx)
    with pytest.raises(ValueError, match="does not match panel node"):
        with advanced.support_panel("Support", node="n07", data={**SUPPORT, "node": "n09"}):
            pass


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


def test_interactive_web_helpers_return_declared_widgets() -> None:
    ctx = _LCARSContext(builder=_ManifestBuilder())
    set_ctx(ctx)

    tri_state = advanced.tri_state(TRI_STATE, on_escalate="EXACT")

    assert isinstance(tri_state, TriState)
