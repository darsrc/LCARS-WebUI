import { render, screen } from "@testing-library/react";
import type { EdgeProps } from "@xyflow/react";

import type { GraphEdge, GraphLayer } from "../../types/contract";
import { LcarsEdge, type LcarsEdgeData } from "./parts";

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

const props = (data: LcarsEdgeData): EdgeProps =>
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
  }) as unknown as EdgeProps;

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
});
