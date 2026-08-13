import { fireEvent, render, screen } from "@testing-library/react";
import { vi } from "vitest";

import type { GraphWorkspaceDocument } from "../../types/workspace";
import { GraphWorkspace } from "./GraphWorkspace";

vi.mock("../nodecanvas/NodeCanvas", () => ({
  default: ({ widget }: { widget: { id: string; document: { edges: unknown[] }; options: { visible_edge_ids?: string[] } } }) => (
    <div
      data-document-edges={widget.document.edges.length}
      data-testid={widget.id}
      data-visible-edges={widget.options.visible_edge_ids?.join(",")}
    />
  ),
}));

const workspace = (): GraphWorkspaceDocument => ({
  format: "lcars-graph-workspace", version: 1, workspace_id: "workspace",
  canonical: {
    graph: { graph_id: "graph", revision: "r1" },
    projection: {
      document: {
        format: "lcars-node-graph", version: 2,
        templates: [{ id: "node" }],
        nodes: [
          { id: "hub", template: "node" },
          ...Array.from({ length: 100 }, (_, index) => ({ id: `source-${index}`, template: "node" })),
        ],
        edges: Array.from({ length: 100 }, (_, index) => ({
          id: `edge-${String(index).padStart(3, "0")}`,
          source: `source-${index}`,
          source_port: "out",
          target: "hub",
          target_port: "in",
          layer: "layer",
          relation: "relation",
        })),
      },
    },
  },
  proposal: { proposal_id: "proposal", title: "Draft", base: { graph_id: "graph", revision: "r1" } },
});

test("keeps the complete hundred-edge fan while showing twenty stable canvas lanes", () => {
  render(
    <GraphWorkspace
      handlers={{ onAction: vi.fn() }}
      label="Fan workspace"
      widget={{ id: "fan", type: "graph_workspace", workspace: workspace(), options: { fan_page_size: 20 } }}
    />,
  );
  const canvas = screen.getByTestId("fan-canonical");
  expect(canvas).toHaveAttribute("data-document-edges", "100");
  expect(canvas.getAttribute("data-visible-edges")?.split(",")).toHaveLength(20);
  expect(screen.getByRole("table", { name: "Complete hub fan" })).toHaveAttribute("aria-rowcount", "100");

  fireEvent.click(screen.getByRole("button", { name: "NEXT LANES" }));
  expect(screen.getByTestId("fan-canonical").getAttribute("data-visible-edges")?.split(",")[0]).toBe("edge-020");
  expect(screen.getByTestId("fan-canonical")).toHaveAttribute("data-document-edges", "100");
});
