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
    SidebarSegment,
)
from lcars_ui.server.events import Envelope
from lcars_ui.widgets.containers import LcarsBox, LcarsBracket, LcarsHeader, LcarsSweep
from lcars_ui.widgets.data import Gauge, LineChart, SeriesPointSet, Sparkline, Table, TableRow
from lcars_ui.widgets.inputs import (
    Button,
    Checkbox,
    Form,
    NumberInput,
    Radio,
    RadioToggle,
    Select,
    SelectOption,
    TextInput,
    Toggle,
)
from lcars_ui.widgets.media import LogViewer, MicButton, VideoHls
from lcars_ui.widgets.primitives import Alert, Markdown, ProgressBar, StatusTile, Text

GOLDEN_DIR = ROOT / "fixtures" / "golden"


def _write_json(path: Path, payload: dict[str, object]) -> None:
    path.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def _build_manifest() -> Manifest:
    form_children = [
        TextInput(id="form_name", label="Name", placeholder="Cmdr Riker", value=""),
        NumberInput(
            id="form_warp_factor",
            label="Warp Factor",
            value=5.0,
            min=1.0,
            max=9.99,
            step=0.01,
        ),
        Toggle(id="form_ack", label="Acknowledge", checked=True, action_id="form_ack_toggle"),
        Checkbox(
            id="form_lockout",
            label="Lockout",
            checked=False,
            action_id="form_lockout_toggle",
        ),
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
        Radio(
            id="form_priority",
            label="Priority",
            value="standard",
            action_id="form_priority_select",
            options=[
                SelectOption(label="Standard", value="standard"),
                SelectOption(label="Emergency", value="emergency"),
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
                            LcarsHeader(
                                id="header_ops",
                                text="Operations",
                                size="h2",
                                color="pale-canary",
                            ),
                            Text(id="txt_title", label="Bridge", content="Bridge Systems", size="h1"),
                            StatusTile(
                                id="tile_warp",
                                label="Warp Core",
                                status="ok",
                                value="98%",
                                color="blue",
                            ),
                            ProgressBar(
                                id="prog_repair",
                                label="Hull Repair",
                                value=42.0,
                                show_label=True,
                                color="yellow",
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
                            Checkbox(
                                id="chk_lock",
                                label="Lock Weapons",
                                checked=False,
                                action_id="lock_weapons",
                                color="husk",
                            ),
                            Radio(
                                id="rad_authorization",
                                label="Authorization",
                                value="alpha",
                                action_id="set_authorization",
                                color="atomic-tangerine",
                                options=[
                                    SelectOption(label="Alpha", value="alpha"),
                                    SelectOption(label="Beta", value="beta"),
                                    SelectOption(label="Gamma", value="gamma"),
                                ],
                            ),
                            RadioToggle(
                                id="radio_toggle_alert",
                                label="Alert Profile",
                                value="yellow",
                                action_id="set_alert_profile",
                                color="orange-peel",
                                options=[
                                    SelectOption(label="GREEN", value="green"),
                                    SelectOption(label="YELLOW", value="yellow"),
                                    SelectOption(label="RED", value="red"),
                                ],
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
                            NumberInput(
                                id="num_alert_threshold",
                                label="Alert Threshold",
                                value=75.0,
                                min=0.0,
                                max=100.0,
                                step=1.0,
                                placeholder="75",
                            ),
                            Form(
                                id="form_ops",
                                label="Ops Form",
                                submit_label="Submit",
                                action_id="submit_ops",
                                children=form_children,
                            ),
                            LcarsBox(
                                id="box_tactical",
                                label="Tactical",
                                title="Tactical",
                                subtitle="Deck A",
                                corners=[1, 2, 3, 4],
                                sides=[1, 2, 3, 4],
                                color="golden-tanoi",
                                corner_colors=["golden-tanoi", "atomic-tangerine", "husk", "anakiwa"],
                                side_colors=["golden-tanoi", "orange-peel", "husk", "anakiwa"],
                                title_color="white",
                                subtitle_color="melrose",
                                width_left=140,
                                width_right=140,
                                left_inputs=[
                                    Button(
                                        id="btn_scan",
                                        label="Run Scan",
                                        action_id="run_scan",
                                        color="atomic-tangerine",
                                    ),
                                ],
                                right_inputs=[
                                    Checkbox(
                                        id="chk_auto",
                                        label="Auto",
                                        checked=True,
                                        action_id="toggle_auto",
                                        color="anakiwa",
                                    ),
                                ],
                                children=[
                                    StatusTile(
                                        id="tile_phasers",
                                        label="Phasers",
                                        status="ok",
                                        value="Charged",
                                        color="orange-peel",
                                    ),
                                    Text(
                                        id="txt_tactical_status",
                                        content="Targeting matrix online",
                                        size="body",
                                        color="melrose",
                                    ),
                                ],
                            ),
                            LcarsSweep(
                                id="sweep_ops",
                                label="Ops Sweep",
                                title="Ops Sweep",
                                color="anakiwa",
                                reverse=False,
                                width_sidebar=120,
                                children=[
                                    Text(
                                        id="txt_sweep_note",
                                        content="Sweep-linked operational notes",
                                        size="body",
                                        color="danub",
                                    ),
                                ],
                            ),
                            LcarsBracket(
                                id="bracket_group",
                                label="Grouped",
                                color="lilac",
                                orientation="both",
                                children=[
                                    Text(
                                        id="txt_grouped",
                                        content="Bracket grouped content",
                                        size="body",
                                        color="lilac",
                                    ),
                                ],
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
                            Gauge(
                                id="gauge_shields",
                                label="Shield Strength",
                                value=87.2,
                                min=0.0,
                                max=100.0,
                                unit="%",
                                warn_threshold=70.0,
                                crit_threshold=90.0,
                                color="blue",
                            ),
                            Markdown(
                                id="md_report",
                                label="Captain's Log",
                                content="## Captain's Log\n\nAll systems nominal.",
                                color="white",
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
            visual_language="strict",
        ),
        layout=Layout(
            header=Header(title="USS Enterprise", subtitle="NCC-1701-D", color="orange"),
            sidebar=Sidebar(
                position="left",
                items=[
                    SidebarItem(
                        id="nav_main",
                        label="MAIN",
                        target_page="main",
                        color="blue",
                        segments=[
                            SidebarSegment(label="MAIN", color="atomic-tangerine"),
                            SidebarSegment(label="OPS", color="anakiwa"),
                        ],
                    ),
                    SidebarItem(
                        id="nav_eng",
                        label="ENGINEERING",
                        target_page="engineering",
                        color="red",
                        segments=[
                            SidebarSegment(label="ENG", color="husk"),
                            SidebarSegment(label="SYS", color="rust"),
                        ],
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
    protocol_payload = Envelope.model_json_schema()

    _write_json(GOLDEN_DIR / "manifest.v1.json", manifest_payload)
    _write_json(GOLDEN_DIR / "schema.v1.json", schema_payload)
    _write_json(GOLDEN_DIR / "protocol.v1.json", protocol_payload)

    print("Generated deterministic golden manifest/schema artifacts.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
