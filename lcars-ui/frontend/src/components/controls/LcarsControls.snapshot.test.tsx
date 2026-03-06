import { fireEvent, render } from "@testing-library/react";

import { LcarsButtonControl } from "./LcarsButtonControl";
import { LcarsGaugeControl } from "./LcarsGaugeControl";
import { LcarsMetricControl } from "./LcarsMetricControl";
import { LcarsProgressControl } from "./LcarsProgressControl";
import { LcarsSelectControl } from "./LcarsSelectControl";
import { LcarsTableControl } from "./LcarsTableControl";
import { LcarsToggleControl } from "./LcarsToggleControl";

describe("Phase 13 control snapshots", () => {
  test("button default", () => {
    const { container } = render(
      <LcarsButtonControl
        onAction={vi.fn()}
        widget={{
          id: "btn-default",
          type: "button",
          label: "Engage",
          action_id: "engage",
          color: "orange",
          visible: true,
          disabled: false,
        }}
      />,
    );

    expect(container.firstChild).toMatchSnapshot();
  });

  test("button hover", () => {
    const onAction = vi.fn();
    const { container, getByRole } = render(
      <LcarsButtonControl
        onAction={onAction}
        widget={{
          id: "btn-hover",
          type: "button",
          label: "Hover State",
          action_id: "hover",
          color: "orange",
          visible: true,
          disabled: false,
        }}
      />,
    );

    fireEvent.mouseEnter(getByRole("button", { name: "Hover State" }));
    expect(container.firstChild).toMatchSnapshot();
  });

  test("button disabled", () => {
    const { container } = render(
      <LcarsButtonControl
        onAction={vi.fn()}
        widget={{
          id: "btn-disabled",
          type: "button",
          label: "Disabled",
          action_id: "disabled",
          color: "orange",
          visible: true,
          disabled: true,
        }}
      />,
    );

    expect(container.firstChild).toMatchSnapshot();
  });

  test("toggle on", () => {
    const { container } = render(
      <LcarsToggleControl
        onToggle={vi.fn()}
        widget={{
          id: "tog-on",
          type: "toggle",
          label: "Shields",
          checked: true,
          action_id: "toggle_shields",
          color: "orange",
          visible: true,
          disabled: false,
        }}
      />,
    );

    expect(container.firstChild).toMatchSnapshot();
  });

  test("toggle off", () => {
    const { container } = render(
      <LcarsToggleControl
        onToggle={vi.fn()}
        widget={{
          id: "tog-off",
          type: "toggle",
          label: "Shields",
          checked: false,
          action_id: "toggle_shields",
          color: "orange",
          visible: true,
          disabled: false,
        }}
      />,
    );

    expect(container.firstChild).toMatchSnapshot();
  });

  test("select with second option selected", () => {
    const { container } = render(
      <LcarsSelectControl
        onSelect={vi.fn()}
        widget={{
          id: "sel-mode",
          type: "select",
          label: "Mode",
          action_id: "set_mode",
          value: "ops",
          color: "blue",
          visible: true,
          disabled: false,
          options: [
            { label: "Science", value: "science" },
            { label: "Operations", value: "ops" },
            { label: "Tactical", value: "tactical" },
          ],
        }}
      />,
    );

    expect(container.firstChild).toMatchSnapshot();
  });

  test("table with five rows", () => {
    const { container } = render(
      <LcarsTableControl
        widget={{
          id: "tbl-crew",
          type: "table",
          label: "Crew",
          color: "blue",
          visible: true,
          headers: ["Name", "Role", "Shift"],
          rows: [
            { id: "r1", cells: ["Picard", "Captain", "Alpha"] },
            { id: "r2", cells: ["Riker", "XO", "Alpha"] },
            { id: "r3", cells: ["Data", "Ops", "Gamma"] },
            { id: "r4", cells: ["Worf", "Security", "Beta"] },
            { id: "r5", cells: ["La Forge", "Engineer", "Gamma"] },
          ],
        }}
      />,
    );

    expect(container.firstChild).toMatchSnapshot();
  });

  test("metric ok", () => {
    const { container } = render(
      <LcarsMetricControl
        widget={{
          id: "metric-ok",
          type: "status_tile",
          label: "Shields",
          value: "100%",
          status: "ok",
          color: "anakiwa",
          visible: true,
        }}
      />,
    );

    expect(container.firstChild).toMatchSnapshot();
  });

  test("metric warn", () => {
    const { container } = render(
      <LcarsMetricControl
        widget={{
          id: "metric-warn",
          type: "status_tile",
          label: "Shields",
          value: "62%",
          status: "warn",
          color: "orange-peel",
          visible: true,
        }}
      />,
    );

    expect(container.firstChild).toMatchSnapshot();
  });

  test("metric crit", () => {
    const { container } = render(
      <LcarsMetricControl
        widget={{
          id: "metric-crit",
          type: "status_tile",
          label: "Shields",
          value: "19%",
          status: "crit",
          color: "rust",
          visible: true,
        }}
      />,
    );

    expect(container.firstChild).toMatchSnapshot();
  });

  test("gauge 25%", () => {
    const { container } = render(
      <LcarsGaugeControl
        widget={{
          id: "gauge-25",
          type: "gauge",
          label: "Core Output",
          value: 25,
          min: 0,
          max: 100,
          unit: "%",
          color: "blue",
          visible: true,
        }}
      />,
    );

    expect(container.firstChild).toMatchSnapshot();
  });

  test("gauge 75%", () => {
    const { container } = render(
      <LcarsGaugeControl
        widget={{
          id: "gauge-75",
          type: "gauge",
          label: "Core Output",
          value: 75,
          min: 0,
          max: 100,
          unit: "%",
          warn_threshold: 70,
          color: "blue",
          visible: true,
        }}
      />,
    );

    expect(container.firstChild).toMatchSnapshot();
  });

  test("gauge 95%", () => {
    const { container } = render(
      <LcarsGaugeControl
        widget={{
          id: "gauge-95",
          type: "gauge",
          label: "Core Output",
          value: 95,
          min: 0,
          max: 100,
          unit: "%",
          warn_threshold: 70,
          crit_threshold: 90,
          color: "blue",
          visible: true,
        }}
      />,
    );

    expect(container.firstChild).toMatchSnapshot();
  });

  test("progress 25%", () => {
    const { container } = render(
      <LcarsProgressControl
        widget={{
          id: "prog-25",
          type: "progress_bar",
          label: "Repair",
          value: 25,
          show_label: true,
          color: "orange",
          visible: true,
        }}
      />,
    );

    expect(container.firstChild).toMatchSnapshot();
  });

  test("progress 75%", () => {
    const { container } = render(
      <LcarsProgressControl
        widget={{
          id: "prog-75",
          type: "progress_bar",
          label: "Repair",
          value: 75,
          show_label: true,
          color: "orange",
          visible: true,
        }}
      />,
    );

    expect(container.firstChild).toMatchSnapshot();
  });

  test("progress 95%", () => {
    const { container } = render(
      <LcarsProgressControl
        widget={{
          id: "prog-95",
          type: "progress_bar",
          label: "Repair",
          value: 95,
          show_label: true,
          color: "orange",
          visible: true,
        }}
      />,
    );

    expect(container.firstChild).toMatchSnapshot();
  });
});
