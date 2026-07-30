import type { GraphDocument, NodeTemplate } from "../../types/contract";
import {
  addComment,
  addReroute,
  alignNodes,
  canonical,
  connect,
  disconnect,
  distributeNodes,
  duplicateNodes,
  emptyDocument,
  extractSubgraph,
  groupSelection,
  insertSubgraph,
  moveComment,
  moveGroup,
  removeComments,
  removeNodes,
  removeReroutes,
  setCommentText,
  ungroup,
  validateDocument,
} from "./graph";

const template = (overrides: Partial<NodeTemplate> & { id: string }): NodeTemplate => ({
  label: null,
  category: null,
  color: null,
  inputs: [],
  outputs: [],
  fields: [],
  ...overrides,
});

const node = (id: string, x: number, y: number, tpl = "box") => ({
  id,
  template: tpl,
  position: [x, y] as [number, number],
  values: {},
  label: null,
  group: null,
});

const doc = (overrides: Partial<GraphDocument> = {}): GraphDocument => ({
  ...emptyDocument(),
  templates: [
    template({
      id: "box",
      inputs: [{ id: "in", label: null, type: "any", capacity: null }],
      outputs: [{ id: "out", label: null, type: "any", capacity: null }],
    }),
  ],
  nodes: [node("a", 0, 0), node("b", 100, 40), node("c", 300, 200)],
  ...overrides,
});

const sizes = {
  a: { width: 100, height: 50 },
  b: { width: 60, height: 30 },
  c: { width: 80, height: 40 },
};

const wired = () =>
  connect(doc(), { source: "a", source_port: "out", target: "b", target_port: "in" });

describe("copy and paste", () => {
  test("extractSubgraph keeps only edges with both ends selected", () => {
    const document = connect(wired(), {
      source: "b",
      source_port: "out",
      target: "c",
      target_port: "in",
    });

    const fragment = extractSubgraph(document, ["a", "b"]);

    expect(fragment.nodes.map((item) => item.id)).toEqual(["a", "b"]);
    expect(fragment.edges).toHaveLength(1);
  });

  test("pasting gives fresh ids and rewires the copy to itself", () => {
    const document = wired();
    const fragment = extractSubgraph(document, ["a", "b"]);

    const { document: next, nodeIds } = insertSubgraph(document, fragment);

    expect(next.nodes).toHaveLength(5);
    expect(nodeIds).toHaveLength(2);
    expect(nodeIds).not.toContain("a");
    // The pasted edge joins the pasted nodes, not the originals.
    const pasted = next.edges[next.edges.length - 1];
    expect(nodeIds).toContain(pasted.source);
    expect(nodeIds).toContain(pasted.target);
  });

  test("pasting offsets the copy so it does not hide under the original", () => {
    const { document: next, nodeIds } = insertSubgraph(doc(), extractSubgraph(doc(), ["a"]), [
      24, 24,
    ]);
    const pasted = next.nodes.find((item) => item.id === nodeIds[0]);

    expect(pasted?.position).toEqual([24, 24]);
  });

  test("a pasted node loses its group membership", () => {
    const grouped = groupSelection(doc(), ["a"], sizes);
    const fragment = extractSubgraph(grouped, ["a"]);

    const { document: next, nodeIds } = insertSubgraph(grouped, fragment);

    expect(next.nodes.find((item) => item.id === nodeIds[0])?.group).toBeNull();
  });

  test("pasting nothing is a no-op", () => {
    const base = doc();
    expect(insertSubgraph(base, { nodes: [], edges: [] }).document).toBe(base);
  });

  test("duplicate is copy and paste in one step", () => {
    const { document: next } = duplicateNodes(wired(), ["a", "b"]);

    expect(next.nodes).toHaveLength(5);
    expect(next.edges).toHaveLength(2);
  });

  test("a duplicated graph is still valid", () => {
    const { document: next } = duplicateNodes(wired(), ["a", "b"]);
    const result = validateDocument(JSON.parse(JSON.stringify(next)));

    expect(result.ok).toBe(true);
  });
});

describe("align", () => {
  test("aligns left edges", () => {
    const next = alignNodes(doc(), ["a", "b", "c"], "left", sizes);

    expect(next.nodes.map((item) => item.position[0])).toEqual([0, 0, 0]);
  });

  test("aligns right edges using measured widths", () => {
    const next = alignNodes(doc(), ["a", "b", "c"], "right", sizes);
    const rights = next.nodes.map((item) => item.position[0] + sizes[item.id as "a"].width);

    expect(new Set(rights).size).toBe(1);
  });

  test("aligns vertical centres using measured heights", () => {
    const next = alignNodes(doc(), ["a", "b", "c"], "center-y", sizes);
    const centres = next.nodes.map((item) => item.position[1] + sizes[item.id as "a"].height / 2);

    expect(new Set(centres).size).toBe(1);
  });

  test("leaves the other axis alone", () => {
    const next = alignNodes(doc(), ["a", "b", "c"], "left", sizes);

    expect(next.nodes.map((item) => item.position[1])).toEqual([0, 40, 200]);
  });

  test("needs two nodes to mean anything", () => {
    const base = doc();
    expect(alignNodes(base, ["a"], "left", sizes)).toBe(base);
  });

  test("degrades to corner alignment when sizes are unknown", () => {
    const next = alignNodes(doc(), ["a", "b"], "right");

    expect(next.nodes[0].position[0]).toBe(100);
    expect(next.nodes[1].position[0]).toBe(100);
  });
});

describe("distribute", () => {
  test("evens the gaps and leaves the ends put", () => {
    const document = doc({ nodes: [node("a", 0, 0), node("b", 10, 0), node("c", 300, 0)] });

    const next = distributeNodes(document, ["a", "b", "c"], "x");
    const xs = next.nodes.map((item) => item.position[0]).sort((p, q) => p - q);

    expect(xs).toEqual([0, 150, 300]);
  });

  test("works on the y axis", () => {
    const document = doc({ nodes: [node("a", 0, 0), node("b", 0, 5), node("c", 0, 100)] });

    const next = distributeNodes(document, ["a", "b", "c"], "y");

    expect(next.nodes.map((item) => item.position[1]).sort((p, q) => p - q)).toEqual([0, 50, 100]);
  });

  test("two nodes are already evenly spaced", () => {
    const base = doc();
    expect(distributeNodes(base, ["a", "b"], "x")).toBe(base);
  });
});

describe("groups", () => {
  test("frames the selection and records membership", () => {
    const next = groupSelection(doc(), ["a", "b"], sizes, "STAGE 1");
    const group = next.groups[0];

    expect(group.label).toBe("STAGE 1");
    expect(next.nodes.find((item) => item.id === "a")?.group).toBe(group.id);
    expect(next.nodes.find((item) => item.id === "c")?.group).toBeNull();
  });

  test("the frame encloses its members", () => {
    const next = groupSelection(doc(), ["a", "b"], sizes);
    const [left, top] = next.groups[0].position;
    const [width, height] = next.groups[0].size;

    expect(left).toBeLessThan(0);
    expect(top).toBeLessThan(0);
    expect(left + width).toBeGreaterThan(160);
    expect(top + height).toBeGreaterThan(70);
  });

  test("ungroup drops the frame and frees the nodes", () => {
    const grouped = groupSelection(doc(), ["a", "b"], sizes);
    const next = ungroup(grouped, grouped.groups[0].id);

    expect(next.groups).toHaveLength(0);
    expect(next.nodes.every((item) => item.group === null)).toBe(true);
  });

  test("grouping nothing is a no-op", () => {
    const base = doc();
    expect(groupSelection(base, [], sizes)).toBe(base);
  });

  test("moveGroup translates the frame and all of its member nodes", () => {
    const grouped = groupSelection(doc(), ["a", "b"], sizes);
    const group = grouped.groups[0];
    const next = moveGroup(grouped, group.id, [group.position[0] + 50, group.position[1] + 75]);

    expect(next.groups[0].position).toEqual([group.position[0] + 50, group.position[1] + 75]);
    expect(next.nodes.find((item) => item.id === "a")?.position).toEqual([50, 75]);
    expect(next.nodes.find((item) => item.id === "b")?.position).toEqual([150, 115]);
    expect(next.nodes.find((item) => item.id === "c")?.position).toEqual([300, 200]);
  });

  test("moveGroup carries internal reroutes but leaves crossing wires anchored", () => {
    let grouped = groupSelection(wired(), ["a", "b"], sizes);
    grouped = {
      ...grouped,
      edges: [
        ...grouped.edges,
        {
          id: "edge-out",
          source: "b",
          source_port: "out",
          target: "c",
          target_port: "in",
        },
      ],
      reroutes: [
        { id: "inside", edge: grouped.edges[0].id, position: [50, 20] },
        { id: "crossing", edge: "edge-out", position: [220, 80] },
      ],
    };
    const group = grouped.groups[0];

    const next = moveGroup(grouped, group.id, [group.position[0] + 32, group.position[1] - 16]);

    expect(next.reroutes.find((item) => item.id === "inside")?.position).toEqual([82, 4]);
    expect(next.reroutes.find((item) => item.id === "crossing")?.position).toEqual([220, 80]);
  });

  test("a grouped document still validates", () => {
    const grouped = groupSelection(doc(), ["a", "b"], sizes);
    expect(validateDocument(JSON.parse(JSON.stringify(grouped))).ok).toBe(true);
  });
});

describe("comments", () => {
  test("adds, edits, moves and removes", () => {
    let document = addComment(doc(), [10, 10], "note");
    const id = document.comments[0].id;

    expect(document.comments[0].text).toBe("note");

    document = setCommentText(document, id, "revised");
    expect(document.comments[0].text).toBe("revised");

    document = moveComment(document, id, [80, 90]);
    expect(document.comments[0].position).toEqual([80, 90]);

    document = removeComments(document, [id]);
    expect(document.comments).toHaveLength(0);
  });
});

describe("reroutes", () => {
  test("attaches a waypoint to an existing edge", () => {
    const document = wired();
    const next = addReroute(document, document.edges[0].id, [50, 50]);

    expect(next.reroutes).toHaveLength(1);
    expect(next.reroutes[0].edge).toBe(document.edges[0].id);
  });

  test("ignores an edge that is not there", () => {
    const base = wired();
    expect(addReroute(base, "ghost", [0, 0])).toBe(base);
  });

  test("removing the edge takes its reroutes with it", () => {
    const document = wired();
    const withReroute = addReroute(document, document.edges[0].id, [50, 50]);

    expect(disconnect(withReroute, [document.edges[0].id]).reroutes).toHaveLength(0);
  });

  test("deleting a node takes the reroutes on its edges", () => {
    const document = wired();
    const withReroute = addReroute(document, document.edges[0].id, [50, 50]);

    expect(removeNodes(withReroute, ["a"]).reroutes).toHaveLength(0);
  });

  test("removeReroutes drops them without touching the edge", () => {
    const document = wired();
    const withReroute = addReroute(document, document.edges[0].id, [50, 50]);
    const next = removeReroutes(withReroute, [withReroute.reroutes[0].id]);

    expect(next.reroutes).toHaveLength(0);
    expect(next.edges).toHaveLength(1);
  });
});

describe("every editing command leaves its input alone", () => {
  test("no command mutates", () => {
    const base = wired();
    const snapshot = canonical(base);

    duplicateNodes(base, ["a"]);
    alignNodes(base, ["a", "b"], "left", sizes);
    distributeNodes(base, ["a", "b", "c"], "x");
    groupSelection(base, ["a"], sizes);
    addComment(base, [0, 0]);
    addReroute(base, base.edges[0].id, [0, 0]);

    expect(canonical(base)).toBe(snapshot);
  });
});
