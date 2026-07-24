"""v4 widget capability and compatibility coverage."""

from __future__ import annotations

import warnings

import lcars_ui as lcars
from examples.widget_capabilities.app import ui as capability_ui
from lcars_ui.dsl._builder import _ManifestBuilder
from lcars_ui.dsl._state import Mode, _LCARSContext, clear_session_state, set_ctx
from lcars_ui.widgets.data import Table
from lcars_ui.widgets.inputs import Select, SelectOption


def _server() -> lcars.InteractionOptions:
    return lcars.InteractionOptions(mode="server")


def test_unused_capabilities_preserve_legacy_widget_payloads() -> None:
    table = Table(
        id="legacy-table",
        headers=["Name"],
        rows=[lcars.TableRow(id="one", cells=["Alpha"])],
    )
    select = Select(
        id="legacy-select",
        action_id="legacy-select",
        options=[SelectOption(label="Alpha", value="alpha")],
        value="alpha",
    )

    table_payload = table.model_dump(mode="json")
    select_payload = select.model_dump(mode="json")

    assert "options" not in table_payload
    assert "children" not in table_payload["rows"][0]
    assert "settings" not in select_payload
    assert select_payload["options"] == [{"label": "Alpha", "value": "alpha"}]


def test_enhanced_table_retains_typed_values_cells_and_child_rows() -> None:
    options = lcars.TableOptions(
        columns=[
            lcars.TableColumn(key="name", sortable=True, filter="text"),
            lcars.TableColumn(key="load", value_type="number", sortable=True),
        ],
        expandable=True,
    )
    rows = [
        lcars.TableRow(
            id="alpha",
            cells=[
                lcars.TableCell(
                    value="Alpha",
                    link=lcars.LinkSpec(href="https://example.test/alpha"),
                ),
                42,
            ],
            children=[lcars.TableRow(id="alpha-child", cells=["Emitter", 7])],
        )
    ]

    ctx = _LCARSContext(mode=Mode.BUILD, builder=_ManifestBuilder())
    set_ctx(ctx)
    with lcars.raw(reason="contract assertion"):
        lcars.table(rows, title="Results", id="results", options=options)
    assert ctx.builder is not None
    manifest = ctx.builder.build(ctx.config)
    payload = manifest.model_dump(mode="json")
    serialized = payload["pages"]["main"]["rows"][0]["columns"][0]["widgets"][0]

    assert serialized["options"]["columns"][1]["value_type"] == "number"
    assert serialized["rows"][0]["cells"][1] == 42
    assert serialized["rows"][0]["children"][0]["id"] == "alpha-child"


def test_server_interaction_states_are_typed_and_session_scoped() -> None:
    clear_session_state("v4-state")
    table_ctx = _LCARSContext(
        mode=Mode.HANDLE,
        session_id="v4-state",
        active_action_id="results",
        active_action_value={
            "kind": "sort",
            "state": {
                "sort": [{"key": "load", "direction": "desc"}],
                "page": 1,
                "page_size": 25,
            },
        },
        builder=_ManifestBuilder(),
    )
    set_ctx(table_ctx)
    table_state = lcars.table(
        [],
        id="results",
        options=lcars.TableOptions(interaction=_server()),
    )
    assert isinstance(table_state, lcars.TableState)
    assert table_state.sort[0].key == "load"
    assert table_state.last_event == "sort"

    alert_ctx = _LCARSContext(
        mode=Mode.HANDLE,
        session_id="v4-state",
        active_action_id="notice",
        active_action_value={
            "kind": "dismiss",
            "state": {"dismissed": True},
        },
        builder=_ManifestBuilder(),
    )
    set_ctx(alert_ctx)
    alert_state = lcars.alert(
        "Notice",
        id="notice",
        options=lcars.AlertOptions(dismissible=True, interaction=_server()),
    )
    assert isinstance(alert_state, lcars.AlertState)
    assert alert_state.dismissed is True
    assert alert_state.last_event == "dismiss"

    panel_ctx = _LCARSContext(
        mode=Mode.HANDLE,
        session_id="v4-state",
        active_action_id="diagnostics",
        active_action_value={
            "kind": "toggle",
            "state": {"collapsed": True},
        },
        builder=_ManifestBuilder(),
    )
    set_ctx(panel_ctx)
    with lcars.data_panel(
        "Diagnostics",
        id="diagnostics",
        options=lcars.ContainerOptions(collapsible=True, interaction=_server()),
    ) as panel:
        pass
    assert panel.state.collapsed is True
    assert panel.state.last_event == "toggle"


def test_v4_capability_showcase_builds_and_validates() -> None:
    ctx = _LCARSContext(mode=Mode.BUILD, builder=_ManifestBuilder())
    set_ctx(ctx)
    with warnings.catch_warnings():
        warnings.simplefilter("ignore", UserWarning)
        capability_ui()

    assert ctx.builder is not None
    manifest = ctx.builder.build(ctx.config)
    payload = manifest.model_dump(mode="json")
    assert set(payload["pages"]) == {"data", "controls"}
    assert "data:" not in str(payload)
