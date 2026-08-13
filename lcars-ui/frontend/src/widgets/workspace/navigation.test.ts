import type { GraphWorkspaceDocument } from "../../types/workspace";
import {
  collapseGroup,
  focusRecordIds,
  projectVisibleDocument,
  searchWorkspace,
  selectStep,
  traverseReaderHistory,
  visibleRecordIds,
} from "./navigation";

const workspace = (): GraphWorkspaceDocument => ({
  format: "lcars-graph-workspace", version: 1, workspace_id: "workspace",
  record_schemas: [{
    kind: "generic", label: "Generic", appearance: { shape: "card", token: "REC" },
    search_fields: [
      { id: "title", label: "Caller title", path: "fields.title", match: "text" },
      { id: "structure", label: "Caller structure", path: "trees.value", match: "structural" },
    ],
  }],
  canonical: {
    graph: { graph_id: "graph", revision: "r1" },
    records: [
      { id: "a", kind: "generic", fields: { title: "Alpha" } },
      { id: "b", kind: "generic", fields: { title: "Beta" } },
      { id: "c", kind: "other", fields: { title: "Gamma" } },
    ],
    projection: {
      document: {
        format: "lcars-node-graph", version: 2,
        templates: [{ id: "t", inputs: [{ id: "in", type: "any", capacity: 5 }], outputs: [{ id: "out", type: "any" }] }],
        nodes: [
          { id: "na", template: "t", group: "step-1" },
          { id: "nb", template: "t", group: "step-1" },
          { id: "nc", template: "t", group: "step-2" },
        ],
        edges: [
          { id: "ab", source: "na", source_port: "out", target: "nb", target_port: "in", layer: "l" },
          { id: "bc", source: "nb", source_port: "out", target: "nc", target_port: "in", layer: "l" },
        ],
        layers: [{ id: "l" }],
        groups: [
          { id: "step-1", label: "Step 1", position: [0, 0], size: [400, 200] },
          { id: "step-2", label: "Step 2", position: [450, 0], size: [200, 200] },
        ],
      },
      bindings: [
        { element_kind: "node", element_id: "na", record_id: "a", plane: "canonical" },
        { element_kind: "node", element_id: "nb", record_id: "b", plane: "canonical" },
        { element_kind: "node", element_id: "nc", record_id: "c", plane: "canonical" },
      ],
    },
  },
  proposal: { proposal_id: "proposal", title: "Draft", base: { graph_id: "graph", revision: "r1" } },
  reader: { revision: 0 },
});

test("search reports every caller-declared field label that matched", () => {
  expect(searchWorkspace(workspace(), "alpha")).toMatchObject([
    { record: { id: "a" }, matched_fields: ["Caller title"] },
  ]);
  expect(searchWorkspace(workspace(), "a").find((result) => result.record.id === "a")?.matched_fields).toEqual([
    "Stable ID", "Caller title",
  ]);
});

test("N-hop focus respects incoming, outgoing, and both directions", () => {
  expect([...focusRecordIds(workspace(), "a", 1, "outgoing")]).toEqual(["a", "b"]);
  expect([...focusRecordIds(workspace(), "b", 1, "incoming")]).toEqual(["b", "a"]);
  expect([...focusRecordIds(workspace(), "b", 1, "both")]).toEqual(["b", "a", "c"]);
});

test("filters and search intersect without treating no matches as complete data", () => {
  const filtered = workspace();
  filtered.reader = { revision: 1, filters: [{ facet: "kind", values: ["generic"] }], search: "beta" };
  expect([...visibleRecordIds(filtered)]).toEqual(["b"]);
});

test("collapse hides group children without losing source positions and expand restores them", () => {
  const original = workspace();
  const collapsed = collapseGroup(original, "step-1", true);
  const projection = original.canonical.projection!;
  const hidden = projectVisibleDocument(
    projection.document as never,
    projection.bindings!,
    visibleRecordIds(collapsed),
    new Set(collapsed.reader?.collapsed),
  );
  expect(hidden.nodes?.map((node) => node.id)).toEqual(["nc"]);
  const expanded = collapseGroup(collapsed, "step-1", false);
  const restored = projectVisibleDocument(
    projection.document as never,
    projection.bindings!,
    visibleRecordIds(expanded),
    new Set(expanded.reader?.collapsed),
  );
  expect(restored.nodes?.map((node) => node.id)).toEqual(["na", "nb", "nc"]);
  expect(restored.nodes?.[0].position).toEqual(projection.document.nodes?.[0].position);
});

test("step navigation restores per-step selection and reader history moves independently", () => {
  const start = workspace();
  start.reader = {
    revision: 0,
    current_step: "one",
    selection: [{ plane: "canonical", element_kind: "record", element_id: "a" }],
  };
  const two = selectStep(start, "two");
  two.reader!.selection = [{ plane: "canonical", element_kind: "record", element_id: "c" }];
  const one = selectStep(two, "one");
  expect(one.reader?.selection?.[0].element_id).toBe("a");
  expect(one.proposal?.interaction_count ?? 0).toBe(0);
  expect(traverseReaderHistory(one, -1).reader?.current_step).toBe("two");
});
