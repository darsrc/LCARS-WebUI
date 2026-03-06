import type { Manifest } from "../types/contract";

export const manifestFixture: Manifest = {
  meta: {
    version: "1.0.0",
    app_name: "Test LCARS",
    theme: "galaxy",
    lang: "en-US",
    sound_enabled: true,
    force_uppercase: true,
    label_uppercase: true,
    lcars_font_headers: true,
    lcars_font_labels: true,
    lcars_font_text: false,
    visual_language: "strict",
  },
  layout: {
    header: {
      title: "USS Test",
      subtitle: "NCC-0001",
      color: "orange",
    },
    sidebar: {
      position: "left",
      items: [
        {
          id: "nav_main",
          label: "MAIN",
          target_page: "main",
          color: "blue",
          segments: [
            { color: "atomic-tangerine", label: "MAIN" },
            { color: "anakiwa", label: "OPS" },
          ],
        },
      ],
    },
  },
  pages: {
    main: {
      id: "main",
      title: "Main Deck",
      rows: [
        {
          id: "row_1",
          height: "auto",
          columns: [
            {
              id: "col_1",
              width: "1fr",
              widgets: [
                {
                  id: "txt_title",
                  type: "text",
                  content: "Bridge",
                  size: "h1",
                  color: "orange",
                  disabled: false,
                  visible: true,
                },
                {
                  id: "btn_ping",
                  type: "button",
                  action_id: "ping_action",
                  label: "Ping",
                  color: "red",
                  disabled: false,
                  visible: true,
                },
                {
                  id: "log_sys",
                  type: "log_viewer",
                  stream_id: "syslog",
                  max_lines: 3,
                  label: "Syslog",
                  color: null,
                  disabled: false,
                  visible: true,
                },
                {
                  id: "tog_alert",
                  type: "toggle",
                  checked: false,
                  action_id: "toggle_alert",
                  label: "Toggle",
                  color: "blue",
                  disabled: false,
                  visible: true,
                },
              ],
            },
          ],
        },
      ],
    },
  },
};
