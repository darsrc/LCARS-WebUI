import { fireEvent, render, screen } from "@testing-library/react";

import { WidgetRenderer } from "./WidgetRenderer";
import type { Widget } from "../types/contract";

const sharedProps = {
  logsByStream: { syslog: ["line one", "line two"] },
  onAction: vi.fn(),
  onInput: vi.fn(),
  onFormSubmit: vi.fn(),
  onAudioUpload: vi.fn().mockResolvedValue(undefined),
};

const renderWidget = (widget: Widget) => {
  return render(<WidgetRenderer {...sharedProps} widget={widget} />);
};

describe("WidgetRenderer", () => {
  beforeEach(() => {
    sharedProps.onAction.mockReset();
    sharedProps.onInput.mockReset();
    sharedProps.onFormSubmit.mockReset();
    sharedProps.onAudioUpload.mockReset();
    sharedProps.onAudioUpload.mockResolvedValue(undefined);
  });

  test("renders alert widgets as aria alerts", () => {
    renderWidget({
      id: "alert_1",
      type: "alert",
      severity: "red",
      message: "Red alert",
      blink: true,
      color: "red",
      visible: true,
      disabled: false,
    });

    expect(screen.getByRole("alert")).toHaveTextContent("Red alert");
  });

  test("sends action for button widgets", () => {
    renderWidget({
      id: "btn_1",
      type: "button",
      action_id: "fire",
      label: "Fire",
      color: "orange",
      visible: true,
      disabled: false,
    });

    fireEvent.click(screen.getByRole("button", { name: "Fire" }));
    expect(sharedProps.onAction).toHaveBeenCalledWith("fire", null);
  });

  test("renders log viewer lines", () => {
    renderWidget({
      id: "log_1",
      type: "log_viewer",
      stream_id: "syslog",
      max_lines: 100,
      label: "System Log",
      color: null,
      visible: true,
      disabled: false,
    });

    expect(screen.getByText("line one", { exact: false })).toHaveTextContent(/line one\s+line two/);
  });

  test("submits form payload", () => {
    renderWidget({
      id: "form_1",
      type: "form",
      action_id: "submit_ops",
      submit_label: "Submit",
      label: "Ops",
      color: null,
      visible: true,
      disabled: false,
      children: [
        {
          id: "name",
          type: "text_input",
          value: "Picard",
          password: false,
          placeholder: null,
          regex: null,
          label: "Name",
          color: null,
          visible: true,
          disabled: false,
        },
      ],
    });

    fireEvent.submit(screen.getByRole("button", { name: "Submit" }).closest("form") as HTMLFormElement);
    expect(sharedProps.onFormSubmit).toHaveBeenCalledWith("submit_ops", { name: "Picard" });
  });

  test("renders strict line chart in strict surface wrapper", () => {
    const { container } = renderWidget({
      id: "chart_1",
      type: "line_chart",
      label: "Warp Curve",
      strict_title: "Subspace Flux",
      color: "blue",
      visible: true,
      disabled: false,
      series: [{ name: "warp", data: [1, 2, 3], color: "blue" }],
      x_labels: ["A", "B", "C"],
    });

    expect(container.querySelector(".lcars-strict-surface.lcars-strict-chart")).not.toBeNull();
    expect(container.querySelector('[data-lcars-shared-primitive="chart-frame"]')).not.toBeNull();
    expect(container.querySelector(".lcars-strict-surface-label")).toBeNull();
    expect(screen.getByText("Subspace Flux")).toBeInTheDocument();
  });

  test("renders strict log viewer in strict surface wrapper", () => {
    const { container } = renderWidget({
      id: "log_2",
      type: "log_viewer",
      stream_id: "syslog",
      max_lines: 100,
      label: "Ops Log",
      strict_title: " ",
      color: "orange",
      visible: true,
      disabled: false,
    });

    expect(container.querySelector(".lcars-strict-surface.lcars-strict-log-viewer")).not.toBeNull();
    expect(container.querySelector(".lcars-strict-surface-label")).toBeNull();
  });
});
