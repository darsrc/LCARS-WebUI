import { render } from "@testing-library/react";

import { LegacyStrictPageRenderer } from "./LegacyStrictPageRenderer";
import type { Page, Widget } from "../../types/contract";

const strictPageFixture: Page = {
  id: "systems",
  title: "SYSTEMS",
  rows: [
    {
      id: "row_title",
      height: "auto",
      columns: [
        {
          id: "col_title",
          width: "1fr",
          widgets: [
            {
              id: "title_sweep",
              type: "lcars_sweep",
              color: "orange",
              reverse: false,
              width_sidebar: 120,
              left_width: 0.32,
              title: "SYSTEMS",
              subtitle: "STATUS",
              column_inputs: [],
              left_children: [],
              right_children: [],
              children: [],
              disabled: false,
              visible: true,
            },
            {
              id: "launch_button",
              type: "button",
              label: "LAUNCH",
              action_id: "launch",
              color: "blue",
              disabled: false,
              visible: true,
            },
            {
              id: "status_panel",
              type: "status_tile",
              label: "GRID",
              value: "STABLE",
              status: "ok",
              color: "anakiwa",
              disabled: false,
              visible: true,
            },
          ],
        },
      ],
    },
    {
      id: "row_secondary",
      height: "auto",
      columns: [
        {
          id: "col_secondary",
          width: "1fr",
          widgets: [
            {
              id: "notes",
              type: "markdown",
              content: "Nominal",
              color: "orange",
              disabled: false,
              visible: true,
            },
          ],
        },
      ],
    },
  ],
};

const renderWidget = (widget: Widget) => <div data-widget-id={widget.id}>{widget.label ?? widget.type}</div>;

describe("LegacyStrictPageRenderer", () => {
  test("renders title-band headers with the extracted oracle segment rhythm", () => {
    const { container } = render(
      <LegacyStrictPageRenderer page={strictPageFixture} pageTitleColor="orange" renderWidget={renderWidget} />,
    );

    const titleLaneHeader = container.querySelector(
      '[data-lcars-band="row_title"] [data-lcars-lane-header-rhythm="oracle-segment-run"]',
    );
    expect(titleLaneHeader).not.toBeNull();

    const titleHeaderSegments = titleLaneHeader?.querySelectorAll(".lcars-bar-segment");
    expect(titleHeaderSegments?.length).toBe(4);

    const titleHeaderLabel = titleLaneHeader?.querySelector(".lcars-bar-segment-label");
    expect(titleHeaderLabel?.textContent).toBe("SYSTEMS");
  });
});
