"""Unit tests for lcars_ui.server.projection — the reconnect-hydration state.

These exercise the patch semantics, the shared/private split, log tail
capping, and overlay pruning directly against plain manifest-shaped dicts,
independent of the DSL or any transport. The full end-to-end reconnect
behavior (through real WebSocket connections) lives in
tests/integration/test_reconnect_hydration.py.

The patch helpers here (``apply_widget_patch``/``apply_manifest_patch``/
``collect_widget_ids``) intentionally mirror
``frontend/src/runtime/manifest.ts`` field-for-field — this file's fixture
shapes are deliberately the same ones exercised in
``frontend/src/runtime/manifest.test.ts`` (a text widget, a toggle, an
``lcars_box`` with a nested child, an ``lcars_sweep`` with a ``column_inputs``
slot) so Python and the browser are provably applying the same semantics.
"""

from __future__ import annotations

import copy

from lcars_ui.server.projection import (
    DEFAULT_LOG_TAIL_CAP,
    PrivateOverlay,
    ProjectionStore,
    SharedProjection,
    apply_manifest_patch,
    apply_widget_patch,
    collect_widget_ids,
)


def _manifest(widgets: list[dict]) -> dict:
    return {
        "meta": {"app_name": "Test", "theme": "galaxy"},
        "pages": {
            "main": {
                "id": "main",
                "title": "Main",
                "rows": [
                    {
                        "id": "row_1",
                        "columns": [{"id": "col_1", "widgets": widgets}],
                    }
                ],
            }
        },
    }


# ---------------------------------------------------------------------------
# apply_widget_patch / apply_manifest_patch / collect_widget_ids
# ---------------------------------------------------------------------------


def test_apply_widget_patch_merges_fields_by_id() -> None:
    manifest = _manifest(
        [{"id": "tog_alert", "type": "toggle", "checked": False, "label": "Alert"}]
    )
    patched = apply_widget_patch(manifest, "tog_alert", {"checked": True, "label": "Alert Enabled"})
    widget = patched["pages"]["main"]["rows"][0]["columns"][0]["widgets"][0]
    expected = {"id": "tog_alert", "type": "toggle", "checked": True, "label": "Alert Enabled"}
    assert widget == expected
    # Original untouched (patch returns a new tree).
    original_widget = manifest["pages"]["main"]["rows"][0]["columns"][0]["widgets"][0]
    assert original_widget["checked"] is False


def test_apply_widget_patch_traverses_nested_box_children() -> None:
    manifest = _manifest(
        [
            {
                "id": "box_1",
                "type": "lcars_box",
                "children": [{"id": "nested_toggle", "type": "toggle", "checked": False}],
            }
        ]
    )
    patched = apply_widget_patch(manifest, "nested_toggle", {"checked": True})
    box = patched["pages"]["main"]["rows"][0]["columns"][0]["widgets"][0]
    assert box["children"][0]["checked"] is True


def test_apply_widget_patch_traverses_sweep_column_inputs() -> None:
    manifest = _manifest(
        [
            {
                "id": "sweep_1",
                "type": "lcars_sweep",
                "column_inputs": [{"id": "nested_mode", "type": "select", "value": "A"}],
                "children": [],
            }
        ]
    )
    patched = apply_widget_patch(manifest, "nested_mode", {"value": "B"})
    sweep = patched["pages"]["main"]["rows"][0]["columns"][0]["widgets"][0]
    assert sweep["column_inputs"][0]["value"] == "B"


def test_apply_widget_patch_traverses_hint_children() -> None:
    manifest = _manifest(
        [
            {
                "id": "chart_1",
                "type": "line_chart",
                "hint": {"children": [{"id": "hint_toggle", "type": "toggle", "checked": False}]},
            }
        ]
    )
    patched = apply_widget_patch(manifest, "hint_toggle", {"checked": True})
    widget = patched["pages"]["main"]["rows"][0]["columns"][0]["widgets"][0]
    assert widget["hint"]["children"][0]["checked"] is True


def test_apply_widget_patch_unknown_id_is_a_no_op() -> None:
    manifest = _manifest([{"id": "a", "type": "text", "content": "hi"}])
    patched = apply_widget_patch(manifest, "does-not-exist", {"content": "bye"})
    assert patched == manifest


def test_apply_manifest_patch_sets_a_nested_path() -> None:
    manifest = _manifest([{"id": "a", "type": "text", "content": "hi"}])
    patched, applied = apply_manifest_patch(manifest, "meta.theme", "nemesis")
    assert applied is True
    assert patched["meta"]["theme"] == "nemesis"
    assert manifest["meta"]["theme"] == "galaxy"  # original untouched


def test_apply_manifest_patch_replaces_whole_manifest_at_root_path() -> None:
    manifest = _manifest([{"id": "a", "type": "text", "content": "hi"}])
    replacement = _manifest([{"id": "b", "type": "text", "content": "bye"}])
    patched, applied = apply_manifest_patch(manifest, "", replacement)
    assert applied is True
    assert patched == replacement


def test_apply_manifest_patch_rejects_missing_intermediate_path() -> None:
    manifest = _manifest([{"id": "a", "type": "text", "content": "hi"}])
    patched, applied = apply_manifest_patch(manifest, "pages.missing.rows[9]", {})
    assert applied is False
    assert patched == manifest


def test_collect_widget_ids_flattens_nested_and_hint_children() -> None:
    manifest = _manifest(
        [
            {
                "id": "box_1",
                "type": "lcars_box",
                "children": [
                    {
                        "id": "nested_toggle",
                        "type": "toggle",
                        "hint": {"children": [{"id": "hint_widget", "type": "text"}]},
                    }
                ],
            },
            {"id": "plain", "type": "text"},
        ]
    )
    assert collect_widget_ids(manifest) == {"box_1", "nested_toggle", "hint_widget", "plain"}


# ---------------------------------------------------------------------------
# SharedProjection
# ---------------------------------------------------------------------------


def test_shared_projection_seed_is_idempotent() -> None:
    shared = SharedProjection()
    shared.seed(_manifest([{"id": "a", "type": "text", "content": "boot"}]))
    shared.apply_widget_update("a", {"content": "mutated"})
    # A second seed call must not clobber the mutation.
    shared.seed(_manifest([{"id": "a", "type": "text", "content": "boot-again"}]))
    widget = shared.snapshot()["pages"]["main"]["rows"][0]["columns"][0]["widgets"][0]
    assert widget["content"] == "mutated"


def test_shared_projection_snapshot_is_a_deep_copy() -> None:
    shared = SharedProjection()
    shared.seed(_manifest([{"id": "a", "type": "text", "content": "boot"}]))
    snapshot = shared.snapshot()
    snapshot["pages"]["main"]["rows"][0]["columns"][0]["widgets"][0]["content"] = "mutated-locally"
    # Mutating a snapshot the caller received must never affect internal state.
    widget = shared.snapshot()["pages"]["main"]["rows"][0]["columns"][0]["widgets"][0]
    assert widget["content"] == "boot"


def test_shared_projection_apply_widget_update_returns_removed_ids() -> None:
    shared = SharedProjection()
    shared.seed(
        _manifest(
            [
                {
                    "id": "box_1",
                    "type": "lcars_box",
                    "children": [{"id": "nested", "type": "toggle", "checked": False}],
                }
            ]
        )
    )
    removed = shared.apply_widget_update("box_1", {"children": []})
    assert removed == {"nested"}
    assert "nested" not in collect_widget_ids(shared.snapshot())


def test_shared_projection_log_tail_is_bounded_at_cap() -> None:
    shared = SharedProjection(log_tail_cap=3)
    shared.append_log("ops", [f"line-{i}" for i in range(10)])
    assert shared.log_tail("ops") == ["line-7", "line-8", "line-9"]


def test_shared_projection_default_log_tail_cap_matches_module_default() -> None:
    shared = SharedProjection()
    assert shared.log_tail_cap == DEFAULT_LOG_TAIL_CAP


# ---------------------------------------------------------------------------
# PrivateOverlay
# ---------------------------------------------------------------------------


def test_private_overlay_repeated_updates_collapse_to_latest_merged_state() -> None:
    """Two private updates to the same widget behave like one merged patch — not a log of two."""
    overlay = PrivateOverlay()
    overlay.apply_widget_update("w", {"value": "first", "label": "A"})
    overlay.apply_widget_update("w", {"value": "second"})
    assert overlay.widget_overrides == {"w": {"value": "second", "label": "A"}}

    base = _manifest([{"id": "w", "type": "text_input", "value": "boot", "label": "boot-label"}])
    sequential = apply_widget_patch(
        apply_widget_patch(base, "w", {"value": "first", "label": "A"}), "w", {"value": "second"}
    )
    merged = overlay.apply_to(copy.deepcopy(base))
    assert merged == sequential


def test_private_overlay_prune_widget_removes_only_that_entry() -> None:
    overlay = PrivateOverlay()
    overlay.apply_widget_update("a", {"value": 1})
    overlay.apply_widget_update("b", {"value": 2})
    overlay.prune_widget("a")
    assert overlay.widget_overrides == {"b": {"value": 2}}


def test_private_overlay_log_tail_bounded_and_independent_of_shared() -> None:
    overlay = PrivateOverlay(log_tail_cap=2)
    overlay.append_log("chat", ["a", "b", "c"])
    assert overlay.log_tail("chat") == ["b", "c"]


# ---------------------------------------------------------------------------
# ProjectionStore — shared/private split, isolation, and pruning
# ---------------------------------------------------------------------------


def _store() -> ProjectionStore:
    store = ProjectionStore()
    store.shared.seed(
        _manifest(
            [
                {
                    "id": "readout",
                    "type": "text",
                    "content": "boot",
                },
                {
                    "id": "box_1",
                    "type": "lcars_box",
                    "children": [{"id": "nested", "type": "toggle", "checked": False}],
                },
            ]
        )
    )
    return store


def test_store_shared_update_is_visible_to_every_session() -> None:
    store = _store()
    store.apply_widget_update(
        audience="all", session_id=None, widget_id="readout", data={"content": "live"}
    )

    for session_id in ("session-a", "session-b", "brand-new-session"):
        snapshot = store.snapshot_for_session(session_id)
        widget = snapshot["pages"]["main"]["rows"][0]["columns"][0]["widgets"][0]
        assert widget["content"] == "live"


def test_store_private_update_is_isolated_to_its_own_session() -> None:
    store = _store()
    store.apply_widget_update(
        audience="session",
        session_id="session-a",
        widget_id="readout",
        data={"content": "private-a"},
    )

    a_snapshot = store.snapshot_for_session("session-a")
    a_widget = a_snapshot["pages"]["main"]["rows"][0]["columns"][0]["widgets"][0]
    assert a_widget["content"] == "private-a"

    b_snapshot = store.snapshot_for_session("session-b")
    b_widget = b_snapshot["pages"]["main"]["rows"][0]["columns"][0]["widgets"][0]
    assert b_widget["content"] == "boot"  # never saw session-a's private state


def test_store_private_update_survives_reread_within_retention_but_not_after_clear() -> None:
    store = _store()
    store.apply_widget_update(
        audience="session",
        session_id="session-a",
        widget_id="readout",
        data={"content": "private-a"},
    )
    assert store.has_overlay("session-a")

    # Simulate a reconnect: reading again (as hydration does) must still see it.
    again = store.snapshot_for_session("session-a")
    widget = again["pages"]["main"]["rows"][0]["columns"][0]["widgets"][0]
    assert widget["content"] == "private-a"

    # Simulate session expiry (App.clear_session_state -> ProjectionStore.clear_session).
    store.clear_session("session-a")
    assert not store.has_overlay("session-a")
    expired = store.snapshot_for_session("session-a")
    widget = expired["pages"]["main"]["rows"][0]["columns"][0]["widgets"][0]
    assert widget["content"] == "boot"


def test_store_shared_structural_removal_prunes_private_overlay_entries_for_it() -> None:
    """Acceptance test: removing a widget in a shared update prunes private overlay entries.

    session-a has a private override queued for "nested" (a widget living
    inside box_1's children). A *shared* update that empties box_1's
    children removes "nested" from the manifest entirely — its private
    override must be pruned everywhere, or a later hydration would try to
    patch a widget id that no longer exists.
    """
    store = _store()
    store.apply_widget_update(
        audience="session", session_id="session-a", widget_id="nested", data={"checked": True}
    )
    store.apply_widget_update(
        audience="session", session_id="session-b", widget_id="nested", data={"checked": True}
    )
    assert store._overlays["session-a"].widget_overrides == {"nested": {"checked": True}}
    assert store._overlays["session-b"].widget_overrides == {"nested": {"checked": True}}

    store.apply_widget_update(
        audience="all", session_id=None, widget_id="box_1", data={"children": []}
    )

    assert store._overlays["session-a"].widget_overrides == {}
    assert store._overlays["session-b"].widget_overrides == {}
    # The shared manifest itself no longer has the widget either.
    assert "nested" not in collect_widget_ids(store.shared.snapshot())


def test_store_shared_structural_removal_via_manifest_update_path_also_prunes() -> None:
    """Same pruning guarantee via a manifest_update (path-based) structural change."""
    store = _store()
    store.apply_widget_update(
        audience="session", session_id="session-a", widget_id="nested", data={"checked": True}
    )
    path = "pages.main.rows[0].columns[0].widgets[1].children"
    store.apply_manifest_update(audience="all", session_id=None, path=path, value=[])

    assert store._overlays["session-a"].widget_overrides == {}


def test_store_log_snapshots_prefer_private_tail_when_present_else_shared() -> None:
    store = _store()
    store.append_log(audience="all", session_id=None, stream_id="ops", lines=["shared-1"])
    store.append_log(
        audience="session", session_id="session-a", stream_id="chat", lines=["private-1"]
    )

    a_snapshots = dict(store.log_snapshots_for_session("session-a"))
    assert a_snapshots["ops"] == ["shared-1"]
    assert a_snapshots["chat"] == ["private-1"]

    b_snapshots = dict(store.log_snapshots_for_session("session-b"))
    assert b_snapshots["ops"] == ["shared-1"]
    assert "chat" not in b_snapshots  # session-b never saw session-a's private stream


def test_store_reset_clears_shared_state_and_every_overlay() -> None:
    store = _store()
    store.apply_widget_update(
        audience="session", session_id="session-a", widget_id="readout", data={"content": "private"}
    )
    store.reset()
    assert store.shared.seeded is False
    assert not store.has_overlay("session-a")
