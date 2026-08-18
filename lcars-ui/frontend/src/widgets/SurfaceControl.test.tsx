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

  it("renders arc as a stroked path and ring/wedge as filled evenodd paths", () => {
    const { container } = render(
      <WidgetRenderer depth={0} widget={surfaceWidget()} {...handlers()} />,
    );

    const paths = Array.from(container.querySelectorAll("path"));
    expect(paths).toHaveLength(3);

    const arc = paths.find((p) => p.getAttribute("fill") === "none");
    expect(arc).toBeTruthy();
    expect(arc?.getAttribute("stroke")).not.toBeNull();
    expect(arc?.getAttribute("d")).toMatch(/^M /);

    const filled = paths.filter((p) => p.getAttribute("fill-rule") === "evenodd");
    expect(filled).toHaveLength(2);
    for (const p of filled) {
      expect(p.getAttribute("fill")).not.toBe("none");
      expect(p.getAttribute("d")).toMatch(/^M /);
    }
  });
});
