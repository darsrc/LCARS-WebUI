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
      strict_band_role: "page_title",
      strict_lane_mode: "follow_columns",
      columns: [
        {
          id: "col_title",
          width: "1fr",
          strict_lane_role: "title",
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
              strict_role: "terminal",
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
              strict_role: "secondary",
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
      strict_band_role: "content",
      strict_lane_mode: "follow_columns",
      columns: [
        {
          id: "col_secondary",
          width: "1fr",
          strict_lane_role: "content",
          widgets: [
            {
              id: "notes",
              type: "markdown",
              content: "Nominal",
              color: "orange",
              strict_role: "primary",
              disabled: false,
              visible: true,
            },
          ],
        },
      ],
    },
  ],
};

const terminalHeavyPageFixture: Page = {
  id: "ops",
  title: "OPS",
  rows: [
    {
      id: "row_ops",
      height: "auto",
      columns: [
        {
          id: "col_ops",
          width: "1fr",
          widgets: [
            {
              id: "ops_markdown",
              type: "markdown",
              content: "OPS QUEUE",
              color: "blue",
              strict_role: "primary",
              disabled: false,
              visible: true,
            },
            {
              id: "ops_button_1",
              type: "button",
              label: "ONE",
              action_id: "one",
              color: "orange",
              strict_role: "terminal",
              disabled: false,
              visible: true,
            },
            {
              id: "ops_button_2",
              type: "button",
              label: "TWO",
              action_id: "two",
              color: "orange",
              strict_role: "terminal",
              disabled: false,
              visible: true,
            },
            {
              id: "ops_button_3",
              type: "button",
              label: "THREE",
              action_id: "three",
              color: "orange",
              strict_role: "terminal",
              disabled: false,
              visible: true,
            },
            {
              id: "ops_button_4",
              type: "button",
              label: "FOUR",
              action_id: "four",
              color: "orange",
              strict_role: "terminal",
              disabled: false,
              visible: true,
            },
            {
              id: "ops_button_5",
              type: "button",
              label: "FIVE",
              action_id: "five",
              color: "orange",
              strict_role: "terminal",
              disabled: false,
              visible: true,
            },
            {
              id: "ops_button_6",
              type: "button",
              label: "SIX",
              action_id: "six",
              color: "orange",
              strict_role: "terminal",
              disabled: false,
              visible: true,
            },
          ],
        },
      ],
    },
  ],
};

const explicitRolePageFixture: Page = {
  id: "contract",
  title: "CONTRACT",
  rows: [
    {
      id: "row_contract",
      height: "auto",
      columns: [
        {
          id: "col_contract",
          width: "1fr",
          widgets: [
            {
              id: "contract_primary",
              type: "markdown",
              content: "PRIMARY",
              color: "orange",
              strict_role: "primary",
              disabled: false,
              visible: true,
            },
            {
              id: "contract_terminal_1",
              type: "markdown",
              content: "TERMINAL ONE",
              color: "orange",
              strict_role: "terminal",
              disabled: false,
              visible: true,
            },
            {
              id: "contract_terminal_2",
              type: "markdown",
              content: "TERMINAL TWO",
              color: "orange",
              strict_role: "terminal",
              disabled: false,
              visible: true,
            },
            {
              id: "contract_terminal_3",
              type: "markdown",
              content: "TERMINAL THREE",
              color: "orange",
              strict_role: "terminal",
              disabled: false,
              visible: true,
            },
          ],
        },
      ],
    },
  ],
};

const metadataSplitPageFixture: Page = {
  id: "metadata",
  title: "METADATA",
  rows: [
    {
      id: "row_metadata",
      height: "auto",
      strict_band_role: "content",
      strict_lane_mode: "split_single_column",
      columns: [
        {
          id: "col_metadata",
          width: "1fr",
          strict_lane_role: "content",
          widgets: [
            {
              id: "metadata_primary",
              type: "markdown",
              content: "PRIMARY",
              color: "orange",
              strict_role: "primary",
              disabled: false,
              visible: true,
            },
            {
              id: "metadata_terminal",
              type: "button",
              label: "SYNC",
              action_id: "sync",
              color: "orange",
              strict_role: "terminal",
              disabled: false,
              visible: true,
            },
            {
              id: "metadata_secondary",
              type: "status_tile",
              label: "STATUS",
              value: "ONLINE",
              status: "ok",
              color: "anakiwa",
              strict_role: "secondary",
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
    expect(titleLaneHeader?.querySelector('[data-lcars-shared-primitive="segment-run"]')).not.toBeNull();

    const titleHeaderLabel = titleLaneHeader?.querySelector(".lcars-bar-segment-label");
    expect(titleHeaderLabel?.textContent).toBe("SYSTEMS");
    expect(titleLaneHeader?.closest("[data-lcars-band-role]")?.getAttribute("data-lcars-band-role")).toBe(
      "page_title",
    );
  });

  test("renders terminal and strip caps through the extracted oracle capsule path", () => {
    const { container } = render(
      <LegacyStrictPageRenderer
        page={terminalHeavyPageFixture}
        pageTitleColor="orange"
        renderWidget={renderWidget}
      />,
    );

    const terminalCap = container.querySelector(
      '.lcars-strict-lane-terminal-cap[data-lcars-capsule-rhythm="oracle-capsule-bar"]',
    );
    expect(terminalCap).not.toBeNull();
    expect(terminalCap?.querySelector('[data-lcars-shared-primitive="capsule-bar"]')).not.toBeNull();
    expect(terminalCap?.querySelector(".lcars-bar-label")?.textContent).toBe("TERMINAL 4");

    const stripCap = container.querySelector(
      '.lcars-strict-lane-strip-cap[data-lcars-capsule-rhythm="oracle-capsule-bar"]',
    );
    expect(stripCap).not.toBeNull();
    expect(stripCap?.querySelector('[data-lcars-shared-primitive="capsule-bar"]')).not.toBeNull();
    expect(stripCap?.querySelector(".lcars-bar-label")?.textContent).toBe("AUXILIARY 2");
  });

  test("prefers explicit strict roles over widget-type heuristics when composing lanes", () => {
    const { container } = render(
      <LegacyStrictPageRenderer
        page={explicitRolePageFixture}
        pageTitleColor="orange"
        renderWidget={renderWidget}
      />,
    );

    const lanes = container.querySelectorAll('[data-lcars-band="row_contract"] .lcars-strict-lane');
    expect(lanes).toHaveLength(2);

    const terminalCap = container.querySelector(
      '[data-lcars-band="row_contract"] .lcars-strict-lane-terminal-cap[data-lcars-capsule-rhythm="oracle-capsule-bar"]',
    );
    expect(terminalCap).not.toBeNull();
    expect(terminalCap?.querySelector(".lcars-bar-label")?.textContent).toBe("TERMINAL 3");
  });

  test("uses explicit row scaffold metadata to split a single-column band without legacy count heuristics", () => {
    const { container } = render(
      <LegacyStrictPageRenderer
        page={metadataSplitPageFixture}
        pageTitleColor="orange"
        renderWidget={renderWidget}
      />,
    );

    const lanes = container.querySelectorAll('[data-lcars-band="row_metadata"] .lcars-strict-lane');
    expect(lanes).toHaveLength(2);
    expect(lanes[0]?.getAttribute("data-lcars-lane-role")).toBe("core");
    expect(lanes[1]?.getAttribute("data-lcars-lane-role")).toBe("support");
  });
});
