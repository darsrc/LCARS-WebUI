/**
 * Contract regression tests.
 *
 * The golden manifest below is kept in sync with the backend's
 * fixtures/golden/manifest.v1.json.  Any drift between the frontend
 * TypeScript contract types and the backend Pydantic schema will cause
 * isManifest() to return false, making these tests fail.
 */

import { isManifest } from "./contract";

// ---------------------------------------------------------------------------
// Golden manifest fixture (mirrors lcars-ui/fixtures/golden/manifest.v1.json)
// ---------------------------------------------------------------------------

const goldenManifest = {
  layout: {
    header: { color: "orange", subtitle: "NCC-1701-D", title: "USS Enterprise" },
    sidebar: {
      items: [
        { color: "blue", id: "nav_main", label: "MAIN", target_page: "main" },
        { color: "red", id: "nav_eng", label: "ENGINEERING", target_page: "engineering" },
      ],
      position: "left",
    },
  },
  meta: {
    app_name: "Starship Operations",
    lang: "en-US",
    sound_enabled: true,
    theme: "galaxy",
    version: "1.0.0",
  },
  pages: {
    engineering: {
      id: "engineering",
      rows: [
        {
          columns: [
            {
              id: "eng_col_1",
              widgets: [
                {
                  color: "orange",
                  content: "Engine Room",
                  disabled: false,
                  id: "eng_text",
                  label: null,
                  size: "h2",
                  type: "text",
                  visible: true,
                },
              ],
              width: "1fr",
            },
          ],
          height: "1fr",
          id: "eng_row_1",
        },
      ],
      title: "Engineering",
    },
    main: {
      id: "main",
      rows: [
        {
          columns: [
            {
              id: "col_1",
              widgets: [
                {
                  color: null,
                  content: "Bridge Systems",
                  disabled: false,
                  id: "txt_title",
                  label: "Bridge",
                  size: "h1",
                  type: "text",
                  visible: true,
                },
                {
                  color: "blue",
                  disabled: false,
                  id: "tile_warp",
                  label: "Warp Core",
                  status: "ok",
                  type: "status_tile",
                  value: "98%",
                  visible: true,
                },
                {
                  color: "yellow",
                  disabled: false,
                  id: "prog_repair",
                  label: "Hull Repair",
                  show_label: true,
                  type: "progress_bar",
                  value: 42.0,
                  visible: true,
                },
                {
                  blink: true,
                  color: "yellow",
                  disabled: false,
                  id: "alert_1",
                  label: "Alert",
                  message: "Yellow Alert",
                  severity: "yellow",
                  type: "alert",
                  visible: true,
                },
                {
                  action_id: "trigger_red_alert",
                  color: "red",
                  disabled: false,
                  id: "btn_red_alert",
                  label: "Red Alert",
                  type: "button",
                  visible: true,
                },
                {
                  action_id: "toggle_shields",
                  checked: true,
                  color: "orange",
                  disabled: false,
                  id: "tog_shields",
                  label: "Shields",
                  type: "toggle",
                  visible: true,
                },
                {
                  action_id: "select_channel",
                  color: null,
                  disabled: false,
                  id: "sel_channel",
                  label: "Comms Channel",
                  options: [
                    { label: "Alpha", value: "alpha" },
                    { label: "Beta", value: "beta" },
                  ],
                  type: "select",
                  value: "alpha",
                  visible: true,
                },
                {
                  color: null,
                  disabled: false,
                  id: "txt_cmd",
                  label: "Command",
                  password: false,
                  placeholder: "Enter command",
                  regex: "^[A-Za-z ]+$",
                  type: "text_input",
                  value: "",
                  visible: true,
                },
                {
                  color: null,
                  disabled: false,
                  id: "num_alert_threshold",
                  label: "Alert Threshold",
                  max: 100.0,
                  min: 0.0,
                  placeholder: "75",
                  step: 1.0,
                  type: "number_input",
                  value: 75.0,
                  visible: true,
                },
                {
                  action_id: "submit_ops",
                  children: [
                    {
                      color: null,
                      disabled: false,
                      id: "form_name",
                      label: "Name",
                      password: false,
                      placeholder: "Cmdr Riker",
                      regex: null,
                      type: "text_input",
                      value: "",
                      visible: true,
                    },
                    {
                      color: null,
                      disabled: false,
                      id: "form_warp_factor",
                      label: "Warp Factor",
                      max: 9.99,
                      min: 1.0,
                      placeholder: null,
                      step: 0.01,
                      type: "number_input",
                      value: 5.0,
                      visible: true,
                    },
                    {
                      action_id: "form_ack_toggle",
                      checked: true,
                      color: null,
                      disabled: false,
                      id: "form_ack",
                      label: "Acknowledge",
                      type: "toggle",
                      visible: true,
                    },
                    {
                      action_id: "form_mode_select",
                      color: null,
                      disabled: false,
                      id: "form_mode",
                      label: "Mode",
                      options: [
                        { label: "Operations", value: "ops" },
                        { label: "Tactical", value: "tac" },
                      ],
                      type: "select",
                      value: "ops",
                      visible: true,
                    },
                  ],
                  color: null,
                  disabled: false,
                  id: "form_ops",
                  label: "Ops Form",
                  submit_label: "Submit",
                  type: "form",
                  visible: true,
                },
              ],
              width: "2fr",
            },
            {
              id: "col_2",
              widgets: [
                {
                  color: null,
                  disabled: false,
                  headers: ["System", "State"],
                  id: "tbl_systems",
                  label: "Subsystem Status",
                  rows: [
                    { cells: ["Impulse", "OK"], id: "r1" },
                    { cells: ["Life Support", "OK"], id: "r2" },
                  ],
                  type: "table",
                  visible: true,
                },
                {
                  color: null,
                  disabled: false,
                  id: "chart_power",
                  label: "Power Trend",
                  series: [{ color: "orange", data: [71.0, 73.5, 70.2], name: "EPS" }],
                  type: "line_chart",
                  visible: true,
                  x_labels: ["t1", "t2", "t3"],
                },
                {
                  color: null,
                  disabled: false,
                  id: "spark_cpu",
                  label: "CPU",
                  series: [{ color: null, data: [0.4, 0.6, 0.55, 0.7], name: "CPU" }],
                  type: "sparkline",
                  visible: true,
                  x_labels: ["a", "b", "c", "d"],
                },
                {
                  color: "blue",
                  crit_threshold: 90.0,
                  disabled: false,
                  id: "gauge_shields",
                  label: "Shield Strength",
                  max: 100.0,
                  min: 0.0,
                  type: "gauge",
                  unit: "%",
                  value: 87.2,
                  visible: true,
                  warn_threshold: 70.0,
                },
                {
                  color: "white",
                  content: "## Captain's Log\\n\\nAll systems nominal.",
                  disabled: false,
                  id: "md_report",
                  label: "Captain's Log",
                  type: "markdown",
                  visible: true,
                },
                {
                  color: null,
                  disabled: false,
                  id: "log_sys",
                  label: "System Log",
                  max_lines: 500,
                  stream_id: "syslog",
                  type: "log_viewer",
                  visible: true,
                },
                {
                  autoplay: false,
                  color: null,
                  disabled: false,
                  id: "vid_external",
                  label: "External Cam",
                  muted: true,
                  src: "https://example.invalid/stream.m3u8",
                  type: "video_hls",
                  visible: true,
                },
                {
                  action_id: "mic_command",
                  color: null,
                  disabled: false,
                  id: "mic_1",
                  label: "Push to Talk",
                  timeout_ms: 5000,
                  type: "mic_button",
                  upload_url: "/lcars/upload/audio",
                  visible: true,
                },
              ],
              width: "1fr",
            },
          ],
          height: "auto",
          id: "row_1",
        },
      ],
      title: "Main Bridge",
    },
  },
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("contract: isManifest", () => {
  test("accepts the golden v1 manifest fixture without shape drift", () => {
    expect(isManifest(goldenManifest)).toBe(true);
  });

  test("rejects null", () => {
    expect(isManifest(null)).toBe(false);
  });

  test("rejects missing meta fields", () => {
    const bad = { ...goldenManifest, meta: { version: "1.0.0" } };
    expect(isManifest(bad)).toBe(false);
  });

  test("rejects empty pages object", () => {
    const bad = { ...goldenManifest, pages: {} };
    expect(isManifest(bad)).toBe(false);
  });

  test("rejects missing layout.header.title", () => {
    const bad = {
      ...goldenManifest,
      layout: {
        ...goldenManifest.layout,
        header: { color: "orange" },
      },
    };
    expect(isManifest(bad)).toBe(false);
  });

  test("rejects non-array sidebar items", () => {
    const bad = {
      ...goldenManifest,
      layout: {
        ...goldenManifest.layout,
        sidebar: { position: "left", items: "not-an-array" },
      },
    };
    expect(isManifest(bad)).toBe(false);
  });
});
