import { render, screen } from "@testing-library/react";
import type { EdgeProps } from "@xyflow/react";

import type { GraphEdge, GraphLayer } from "../../types/contract";
import { edgeGeometry, LcarsEdge, type LcarsEdgeData } from "./parts";

vi.mock("@xyflow/react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@xyflow/react")>();
  return {
    ...actual,
    BaseEdge: ({ path, style }: { path: string; style: React.CSSProperties }) => (
      <path className="react-flow__edge-path" data-testid="base-edge" d={path} style={style} />
    ),
    EdgeLabelRenderer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    getBezierPath: () => ["M 0,0 C 30,0 70,50 100,50", 50, 25, 50, 25],
    useViewport: () => ({ x: 0, y: 0, zoom: 1 }),
  };
});

const edge: GraphEdge = {
  id: "e1",
  source: "source",
  source_port: "out",
  target: "target",
  target_port: "in",
  layer: "layer",
  label: "Full relation label",
  relation: "RELATION",
  accessible_label: null,
};

const layer = (pattern: GraphLayer["pattern"], overrides: Partial<GraphLayer> = {}): GraphLayer => ({
  id: "layer",
  label: "Layer name",
  token: "LN",
  color: "#fdb441",
  pattern,
  marker: "arrow_closed",
  default_visible: true,
  default_emphasized: false,
  label_zoom_threshold: 0.65,
  description: null,
  ...overrides,
});

const props = (data: LcarsEdgeData, overrides: Record<string, unknown> = {}): EdgeProps =>
  ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    sourceX: 0,
    sourceY: 0,
    targetX: 100,
    targetY: 50,
    sourcePosition: "right",
    targetPosition: "left",
    markerEnd: undefined,
    data,
    ...overrides,
  }) as unknown as EdgeProps;

describe("edgeGeometry", () => {
  test("gives parallel lanes distinct code-rendered paths", () => {
    const first = edgeGeometry({
      edge,
      route: {
        parallelIndex: 0,
        parallelCount: 2,
        reciprocal: false,
        selfLoopIndex: 0,
        selfLoopCount: 0,
      },
      sourceX: 0,
      sourceY: 0,
      targetX: 100,
      targetY: 0,
    });
    const second = edgeGeometry({
      edge,
      route: {
        parallelIndex: 1,
        parallelCount: 2,
        reciprocal: false,
        selfLoopIndex: 0,
        selfLoopCount: 0,
      },
      sourceX: 0,
      sourceY: 0,
      targetX: 100,
      targetY: 0,
    });

    expect(first?.path).not.toBe(second?.path);
    expect(first?.labelY).toBeLessThan(0);
    expect(second?.labelY).toBeGreaterThan(0);
  });

  test("routes reciprocal directions to opposite physical sides", () => {
    const route = {
      parallelIndex: 0,
      parallelCount: 1,
      reciprocal: true,
      selfLoopIndex: 0,
      selfLoopCount: 0,
    };
    const forward = edgeGeometry({
      edge,
      route,
      sourceX: 0,
      sourceY: 0,
      targetX: 100,
      targetY: 0,
    });
    const reverse = edgeGeometry({
      edge: { ...edge, source: "target", target: "source" },
      route,
      sourceX: 100,
      sourceY: 0,
      targetX: 0,
      targetY: 0,
    });

    expect(forward?.labelY).toBeGreaterThan(0);
    expect(reverse?.labelY).toBeLessThan(0);
  });

  test("nests self-loops without raster or image geometry", () => {
    const selfLoop = { ...edge, source: "source", target: "source" };
    const inner = edgeGeometry({
      edge: selfLoop,
      route: {
        parallelIndex: 0,
        parallelCount: 2,
        reciprocal: false,
        selfLoopIndex: 0,
        selfLoopCount: 2,
      },
      sourceX: 100,
      sourceY: 20,
      targetX: 0,
      targetY: 20,
    });
    const outer = edgeGeometry({
      edge: selfLoop,
      route: {
        parallelIndex: 1,
        parallelCount: 2,
        reciprocal: false,
        selfLoopIndex: 1,
        selfLoopCount: 2,
      },
      sourceX: 100,
      sourceY: 20,
      targetX: 0,
      targetY: 20,
    });

    expect(inner?.path).toMatch(/^M .* C /);
    expect(outer?.labelY).toBeLessThan(inner?.labelY ?? 0);
  });
});

describe("LcarsEdge layer rendering", () => {
  test.each([
    ["solid", ""],
    ["dashed", "14 8"],
    ["dotted", "2 9"],
  ] as const)("renders the %s non-color pattern", (pattern, dasharray) => {
    render(
      <svg>
        <LcarsEdge
          {...props({ edge, layer: layer(pattern), reroutes: [], color: "#fdb441", muted: false })}
        />
      </svg>,
    );

    expect(screen.getByTestId("base-edge").style.strokeDasharray).toBe(dasharray);
  });

  test("renders a double rail as separate code-rendered geometry", () => {
    const { container } = render(
      <svg>
        <LcarsEdge
          {...props({ edge, layer: layer("double"), reroutes: [], color: "#fdb441", muted: false })}
        />
      </svg>,
    );

    expect(container.querySelector(".lcars-gedge-double")).toBeInTheDocument();
    expect(screen.getByTestId("base-edge")).toHaveStyle("stroke: #000");
  });

  test("collapses the visual label to a token without losing the accessible relation", () => {
    render(
      <svg>
        <LcarsEdge
          {...props({
            edge,
            layer: layer("solid", { label_zoom_threshold: 2 }),
            reroutes: [],
            color: "#fdb441",
            muted: false,
          })}
        />
      </svg>,
    );

    expect(screen.getByText("LN")).toHaveAttribute("data-token", "true");
    expect(
      screen.getByRole("note", {
        name: "Layer name edge RELATION from source:out to target:in",
      }),
    ).toBeInTheDocument();
  });

  test("adds a continuous trace for a selected edge without changing its layer pattern", () => {
    const { container } = render(
      <svg>
        <LcarsEdge
          {...props(
            { edge, layer: layer("dashed"), reroutes: [], color: "#fdb441", muted: false },
            { selected: true },
          )}
        />
      </svg>,
    );

    expect(container.querySelector(".lcars-gedge-selected-trace")).toHaveAttribute(
      "d",
      "M 0,0 C 30,0 70,50 100,50",
    );
    expect(screen.getByTestId("base-edge").style.strokeDasharray).toBe("14 8");
  });
});
