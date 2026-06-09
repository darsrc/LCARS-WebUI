import { applyManifestUpdate, applyWidgetUpdate, getLogViewerByStream, getWidgetById } from "./manifest";
import { manifestFixture } from "../test/manifestFixture";

describe("manifest runtime helpers", () => {
  test("applyManifestUpdate patches a nested value", () => {
    const { manifest, applied } = applyManifestUpdate(
      manifestFixture,
      "pages.main.rows[0].columns[0].widgets[0].content",
      "Updated Bridge",
    );
    expect(applied).toBe(true);
    const widget = manifest.pages.main.rows[0].columns[0].widgets[0];
    expect(widget.type).toBe("text");
    if (widget.type === "text") {
      expect(widget.content).toBe("Updated Bridge");
    }
  });

  test("applyManifestUpdate rejects invalid path", () => {
    const { applied } = applyManifestUpdate(manifestFixture, "pages.missing.rows[9]", {});
    expect(applied).toBe(false);
  });

  test("applyManifestUpdate replaces manifest at root path", () => {
    const replacement = {
      ...manifestFixture,
      meta: {
        ...manifestFixture.meta,
        app_name: "Replacement",
      },
    };
    const { manifest, applied } = applyManifestUpdate(manifestFixture, "", replacement);
    expect(applied).toBe(true);
    expect(manifest.meta.app_name).toBe("Replacement");
  });

  test("applyWidgetUpdate merges widget fields by id", () => {
    const updated = applyWidgetUpdate(manifestFixture, "tog_alert", {
      checked: true,
      label: "Alert Enabled",
    });
    const widget = updated.pages.main.rows[0].columns[0].widgets.find((item) => item.id === "tog_alert");
    expect(widget).toBeDefined();
    expect(widget?.type).toBe("toggle");
    if (widget?.type === "toggle") {
      expect(widget.checked).toBe(true);
      expect(widget.label).toBe("Alert Enabled");
    }
  });

  test("applyWidgetUpdate merges nested lcars_box child fields by id", () => {
    const nested = {
      ...manifestFixture,
      pages: {
        ...manifestFixture.pages,
        main: {
          ...manifestFixture.pages.main,
          rows: [
            {
              ...manifestFixture.pages.main.rows[0],
              columns: [
                {
                  ...manifestFixture.pages.main.rows[0].columns[0],
                  widgets: [
                    {
                      id: "box_1",
                      type: "lcars_box",
                      title: "Systems",
                      subtitle: null,
                      corners: [1, 2, 3, 4],
                      sides: [1, 2, 3, 4],
                      color: "golden-tanoi",
                      corner_colors: null,
                      side_colors: null,
                      title_color: null,
                      subtitle_color: null,
                      width_left: 120,
                      width_right: 120,
                      left_inputs: null,
                      right_inputs: null,
                      children: [
                        {
                          id: "nested_toggle",
                          type: "toggle",
                          checked: false,
                          action_id: "nested_toggle",
                          label: "Nested",
                          color: "blue",
                          disabled: false,
                          visible: true,
                        },
                      ],
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

    const updated = applyWidgetUpdate(nested, "nested_toggle", { checked: true });
    const box = updated.pages.main.rows[0].columns[0].widgets[0];
    expect(box.type).toBe("lcars_box");
    if (box.type === "lcars_box") {
      const nestedToggle = box.children[0];
      expect(nestedToggle.type).toBe("toggle");
      if (nestedToggle.type === "toggle") {
        expect(nestedToggle.checked).toBe(true);
      }
    }
  });

  test("applyWidgetUpdate traverses sweep input slots", () => {
    const nested = {
      ...manifestFixture,
      pages: {
        ...manifestFixture.pages,
        main: {
          ...manifestFixture.pages.main,
          rows: [
            {
              ...manifestFixture.pages.main.rows[0],
              columns: [
                {
                  ...manifestFixture.pages.main.rows[0].columns[0],
                  widgets: [
                    {
                      id: "sweep_1",
                      type: "lcars_sweep",
                      title: "Console",
                      subtitle: null,
                      color: "golden-tanoi",
                      reverse: false,
                      width_sidebar: 120,
                      left_width: 0.5,
                      header_children: null,
                      column_inputs: [
                        {
                          id: "nested_mode",
                          type: "select",
                          options: [
                            { label: "A", value: "A" },
                            { label: "B", value: "B" },
                          ],
                          value: "A",
                          action_id: "nested_mode",
                          label: "Mode",
                          color: "blue",
                          disabled: false,
                          visible: true,
                        },
                      ],
                      left_children: null,
                      right_children: null,
                      rail_children: null,
                      content_children: null,
                      children: [],
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

    const updated = applyWidgetUpdate(nested, "nested_mode", { value: "B" });
    const nestedMode = getWidgetById(updated, "nested_mode");
    expect(nestedMode?.type).toBe("select");
    if (nestedMode?.type === "select") {
      expect(nestedMode.value).toBe("B");
    }
  });

  test("getLogViewerByStream resolves stream config", () => {
    const viewer = getLogViewerByStream(manifestFixture, "syslog");
    expect(viewer?.id).toBe("log_sys");
    expect(viewer?.max_lines).toBe(3);
  });
});
