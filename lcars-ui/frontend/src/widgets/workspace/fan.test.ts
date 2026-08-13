import type { GraphDocument } from "../../types/contract";
import { groupEdgeFans, windowEdgeFans } from "./fan";
import { edgeRoutes } from "../nodecanvas/graph";

const fan = (count = 100): GraphDocument => ({
  format: "lcars-node-graph", version: 2,
  layers: [{ id: "alpha", label: "Alpha", pattern: "solid", marker: "arrow_closed", default_visible: true, default_emphasized: false, label_zoom_threshold: .65 }],
  templates: [], nodes: [], reroutes: [], groups: [], comments: [], viewport: { x: 0, y: 0, zoom: 1 },
  edges: Array.from({ length: count }, (_, index) => ({
    id: `edge-${String(index).padStart(3, "0")}`,
    source: `source-${index}`,
    source_port: "out",
    target: "hub",
    target_port: "in",
    layer: "alpha",
    relation: "same-relation",
  })),
});

test("groups a hundred-edge convergence only by exact layer relation and direction", () => {
  const document = fan();
  document.edges[99].relation = "other-relation";
  const groups = groupEdgeFans(document);

  expect(groups.map((group) => [group.hub, group.direction, group.layer, group.relation, group.edges.length])).toEqual([
    ["hub", "incoming", "alpha", "same-relation", 99],
  ]);
});

test("shows twenty stable lanes by default and pages without changing their order", () => {
  const document = fan();
  const group = groupEdgeFans(document)[0];
  const first = windowEdgeFans(document, 20);
  const second = windowEdgeFans(document, 20, { [group.id]: 1 });

  expect(first.visible_edge_ids).toEqual(document.edges.slice(0, 20).map((edge) => edge.id));
  expect(second.visible_edge_ids).toEqual(document.edges.slice(20, 40).map((edge) => edge.id));
  expect(group.edges.map((edge) => edge.id)).toEqual(document.edges.map((edge) => edge.id));
  expect(edgeRoutes(document.edges)["edge-020"]).toMatchObject({
    parallelIndex: 0,
    parallelCount: 1,
    targetFanIndex: 20,
    targetFanCount: 100,
  });
});

test("small groups remain fully visible", () => {
  expect(windowEdgeFans(fan(20), 20).visible_edge_ids).toHaveLength(20);
});
