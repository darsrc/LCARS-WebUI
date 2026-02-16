"""Generate deterministic golden artifacts for the LCARS contract."""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT / "src") not in sys.path:
    sys.path.insert(0, str(ROOT / "src"))

from lcars_ui.core.models import (
    Column,
    Header,
    Layout,
    Manifest,
    Meta,
    Page,
    Row,
    Sidebar,
    SidebarItem,
)
from lcars_ui.widgets.data import LineChart, SeriesPointSet, Sparkline, Table, TableRow
from lcars_ui.widgets.inputs import Button, Form, Select, SelectOption, TextInput, Toggle
from lcars_ui.widgets.media import LogViewer, MicButton, VideoHls
from lcars_ui.widgets.primitives import Alert, StatusTile, Text

GOLDEN_DIR = ROOT / "fixtures" / "golden"

PROTOCOL_PLACEHOLDER = {
    "phase": 0,
    "status": "placeholder",
    "kind": "protocol",
}


def _write_json(path: Path, payload: dict[str, object]) -> None:
    path.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def _build_manifest() -> Manifest:
    form_children = [
        TextInput(id="form_name", label="Name", placeholder="Cmdr Riker", value=""),
        Toggle(id="form_ack", label="Acknowledge", checked=True, action_id="form_ack_toggle"),
        Select(
            id="form_mode",
            label="Mode",
            value="ops",
            action_id="form_mode_select",
            options=[
                SelectOption(label="Operations", value="ops"),
                SelectOption(label="Tactical", value="tac"),
            ],
        ),
    ]

    main_page = Page(
        id="main",
        title="Main Bridge",
        rows=[
            Row(
                id="row_1",
                height="auto",
                columns=[
                    Column(
                        id="col_1",
                        width="2fr",
                        widgets=[
                            Text(id="txt_title", label="Bridge", content="Bridge Systems", size="h1"),
                            StatusTile(
                                id="tile_warp",
                                label="Warp Core",
                                status="ok",
                                value="98%",
                                color="blue",
                            ),
                            Alert(
                                id="alert_1",
                                label="Alert",
                                severity="yellow",
                                message="Yellow Alert",
                                blink=True,
                                color="yellow",
                            ),
                            Button(
                                id="btn_red_alert",
                                label="Red Alert",
                                action_id="trigger_red_alert",
                                color="red",
                            ),
                            Toggle(
                                id="tog_shields",
                                label="Shields",
                                checked=True,
                                action_id="toggle_shields",
                                color="orange",
                            ),
                            Select(
                                id="sel_channel",
                                label="Comms Channel",
                                value="alpha",
                                action_id="select_channel",
                                options=[
                                    SelectOption(label="Alpha", value="alpha"),
                                    SelectOption(label="Beta", value="beta"),
                                ],
                            ),
                            TextInput(
                                id="txt_cmd",
                                label="Command",
                                placeholder="Enter command",
                                value="",
                                regex=r"^[A-Za-z ]+$",
                            ),
                            Form(
                                id="form_ops",
                                label="Ops Form",
                                submit_label="Submit",
                                action_id="submit_ops",
                                children=form_children,
                            ),
                        ],
                    ),
                    Column(
                        id="col_2",
                        width="1fr",
                        widgets=[
                            Table(
                                id="tbl_systems",
                                label="Subsystem Status",
                                headers=["System", "State"],
                                rows=[
                                    TableRow(id="r1", cells=["Impulse", "OK"]),
                                    TableRow(id="r2", cells=["Life Support", "OK"]),
                                ],
                            ),
                            LineChart(
                                id="chart_power",
                                label="Power Trend",
                                x_labels=["t1", "t2", "t3"],
                                series=[
                                    SeriesPointSet(name="EPS", data=[71.0, 73.5, 70.2], color="orange"),
                                ],
                            ),
                            Sparkline(
                                id="spark_cpu",
                                label="CPU",
                                x_labels=["a", "b", "c", "d"],
                                series=[SeriesPointSet(name="CPU", data=[0.4, 0.6, 0.55, 0.7])],
                            ),
                            LogViewer(
                                id="log_sys",
                                label="System Log",
                                stream_id="syslog",
                                max_lines=500,
                            ),
                            VideoHls(
                                id="vid_external",
                                label="External Cam",
                                src="https://example.invalid/stream.m3u8",
                                autoplay=False,
                                muted=True,
                            ),
                            MicButton(
                                id="mic_1",
                                label="Push to Talk",
                                upload_url="/lcars/upload/audio",
                                action_id="mic_command",
                                timeout_ms=5000,
                            ),
                        ],
                    ),
                ],
            )
        ],
    )

    engineering_page = Page(
        id="engineering",
        title="Engineering",
        rows=[
            Row(
                id="eng_row_1",
                height="1fr",
                columns=[
                    Column(
                        id="eng_col_1",
                        width="1fr",
                        widgets=[
                            Text(id="eng_text", content="Engine Room", size="h2", color="orange"),
                        ],
                    )
                ],
            )
        ],
    )

    return Manifest(
        meta=Meta(
            version="1.0.0",
            app_name="Starship Operations",
            theme="galaxy",
            lang="en-US",
            sound_enabled=True,
        ),
        layout=Layout(
            header=Header(title="USS Enterprise", subtitle="NCC-1701-D", color="orange"),
            sidebar=Sidebar(
                position="left",
                items=[
                    SidebarItem(id="nav_main", label="MAIN", target_page="main", color="blue"),
                    SidebarItem(
                        id="nav_eng",
                        label="ENGINEERING",
                        target_page="engineering",
                        color="red",
                    ),
                ],
            ),
        ),
        pages={
            "main": main_page,
            "engineering": engineering_page,
        },
    )


def main() -> int:
    GOLDEN_DIR.mkdir(parents=True, exist_ok=True)

    manifest = _build_manifest()
    manifest_payload = manifest.model_dump(mode="json")
    schema_payload = Manifest.model_json_schema()

    _write_json(GOLDEN_DIR / "manifest.v1.json", manifest_payload)
    _write_json(GOLDEN_DIR / "schema.v1.json", schema_payload)
    _write_json(GOLDEN_DIR / "protocol.v1.json", PROTOCOL_PLACEHOLDER)

    print("Generated deterministic golden manifest/schema artifacts.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
