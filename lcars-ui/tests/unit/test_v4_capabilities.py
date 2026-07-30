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


def test_table_column_sort_rules_default_to_auto_and_serialize() -> None:
    default = lcars.TableColumn(key="ram")
    assert default.sort_as == "auto"
    assert default.sort_order is None
    assert default.sort_nulls == "last"

    tuned = lcars.TableColumn(
        key="state",
        sort_as="bytes",
        sort_order=["running", "sleeping", "stopped"],
        sort_nulls="first",
    )
    payload = tuned.model_dump(mode="json")
    assert payload["sort_as"] == "bytes"
    assert payload["sort_order"] == ["running", "sleeping", "stopped"]
    assert payload["sort_nulls"] == "first"


def test_table_sort_cycle_defaults_to_auto_and_accepts_explicit_policies() -> None:
    assert lcars.TableOptions().sort_cycle == "auto"
    assert lcars.TableOptions(sort_cycle="two-state").sort_cycle == "two-state"
    assert lcars.TableOptions(sort_cycle="three-state").sort_cycle == "three-state"


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
    assert set(payload["pages"]) == {"data", "controls", "lcars-options"}
    assert "data:" not in str(payload)


def test_table_cell_copy_fields_serialize_and_validate() -> None:
    cell = lcars.TableCell(
        value="acme/widget",
        display="widget",
        link=lcars.LinkSpec(href="https://example.com/acme/widget", target="_blank"),
        copyable=True,
        copy_value="acme/widget",
    )
    payload = cell.model_dump(mode="json")
    assert payload["copyable"] is True
    assert payload["copy_value"] == "acme/widget"
    assert payload["copy_on_click"] is False

    # copy_on_click must not silently combine with a link or action.
    from pydantic import ValidationError

    for conflict in (
        {"link": lcars.LinkSpec(href="https://example.com")},
        {"action": lcars.ActionSpec(label="Open", action_id="open")},
    ):
        try:
            lcars.TableCell(value="x", copy_on_click=True, **conflict)
        except ValidationError:
            pass
        else:  # pragma: no cover - the validator must reject these
            raise AssertionError("copy_on_click conflict was not rejected")


def test_table_row_expanded_content_and_lazy_fields_round_trip() -> None:
    row = lcars.TableRow(
        id="acme/widget",
        cells=["widget", 3],
        loading=True,
        error="Fetch failed",
        expanded_content=[
            lcars.TableDetailText(text="Compatible with core v3+"),
            lcars.TableDetailStatus(status="ok", label="Signed"),
            lcars.TableDetailLink(href="https://example.com/changelog", label="Changelog"),
            lcars.TableDetailAction(label="Rebuild", action_id="rebuild", value="acme/widget"),
            lcars.TableDetailTable(
                headers=["File"], rows=[lcars.TableRow(id="f1", cells=["main.py"])]
            ),
        ],
    )
    payload = row.model_dump(mode="json")
    assert payload["loading"] is True
    assert payload["error"] == "Fetch failed"
    kinds = [item["kind"] for item in payload["expanded_content"]]
    assert kinds == ["text", "status", "link", "action", "table"]

    # Empty optional fields are omitted so legacy manifests stay byte-identical.
    bare = lcars.TableRow(id="plain", cells=["a"]).model_dump(mode="json")
    assert bare == {"id": "plain", "cells": ["a"]}


def test_client_emit_mode_receives_state_without_owning_data_ops() -> None:
    clear_session_state("v4-emit")
    ctx = _LCARSContext(
        mode=Mode.HANDLE,
        session_id="v4-emit",
        active_action_id="repos",
        active_action_value={
            "kind": "selection",
            "state": {"selected_ids": ["acme/widget"], "page": 1, "page_size": 25},
        },
        builder=_ManifestBuilder(),
    )
    set_ctx(ctx)
    state = lcars.table(
        [],
        id="repos",
        options=lcars.TableOptions(
            data_mode="client",
            emit_state_changes=True,
            interaction=lcars.InteractionOptions(action_id="repos"),
        ),
    )
    assert isinstance(state, lcars.TableState)
    assert state.selected_ids == ["acme/widget"]
    assert state.last_event == "selection"


def test_pure_local_table_returns_none_in_handle_mode() -> None:
    ctx = _LCARSContext(
        mode=Mode.HANDLE,
        session_id="v4-local",
        active_action_id="repos",
        builder=_ManifestBuilder(),
    )
    set_ctx(ctx)
    # No emit_state_changes, no server data_mode -> Python is not notified.
    assert lcars.table([], id="repos", options=lcars.TableOptions()) is None


def test_table_repositories_example_builds_and_validates() -> None:
    from examples.table_repositories.app import ui as repos_ui

    ctx = _LCARSContext(mode=Mode.BUILD, builder=_ManifestBuilder())
    set_ctx(ctx)
    repos_ui()
    assert ctx.builder is not None
    manifest = ctx.builder.build(ctx.config)
    payload = manifest.model_dump(mode="json")

    def _find_table(node: object) -> dict | None:
        if isinstance(node, dict):
            if node.get("type") == "table":
                return node
            for value in node.values():
                found = _find_table(value)
                if found is not None:
                    return found
        elif isinstance(node, list):
            for item in node:
                found = _find_table(item)
                if found is not None:
                    return found
        return None

    table = _find_table(payload["pages"]["repos"])
    assert table is not None
    assert table["options"]["data_mode"] == "client"
    assert table["options"]["emit_state_changes"] is True
    # Linked-and-copyable name cell survives serialisation.
    name_cell = table["rows"][0]["cells"][0]
    assert name_cell["copyable"] is True and name_cell["link"]["href"]
