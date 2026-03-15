import { fireEvent, render, screen } from "@testing-library/react";

import { JoernStrictPageRenderer } from "./JoernStrictPageRenderer";
import type { Page } from "../../types/contract";

const overviewPageFixture: Page = {
  id: "overview",
  title: "OVERVIEW",
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
              id: "overview_sweep",
              type: "lcars_sweep",
              color: "pale-canary",
              reverse: false,
              width_sidebar: 140,
              left_width: 0.32,
              title: "TITLE",
              subtitle: "SUBTITLE",
              column_inputs: [
                {
                  id: "btn_a",
                  type: "button",
                  label: "A",
                  action_id: "action_a",
                  color: "orange",
                  disabled: false,
                  visible: true,
                },
              ],
              left_children: [
                {
                  id: "markdown_left",
                  type: "markdown",
                  content: "LEFT CONTENT",
                  color: "anakiwa",
                  disabled: false,
                  visible: true,
                },
              ],
              right_children: [
                {
                  id: "chart_right",
                  type: "line_chart",
                  x_labels: ["1", "2", "3"],
                  series: [{ name: "S", data: [1, 3, 2], color: "melrose" }],
                  color: "melrose",
                  disabled: false,
                  visible: true,
                },
              ],
              children: [],
              disabled: false,
              visible: true,
            },
          ],
        },
      ],
    },
  ],
};

describe("JoernStrictPageRenderer", () => {
  test("renders overview page through joern strict path", () => {
    const onAction = vi.fn();

    render(<JoernStrictPageRenderer onAction={onAction} page={overviewPageFixture} />);

    expect(screen.getByText("TITLE")).toBeInTheDocument();
    expect(screen.getByText("SUBTITLE")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /A/i }));
    expect(onAction).toHaveBeenCalledWith("action_a", null);
    expect(screen.queryByText("Joern Strict Renderer Preview")).not.toBeInTheDocument();
  });

  test("attempts non-overview pages through the joern widget path when the page widgets are supported", () => {
    const onAction = vi.fn();
    const page: Page = { ...overviewPageFixture, id: "systems", title: "SYSTEMS" };

    render(<JoernStrictPageRenderer onAction={onAction} page={page} />);

    expect(screen.getByText("TITLE")).toBeInTheDocument();
    expect(screen.queryByText("Joern Strict Renderer Preview")).not.toBeInTheDocument();
  });

  test("renders explicit unsupported widget marker instead of silent fallback", () => {
    const onAction = vi.fn();
    const page: Page = {
      ...overviewPageFixture,
      rows: [
        {
          id: "row_u",
          height: "auto",
          columns: [
            {
              id: "col_u",
              width: "1fr",
              widgets: [
                {
                  id: "overview_unsupported",
                  type: "gauge",
                  value: 70,
                  min: 0,
                  max: 100,
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

    render(<JoernStrictPageRenderer onAction={onAction} page={page} />);

    expect(screen.getByText("Unsupported Joern Widget")).toBeInTheDocument();
    expect(screen.getByText(/gauge \(overview_unsupported\)/i)).toBeInTheDocument();
  });

  test("renders fixed-probe widgets without promoting broader unsupported types", () => {
    const onAction = vi.fn();
    const page: Page = {
      id: "target",
      title: "TARGET",
      rows: [
        {
          id: "row_fixed_probe",
          height: "auto",
          columns: [
            {
              id: "col_fixed_probe",
              width: "1fr",
              widgets: [
                {
                  id: "metric_a",
                  type: "status_tile",
                  label: "FAMILY",
                  value: "SEISMOGRAPHIC_SCAN",
                  status: "ok",
                  color: "blue",
                  disabled: false,
                  visible: true,
                },
                {
                  id: "matrix_a",
                  type: "table",
                  headers: ["A", "B"],
                  rows: [
                    { id: "row_a", cells: ["H", "Li"] },
                    { id: "row_b", cells: ["Be", "Mg"] },
                  ],
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

    render(<JoernStrictPageRenderer onAction={onAction} page={page} />);

    expect(screen.getByText("FAMILY")).toBeInTheDocument();
    expect(screen.getByText("SEISMOGRAPHIC_SCAN")).toBeInTheDocument();
    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getByText("Li")).toBeInTheDocument();
    expect(screen.queryByText("Unsupported Joern Widget")).not.toBeInTheDocument();
  });
});
