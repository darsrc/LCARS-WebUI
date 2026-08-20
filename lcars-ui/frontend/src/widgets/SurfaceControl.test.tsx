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
      filled: true,
      commands: [
        { op: "move", x: 0, y: 0 },
        { op: "line", x: 20, y: 0 },
        { op: "arc", rx: 10, ry: 10, rotation: 0, large_arc: 0, sweep: 1, x: 20, y: 20 },
        { op: "close" },
      ],
    },
    {
      id: "stroke-only",
      type: "path",
      filled: false,
      commands: [
        { op: "move", x: 0, y: 0 },
        { op: "line", x: 10, y: 10 },
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
      id: "labeled-rim",
      type: "arc",
      center_x: 400,
      center_y: 300,
      radius: 250,
      start_angle: 0,
      end_angle: 180,
    },
    {
      id: "rim-label",
      type: "text_path",
      path_ref: "labeled-rim",
      text: "HELLO ARC",
      start_offset: 10,
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
    // arc, ring, wedge, elbow, polygon, path(filled), path(unfilled), connector, arc(labeled-rim)
    expect(paths).toHaveLength(9);

    const stroked = paths.filter((p) => p.getAttribute("fill") === "none");
    expect(stroked).toHaveLength(4); // 2 arcs + unfilled path + connector
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

  it("gives each path-rendering geometry node a stable id, and renders text_path referencing one by href", () => {
    const { container } = render(
      <WidgetRenderer depth={0} widget={surfaceWidget()} {...handlers()} />,
    );

    const rim = container.querySelector("#labeled-rim");
    expect(rim).not.toBeNull();
    expect(rim?.tagName).toBe("path");

    const textPath = container.querySelector("textPath");
    expect(textPath).not.toBeNull();
    expect(textPath?.getAttribute("href")).toBe("#labeled-rim");
    expect(textPath?.getAttribute("startOffset")).toBe("10%");
    expect(textPath?.textContent).toBe("HELLO ARC");
  });

  it("switches to narrow_x/y/w/h and the narrow_design_size viewBox once the viewport drops below min_width under narrow=fluid", () => {
    const fluidWidget: SurfaceWidgetType = {
      id: "surf",
      type: "surface",
      design_width: 1600,
      design_height: 900,
      min_width: 1200,
      narrow: "fluid",
      narrow_design_width: 800,
      narrow_design_height: 900,
      children: [
        {
          id: "rail",
          type: "rect",
          x: 0, y: 0, w: 200, h: 900,
          narrow_x: 0, narrow_y: 0, narrow_w: 200, narrow_h: 900,
        },
        {
          id: "viewport",
          type: "surface_region",
          x: 224, y: 0, w: 1376, h: 900,
          narrow_x: 224, narrow_y: 0, narrow_w: 576, narrow_h: 900,
          layer: "content",
          children: [textWidget("t", "content")],
        },
      ],
    };

    const original = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "clientWidth");
    Object.defineProperty(HTMLElement.prototype, "clientWidth", { configurable: true, value: 700 });
    try {
      const { container } = render(
        <WidgetRenderer depth={0} widget={fluidWidget} {...handlers()} />,
      );
      const svg = container.querySelector("svg.lcars-surface-geometry");
      expect(svg?.getAttribute("viewBox")).toBe("0 0 800 900");

      const rect = container.querySelector("rect");
      expect(rect?.getAttribute("width")).toBe("200");

      const region = container.querySelector('[data-region="viewport"]') as HTMLElement;
      // 224 / 800 = 28%
      expect(parseFloat(region.style.left)).toBeCloseTo(28);
      // 576 / 800 = 72%
      expect(parseFloat(region.style.width)).toBeCloseTo(72);
    } finally {
      if (original) Object.defineProperty(HTMLElement.prototype, "clientWidth", original);
    }
  });

  it("renders a mirror group's geometry as N <g transform> copies and repositions its region children without rotating their content", () => {
    const groupWidget: SurfaceWidgetType = {
      id: "surf",
      type: "surface",
      design_width: 800,
      design_height: 600,
      min_width: 400,
      narrow: "scroll",
      children: [
        {
          id: "lobe",
          type: "surface_group",
          mirror: { axis: "x", axis_x: 400 },
          children: [
            { id: "dial", type: "circle", cx: 100, cy: 100, r: 20 },
            {
              id: "readout",
              type: "surface_region",
              x: 50,
              y: 150,
              w: 100,
              h: 40,
              layer: "content",
              children: [textWidget("readout-text", "HELLO")],
            },
          ],
        },
      ],
    };

    const { container } = render(
      <WidgetRenderer depth={0} widget={groupWidget} {...handlers()} />,
    );

    const circles = container.querySelectorAll("circle");
    expect(circles).toHaveLength(2);
    expect(circles[0].getAttribute("id")).toBe("dial-copy-0");
    expect(circles[1].getAttribute("id")).toBe("dial-copy-1");

    const groups = container.querySelectorAll("svg.lcars-surface-geometry > g");
    expect(groups).toHaveLength(2);
    expect(groups[0].getAttribute("transform")).toBe("matrix(1,0,0,1,0,0)");
    expect(groups[1].getAttribute("transform")).toBe("matrix(-1,0,0,1,800,0)");

    const regions = container.querySelectorAll('[data-region^="readout-copy-"]');
    expect(regions).toHaveLength(2);
    // Original region center: (100, 170). Copy 0 (identity) keeps that center -> left = 50/800.
    expect(parseFloat((regions[0] as HTMLElement).style.left)).toBeCloseTo((50 / 800) * 100);
    // Copy 1 (mirrored across x=400): new center x = 800 - 100 = 700 -> left = (700-50)/800.
    expect(parseFloat((regions[1] as HTMLElement).style.left)).toBeCloseTo((650 / 800) * 100);
    // Text content is untouched by the mirror - still reads "HELLO", not reversed.
    expect(screen.getAllByText("HELLO")).toHaveLength(2);
  });
});
