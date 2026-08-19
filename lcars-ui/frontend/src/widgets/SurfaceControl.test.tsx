import { render, screen } from "@testing-library/react";

import type { SurfaceWidget as SurfaceWidgetType, TextWidget } from "../types/contract";
import { WidgetRenderer, type WidgetHandlers } from "./WidgetRenderer";

const handlers = (): WidgetHandlers => ({
  logsByStream: {},
  onAction: vi.fn(),
  onFormSubmit: vi.fn(),
  onInput: vi.fn(),
});

const textWidget = (id: string, content: string): TextWidget => ({
  id,
  type: "text",
  content,
  size: "body",
});

const surfaceWidget = (): SurfaceWidgetType => ({
  id: "surf",
  type: "surface",
  design_width: 800,
  design_height: 600,
  min_width: 400,
  narrow: "scroll",
  children: [
    { id: "bg-rect", type: "rect", x: 10, y: 10, w: 100, h: 50, color: "orange" },
    { id: "dial", type: "circle", cx: 50, cy: 50, r: 20 },
    { id: "scan-arc", type: "arc", center_x: 400, center_y: 300, radius: 200, start_angle: 0, end_angle: 90 },
    {
      id: "halo",
      type: "ring",
      center_x: 400,
      center_y: 300,
      inner_radius: 150,
      outer_radius: 180,
      start_angle: 0,
      end_angle: 360,
    },
    {
      id: "pie",
      type: "wedge",
      center_x: 400,
      center_y: 300,
      inner_radius: 0,
      outer_radius: 100,
      start_angle: 45,
      end_angle: 135,
    },
    {
      id: "bracket",
      type: "elbow",
      x: 500,
      y: 20,
      w: 120,
      h: 100,
      arm_thickness_x: 30,
      arm_thickness_y: 25,
      corner: "top-left",
      outer_radius: 12,
      inner_radius: 8,
    },
    {
      id: "tri",
      type: "polygon",
      points: [{ x: 600, y: 400 }, { x: 650, y: 400 }, { x: 625, y: 450 }],
    },
    {
      id: "custom",
      type: "path",
      commands: [
        { op: "move", x: 0, y: 0 },
        { op: "line", x: 20, y: 0 },
        { op: "arc", rx: 10, ry: 10, rotation: 0, large_arc: 0, sweep: 1, x: 20, y: 20 },
        { op: "close" },
      ],
    },
    {
      id: "wire",
      type: "connector",
      from_x: 0,
      from_y: 0,
      to_x: 100,
      to_y: 100,
      style: "elbow",
      layer: "overlay",
    },
    {
      id: "r1",
      type: "surface_region",
      x: 200,
      y: 10,
      w: 300,
      h: 200,
      layer: "content",
      children: [textWidget("hello-text", "hello")],
    },
  ],
});

describe("SurfaceControl", () => {
  it("renders geometry nodes as SVG shapes and region children as normal widgets", () => {
    const { container } = render(
      <WidgetRenderer depth={0} widget={surfaceWidget()} {...handlers()} />,
    );

    expect(container.querySelector("svg.lcars-surface-geometry")).not.toBeNull();
    expect(container.querySelector("rect")).not.toBeNull();
    expect(container.querySelector("circle")).not.toBeNull();
    expect(screen.getByText("hello")).toBeInTheDocument();
  });

  it("renders arc/connector as stroked paths and ring/wedge as filled evenodd paths", () => {
    const { container } = render(
      <WidgetRenderer depth={0} widget={surfaceWidget()} {...handlers()} />,
    );

    const paths = Array.from(container.querySelectorAll("path"));
    expect(paths).toHaveLength(7); // arc, ring, wedge, elbow, polygon, path, connector

    const stroked = paths.filter((p) => p.getAttribute("fill") === "none");
    expect(stroked).toHaveLength(2); // arc + connector
    for (const p of stroked) {
      expect(p.getAttribute("stroke")).not.toBeNull();
      expect(p.getAttribute("d")).toMatch(/^M /);
    }

    const filled = paths.filter((p) => p.getAttribute("fill-rule") === "evenodd");
    expect(filled).toHaveLength(2);
    for (const p of filled) {
      expect(p.getAttribute("fill")).not.toBe("none");
      expect(p.getAttribute("d")).toMatch(/^M /);
    }
  });

  it("renders elbow/polygon/path as filled paths with non-empty geometry", () => {
    const { container } = render(
      <WidgetRenderer depth={0} widget={surfaceWidget()} {...handlers()} />,
    );
    const paths = Array.from(container.querySelectorAll("path"));
    const nonRingWedgeArc = paths.filter(
      (p) => p.getAttribute("fill-rule") !== "evenodd" && p.getAttribute("fill") !== "none",
    );
    // elbow + polygon + path
    expect(nonRingWedgeArc).toHaveLength(3);
    for (const p of nonRingWedgeArc) {
      expect(p.getAttribute("d")).toMatch(/^M /);
      expect(p.getAttribute("d")?.trim().endsWith("Z")).toBe(true);
    }
  });
});
