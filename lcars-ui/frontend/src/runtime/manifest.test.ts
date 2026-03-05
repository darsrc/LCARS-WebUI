import { applyManifestUpdate, applyWidgetUpdate, getLogViewerByStream } from "./manifest";
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

  test("getLogViewerByStream resolves stream config", () => {
    const viewer = getLogViewerByStream(manifestFixture, "syslog");
    expect(viewer?.id).toBe("log_sys");
    expect(viewer?.max_lines).toBe(3);
  });
});
